import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { n8nService } from '@/lib/services/n8nService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params;
    const { status, brandId } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    const supabase = await createServerAdminClient();

    console.log(`🔍 Attempting to update creator ${creatorId} status to "${status}" for brand ${brandId}`);

    // First check if creator exists
    const { data: existingCreator, error: fetchError } = await supabase
      .from('ugc_creators')
      .select('id, brand_id, status, name')
      .eq('id', creatorId)
      .single();

    if (fetchError) {
      console.error('Error finding creator:', fetchError);
      return NextResponse.json({ 
        error: 'Creator not found',
        details: fetchError
      }, { status: 404 });
    }

    console.log(`✅ Found creator: ${existingCreator.name} (current status: ${existingCreator.status})`);

    // Check if brand_id matches
    if (existingCreator.brand_id !== brandId) {
      console.error(`❌ Brand ID mismatch: creator belongs to ${existingCreator.brand_id}, requested ${brandId}`);
      return NextResponse.json({ 
        error: 'Creator does not belong to this brand' 
      }, { status: 403 });
    }

    // Update creator status
    const { data: updatedCreator, error: updateError } = await supabase
      .from('ugc_creators')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', creatorId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating creator status:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update creator status',
        details: updateError
      }, { status: 500 });
    }

    // Trigger n8n workflow if status is "Approved for Next Steps"
    if (status === 'Approved for Next Steps') {
      try {
        console.log(`🚀 Triggering AI agent workflow for creator ${creatorId} approved for next steps`);
        await n8nService.triggerCreatorApproved(
          brandId,
          creatorId,
          {
            previousStatus: updatedCreator.status,
            newStatus: status,
            triggeredBy: 'status_update',
          }
        );
        console.log(`✅ Successfully triggered AI agent workflow for creator ${creatorId}`);
      } catch (workflowError) {
        console.error('Error triggering n8n workflow:', workflowError);
        // Don't fail the status update if workflow fails
      }
    }

    return NextResponse.json({
      success: true,
      creator: updatedCreator,
      workflowTriggered: status === 'Approved for Next Steps'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 