import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { n8nService, N8nWebhookData } from '@/lib/services/n8nService';

/**
 * n8n Webhook Handler for PowerBrief UGC Pipeline
 * 
 * This endpoint receives webhook calls from n8n workflows and processes them
 * to update the UGC pipeline state in PowerBrief.
 */

interface N8nWebhookPayload {
  executionId: string;
  workflowId: string;
  stepName: string;
  status: 'success' | 'error' | 'waiting';
  data?: Record<string, unknown>;
  error?: string;
  creatorId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    const { brandId } = params;
    
    if (!brandId) {
      return NextResponse.json(
        { error: 'Brand ID is required' },
        { status: 400 }
      );
    }

    // Parse the webhook payload
    const payload: N8nWebhookPayload = await request.json();
    
    const {
      executionId,
      workflowId,
      stepName,
      status,
      data = {},
      error,
      creatorId
    } = payload;

    // Validate required fields
    if (!executionId || !workflowId || !stepName || !status) {
      return NextResponse.json(
        { error: 'Missing required fields in webhook payload' },
        { status: 400 }
      );
    }

    // Validate webhook signature/authentication if configured
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get brand automation settings to check webhook secret
    const { data: brandSettings } = await supabase
      .from('brand_automation_settings')
      .select('webhook_secret')
      .eq('brand_id', brandId)
      .single();

    if (brandSettings?.webhook_secret) {
      const signature = request.headers.get('x-n8n-signature');
      if (!signature || !(await verifyWebhookSignature(payload, signature, brandSettings.webhook_secret))) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    }

    // If no creator ID provided, try to extract from data
    let finalCreatorId = creatorId;
    if (!finalCreatorId && data.creator_id) {
      finalCreatorId = data.creator_id as string;
    }

    // Process the webhook through the n8n service
    const webhookData: N8nWebhookData = {
      executionId,
      workflowId,
      brandId,
      creatorId: finalCreatorId || '',
      stepName,
      status,
      data,
      error,
    };

    await n8nService.processWebhook(webhookData);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      executionId,
      brandId,
      stepName,
      status,
    });

  } catch (error) {
    console.error('Error processing n8n webhook:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests for webhook testing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  const { brandId } = params;
  
  return NextResponse.json({
    message: 'n8n webhook endpoint active',
    brandId,
    timestamp: new Date().toISOString(),
    url: request.url,
  });
}

/**
 * Verify webhook signature for security
 */
async function verifyWebhookSignature(
  payload: N8nWebhookPayload,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Simple HMAC verification - in production you might want more robust security
    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
} 