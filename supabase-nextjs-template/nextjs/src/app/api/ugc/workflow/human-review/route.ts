import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch human review items using the view
    const { data: reviewItems, error } = await supabase
      .from('ugc_human_review_queue')
      .select(`
        id,
        workflow_execution_id,
        step_id,
        creator_id,
        brand_id,
        assigned_to,
        priority,
        title,
        description,
        context,
        status,
        due_date,
        completed_at,
        completed_by,
        resolution_notes,
        created_at,
        updated_at
      `)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching human review items:', error);
      return NextResponse.json({ error: 'Failed to fetch human review items' }, { status: 500 });
    }

    // Fetch additional data for each review item
    const itemsWithDetails = await Promise.all(
      (reviewItems || []).map(async (item) => {
        // Get creator details
        const { data: creator } = await supabase
          .from('ugc_creators')
          .select('name, email')
          .eq('id', item.creator_id)
          .single();

        return {
          ...item,
          creator_name: creator?.name || 'Unknown Creator',
          creator_email: creator?.email || 'Unknown Email'
        };
      })
    );

    return NextResponse.json({ items: itemsWithDetails });
  } catch (error) {
    console.error('Error in human review API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}