import { NextRequest, NextResponse } from 'next/server';
import { n8nService } from '@/lib/services/n8nService';

// POST - Test n8n webhook trigger
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { brandId, creatorId, workflowName } = body;

    if (!brandId || !creatorId || !workflowName) {
      return NextResponse.json({ 
        error: 'Missing required fields: brandId, creatorId, workflowName' 
      }, { status: 400 });
    }

    console.log('🚀 [TEST WEBHOOK] Testing n8n webhook trigger');
    console.log('📋 [TEST WEBHOOK] Parameters:', { brandId, creatorId, workflowName });

    // Test the workflow trigger
    await n8nService.triggerWorkflow(
      workflowName, 
      brandId, 
      creatorId, 
      {
        test: true,
        triggered_by: 'api_test',
        timestamp: new Date().toISOString()
      }
    );

    return NextResponse.json({ 
      success: true,
      message: `Successfully triggered workflow: ${workflowName}`,
      data: {
        brandId,
        creatorId,
        workflowName,
        webhookUrl: process.env.NEXT_PUBLIC_N8N_CREATOR_ACKNOWLEDGEMENT_WEBHOOK || 'https://primary-production-f140.up.railway.app/webhook/powerbrief-creator-acknowledgment',
        usingEnvironmentVariable: !!process.env.NEXT_PUBLIC_N8N_CREATOR_ACKNOWLEDGEMENT_WEBHOOK
      }
    });

  } catch (error) {
    console.error('❌ [TEST WEBHOOK] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }, { status: 500 });
  }
} 