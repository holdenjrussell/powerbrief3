import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { creatorId: string } }
) {
  try {
    const supabase = await createServerAdminClient();
    
    const { creatorId } = params;
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Get creator to verify it exists and belongs to the brand
    const { data: creator, error: creatorError } = await supabase
      .from('ugc_creators')
      .select('id, brand_id, name')
      .eq('id', creatorId)
      .eq('brand_id', brandId)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Fetch email threads with messages
    const { data: threads, error: threadsError } = await (supabase as any)
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
    const sortedThreads = (threads || []).map((thread: any) => ({
      ...thread,
      messages: (thread.messages || []).sort((a: any, b: any) => 
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