/**
 * n8n API Service for PowerBrief UGC Pipeline Integration
 * 
 * This service handles brand activation/deactivation of shared n8n workflows.
 * Workflows are manually created and brands can toggle their usage.
 */

import { createClient } from '@/utils/supabase/client';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  tags: string[];
  nodes: N8nNode[];
  connections: Record<string, unknown>;
  settings: {
    executionOrder: 'v0' | 'v1';
  };
  staticData: Record<string, unknown>;
  meta: {
    instanceId: string;
  };
  pinData: Record<string, unknown>;
  versionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, string>;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: 'manual' | 'trigger' | 'webhook';
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowData: N8nWorkflow;
  data?: Record<string, unknown>;
}

export interface N8nWebhookData {
  executionId: string;
  workflowId: string;
  brandId: string;
  creatorId: string;
  stepName: string;
  status: 'success' | 'error' | 'waiting';
  data: Record<string, unknown>;
  error?: string;
}

export interface BrandWorkflowConfig {
  id: string;
  brand_id: string;
  workflow_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class N8nService {
  private baseUrl: string;
  private apiKey: string;
  private supabase = createClient();
  
  // Configurable webhook URLs for shared workflows
  private readonly WEBHOOK_URL: string;
  private readonly CREATOR_APPROVED_WEBHOOK_URL: string;

  constructor() {
    // Auto-detect n8n URL - check for Railway URL first, then fallback to localhost
    this.baseUrl = process.env.N8N_URL || 
                   process.env.RAILWAY_N8N_URL || 
                   'http://localhost:5678';
    
    this.apiKey = process.env.N8N_API_KEY || '';
    
    // Set webhook URLs from environment variables with fallbacks
    this.WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_CREATOR_ACKNOWLEDGEMENT_WEBHOOK || 
                       'https://primary-production-f140.up.railway.app/webhook/powerbrief-creator-acknowledgment';
    
    this.CREATOR_APPROVED_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_CREATOR_APPROVED || 
                                        'https://primary-production-f140.up.railway.app/webhook-test/867ac9d6-87ac-4c91-b8d5-4ff8a73111b1';
    
    if (!this.apiKey) {
      console.warn('N8N_API_KEY not found in environment variables');
    }
    
    if (!process.env.NEXT_PUBLIC_N8N_CREATOR_ACKNOWLEDGEMENT_WEBHOOK) {
      console.warn('NEXT_PUBLIC_N8N_CREATOR_ACKNOWLEDGEMENT_WEBHOOK not found, using default Railway URL');
    }
    
    if (!process.env.NEXT_PUBLIC_N8N_CREATOR_APPROVED) {
      console.warn('NEXT_PUBLIC_N8N_CREATOR_APPROVED not found, using default test URL');
    }
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': this.apiKey,
    };
  }

  /**
   * Get all available shared workflows
   */
  async getAvailableWorkflows(): Promise<N8nWorkflow[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflows');
    }

    const result = await response.json();
    const workflows = result.data || [];
    
