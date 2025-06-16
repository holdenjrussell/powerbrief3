import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { UgcAiCoordinatorService } from './ugcAiCoordinator';

interface EmailData {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  headers: string;
  attachments: string;
  envelope: string;
}

interface ProcessEmailResponse {
  brandIdentifier: string;
  emailData: EmailData;
}

interface ProcessResult {
  success: boolean;
  threadId?: string;
  actionsTaken?: string[];
  error?: string;
}

export async function processCreatorEmailResponse({
  brandIdentifier,
  emailData,
}: ProcessEmailResponse): Promise<ProcessResult> {
  try {
    const supabase = await createServerAdminClient();

    // 1. Find the brand by email identifier with enhanced validation
    const { data: brand, error: brandError } = await (supabase as any)
      .from('brands')
      .select('*')
      .eq('email_identifier', brandIdentifier)
      .not('email_identifier', 'is', null)
      .single();

    if (brandError || !brand) {
      console.error('❌ Brand lookup failed:', { brandIdentifier, error: brandError });
      return { success: false, error: `Brand not found: ${brandIdentifier}` };
    }

    // Enhanced validation: Ensure email identifier matches exactly
    if (brand.email_identifier !== brandIdentifier) {
      console.error('❌ Email identifier mismatch:', { 
        expected: brand.email_identifier, 
        received: brandIdentifier 
      });
      return { success: false, error: `Invalid email identifier: ${brandIdentifier}` };
    }

    // Validate brand has required fields for email processing
    if (!brand.user_id) {
      console.error('❌ Brand missing user_id:', { brandId: brand.id });
      return { success: false, error: `Brand configuration invalid: ${brandIdentifier}` };
    }

    console.log('✅ Valid brand found:', { 
      brandId: brand.id, 
      brandName: brand.name, 
      emailIdentifier: brand.email_identifier,
      userId: brand.user_id 
    });

    // 2. Find or create creator by email
    const creatorEmail = extractEmailFromSender(emailData.from);
    console.log('🔍 Looking for creator:', { creatorEmail, brandId: brand.id });
    
    let { data: creator, error: creatorError } = await (supabase as any)
      .from('ugc_creators')
      .select('*')
      .eq('brand_id', brand.id)
      .eq('email', creatorEmail)
      .single();

    if (creatorError && creatorError.code === 'PGRST116') {
      // Creator doesn't exist, create new one
      console.log('👤 Creating new creator:', { creatorEmail, brandId: brand.id });
      
      const { data: newCreator, error: createError } = await (supabase as any)
        .from('ugc_creators')
        .insert({
          brand_id: brand.id,
          name: extractNameFromSender(emailData.from),
          email: creatorEmail,
          status: 'EMAIL_RESPONSE',
          user_id: brand.user_id,
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Failed to create creator:', { creatorEmail, error: createError });
        return { success: false, error: 'Failed to create creator' };
      }
      
      creator = newCreator;
      console.log('✅ Creator created successfully:', { creatorId: creator.id, email: creator.email });
    } else if (creatorError) {
      console.error('❌ Database error finding creator:', { creatorEmail, error: creatorError });
      return { success: false, error: 'Database error finding creator' };
    } else {
      console.log('✅ Existing creator found:', { creatorId: creator.id, email: creator.email, status: creator.status });
    }

    // 3. Find or create email thread
    let { data: thread, error: threadError } = await (supabase as any)
      .from('ugc_email_threads')
      .select('*')
      .eq('brand_id', brand.id)
      .eq('creator_id', creator.id)
      .eq('thread_subject', normalizeSubject(emailData.subject))
      .single();

    if (threadError && threadError.code === 'PGRST116') {
      // Thread doesn't exist, create new one
      const { data: newThread, error: createThreadError } = await (supabase as any)
        .from('ugc_email_threads')
        .insert({
          brand_id: brand.id,
          creator_id: creator.id,
          thread_subject: normalizeSubject(emailData.subject),
          status: 'active',
        })
        .select()
        .single();

      if (createThreadError) {
        return { success: false, error: 'Failed to create thread' };
      }
      thread = newThread;
    } else if (threadError) {
      return { success: false, error: 'Database error finding thread' };
    }

    // 4. Store the incoming email message
    const { error: messageError } = await (supabase as any)
      .from('ugc_email_messages')
      .insert({
        thread_id: thread.id,
        from_email: creatorEmail,
        to_email: emailData.to,
        subject: emailData.subject,
        html_content: emailData.html || '',
        text_content: emailData.text || '',
        status: 'delivered',
        variables_used: {
          original_headers: emailData.headers,
          attachments: emailData.attachments,
          envelope: emailData.envelope,
        },
      });

    if (messageError) {
      return { success: false, error: 'Failed to store message' };
    }

    // 5. Update creator status based on email content
    const newStatus = analyzeEmailForStatus(emailData.text, emailData.subject);
    if (newStatus && newStatus !== creator.status) {
      await (supabase as any)
        .from('ugc_creators')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creator.id);
    }

    // 5.5. Send response to n8n AI agent if this is for a creator with active AI conversation
    if (creator.status === 'Approved for Next Steps' || creator.status === 'AI Conversation Active') {
      try {
        console.log('🤖 Sending creator response to n8n AI agent...');
        
        const responseWebhookUrl = process.env.NEXT_PUBLIC_N8N_CREATOR_APPROVED_RESPONSE || 
                                  'https://primary-production-f140.up.railway.app/webhook-test/7c0199be-6b31-4d1a-8b39-5e46947cb123';
        
        await fetch(responseWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brandId: brand.id,
            creatorId: creator.id,
            threadId: thread.id,
            responseData: {
              from: emailData.from,
              subject: emailData.subject,
              text: emailData.text,
              html: emailData.html,
              timestamp: new Date().toISOString()
            },
            brand: {
              id: brand.id,
              name: brand.name,
              email_identifier: brand.email_identifier
            },
            creator: {
              id: creator.id,
              name: creator.name,
              email: creator.email,
              status: creator.status
            }
          }),
        });
        
        console.log('✅ Successfully sent creator response to n8n AI agent');
      } catch (webhookError) {
        console.error('❌ Failed to send response to n8n webhook:', webhookError);
        // Don't fail the email processing if webhook fails
      }
    }

    // 6. Trigger AI analysis for this creator
    console.log('🤖 Triggering AI analysis for creator response...');
    
    try {
      const coordinator = new UgcAiCoordinatorService();
      const aiResult = await coordinator.processPipeline(brand.id);
      console.log('✅ AI analysis completed:', aiResult);
      
      return {
        success: true,
        threadId: thread.id,
        actionsTaken: aiResult.summary ? [aiResult.summary] : [],
      };
    } catch (aiError) {
      console.error('⚠️ AI analysis failed, but email was stored:', aiError);
      return {
        success: true,
        threadId: thread.id,
        actionsTaken: ['Email stored - AI analysis failed'],
      };
    }

  } catch (error) {
    console.error('❌ Error processing email response:', error);
    return { success: false, error: 'Internal processing error' };
  }
}

