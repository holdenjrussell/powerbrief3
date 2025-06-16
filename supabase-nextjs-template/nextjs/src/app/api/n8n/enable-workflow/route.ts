import { NextRequest, NextResponse } from 'next/server';
import { n8nService } from '@/lib/services/n8nService';

export async function POST(request: NextRequest) {
  try {
    const { brandId, workflowName = 'creator_application_acknowledgment' } = await request.json();
    
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    // Enable the workflow for the brand
    await n8nService.toggleBrandWorkflow(brandId, workflowName, true);
    
    return NextResponse.json({ 
      success: true, 
      message: `Workflow ${workflowName} enabled for brand ${brandId}` 
    });
    
  } catch (error) {
    console.error('Error enabling workflow:', error);
    return NextResponse.json({ 
      error: 'Failed to enable workflow' 
    }, { status: 500 });
  }
} 