    // Filter to only PowerBrief workflows
    return workflows.filter((w: N8nWorkflow) => 
      w.name.startsWith('PowerBrief-') || 
      w.tags.some(tag => tag.includes('powerbrief'))
    );
  }

  /**
   * Get brand's workflow configuration
   */
  async getBrandWorkflowConfig(brandId: string): Promise<BrandWorkflowConfig[]> {
    const { data, error } = await this.supabase
      .from('brand_n8n_workflows')
      .select('*')
      .eq('brand_id', brandId);

    if (error) {
      console.error('Failed to fetch brand workflow config:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Toggle workflow activation for a brand
   */
  async toggleBrandWorkflow(
    brandId: string, 
    workflowName: string, 
    isActive: boolean
  ): Promise<void> {
    const { error } = await this.supabase
      .from('brand_n8n_workflows')
      .upsert({
        brand_id: brandId,
        workflow_name: workflowName,
        n8n_workflow_id: `shared-${workflowName}-workflow`, // Shared workflow approach
        is_active: isActive,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'brand_id,workflow_name'
      });

    if (error) {
      throw new Error(`Failed to toggle workflow: ${error.message}`);
    }
  }

  /**
   * Check if a brand has a specific workflow enabled
   */
  async isBrandWorkflowEnabled(brandId: string, workflowName: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('brand_n8n_workflows')
      .select('is_active')
      .eq('brand_id', brandId)
      .eq('workflow_name', workflowName)
      .single();

    if (error || !data) {
      console.log(`🔍 Workflow ${workflowName} not found for brand ${brandId} - defaulting to disabled`);
      return false; // Default to disabled if not configured
    }

    return data.is_active || false;
  }

  /**
   * Get the appropriate webhook URL for a workflow
   */
  private getWebhookUrlForWorkflow(workflowName: string): string {
    switch (workflowName) {
      case 'creator_application_acknowledgment':
        return this.WEBHOOK_URL;
      case 'creator_approved_for_next_steps':
        return this.CREATOR_APPROVED_WEBHOOK_URL;
      default:
        return this.WEBHOOK_URL; // Default fallback
    }
  }

  /**
   * Trigger a shared workflow with brand-specific data
   */
  async triggerWorkflow(
    workflowName: string,
    brandId: string,
    creatorId: string,
    additionalData: Record<string, unknown> = {}
  ): Promise<void> {
    console.log(`🔍 Checking if workflow ${workflowName} is enabled for brand ${brandId}`);
    
    // Check if brand has this workflow enabled
    const isEnabled = await this.isBrandWorkflowEnabled(brandId, workflowName);
    if (!isEnabled) {
      console.log(`❌ Workflow ${workflowName} is disabled for brand ${brandId}`);
      return;
    }

    console.log(`✅ Workflow ${workflowName} is enabled for brand ${brandId}`);

    // Get brand information for the webhook payload
    console.log(`📋 Fetching brand and creator information...`);
    const brandInfo = await this.getBrandInfo(brandId);
    const creatorInfo = await this.getCreatorInfo(creatorId, brandId);

    // Prepare webhook payload with all brand and creator information
    const webhookPayload = {
      brandId,
      creatorId,
      workflowName,
      brand: brandInfo,
      creator: creatorInfo,
      ...additionalData,
      timestamp: new Date().toISOString(),
    };

    // Get the appropriate webhook URL for this workflow
    const webhookUrl = this.getWebhookUrlForWorkflow(workflowName);
    console.log(`🚀 Triggering n8n webhook: ${webhookUrl}`);

    // Send webhook to shared n8n instance
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.error(`❌ Webhook failed with status ${response.status}: ${responseText}`);
        throw new Error(`Webhook failed with status: ${response.status}`);
      }

      console.log(`✅ Successfully triggered workflow ${workflowName} for brand ${brandId} via ${webhookUrl}`);
    } catch (error) {
      console.error(`❌ Failed to trigger workflow ${workflowName}:`, error);
      throw error;
    }
  }

  /**
   * Get brand information for webhook payload
   */
  private async getBrandInfo(brandId: string): Promise<Record<string, unknown>> {
    try {
      // Use server admin client for better permissions with shared brands
      const supabaseAdmin = await createServerAdminClient();
      const { data: brand, error } = await supabaseAdmin
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (error || !brand) {
        console.error(`Failed to fetch brand info for ${brandId}:`, error);
        return {
          id: brandId,
          name: 'Unknown Brand',
          email_identifier: null,
        };
      }

      console.log(`✅ Successfully fetched brand info: ${brand.name}`);

      // Include email configuration
      const emailConfig = await this.getBrandEmailConfig(brandId);

      return {
        ...brand,
        emailConfig,
      };
    } catch (error) {
      console.error('Error fetching brand info:', error);
      return {
        id: brandId,
        name: 'Unknown Brand',
        email_identifier: null,
      };
    }
  }

  /**
   * Get creator information for webhook payload
   */
  private async getCreatorInfo(creatorId: string, brandId: string): Promise<Record<string, unknown>> {
    try {
      // Use server admin client for better permissions with shared brands
      const supabaseAdmin = await createServerAdminClient();
      const { data: creator, error } = await supabaseAdmin
        .from('ugc_creators')
        .select('*')
        .eq('id', creatorId)
        .eq('brand_id', brandId)
        .single();

      if (error || !creator) {
        console.error(`Failed to fetch creator info for ${creatorId}:`, error);
        return {
          id: creatorId,
          name: 'Unknown Creator',
          email: null,
        };
      }

      console.log(`✅ Successfully fetched creator info: ${creator.name} (${creator.email})`);
      return creator;
    } catch (error) {
      console.error('Error fetching creator info:', error);
      return {
        id: creatorId,
        name: 'Unknown Creator',
        email: null,
      };
    }
  }

  /**
   * Process webhook data from n8n executions
   */
  async processWebhook(webhookData: N8nWebhookData): Promise<void> {
    const { brandId, creatorId, stepName, status, error } = webhookData;

    // Update UGC creator status based on workflow step
    if (status === 'success') {
      await this.updateCreatorFromWorkflow(creatorId, brandId, stepName);
    } else if (status === 'error') {
      await this.logWorkflowError(brandId, creatorId, stepName, error || 'Unknown error');
    }

    // Log execution in database
    await this.logWorkflowExecution(webhookData);
  }

  /**
   * Update creator status based on workflow completion
   */
  private async updateCreatorFromWorkflow(
    creatorId: string,
    brandId: string,
    stepName: string
  ): Promise<void> {
    // Map workflow steps to creator status updates
    const statusMap: Record<string, string> = {
      'creator_application_acknowledgment': 'Application Received',
      'onboarding_complete': 'Active',
      'contract_sent': 'contract sent',
      'contract_signed': 'contract signed',
      'script_assigned': 'script assigned',
      'content_submitted': 'content submitted',
    };

    const newStatus = statusMap[stepName];
    if (newStatus) {
      const { error } = await this.supabase
        .from('ugc_creators')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', creatorId)
        .eq('brand_id', brandId);

      if (error) {
        console.error('Failed to update creator status:', error);
      }
    }
  }

  /**
   * Log workflow execution for monitoring
   */
  private async logWorkflowExecution(webhookData: N8nWebhookData): Promise<void> {
    const { error } = await this.supabase
      .from('n8n_execution_logs')
      .insert({
        execution_id: webhookData.executionId,
        workflow_id: webhookData.workflowId,
        brand_id: webhookData.brandId,
        creator_id: webhookData.creatorId,
        step_name: webhookData.stepName,
        status: webhookData.status,
        data: webhookData.data,
        error_message: webhookData.error,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to log workflow execution:', error);
    }
  }

  /**
   * Log workflow errors for debugging
   */
  private async logWorkflowError(
    brandId: string,
    creatorId: string,
    stepName: string,
    error: string
  ): Promise<void> {
    console.error(`Workflow error for brand ${brandId}, creator ${creatorId}:`, {
      stepName,
      error,
    });
  }

  /**
   * Get brand email configuration for SendGrid integration
   */
  private async getBrandEmailConfig(brandId: string): Promise<Record<string, string>> {
    try {
      const { data: brand, error } = await this.supabase
        .from('brands')
        .select('name, email_identifier')
        .eq('id', brandId)
        .single();

      if (error || !brand) {
        console.warn(`Failed to fetch brand email config for ${brandId}:`, error);
        return {
          brandName: 'Your Brand',
          fromEmail: 'noreply@powerbrief.ai',
          replyToEmail: 'support@powerbrief.ai',
        };
      }

      const fromEmail = 'noreply@powerbrief.ai'; // Always use verified sender
      const replyToEmail = brand.email_identifier 
        ? `${brand.email_identifier}@mail.powerbrief.ai`
        : fromEmail;

      return {
        brandName: brand.name || 'Your Brand',
        fromEmail,
        replyToEmail,
      };
    } catch (error) {
      console.error('Error fetching brand email config:', error);
      return {
        brandName: 'Your Brand',
        fromEmail: 'noreply@powerbrief.ai',
        replyToEmail: 'support@powerbrief.ai',
      };
    }
  }

  /**
   * Convenience method to trigger creator acknowledgment workflow
   */
  async triggerCreatorAcknowledgment(
    brandId: string, 
    creatorId: string, 
    applicationData: Record<string, unknown> = {}
  ): Promise<void> {
    await this.triggerWorkflow(
      'creator_application_acknowledgment',
      brandId,
      creatorId,
      {
        stepName: 'creator_application_acknowledgment',
        ...applicationData,
      }
    );
  }

  /**
   * Convenience method to trigger creator approved workflow
   */
  async triggerCreatorApproved(
    brandId: string, 
    creatorId: string, 
    approvalData: Record<string, unknown> = {}
  ): Promise<void> {
    await this.triggerWorkflow(
      'creator_approved_for_next_steps',
      brandId,
      creatorId,
      {
        stepName: 'creator_approved_for_next_steps',
        ...approvalData,
      }
    );
  }

  /**
   * Trigger a shared workflow with brand-specific data (with pre-loaded creator data)
   */
  async triggerWorkflowWithCreatorData(
    workflowName: string,
    brandId: string,
    creatorId: string,
    creatorData: Record<string, unknown>,
    additionalData: Record<string, unknown> = {}
  ): Promise<void> {
    // Check if brand has this workflow enabled
    const isEnabled = await this.isBrandWorkflowEnabled(brandId, workflowName);
    if (!isEnabled) {
      console.log(`Workflow ${workflowName} is disabled for brand ${brandId}`);
      return;
    }

    // Get brand information for the webhook payload
    const brandInfo = await this.getBrandInfo(brandId);

    // Prepare webhook payload with all brand and creator information
    const webhookPayload = {
      brandId,
      creatorId,
      workflowName,
      brand: brandInfo,
      creator: {
        id: creatorId,
        ...creatorData,
      },
      ...additionalData,
      timestamp: new Date().toISOString(),
    };

    // Send webhook to shared n8n instance
    try {
      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`);
      }

      console.log(`Successfully triggered workflow ${workflowName} for brand ${brandId}`);
    } catch (error) {
      console.error(`Failed to trigger workflow ${workflowName}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const n8nService = new N8nService(); 