import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  try {
    const supabase = createClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { creatorId } = params;

    // Get creator to verify access
    const { data: creator, error: creatorError } = await supabase
      .from('ugc_creators')
      .select('brand_id')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Check if user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', creator.brand_id)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch email threads with messages
    const { data: threads, error: threadsError } = await supabase
      .from('ugc_email_threads')
      .select(`
        *,
        messages:ugc_email_messages(*)
      `)
      .eq('creator_id', creatorId)
      .order('updated_at', { ascending: false });

    if (threadsError) {
      console.error('Error fetching threads:', threadsError);
      return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 });
    }

    // Sort messages within each thread by creation date
    const sortedThreads = threads.map(thread => ({
      ...thread,
      messages: thread.messages.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
    }));

    return NextResponse.json({
      success: true,
      threads: sortedThreads,
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 