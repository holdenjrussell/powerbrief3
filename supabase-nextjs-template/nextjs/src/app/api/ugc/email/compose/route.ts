import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // First, verify user authentication with SSR client
    const ssrSupabase = await createSSRClient();
    const { data: { user }, error: authError } = await ssrSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Now use admin client for database operations
    const supabase = await createServerAdminClient();
    
    const { creatorId, brandId, subject, htmlContent, textContent } = await request.json();

    if (!creatorId || !brandId || !subject || !htmlContent) {
      return NextResponse.json({ 
        error: 'Missing required fields: creatorId, brandId, subject, htmlContent' 
      }, { status: 400 });
    }

    // Get creator info
    const { data: creator, error: creatorError } = await supabase
      .from('ugc_creators')
      .select('name, email, brand_id')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    if (!creator.email) {
      return NextResponse.json({ error: 'Creator email not available' }, { status: 400 });
    }

    // Get brand info including email_identifier
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('name, email_identifier')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Type assertion to access email_identifier
    const brandWithEmailId = brand as any;
    
    if (!brandWithEmailId.email_identifier) {
      return NextResponse.json({ 
        error: 'Brand email identifier not configured. Please set up email settings in brand configuration.' 
      }, { status: 400 });
    }

    // Generate from address
    const fromEmail = `${brandWithEmailId.email_identifier}@mail.powerbrief.ai`;

    // Check if thread exists or create new one
    const threadSubject = subject;
    let threadId: string;

    const { data: existingThread } = await supabase
      .from('ugc_email_threads' as any)
      .select('id')
      .eq('creator_id', creatorId)
      .eq('brand_id', brandId)
      .eq('thread_subject', threadSubject)
      .single();

    if (existingThread) {
      threadId = String(existingThread.id);
    } else {
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
        return NextResponse.json({ error: 'Failed to create email thread' }, { status: 500 });
      }

      threadId = String(newThread.id);
    }

    // Create email message record
    const { data: emailMessage, error: messageError } = await supabase
      .from('ugc_email_messages' as any)
      .insert({
        thread_id: threadId,
        from_email: fromEmail,
        to_email: creator.email,
        subject: subject,
        html_content: htmlContent,
        text_content: textContent,
        status: 'pending'
      })
      .select('id')
      .single();

    if (messageError || !emailMessage) {
      return NextResponse.json({ error: 'Failed to create email message' }, { status: 500 });
    }

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