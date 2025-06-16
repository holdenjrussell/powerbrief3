import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { NextRequest, NextResponse } from 'next/server';
import { N8nService } from '@/lib/services/n8nService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      brandId, 
      templateName, 
      triggerData, 
      automationType 
    } = body;

    if (!brandId || !templateName || !triggerData) {
      return NextResponse.json(
        { error: 'Missing required fields: brandId, templateName, triggerData' },
        { status: 400 }
      );
    }

    const supabase = await createServerAdminClient();
    const n8nService = new N8nService();

    // Get the brand's active workflows for this template
    const { data: brandWorkflows, error: workflowError } = await supabase
      .from('brand_n8n_workflows')
      .select('workflow_id, active')
      .eq('brand_id', brandId)
      .eq('template_name', templateName)
      .eq('active', true);

    if (workflowError) {
      console.error('Error fetching brand workflows:', workflowError);
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 }
      );
    }

    if (!brandWorkflows || brandWorkflows.length === 0) {
      return NextResponse.json(
        { error: `No active workflow found for template: ${templateName}` },
        { status: 404 }
      );
    }

    const results = [];

    // Trigger each active workflow
    for (const workflow of brandWorkflows) {
      try {
        const executionResult = await n8nService.executeWorkflow(
          workflow.workflow_id,
          {
            ...triggerData,
            brand_id: brandId,
            automation_type: automationType || templateName,
            triggered_at: new Date().toISOString()
          }
        );

        results.push({
          workflowId: workflow.workflow_id,
          executionId: executionResult.id,
          status: 'triggered'
        });

        // Log the execution
        await supabase
          .from('n8n_execution_logs')
          .insert({
            brand_id: brandId,
            workflow_id: workflow.workflow_id,
            execution_id: executionResult.id,
            template_name: templateName,
            trigger_data: triggerData,
            status: 'running',
            started_at: new Date().toISOString()
          });

      } catch (error) {
        console.error(`Error executing workflow ${workflow.workflow_id}:`, error);
        results.push({
          workflowId: workflow.workflow_id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Triggered ${results.length} workflow(s)`,
      results
    });

  } catch (error) {
    console.error('Error triggering automation:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 