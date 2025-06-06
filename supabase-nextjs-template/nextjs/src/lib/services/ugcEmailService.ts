import { createSPAClient } from '@/lib/supabase/client';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import sgMail from '@sendgrid/mail';
import { UgcCreator } from '@/lib/types/ugcCreator';
import { Brand } from '@/lib/types/powerbrief';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  triggerStatus?: string;
  pipelineStage: 'onboarding' | 'script_pipeline';
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailThread {
  id: string;
  creator_id: string;
  brand_id: string;
  thread_subject: string;
  status: 'active' | 'completed' | 'paused';
  is_primary: boolean;
  closed_at?: string;
  closed_by?: string;
  close_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailMessage {
  id: string;
  thread_id: string;
  message_id?: string; // SendGrid message ID
  from_email: string;
  to_email: string;
  subject: string;
  html_content: string;
  text_content: string;
  sent_at?: string;
  status: 'draft' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed';
  template_id?: string;
  variables_used?: Record<string, string | number>;
  deleted_at?: string;
  deleted_by?: string;
  created_at: string;
}

// Default email templates based on the SOP provided
export const DEFAULT_EMAIL_TEMPLATES: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>[] = [
  // ONBOARDING TEMPLATES
  {
    name: 'Cold Outreach Invite',
    subject: '🌿 The Grounding Co – Let\'s Collab!',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">🌿 The Grounding Co</h2>
        <p>Hey {{CREATOR_NAME}}!</p>
        <p>We came across your page and absolutely love your vibe — grounded, real, and perfectly aligned with The Grounding Co.</p>
        <p><strong>Want to collab on some upcoming briefs?</strong></p>
        <p>Let us know and we'll send over the details!</p>
        <br>
        <p>Best,<br>{{SENDER_NAME}}<br>The Grounding Co</p>
      </div>
    `,
    textContent: `Hey {{CREATOR_NAME}}!\n\nWe came across your page and absolutely love your vibe — grounded, real, and perfectly aligned with The Grounding Co.\n\nWant to collab on some upcoming briefs?\n\nLet us know and we'll send over the details!\n\nBest,\n{{SENDER_NAME}}\nThe Grounding Co`,
    variables: ['CREATOR_NAME', 'SENDER_NAME'],
    triggerStatus: 'Cold Outreach',
    pipelineStage: 'onboarding',
    enabled: true
  },
  {
    name: 'Rate Request',
    subject: 'UGC Brief - What\'s Your Rate?',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Hey {{CREATOR_NAME}}!</p>
        <p>Awesome! Here's the type of brief you'd be working on:</p>
        <p><a href="{{SAMPLE_BRIEF_LINK}}" target="_blank">Sample Brief</a></p>
        <p>We handle editing — just need your raw footage/audio.</p>
        <p><strong>What's your rate for 1 brief? For 3?</strong></p>
        <br>
        <p>Best,<br>{{SENDER_NAME}}<br>The Grounding Co</p>
      </div>
    `,
    textContent: `Hey {{CREATOR_NAME}}!\n\nAwesome! Here's the type of brief you'd be working on:\n\n{{SAMPLE_BRIEF_LINK}}\n\nWe handle editing — just need your raw footage/audio.\n\nWhat's your rate for 1 brief? For 3?\n\nBest,\n{{SENDER_NAME}}\nThe Grounding Co`,
    variables: ['CREATOR_NAME', 'SENDER_NAME', 'SAMPLE_BRIEF_LINK'],
    triggerStatus: 'Primary Screen',
    pipelineStage: 'onboarding',
    enabled: true
  },
  {
    name: 'Negotiation Follow-Up',
    subject: 'Re: UGC Brief Rates',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Hey {{CREATOR_NAME}}!</p>
        <p>Would you be open to a lower rate if we committed to 3 videos up front?</p>
        <p>We're in the early stage of testing multiple creators to build a proven roster, so our testing budget is limited to $150-200 per creator per video. We hope you understand.</p>
        <p>If you produce strong UGC ads, we'll shift to long-term work at your standard rate.</p>
        <br>
        <p>Best,<br>{{SENDER_NAME}}<br>The Grounding Co</p>
      </div>
    `,
    textContent: `Hey {{CREATOR_NAME}}!\n\nWould you be open to a lower rate if we committed to 3 videos up front?\n\nWe're in the early stage of testing multiple creators to build a proven roster, so our testing budget is limited to $150-200 per creator per video. We hope you understand.\n\nIf you produce strong UGC ads, we'll shift to long-term work at your standard rate.\n\nBest,\n{{SENDER_NAME}}\nThe Grounding Co`,
    variables: ['CREATOR_NAME', 'SENDER_NAME'],
    pipelineStage: 'onboarding',
    enabled: true
  },
  {
    name: 'Product Shipping Request',
    subject: 'Shipping Address for Product',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Hey {{CREATOR_NAME}}!</p>
        <p>Perfect — let's get started!</p>
        <p><strong>What's the best shipping address for your product?</strong></p>
        <p>We usually pay via {{PAYMENT_METHOD}} once everything is delivered. That work for you?</p>
        <br>
        <p>Best,<br>{{SENDER_NAME}}<br>The Grounding Co</p>
      </div>
    `,
    textContent: `Hey {{CREATOR_NAME}}!\n\nPerfect — let's get started!\n\nWhat's the best shipping address for your product?\n\nWe usually pay via {{PAYMENT_METHOD}} once everything is delivered. That work for you?\n\nBest,\n{{SENDER_NAME}}\nThe Grounding Co`,
    variables: ['CREATOR_NAME', 'SENDER_NAME', 'PAYMENT_METHOD'],
    triggerStatus: 'READY FOR SCRIPTS',
    pipelineStage: 'onboarding',
    enabled: true
  },

  // SCRIPT PIPELINE TEMPLATES
  {
    name: 'Script Assignment',
    subject: 'New UGC Script Assignment',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">New Script Assignment</h2>
        <p>Hey {{CREATOR_NAME}}!</p>
        <p>We have a new script ready for you:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Script:</strong> {{SCRIPT_TITLE}}</p>
          <p><strong>Fee:</strong> $\{{SCRIPT_FEE}}</p>
          <p><a href="{{PUBLIC_SHARE_LINK}}" target="_blank" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Script</a></p>
        </div>
        <p>Please review and let us know if you can take this on!</p>
        <p>To approve: <a href="{{APPROVE_LINK}}">Click here to approve</a></p>
        <p>To reject: <a href="{{REJECT_LINK}}">Click here to reject</a></p>
        <br>
        <p>Best,<br>{{SENDER_NAME}}<br>The Grounding Co</p>
      </div>
    `,
    textContent: `Hey {{CREATOR_NAME}}!\n\nWe have a new script ready for you:\n\nScript: {{SCRIPT_TITLE}}\nFee: $\{{SCRIPT_FEE}}\n\nView Script: {{PUBLIC_SHARE_LINK}}\n\nPlease review and let us know if you can take this on!\n\nTo approve: {{APPROVE_LINK}}\nTo reject: {{REJECT_LINK}}\n\nBest,\n{{SENDER_NAME}}\nThe Grounding Co`,
    variables: ['CREATOR_NAME', 'SENDER_NAME', 'SCRIPT_TITLE', 'SCRIPT_FEE', 'PUBLIC_SHARE_LINK', 'APPROVE_LINK', 'REJECT_LINK'],
    triggerStatus: 'Send Script to Creator',
    pipelineStage: 'script_pipeline',
    enabled: true
  },
  {
    name: 'Script Approved - Payment Info',
    subject: 'Script Approved - Payment Details Needed',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Great! Script Approved</h2>
        <p>Hey {{CREATOR_NAME}}!</p>
        <p>Thanks for approving the script: <strong>{{SCRIPT_TITLE}}</strong></p>
        <p>We need your payment details to send the deposit:</p>
        <ul>
          <li>Deposit Amount: $\{{DEPOSIT_AMOUNT}}</li>
          <li>Total Fee: $\{{TOTAL_FEE}}</li>
        </ul>
        <p><strong>Please provide:</strong></p>
        <ul>
          <li>PayPal email, OR</li>
          <li>ACH details (routing & account number)</li>
        </ul>
        <p>We'll send the deposit within 24 hours of receiving your payment info!</p>
        <br>
        <p>Best,<br>{{SENDER_NAME}}<br>The Grounding Co</p>
      </div>
    `,
    textContent: `Hey {{CREATOR_NAME}}!\n\nThanks for approving the script: {{SCRIPT_TITLE}}\n\nWe need your payment details to send the deposit:\n- Deposit Amount: $\{{DEPOSIT_AMOUNT}}\n- Total Fee: $\{{TOTAL_FEE}}\n\nPlease provide:\n- PayPal email, OR\n- ACH details (routing & account number)\n\nWe'll send the deposit within 24 hours of receiving your payment info!\n\nBest,\n{{SENDER_NAME}}\nThe Grounding Co`,
    variables: ['CREATOR_NAME', 'SENDER_NAME', 'SCRIPT_TITLE', 'DEPOSIT_AMOUNT', 'TOTAL_FEE'],
    pipelineStage: 'script_pipeline',
    enabled: true
  },
  {
    name: 'Product Not Shipped Warning',
    subject: 'Product Shipping Status Update Needed',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⚠️ Product Shipping Update</h2>
        <p>Hey {{CREATOR_NAME}}!</p>
        <p>We notice your product hasn't been shipped yet for the script: <strong>{{SCRIPT_TITLE}}</strong></p>
        <p>We want to make sure you have everything you need to create amazing content!</p>
        <p>Please confirm your shipping address is correct:</p>
        <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <p><strong>Current Address:</strong><br>{{SHIPPING_ADDRESS}}</p>
        </div>
        <p>If this needs updating, please reply with the correct address.</p>
        <br>
        <p>Best,<br>{{SENDER_NAME}}<br>The Grounding Co</p>
      </div>
    `,
    textContent: `Hey {{CREATOR_NAME}}!\n\nWe notice your product hasn't been shipped yet for the script: {{SCRIPT_TITLE}}\n\nWe want to make sure you have everything you need to create amazing content!\n\nPlease confirm your shipping address is correct:\n\nCurrent Address:\n{{SHIPPING_ADDRESS}}\n\nIf this needs updating, please reply with the correct address.\n\nBest,\n{{SENDER_NAME}}\nThe Grounding Co`,
    variables: ['CREATOR_NAME', 'SENDER_NAME', 'SCRIPT_TITLE', 'SHIPPING_ADDRESS'],
    pipelineStage: 'script_pipeline',
    enabled: true
  },
  {
    name: 'Contract Not Signed Reminder',
    subject: 'Contract Signature Required',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">📋 Contract Signature Needed</h2>
        <p>Hey {{CREATOR_NAME}}!</p>
        <p>We're excited to work with you on: <strong>{{SCRIPT_TITLE}}</strong></p>
        <p>Before we can proceed, we need your signature on the contract.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{{CONTRACT_LINK}}" target="_blank" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Sign Contract</a>
        </div>
        <p>This should only take a few minutes, and once it's signed we can move forward with everything else!</p>
        <br>
        <p>Best,<br>{{SENDER_NAME}}<br>The Grounding Co</p>
      </div>
    `,
    textContent: `Hey {{CREATOR_NAME}}!\n\nWe're excited to work with you on: {{SCRIPT_TITLE}}\n\nBefore we can proceed, we need your signature on the contract.\n\nSign Contract: {{CONTRACT_LINK}}\n\nThis should only take a few minutes, and once it's signed we can move forward with everything else!\n\nBest,\n{{SENDER_NAME}}\nThe Grounding Co`,
    variables: ['CREATOR_NAME', 'SENDER_NAME', 'SCRIPT_TITLE', 'CONTRACT_LINK'],
    pipelineStage: 'script_pipeline',
    enabled: true
  }
];

export class UgcEmailService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  // Get Supabase client (server-side)
  private async getSupabaseClient() {
    try {
      return await createServerAdminClient();
    } catch {
      // Fallback to SPA client if server client fails
      return createSPAClient();
    }
  }

  // Get or create primary email thread for creator-brand pair
  async getPrimaryEmailThread(
    creatorId: string,
    brandId: string,
    subject?: string
  ): Promise<{ threadId: string; isNew: boolean }> {
    const supabase = await this.getSupabaseClient();

    try {
      // Use the database function to get or create primary thread
      const { data, error } = await supabase.rpc('get_or_create_primary_email_thread', {
        p_creator_id: creatorId,
        p_brand_id: brandId,
        p_subject: subject || null
      });

      if (error) {
        console.error('Error getting primary thread:', error);
        throw new Error(`Failed to get primary thread: ${error.message}`);
      }

      // Check if this is a newly created thread by looking for recent creation
      const { data: threadData } = await supabase
        .from('ugc_email_threads')
        .select('created_at')
        .eq('id', data)
        .single();

      const isNew = threadData ? 
        (Date.now() - new Date(threadData.created_at).getTime()) < 1000 : 
        false;

      return { threadId: data, isNew };
    } catch (error) {
      console.error('Failed to get primary thread:', error);
      throw error;
    }
  }

  // Close email thread
  async closeEmailThread(
    threadId: string, 
    userId: string, 
    reason?: string
  ): Promise<boolean> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase.rpc('close_email_thread', {
        p_thread_id: threadId,
        p_user_id: userId,
        p_reason: reason || null
      });

      if (error) {
        console.error('Error closing thread:', error);
        throw new Error(`Failed to close thread: ${error.message}`);
      }

      return data === true;
    } catch (error) {
      console.error('Failed to close thread:', error);
      return false;
    }
  }

  // Soft delete email message
  async deleteEmailMessage(messageId: string, userId: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();

    try {
      const { data, error } = await supabase.rpc('delete_email_message', {
        p_message_id: messageId,
        p_user_id: userId
      });

      if (error) {
        console.error('Error deleting message:', error);
        throw new Error(`Failed to delete message: ${error.message}`);
      }

      return data === true;
    } catch (error) {
      console.error('Failed to delete message:', error);
      return false;
    }
  }

  // Get email template
  async getTemplate(templateId: string, brandId: string): Promise<EmailTemplate | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('ugc_email_templates')
      .select('*')
      .eq('id', templateId)
      .eq('brand_id', brandId)
      .eq('enabled', true)
      .single();

    if (error) {
      console.error('Error fetching template:', error);
      return null;
    }

    return data as EmailTemplate;
  }

  // Replace variables in content
  private replaceVariables(content: string, variables: Record<string, string | number>): string {
    let result = content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, String(value));
    });
    
    return result;
  }

  // Get creator and brand data
  private async getCreatorAndBrand(creatorId: string, brandId: string): Promise<{
    creator: UgcCreator;
    brand: Brand;
  }> {
    const supabase = await this.getSupabaseClient();

    const [creatorResult, brandResult] = await Promise.all([
      supabase
        .from('ugc_creators')
        .select('id, name, email, brand_id')
        .eq('id', creatorId)
        .single(),
      supabase
        .from('brands')
        .select('id, name, email_identifier')
        .eq('id', brandId)
        .single()
    ]);

    if (creatorResult.error) {
      throw new Error(`Creator not found: ${creatorResult.error.message}`);
    }

    if (brandResult.error) {
      throw new Error(`Brand not found: ${brandResult.error.message}`);
    }

    return {
      creator: creatorResult.data as UgcCreator,
      brand: brandResult.data as Brand
    };
  }

  // Main send email function with improved threading
  async sendEmail({
    templateId,
    creatorId,
    brandId,
    variables = {},
    customSubject,
    customContent,
    replyToThreadId
  }: {
    templateId?: string;
    creatorId: string;
    brandId: string;
    variables?: Record<string, string | number>;
    customSubject?: string;
    customContent?: { html: string; text: string };
    replyToThreadId?: string;
  }): Promise<{ 
    success: boolean; 
    messageId?: string; 
    error?: string; 
    threadId?: string;
  }> {
    try {
      const supabase = await this.getSupabaseClient();
      
      // Get creator and brand data
      const { creator, brand } = await this.getCreatorAndBrand(creatorId, brandId);

      if (!creator.email) {
        return { success: false, error: 'Creator email not available' };
      }

      if (!brand.email_identifier) {
        return { 
          success: false, 
          error: 'Brand email identifier not configured. Please set up email settings.' 
        };
      }

      // Prepare email content
      let subject: string;
      let htmlContent: string;
      let textContent: string;
      let templateUsed: string | undefined;

      if (customContent) {
        subject = customSubject || `Update from ${brand.name}`;
        htmlContent = customContent.html;
        textContent = customContent.text;
      } else if (templateId) {
        const template = await this.getTemplate(templateId, brandId);
        if (!template) {
          return { success: false, error: 'Template not found' };
        }

        templateUsed = template.id;
        
        // Enhance variables with brand and creator data
        const allVariables = {
          creator_name: creator.name,
          creator_email: creator.email,
          brand_name: brand.name,
          current_date: new Date().toLocaleDateString(),
          ...variables
        };

        subject = customSubject || this.replaceVariables(template.subject, allVariables);
        htmlContent = this.replaceVariables(template.htmlContent, allVariables);
        textContent = this.replaceVariables(template.textContent, allVariables);
      } else {
        return { success: false, error: 'No content or template provided' };
      }

      // Get or create email thread
      let threadId: string;
      
      if (replyToThreadId) {
        // Replying to specific thread
        threadId = replyToThreadId;
      } else {
        // Get primary thread for this creator-brand pair
        const threadResult = await this.getPrimaryEmailThread(creatorId, brandId, subject);
        threadId = threadResult.threadId;
      }

      // Generate email addresses
      const fromEmail = `${brand.email_identifier}@mail.powerbrief.ai`;
      const replyToEmail = fromEmail;

      // Send email with SendGrid
      const msg = {
        to: creator.email,
        from: {
          email: 'noreply@powerbrief.ai',
          name: brand.name
        },
        replyTo: {
          email: replyToEmail,
          name: `${brand.name} Creator Team`
        },
        subject,
        html: htmlContent,
        text: textContent,
        headers: {
          'X-Brand-ID': brandId,
          'X-Creator-ID': creatorId,
          'X-Thread-ID': threadId,
          'X-Brand-Identifier': brand.email_identifier
        }
      };

      if (!process.env.SENDGRID_API_KEY) {
        console.warn('SendGrid API key not configured - email would be sent in production');
        // Store as draft in development
        await supabase
          .from('ugc_email_messages')
          .insert({
            thread_id: threadId,
            from_email: fromEmail,
            to_email: creator.email,
            subject,
            html_content: htmlContent,
            text_content: textContent,
            status: 'draft',
            template_id: templateUsed,
            variables_used: variables,
          });

        return { 
          success: true, 
          messageId: 'dev-mode-' + Date.now(),
          threadId 
        };
      }

      const response = await sgMail.send(msg);
      const messageId = response[0].headers['x-message-id'];
      
      // Store the sent message
      await supabase
        .from('ugc_email_messages')
        .insert({
          thread_id: threadId,
          template_id: templateUsed,
          from_email: fromEmail,
          to_email: creator.email,
          subject,
          html_content: htmlContent,
          text_content: textContent,
          status: 'sent',
          sent_at: new Date().toISOString(),
          message_id: messageId,
          variables_used: variables,
        });

      console.log('✅ Email sent successfully:', {
        to: creator.email,
        subject,
        messageId,
        replyTo: replyToEmail,
        threadId,
      });

      return { 
        success: true, 
        messageId,
        threadId,
      };

    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Send workflow automation email using templates with variable substitution
  async sendWorkflowEmail({
    templateId,
    creatorId,
    brandId,
    variables = {},
    triggerEvent
  }: {
    templateId: string;
    creatorId: string;
    brandId: string;
    variables?: Record<string, string | number>;
    triggerEvent?: string;
  }): Promise<{ 
    success: boolean; 
    messageId?: string; 
    error?: string; 
    threadId?: string;
  }> {
    return this.sendEmail({
      templateId,
      creatorId,
      brandId,
      variables: {
        ...variables,
        trigger_event: triggerEvent || 'workflow_automation'
      }
    });
  }

  // Get all email threads for a creator
  async getCreatorEmailThreads(creatorId: string, brandId: string): Promise<EmailThread[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('ugc_email_threads')
      .select(`
        *,
        messages:ugc_email_messages!inner(*)
      `)
      .eq('creator_id', creatorId)
      .eq('brand_id', brandId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching creator threads:', error);
      return [];
    }

    return (data || []) as EmailThread[];
  }

  // Get thread messages with pagination
  async getThreadMessages(
    threadId: string, 
    includeDeleted = false,
    limit = 50,
    offset = 0
  ): Promise<EmailMessage[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('ugc_email_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching thread messages:', error);
      return [];
    }

    return (data || []) as EmailMessage[];
  }

  // Restore deleted message
  async restoreEmailMessage(messageId: string): Promise<boolean> {
    const supabase = await this.getSupabaseClient();

    try {
      const { error } = await supabase
        .from('ugc_email_messages')
        .update({ 
          deleted_at: null, 
          deleted_by: null 
        })
        .eq('id', messageId)
        .not('deleted_at', 'is', null);

      return !error;
    } catch (error) {
      console.error('Failed to restore message:', error);
      return false;
    }
  }

  // Get email analytics for a brand
  async getEmailAnalytics(brandId: string, days = 30): Promise<{
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    activeThreads: number;
    topTemplates: Array<{ templateId: string; name: string; count: number }>;
  }> {
    const supabase = await this.getSupabaseClient();
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    try {
      // Get message stats
      const { data: messageStats } = await supabase
        .from('ugc_email_messages')
        .select('status, template_id')
        .gte('created_at', sinceDate.toISOString())
        .in('thread_id', 
          supabase
            .from('ugc_email_threads')
            .select('id')
            .eq('brand_id', brandId)
        );

      const totalSent = messageStats?.filter(m => m.status === 'sent').length || 0;
      const totalDelivered = messageStats?.filter(m => m.status === 'delivered').length || 0;
      const totalOpened = messageStats?.filter(m => m.status === 'opened').length || 0;
      const totalClicked = messageStats?.filter(m => m.status === 'clicked').length || 0;

      // Get active threads count
      const { count: activeThreads } = await supabase
        .from('ugc_email_threads')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', brandId)
        .eq('status', 'active');

      // Get top templates
      const templateCounts = messageStats?.reduce((acc, msg) => {
        if (msg.template_id) {
          acc[msg.template_id] = (acc[msg.template_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      const { data: templates } = await supabase
        .from('ugc_email_templates')
        .select('id, name')
        .eq('brand_id', brandId)
        .in('id', Object.keys(templateCounts));

      const topTemplates = (templates || [])
        .map(t => ({
          templateId: t.id,
          name: t.name,
          count: templateCounts[t.id] || 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalSent,
        totalDelivered,
        totalOpened,
        totalClicked,
        activeThreads: activeThreads || 0,
        topTemplates
      };

    } catch (error) {
      console.error('Failed to get email analytics:', error);
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0,
        activeThreads: 0,
        topTemplates: []
      };
    }
  }
}

// Export singleton instance
export const ugcEmailService = new UgcEmailService(); 