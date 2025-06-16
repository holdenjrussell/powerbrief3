/**
 * Creator Automation Service
 * 
 * Handles triggering n8n automations for creator lifecycle events
 */

import { createClient } from '@/utils/supabase/client';
import jwt from 'jsonwebtoken';

export interface CreatorAutomationTrigger {
  creatorId: string;
  brandId: string;
  automationType: 'creator_application_acknowledgment' | 'script_approval_notification' | 'contract_status_update';
  data: Record<string, unknown>;
}

export class CreatorAutomationService {
  private supabase = createClient();

  /**
   * Generate JWT token for webhook authentication
   */
  private generateWebhookToken(brandId: string): string {
    const secret = process.env.POWERBRIEF_JWT_SECRET;
    if (!secret) {
      throw new Error('POWERBRIEF_JWT_SECRET not configured');
    }

    return jwt.sign(
      { 
        brandId,
        iss: 'powerbrief',
        aud: 'n8n-webhook',
        exp: Math.floor(Date.now() / 1000) + (60 * 5) // 5 minutes expiry
      },
      secret
    );
  }

  /**
   * Trigger creator application acknowledgment automation
   */
  async triggerCreatorApplicationAcknowledgment(
    creatorId: string,
    brandId: string
  ): Promise<void> {
    // Get creator and brand details
    const { data: creator } = await this.supabase
      .from('ugc_creators')
      .select('name, email')
      .eq('id', creatorId)
      .single();

    const { data: brand } = await this.supabase
      .from('brands')
      .select('name, email_identifier')
      .eq('id', brandId)
      .single();

    if (!creator || !brand) {
      throw new Error('Creator or brand not found');
    }

    const webhookData = {
      creatorId,
      creatorName: creator.name,
      creatorEmail: creator.email,
      brandId,
      brandName: brand.name,
      brandEmail: `${brand.email_identifier}@mail.powerbrief.ai`,
    };

    await this.triggerAutomation('creator_application_acknowledgment', brandId, webhookData);
  }

  /**
   * Generic automation trigger with JWT authentication
   */
  private async triggerAutomation(
    automationType: string,
    brandId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // Get the webhook URL for this automation type
    const { data: workflow } = await this.supabase
      .from('brand_n8n_workflows')
      .select('webhook_url')
      .eq('brand_id', brandId)
      .eq('template_name', automationType)
      .eq('active', true)
      .single();

    if (!workflow?.webhook_url) {
      console.warn(`No active workflow found for ${automationType} on brand ${brandId}`);
      return;
    }

    // Generate JWT token
    const token = this.generateWebhookToken(brandId);

    // Trigger the n8n webhook
    const response = await fetch(workflow.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Automation trigger failed: ${response.statusText}`);
    }

    // Log the execution
    await this.logAutomationExecution(brandId, automationType, data, 'success');
  }

  /**
   * Log automation execution for monitoring
   */
  private async logAutomationExecution(
    brandId: string,
    automationType: string,
    data: Record<string, unknown>,
    status: 'success' | 'error',
    error?: string
  ): Promise<void> {
    await this.supabase
      .from('n8n_execution_logs')
      .insert({
        brand_id: brandId,
        workflow_name: automationType,
        execution_data: data,
        status,
        error_message: error,
      });
  }

  /**
   * Test webhook with JWT authentication
   */
  async testWebhook(
    webhookUrl: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const brandId = data.brandId as string;
    const token = this.generateWebhookToken(brandId);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook test failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log('Webhook test successful:', await response.text());
  }
} 