import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendUGCScriptRevisionSubmittedNotification } from '@/lib/services/ugcSlackService';

interface Params {
  scriptId: string;
}

export async function GET(
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
    
    // Get the script
    const { data, error } = await supabase
      .from('ugc_creator_scripts')
      .select('*')
      .eq('id', scriptId)
      .single();
    
    if (error) {
      console.error('Error fetching script:', error);
      return NextResponse.json({ error: 'Failed to fetch script' }, { status: 500 });
    }
    
    if (!data) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('General error in script fetch:', error);
    return NextResponse.json({
      error: 'An error occurred while fetching the script'
    }, { status: 500 });
  }
}

export async function DELETE(
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
    
    // Delete the script
    const { error } = await supabase
      .from('ugc_creator_scripts')
      .delete()
      .eq('id', scriptId);
    
    if (error) {
      console.error('Error deleting script:', error);
      return NextResponse.json({ error: 'Failed to delete script' }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Script deleted successfully' });
  } catch (error) {
    console.error('General error in script deletion:', error);
    return NextResponse.json({
      error: 'An error occurred while deleting the script'
    }, { status: 500 });
  }
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
    
    // Update the script with the provided fields
    const { data, error } = await supabase
      .from('ugc_creator_scripts')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', scriptId)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating script:', error);
      return NextResponse.json({ error: 'Failed to update script' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('General error in script update:', error);
    return NextResponse.json({
      error: 'An error occurred while updating the script'
    }, { status: 500 });
  }
}

export async function PUT(
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
    
    // Get the current script to check if it's a revision submission
    const { data: currentScript, error: fetchError } = await supabase
      .from('ugc_creator_scripts')
      .select('*, ugc_creators(*)')
      .eq('id', scriptId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching current script:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch script' }, { status: 500 });
    }
    
    // Check if this is a revision submission (status changing from REVISION_REQUESTED to PENDING_APPROVAL)
    const isRevisionSubmission = currentScript.status === 'REVISION_REQUESTED' && 
                                 body.status === 'PENDING_APPROVAL';
    
    // Update the script with the provided fields
    const { data, error } = await supabase
      .from('ugc_creator_scripts')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', scriptId)
      .select('*, ugc_creators(*)')
      .single();
    
    if (error) {
      console.error('Error updating script:', error);
      return NextResponse.json({ error: 'Failed to update script' }, { status: 500 });
    }
    
    // Send Slack notification if this is a revision submission
    if (isRevisionSubmission) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
        const publicShareLink = `${baseUrl}/public/ugc-script/${data.public_share_id}`;
        const reviewDashboardLink = `${baseUrl}/app/powerbrief/${data.brand_id}/ugc-pipeline`;
        const creatorName = data.ugc_creators?.name || 'TBD';
        
        await sendUGCScriptRevisionSubmittedNotification({
          brandId: data.brand_id,
          scriptId: data.id,
          scriptTitle: data.title,
          creatorName,
          revisionCount: data.revision_count || 1,
          publicShareLink,
          reviewDashboardLink
        });
      } catch (slackError) {
        console.error('Error sending Slack notification:', slackError);
        // Don't fail the update if Slack notification fails
      }
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('General error in script update:', error);
    return NextResponse.json({
      error: 'An error occurred while updating the script'
    }, { status: 500 });
  }
} 