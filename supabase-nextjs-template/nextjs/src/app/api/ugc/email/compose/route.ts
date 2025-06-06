import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Email compose API started');
    
    // First, verify user authentication with SSR client
    const ssrSupabase = await createSSRClient();
    const { data: { user }, error: authError } = await ssrSupabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.id);

    // Now use admin client for database operations
    const supabase = await createServerAdminClient();
    
    const { creatorId, brandId, subject, htmlContent, textContent } = await request.json();
    console.log('📝 Request payload:', { creatorId, brandId, subject, htmlContentLength: htmlContent?.length, textContentLength: textContent?.length });

    if (!creatorId || !brandId || !subject || !htmlContent) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ 
        error: 'Missing required fields: creatorId, brandId, subject, htmlContent' 
      }, { status: 400 });
    }

    // Get creator info
    console.log('🔍 Looking up creator:', creatorId);
    const { data: creator, error: creatorError } = await supabase
      .from('ugc_creators')
      .select('name, email, brand_id')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      console.log('❌ Creator lookup failed:', creatorError);
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }
    
    console.log('✅ Creator found:', { name: creator.name, email: creator.email });

    if (!creator.email) {
      console.log('❌ Creator email not available');
      return NextResponse.json({ error: 'Creator email not available' }, { status: 400 });
    }

    // Get brand info including email_identifier
    console.log('🔍 Looking up brand:', brandId);
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('name, email_identifier')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      console.log('❌ Brand lookup failed:', brandError);
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Type assertion to access email_identifier
    const brandWithEmailId = brand as any;
    console.log('✅ Brand found:', { name: brandWithEmailId.name, email_identifier: brandWithEmailId.email_identifier });
    
    if (!brandWithEmailId.email_identifier) {
      console.log('❌ Brand email identifier not configured');
      return NextResponse.json({ 
        error: 'Brand email identifier not configured. Please set up email settings in brand configuration.' 
      }, { status: 400 });
    }

    // Generate from address
    const fromEmail = `${brandWithEmailId.email_identifier}@mail.powerbrief.ai`;
    console.log('📧 Generated from email:', fromEmail);

    // Check if thread exists or create new one
    const threadSubject = subject;
    let threadId: string;

    console.log('🔍 Looking for existing thread');
    const { data: existingThread } = await supabase
      .from('ugc_email_threads' as any)
      .select('id')
      .eq('creator_id', creatorId)
      .eq('brand_id', brandId)
      .eq('thread_subject', threadSubject)
      .single();

    if (existingThread) {
      threadId = String((existingThread as any).id);
      console.log('✅ Found existing thread:', threadId);
    } else {
      console.log('📝 Creating new thread');
      // Create new thread
      const { data: newThread, error: threadError } = await supabase
        .from('ugc_email_threads' as any)
        .insert({
          creator_id: creatorId,
          brand_id: brandId,
          thread_subject: threadSubject,
          status: 'active'
        })
        .select('id')
        .single();

      if (threadError || !newThread) {
        console.log('❌ Thread creation failed:', threadError);
        return NextResponse.json({ error: 'Failed to create email thread' }, { status: 500 });
      }

      threadId = String((newThread as any).id);
      console.log('✅ Created new thread:', threadId);
    }

    // Create email message record
    const messageData = {
      thread_id: threadId,
      from_email: fromEmail,
      to_email: creator.email,
      subject: subject,
      html_content: htmlContent,
      text_content: textContent,
      status: 'draft'
    };
    
    console.log('📝 Creating email message with data:', messageData);
    const { data: emailMessage, error: messageError } = await supabase
      .from('ugc_email_messages' as any)
      .insert(messageData)
      .select('id')
      .single();

    if (messageError || !emailMessage) {
      console.log('❌ Email message creation failed:', messageError);
      console.log('📝 Message data that failed:', messageData);
      return NextResponse.json({ error: 'Failed to create email message' }, { status: 500 });
    }
    
    console.log('✅ Email message created:', (emailMessage as any).id);

    // Send email via SendGrid
    try {
      const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: {
            email: 'noreply@powerbrief.ai',
            name: brandWithEmailId.name
          },
          reply_to: {
            email: fromEmail,
            name: brandWithEmailId.name
          },
          personalizations: [{
            to: [{ email: creator.email, name: creator.name }],
            subject: subject
          }],
          content: [
            {
              type: 'text/plain',
              value: textContent
            },
            {
              type: 'text/html',
              value: htmlContent
            }
          ]
        }),
      });

      if (sendGridResponse.ok) {
        // Update message status to sent
        await supabase
          .from('ugc_email_messages' as any)
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', emailMessage.id);

        return NextResponse.json({ 
          success: true, 
          messageId: emailMessage.id,
          threadId: threadId
        });
      } else {
        const errorText = await sendGridResponse.text();
        console.error('SendGrid error:', errorText);

        // Update message status to failed
        await supabase
          .from('ugc_email_messages' as any)
          .update({ status: 'failed' })
          .eq('id', emailMessage.id);

        return NextResponse.json({ 
          error: 'Failed to send email via SendGrid' 
        }, { status: 500 });
      }
    } catch (sendError) {
      console.error('Email sending error:', sendError);

      // Update message status to failed
      await supabase
        .from('ugc_email_messages' as any)
        .update({ status: 'failed' })
        .eq('id', emailMessage.id);

      return NextResponse.json({ 
        error: 'Failed to send email' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Compose email error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 