function extractEmailFromSender(fromField: string): string {
  // Extract email from "Name <email@domain.com>" format
  const emailMatch = fromField.match(/<([^>]+)>/);
  return emailMatch ? emailMatch[1] : fromField;
}

function extractNameFromSender(fromField: string): string {
  // Extract name from "Name <email@domain.com>" format
  const nameMatch = fromField.match(/^([^<]+)/);
  if (nameMatch) {
    return nameMatch[1].trim().replace(/"/g, '');
  }
  // Fallback to email username
  const email = extractEmailFromSender(fromField);
  return email.split('@')[0];
}

function normalizeSubject(subject: string): string {
  // Remove "Re:", "Fwd:", etc. and normalize for thread matching
  return subject
    .replace(/^(Re|RE|Fwd|FWD|Fw|FW):\s*/gi, '')
    .trim();
}

function analyzeEmailForStatus(text: string, subject: string): string | null {
  const content = (text + ' ' + subject).toLowerCase();
  
  // Status detection patterns
  if (content.includes('yes') || content.includes('interested') || content.includes('let\'s do it')) {
    return 'INTERESTED';
  }
  if (content.includes('no thanks') || content.includes('not interested') || content.includes('pass')) {
    return 'NOT_INTERESTED';
  }
  if (content.includes('question') || content.includes('clarification') || content.includes('?')) {
    return 'NEEDS_CLARIFICATION';
  }
  if (content.includes('schedule') || content.includes('calendar') || content.includes('call')) {
    return 'SCHEDULING';
  }
  if (content.includes('rates') || content.includes('price') || content.includes('fee') || content.includes('cost')) {
    return 'NEGOTIATING_RATES';
  }
  if (content.includes('script') || content.includes('brief') || content.includes('ready')) {
    return 'READY_FOR_SCRIPTS';
  }
  
  return 'EMAIL_RESPONSE'; // Generic response status
} 