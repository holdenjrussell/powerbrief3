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
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Get workflow templates for the brand
    const { data: workflows, error } = await supabase
      .from('ugc_workflow_templates')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workflows:', error);
      return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
    }

    return NextResponse.json(workflows || []);

  } catch (error) {
    console.error('Workflow templates API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const ssrSupabase = await createSSRClient();
    const { data: { user }, error: authError } = await ssrSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerAdminClient();
    const body = await request.json();
    const { name, description, category, trigger_event, brand_id } = body;

    if (!name || !category || !trigger_event || !brand_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, category, trigger_event, brand_id' 
      }, { status: 400 });
    }

    // Create workflow template
    const { data: workflow, error } = await supabase
      .from('ugc_workflow_templates')
      .insert({
        name,
        description,
        category,
        trigger_event,
        brand_id,
        user_id: user.id,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating workflow:', error);
      return NextResponse.json({ error: 'Failed to create workflow' }, { status: 500 });
    }

    return NextResponse.json(workflow);

  } catch (error) {
    console.error('Create workflow API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 