import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export async function POST(request: NextRequest) {
  try {
    const { 
      brandId, 
      creatorId, 
      subject, 
      htmlContent, 
      textContent,
      source = 'n8n_ai_agent',
      workflowExecutionId,
      messageType = 'ai_generated'
    } = await request.json();

    if (!brandId || !creatorId || !subject || (!htmlContent && !textContent)) {
      return NextResponse.json({ 
        error: 'brandId, creatorId, subject, and content are required' 
      }, { status: 400 });
    }

    const supabase = await createServerAdminClient();

    // Get brand and creator info
    const { data: brand } = await supabase
      .from('brands')
      .select('name, email_identifier')
      .eq('id', brandId)
      .single();

    const { data: creator } = await supabase
      .from('ugc_creators')
      .select('name, email')
      .eq('id', creatorId)
      .single();

    if (!brand || !creator) {
      return NextResponse.json({ 
        error: 'Brand or creator not found' 
      }, { status: 404 });
    }

    // Find or create email thread
    const normalizedSubject = normalizeSubject(subject);
    
    let { data: thread, error: threadError } = await supabase
      .from('ugc_email_threads')
      .select('*')
      .eq('brand_id', brandId)
      .eq('creator_id', creatorId)
      .eq('thread_subject', normalizedSubject)
      .single();

    if (threadError && threadError.code === 'PGRST116') {
      // Thread doesn't exist, create new one
      const { data: newThread, error: createThreadError } = await supabase
        .from('ugc_email_threads')
        .insert({
          brand_id: brandId,
          creator_id: creatorId,
          thread_subject: normalizedSubject,
          status: 'active',
        })
        .select()
        .single();

      if (createThreadError) {
        return NextResponse.json({ 
          error: 'Failed to create thread' 
        }, { status: 500 });
      }
      thread = newThread;
    } else if (threadError) {
      return NextResponse.json({ 
        error: 'Database error finding thread' 
      }, { status: 500 });
    }

    // Store the outbound AI message
    const fromEmail = brand.email_identifier 
      ? `${brand.email_identifier}@mail.powerbrief.ai`
      : 'noreply@powerbrief.ai';

    const { data: message, error: messageError } = await supabase
      .from('ugc_email_messages')
      .insert({
        thread_id: thread.id,
        from_email: fromEmail,
        to_email: creator.email,
        subject: subject,
        html_content: htmlContent || '',
        text_content: textContent || '',
        status: 'sent',
        sent_at: new Date().toISOString(),
        template_id: null, // AI-generated, not from template
        variables_used: {
          source: source,
          message_type: messageType,
          workflow_execution_id: workflowExecutionId,
          ai_generated: true
        },
      })
      .select()
      .single();

    if (messageError) {
      return NextResponse.json({ 
        error: 'Failed to store message',
        details: messageError 
      }, { status: 500 });
    }

    // Update thread last message time
    await supabase
      .from('ugc_email_threads')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', thread.id);

    console.log(`✅ Stored AI agent message in creator inbox: ${message.id}`);

    return NextResponse.json({
      success: true,
      message: 'AI message stored successfully',
      messageId: message.id,
      threadId: thread.id
    });

  } catch (error) {
    console.error('Store outbound message API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function normalizeSubject(subject: string): string {
  // Remove "Re:", "Fwd:", etc. and normalize for thread matching
  return subject
    .replace(/^(Re|RE|Fwd|FWD|Fw|FW):\s*/gi, '')
    .trim();
} 