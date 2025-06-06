import sgMail from '@sendgrid/mail';
import { createSSRClient } from '@/lib/supabase/server';
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
  emails: EmailMessage[];
  status: 'active' | 'completed' | 'paused';
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
    // Remove Supabase initialization from constructor
  }

  private async getSupabaseClient() {
    return await createSSRClient();
  }

  // Email validation - check if creator has email
  async validateCreatorEmail(creator: UgcCreator): Promise<{ valid: boolean; message: string }> {
    if (!creator.email || creator.email.trim() === '') {
      return {
        valid: false,
        message: 'Creator profile flagged: No email address'
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(creator.email)) {
      return {
        valid: false,
        message: 'Creator profile flagged: Invalid email format'
      };
    }

    return {
      valid: true,
      message: 'Email valid'
    };
  }

  // Get or create email thread for creator
  async getOrCreateEmailThread(
    creatorId: string,
    brandId: string,
    subject: string
  ): Promise<EmailThread> {
    const supabase = await this.getSupabaseClient();

    // Try to find existing active thread - using any until TS server refreshes
    const { data: existingThread } = await (supabase as any)
      .from('ugc_email_threads')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('brand_id', brandId)
      .eq('status', 'active')
      .single();

    if (existingThread) {
      return existingThread as EmailThread;
    }

    // Create new thread
    const { data: newThread, error } = await (supabase as any)
      .from('ugc_email_threads')
      .insert({
        creator_id: creatorId,
        brand_id: brandId,
        thread_subject: subject,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create email thread: ${error.message}`);
    }

    return newThread as EmailThread;
  }

  // Send email with template
  async sendTemplatedEmail({
    templateId,
    creatorId,
    brandId,
    variables = {},
    customSubject,
    customContent
  }: {
    templateId?: string;
    creatorId: string;
    brandId: string;
    variables?: Record<string, string | number>;
    customSubject?: string;
    customContent?: { html: string; text: string };
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const supabase = await this.getSupabaseClient();

      // Get creator and brand details
      const [creatorResult, brandResult] = await Promise.all([
        supabase.from('ugc_creators').select('*').eq('id', creatorId).single(),
        supabase.from('brands').select('*').eq('id', brandId).single()
      ]);

      if (creatorResult.error || brandResult.error) {
        throw new Error('Failed to fetch creator or brand details');
      }

      const creator: UgcCreator = {
        ...creatorResult.data,
        products: Array.isArray(creatorResult.data.products) 
          ? creatorResult.data.products as string[]
          : JSON.parse(creatorResult.data.products as string || '[]'),
        content_types: Array.isArray(creatorResult.data.content_types)
          ? creatorResult.data.content_types as string[]
          : JSON.parse(creatorResult.data.content_types as string || '[]'),
        platforms: Array.isArray(creatorResult.data.platforms)
          ? creatorResult.data.platforms as string[]
          : JSON.parse(creatorResult.data.platforms as string || '[]')
      };

      const brand: Brand = {
        ...brandResult.data,
        brand_info_data: typeof brandResult.data.brand_info_data === 'string' 
          ? JSON.parse(brandResult.data.brand_info_data) 
          : brandResult.data.brand_info_data || {},
        target_audience_data: typeof brandResult.data.target_audience_data === 'string'
          ? JSON.parse(brandResult.data.target_audience_data)
          : brandResult.data.target_audience_data || {},
        competition_data: typeof brandResult.data.competition_data === 'string'
          ? JSON.parse(brandResult.data.competition_data)
          : brandResult.data.competition_data || {},
        editing_resources: Array.isArray(brandResult.data.editing_resources)
          ? brandResult.data.editing_resources
          : JSON.parse(brandResult.data.editing_resources as string || '[]'),
        dos_and_donts: typeof brandResult.data.dos_and_donts === 'string'
          ? JSON.parse(brandResult.data.dos_and_donts)
          : brandResult.data.dos_and_donts || {},
        resource_logins: Array.isArray(brandResult.data.resource_logins)
          ? brandResult.data.resource_logins
          : JSON.parse(brandResult.data.resource_logins as string || '[]')
      };

      // Validate creator email
      const emailValidation = await this.validateCreatorEmail(creator);
      if (!emailValidation.valid) {
        return {
          success: false,
          error: emailValidation.message
        };
      }

      let emailSubject: string;
      let htmlContent: string;
      let textContent: string;

      if (customSubject && customContent) {
        // Use custom content
        emailSubject = customSubject;
        htmlContent = customContent.html;
        textContent = customContent.text;
      } else if (templateId) {
        // Get template - using any until TS server refreshes
        const { data: template, error: templateError } = await (supabase as any)
          .from('ugc_email_templates')
          .select('*')
          .eq('id', templateId)
          .single();

        if (templateError || !template) {
          throw new Error('Email template not found');
        }

        emailSubject = template.subject;
        htmlContent = template.html_content;
        textContent = template.text_content;
      } else {
        throw new Error('Either templateId or custom content must be provided');
      }

      // Replace variables in content
      const allVariables = {
        CREATOR_NAME: creator.name,
        CREATOR_EMAIL: creator.email,
        BRAND_NAME: brand.name,
        SENDER_NAME: 'The Grounding Co Team', // This could be configurable
        ...variables
      };

      // Replace variables in content
      for (const [key, value] of Object.entries(allVariables)) {
        const placeholder = `{{${key}}}`;
        emailSubject = emailSubject.replace(new RegExp(placeholder, 'g'), String(value));
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), String(value));
        textContent = textContent.replace(new RegExp(placeholder, 'g'), String(value));
      }

      // Send email via SendGrid
      const msg = {
        to: creator.email!,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL!,
          name: 'The Grounding Co'
        },
        subject: emailSubject,
        html: htmlContent,
        text: textContent
      };

      const sendResponse = await sgMail.send(msg);
      const messageId = sendResponse[0].headers['x-message-id'];

      // Get or create email thread
      const thread = await this.getOrCreateEmailThread(
        creatorId,
        brandId,
        emailSubject
      );

      // Store email record - using any until TS server refreshes
      await (supabase as any)
        .from('ugc_email_messages')
        .insert({
          thread_id: thread.id,
          message_id: messageId,
          from_email: process.env.SENDGRID_FROM_EMAIL!,
          to_email: creator.email!,
          subject: emailSubject,
          html_content: htmlContent,
          text_content: textContent,
          status: 'sent',
          template_id: templateId,
          variables_used: allVariables,
          sent_at: new Date().toISOString()
        });

      return {
        success: true,
        messageId
      };

    } catch (error) {
      console.error('Failed to send templated email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Trigger automation based on status change
  async triggerAutomation(
    creatorId: string,
    brandId: string,
    newStatus: string,
    pipelineStage: 'onboarding' | 'script_pipeline',
    additionalVariables: Record<string, string | number> = {}
  ): Promise<{ success: boolean; emailsSent: number; errors: string[] }> {
    try {
      const supabase = await this.getSupabaseClient();

      // Find templates that should trigger for this status - using any until TS server refreshes
      const { data: templates, error } = await (supabase as any)
        .from('ugc_email_templates')
        .select('*')
        .eq('trigger_status', newStatus)
        .eq('pipeline_stage', pipelineStage)
        .eq('enabled', true);

      if (error) {
        throw new Error(`Failed to fetch templates: ${error.message}`);
      }

      if (!templates || templates.length === 0) {
        return {
          success: true,
          emailsSent: 0,
          errors: []
        };
      }

      const results = [];
      const errors = [];

      for (const template of templates) {
        const result = await this.sendTemplatedEmail({
          templateId: template.id,
          creatorId,
          brandId,
          variables: additionalVariables
        });

        if (result.success) {
          results.push(result);
        } else {
          errors.push(`Template ${template.name}: ${result.error}`);
        }
      }

      return {
        success: errors.length === 0,
        emailsSent: results.length,
        errors
      };

    } catch (error) {
      console.error('Failed to trigger automation:', error);
      return {
        success: false,
        emailsSent: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  // Generate email approval/rejection links for scripts
  generateScriptActionLinks(scriptId: string, baseUrl: string) {
    const approveToken = Buffer.from(`approve:${scriptId}:${Date.now()}`).toString('base64');
    const rejectToken = Buffer.from(`reject:${scriptId}:${Date.now()}`).toString('base64');

    return {
      approveLink: `${baseUrl}/api/ugc/script-response?token=${approveToken}`,
      rejectLink: `${baseUrl}/api/ugc/script-response?token=${rejectToken}`
    };
  }

  // Update generateBrandReplyToAddress method to use email_identifier from database
  async generateBrandReplyToAddress(brandId: string): Promise<string> {
    const supabase = await this.getSupabaseClient();
    
    // Get brand's email identifier
    const { data: brand, error } = await supabase
      .from('brands')
      .select('email_identifier')
      .eq('id', brandId)
      .single();

    if (error || !brand?.email_identifier) {
      throw new Error(`Brand email identifier not found for brand ${brandId}. Please set up email identifier in brand settings.`);
    }
    
    return `${brand.email_identifier}@mail.powerbrief.ai`;
  }

  // Update sendEmail method to include proper reply-to
  async sendEmail({
    templateId,
    creatorId,
    brandId,
    variables = {},
    customSubject,
    customContent,
  }: {
    templateId?: string;
    creatorId: string;
    brandId: string;
    variables?: Record<string, string | number>;
    customSubject?: string;
    customContent?: { html: string; text: string };
  }): Promise<{ success: boolean; messageId?: string; error?: string; threadId?: string }> {
    try {
      const supabase = await this.getSupabaseClient();
      
      // Get creator and brand info
      const { data: creator } = await supabase
        .from('ugc_creators')
        .select('*')
        .eq('id', creatorId)
        .single();

      const { data: brand } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (!creator || !brand) {
        return { success: false, error: 'Creator or brand not found' };
      }

      if (!creator.email) {
        return { success: false, error: 'Creator email not available' };
      }

      // Generate brand-specific reply-to address
      const replyToAddress = await this.generateBrandReplyToAddress(brandId);

      let subject: string;
      let htmlContent: string;
      let textContent: string;
      let templateUsed: string | null = null;

      if (customContent) {
        subject = customSubject || 'Update from ' + brand.name;
        htmlContent = customContent.html;
        textContent = customContent.text;
      } else if (templateId) {
        const template = await this.getTemplate(templateId, brandId);
        if (!template) {
          return { success: false, error: 'Template not found' };
        }

        templateUsed = template.id;
        subject = customSubject || this.replaceVariables(template.subject, variables);
        htmlContent = this.replaceVariables(template.html_content, variables);
        textContent = this.replaceVariables(template.text_content, variables);
      } else {
        return { success: false, error: 'No content or template provided' };
      }

      // Create or find email thread
      let { data: thread } = await supabase
        .from('ugc_email_threads')
        .select('*')
        .eq('brand_id', brandId)
        .eq('creator_id', creatorId)
        .eq('thread_subject', subject)
        .single();

      if (!thread) {
        const { data: newThread } = await supabase
          .from('ugc_email_threads')
          .insert({
            brand_id: brandId,
            creator_id: creatorId,
            thread_subject: subject,
            status: 'active',
          })
          .select()
          .single();
        thread = newThread;
      }

      if (!thread) {
        return { success: false, error: 'Failed to create email thread' };
      }

      // Send email with brand-specific reply-to
      const msg = {
        to: creator.email,
        from: {
          email: 'noreply@powerbrief.ai',
          name: brand.name
        },
        replyTo: {
          email: replyToAddress,
          name: `${brand.name} Creator Team`
        },
        subject,
        html: htmlContent,
        text: textContent,
        headers: {
          'X-Brand-ID': brandId,
          'X-Creator-ID': creatorId,
          'X-Thread-ID': thread.id,
        }
      };

      const response = await sgMail.send(msg);
      
      // Store the sent message in the thread
      const { data: message } = await supabase
        .from('ugc_email_messages')
        .insert({
          thread_id: thread.id,
          template_id: templateUsed,
          from_email: 'noreply@powerbrief.ai',
          to_email: creator.email,
          subject,
          html_content: htmlContent,
          text_content: textContent,
          status: 'sent',
          sent_at: new Date().toISOString(),
          message_id: response[0].headers['x-message-id'],
          variables_used: variables,
        })
        .select()
        .single();

      console.log('✅ Email sent successfully:', {
        to: creator.email,
        subject,
        messageId: response[0].headers['x-message-id'],
        replyTo: replyToAddress,
        threadId: thread.id,
      });

      return { 
        success: true, 
        messageId: response[0].headers['x-message-id'],
        threadId: thread.id,
      };

    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Create a function to get the service instance when needed
export function getUgcEmailService(): UgcEmailService {
  return new UgcEmailService();
}

// For backward compatibility, export a lazy-loaded service
export const ugcEmailService = {
  validateCreatorEmail: (...args: Parameters<UgcEmailService['validateCreatorEmail']>) => 
    getUgcEmailService().validateCreatorEmail(...args),
  getOrCreateEmailThread: (...args: Parameters<UgcEmailService['getOrCreateEmailThread']>) => 
    getUgcEmailService().getOrCreateEmailThread(...args),
  sendTemplatedEmail: (...args: Parameters<UgcEmailService['sendTemplatedEmail']>) => 
    getUgcEmailService().sendTemplatedEmail(...args),
  triggerAutomation: (...args: Parameters<UgcEmailService['triggerAutomation']>) => 
    getUgcEmailService().triggerAutomation(...args),
  generateScriptActionLinks: (...args: Parameters<UgcEmailService['generateScriptActionLinks']>) => 
    getUgcEmailService().generateScriptActionLinks(...args),
  generateBrandReplyToAddress: (...args: Parameters<UgcEmailService['generateBrandReplyToAddress']>) => 
    getUgcEmailService().generateBrandReplyToAddress(...args),
  sendEmail: (...args: Parameters<UgcEmailService['sendEmail']>) => 
    getUgcEmailService().sendEmail(...args)
}; 