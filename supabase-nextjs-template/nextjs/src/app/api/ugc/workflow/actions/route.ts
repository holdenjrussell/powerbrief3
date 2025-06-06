import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const ssrSupabase = await createSSRClient();
    const { data: { user }, error: authError } = await ssrSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerAdminClient();

    // Get available workflow actions
    const { data: actions, error } = await (supabase as any)
      .from('ugc_workflow_actions')
      .select('*')
      .eq('is_system', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching workflow actions:', error);
      return NextResponse.json({ error: 'Failed to fetch workflow actions' }, { status: 500 });
    }

    return NextResponse.json(actions || []);

  } catch (error) {
    console.error('Workflow actions API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 