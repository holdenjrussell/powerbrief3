import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Toggle Automation API
 * 
 * Activates or deactivates an n8n workflow
 */

interface ToggleAutomationRequest {
  automationId: string;
  isActive: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: ToggleAutomationRequest = await request.json();
    const { automationId, isActive } = body;

    if (!automationId || isActive === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the automation and verify ownership (including shared access)
    const { data: automation, error: automationError } = await supabase
      .from('brand_n8n_workflows')
      .select(`
        *,
        brands!inner(id, user_id)
      `)
      .eq('id', automationId)
      .single();

    if (automationError || !automation) {
      return NextResponse.json(
        { error: 'Automation not found or unauthorized' },
        { status: 404 }
      );
    }

    // Toggle the workflow in n8n
    const { N8nService } = await import('@/lib/services/n8nService');
    const n8nService = new N8nService();
    await n8nService.toggleWorkflow(automation.n8n_workflow_id, isActive);

    // Update the database
    const { error: updateError } = await supabase
      .from('brand_n8n_workflows')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', automationId);

    if (updateError) {
      console.error('Error updating automation status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update automation status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Automation ${isActive ? 'activated' : 'deactivated'} successfully`,
      automation: {
        id: automation.id,
        template_name: automation.template_name,
        is_active: isActive,
      },
    });

  } catch (error) {
    console.error('Error toggling automation:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
} 