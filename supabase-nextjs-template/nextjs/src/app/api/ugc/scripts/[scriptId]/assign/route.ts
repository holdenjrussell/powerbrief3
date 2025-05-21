import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface Params {
  scriptId: string;
}

export async function POST(
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
    
    // Get the script to validate
    const { data: script, error: scriptError } = await supabase
      .from('ugc_creator_scripts')
      .select('*')
      .eq('id', scriptId)
      .single();
    
    if (scriptError) {
      console.error('Error fetching script:', scriptError);
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }
    
    // Update the script with creator assignment
    const { creatorIds, status, concept_status } = body;
    
    if (!creatorIds || !creatorIds.length) {
      return NextResponse.json({ error: 'Creator IDs are required' }, { status: 400 });
    }
    
    // For now, we'll use the first creator ID (future: could create multiple copies for multiple creators)
    const creatorId = creatorIds[0];
    
    // Update the script
    const updateData = {
      creator_id: creatorId,
      status: status || 'SCRIPT_ASSIGNED',
      concept_status: concept_status || 'Send Script to Creator',
      is_ai_generated: script.is_ai_generated,
      creative_strategist: script.creative_strategist,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('ugc_creator_scripts')
      .update(updateData)
      .eq('id', scriptId)
      .select('*')
      .single();
    
    if (error) {
      console.error('Error assigning script to creator:', error);
      return NextResponse.json({ error: 'Failed to assign script to creator' }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('General error in script assignment:', error);
    return NextResponse.json({
      error: 'An error occurred while assigning the script'
    }, { status: 500 });
  }
} 