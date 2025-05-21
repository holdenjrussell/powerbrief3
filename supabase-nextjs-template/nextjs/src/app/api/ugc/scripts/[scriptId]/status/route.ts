import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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
      .select('*')
      .eq('id', scriptId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching script data:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch script data' }, { status: 500 });
    }
    
    // Update the script status and any additional fields
    const updateData = {
      status: body.status,
      concept_status: body.concept_status,
      revision_notes: body.revision_notes,
      // Preserve the is_ai_generated flag
      is_ai_generated: currentScript.is_ai_generated,
      // Preserve the creative_strategist if it exists
      creative_strategist: body.creative_strategist || currentScript.creative_strategist,
      updated_at: new Date().toISOString()
    };
    
    // Only include fields that are provided
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );
    
    // Update the script
    const { data, error } = await supabase
      .from('ugc_creator_scripts')
      .update(updateData)
      .eq('id', scriptId)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error updating script status:', error);
      return NextResponse.json({ error: 'Failed to update script status' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('General error in script status update:', error);
    return NextResponse.json({
      error: 'An error occurred while updating the script status'
    }, { status: 500 });
  }
} 