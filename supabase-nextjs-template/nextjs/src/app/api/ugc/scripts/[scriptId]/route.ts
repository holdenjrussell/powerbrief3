import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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