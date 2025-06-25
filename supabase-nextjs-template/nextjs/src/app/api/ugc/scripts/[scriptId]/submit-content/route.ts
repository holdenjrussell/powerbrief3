import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendUGCContentSubmittedNotification } from '@/lib/services/ugcSlackService';

interface Params {
  scriptId: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { scriptId } = params;
    const body = await request.json();
    
    const { final_content_link } = body;
    
    if (!final_content_link) {
      return NextResponse.json({ error: 'Content link is required' }, { status: 400 });
    }
    
    // Create Supabase client (no auth required for public submission)
    const supabase = await createClient();
    
    // First, validate that the script exists and get creator info
    const { data: currentScript, error: fetchError } = await supabase
      .from('ugc_creator_scripts')
      .select('*, ugc_creators(*)')
      .eq('id', scriptId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching script data:', fetchError);
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }
    
    // Update the script with the content link and move to content approval
    const { data: updatedScript, error: updateError } = await supabase
      .from('ugc_creator_scripts')
      .update({
        final_content_link,
        status: 'CONTENT_SUBMITTED',
        concept_status: 'Content Approval',
        revision_notes: null, // Clear any previous revision notes
        updated_at: new Date().toISOString()
      })
      .eq('id', scriptId)
      .select('*, ugc_creators(*)')
      .single();
    
    if (updateError) {
      console.error('Error updating script with content:', updateError);
      return NextResponse.json({ error: 'Failed to submit content' }, { status: 500 });
    }
    
    // Send Slack notification for content submission
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const publicShareLink = `${baseUrl}/public/ugc-script/${updatedScript.public_share_id}`;
      const approvalDashboardLink = `${baseUrl}/app/powerbrief/${updatedScript.brand_id}/ugc-pipeline`;
      const creatorName = updatedScript.ugc_creators?.name || 'Unknown Creator';
      
      await sendUGCContentSubmittedNotification({
        brandId: updatedScript.brand_id,
        scriptId: updatedScript.id,
        scriptTitle: updatedScript.title,
        creatorName,
        contentLinks: [final_content_link],
        approvalDashboardLink,
        publicShareLink
      });
    } catch (slackError) {
      console.error('Error sending Slack notification:', slackError);
      // Don't fail the content submission if Slack notification fails
    }
    
    return NextResponse.json({ 
      message: 'Content submitted successfully',
      script: updatedScript 
    });
  } catch (error) {
    console.error('Error in content submission:', error);
    return NextResponse.json({
      error: 'An error occurred while submitting content'
    }, { status: 500 });
  }
} 