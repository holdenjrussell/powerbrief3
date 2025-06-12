import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/database.types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tool with brand access check
    const { data: tool, error } = await supabase
      .from('poweragent_tools')
      .select(`
        *,
        brands!inner(id, user_id)
      `)
      .eq('id', params.id)
      .eq('brands.user_id', user.id)
      .single();

    if (error || !tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    return NextResponse.json({ tool });
  } catch (error) {
    console.error('Tool GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, parameters, execute_code } = body;

    // Check if tool exists and user has access
    const { data: existingTool } = await supabase
      .from('poweragent_tools')
      .select(`
        *,
        brands!inner(id, user_id)
      `)
      .eq('id', params.id)
      .eq('brands.user_id', user.id)
      .single();

    if (!existingTool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // Update the tool
    const { data: tool, error } = await supabase
      .from('poweragent_tools')
      .update({
        name,
        description,
        parameters,
        execute_code,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tool:', error);
      return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
    }

    return NextResponse.json({ tool });
  } catch (error) {
    console.error('Tool PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if tool exists and user has access
    const { data: existingTool } = await supabase
      .from('poweragent_tools')
      .select(`
        *,
        brands!inner(id, user_id)
      `)
      .eq('id', params.id)
      .eq('brands.user_id', user.id)
      .single();

    if (!existingTool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    // Delete the tool
    const { error } = await supabase
      .from('poweragent_tools')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting tool:', error);
      return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Tool deleted successfully' });
  } catch (error) {
    console.error('Tool DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 