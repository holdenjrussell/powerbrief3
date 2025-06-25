import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  sendUGCScriptApprovedNotification,
  sendUGCScriptRevisionNotification,
  sendUGCScriptRevisionSubmittedNotification,
  sendUGCScriptResponseNotification,
  sendUGCContentRevisionNotification,
  sendUGCContentRevisionSubmittedNotification
} from '@/lib/services/ugcSlackService';

interface Params {
  scriptId: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Create Supabase client
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { scriptId } = params;
    const body = await request.json();
    
    // First, fetch the current script to preserve fields like is_ai_generated
    const { data: currentScript, error: fetchError } = await supabase
      .from('ugc_creator_scripts')
      .select('*, ugc_creators(*)')
      .eq('id', scriptId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching script data:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch script data' }, { status: 500 });
    }
    
    // Track revision counts for notifications
    let updateData: any = {
      status: body.status,
      concept_status: body.concept_status,
      revision_notes: body.revision_notes,
      // Preserve the is_ai_generated flag
      is_ai_generated: currentScript.is_ai_generated,
      // Preserve the creative_strategist if it exists
      creative_strategist: body.creative_strategist || currentScript.creative_strategist,
      updated_at: new Date().toISOString()
    };
    
    // Handle revision tracking for script revisions
    if (body.status === 'REVISION_REQUESTED' && currentScript.status !== 'REVISION_REQUESTED') {
      updateData.has_revisions = true;
      updateData.revision_count = (currentScript.revision_count || 0) + 1;
      updateData.last_revision_at = new Date().toISOString();
    }
    
    // Handle revision tracking for content revisions
    if (body.status === 'CONTENT_REVISION_REQUESTED' && currentScript.status !== 'CONTENT_REVISION_REQUESTED') {
      updateData.content_resubmitted = true;
      updateData.content_revision_count = (currentScript.content_revision_count || 0) + 1;
      updateData.last_content_revision_at = new Date().toISOString();
    }
    
    // Only include fields that are provided
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );
    
    // Update the script
    const { data, error } = await supabase
      .from('ugc_creator_scripts')
      .update(updateData)
      .eq('id', scriptId)
      .select('*, ugc_creators(*)')
      .single();
    
    if (error) {
      console.error('Error updating script status:', error);
      return NextResponse.json({ error: 'Failed to update script status' }, { status: 500 });
    }
    
    // Send Slack notifications based on status changes
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const publicShareLink = `${baseUrl}/public/ugc-script/${data.public_share_id}`;
      const dashboardLink = `${baseUrl}/app/powerbrief/${data.brand_id}/ugc-pipeline`;
      const scriptEditorLink = `${baseUrl}/app/powerbrief/${data.brand_id}/ugc-pipeline/scripts/${scriptId}/edit`;
      const creatorDashboardLink = `${baseUrl}/app/powerbrief/${data.brand_id}/ugc-pipeline/scripts/${scriptId}`;
      
      // Get available creators count for approved scripts
      let creatorCount = 0;
      if (body.status === 'APPROVED') {
        const { count } = await supabase
          .from('ugc_creators')
          .select('*', { count: 'exact', head: true })
          .eq('brand_id', data.brand_id)
          .eq('status', 'READY FOR SCRIPTS');
        creatorCount = count || 0;
      }
      
      // Script approved
      if (body.status === 'APPROVED' && currentScript.status !== 'APPROVED') {
        await sendUGCScriptApprovedNotification({
          brandId: data.brand_id,
          scriptId: data.id,
          scriptTitle: data.title,
          creatorCount,
          publicShareLink,
          dashboardLink
        });
      }
      
      // Script revision requested
      if (body.status === 'REVISION_REQUESTED' && currentScript.status !== 'REVISION_REQUESTED') {
        const creatorName = data.ugc_creators?.name || 'TBD';
        await sendUGCScriptRevisionNotification({
          brandId: data.brand_id,
          scriptId: data.id,
          scriptTitle: data.title,
          creatorName,
          feedback: body.revision_notes || 'No specific feedback provided',
          publicShareLink,
          scriptEditorLink
        });
      }
      
      // Script revision submitted (when status changes from REVISION_REQUESTED to PENDING_APPROVAL)
      if (body.status === 'PENDING_APPROVAL' && currentScript.status === 'REVISION_REQUESTED') {
        const creatorName = data.ugc_creators?.name || 'TBD';
        await sendUGCScriptRevisionSubmittedNotification({
          brandId: data.brand_id,
          scriptId: data.id,
          scriptTitle: data.title,
          creatorName,
          revisionCount: data.revision_count || 1,
          publicShareLink,
          reviewDashboardLink: dashboardLink
        });
      }
      
      // Creator approved script
      if (body.status === 'CREATOR_APPROVED' && currentScript.status !== 'CREATOR_APPROVED') {
        const creatorName = data.ugc_creators?.name || 'Unknown Creator';
        await sendUGCScriptResponseNotification({
          brandId: data.brand_id,
          scriptId: data.id,
          scriptTitle: data.title,
          creatorName,
          response: 'approved',
          publicShareLink,
          dashboardLink
        });
      }
      
      // Creator rejected script (reassignment)
      if (body.status === 'CREATOR_REASSIGNMENT' && currentScript.status !== 'CREATOR_REASSIGNMENT') {
        const creatorName = data.ugc_creators?.name || 'Unknown Creator';
        await sendUGCScriptResponseNotification({
          brandId: data.brand_id,
          scriptId: data.id,
          scriptTitle: data.title,
          creatorName,
          response: 'rejected',
          feedback: body.revision_notes,
          publicShareLink,
          dashboardLink
        });
      }
      
      // Content revision requested
      if (body.status === 'CONTENT_REVISION_REQUESTED' && currentScript.status !== 'CONTENT_REVISION_REQUESTED') {
        const creatorName = data.ugc_creators?.name || 'Unknown Creator';
        await sendUGCContentRevisionNotification({
          brandId: data.brand_id,
          scriptId: data.id,
          scriptTitle: data.title,
          creatorName,
          feedback: body.revision_notes || 'No specific feedback provided',
          publicShareLink,
          creatorDashboardLink
        });
      }
      
      // Content revision submitted (when content is resubmitted after revision)
      if (body.status === 'CONTENT_SUBMITTED' && currentScript.status === 'CONTENT_REVISION_REQUESTED') {
        const creatorName = data.ugc_creators?.name || 'Unknown Creator';
        const contentLinks = data.final_content_link ? [data.final_content_link] : [];
        await sendUGCContentRevisionSubmittedNotification({
          brandId: data.brand_id,
          scriptId: data.id,
          scriptTitle: data.title,
          creatorName,
          resubmissionCount: data.content_revision_count || 1,
          contentLinks,
          approvalDashboardLink: dashboardLink,
          publicShareLink
        });
      }
      
    } catch (slackError) {
      console.error('Error sending Slack notification:', slackError);
      // Don't fail the status update if Slack notification fails
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('General error in script status update:', error);
    return NextResponse.json({
      error: 'An error occurred while updating the script status'
    }, { status: 500 });
  }
} 