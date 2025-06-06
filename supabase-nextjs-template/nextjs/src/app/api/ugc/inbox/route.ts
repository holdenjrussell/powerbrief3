import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Check if user has access to this brand (owner or shared)
    const { data: canAccess, error: brandError } = await supabase
      .rpc('can_user_edit_brand', { p_brand_id: brandId });

    if (brandError || !canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch email threads with latest message and creator details
    const { data: threads, error: threadsError } = await (supabase as any)
      .from('ugc_email_threads')
      .select(`
        *,
        creator:ugc_creators (name, email),
        messages:ugc_email_messages (
          id,
          from_email,
          text_content,
          created_at,
          status
        )
      `)
      .eq('brand_id', brandId)
      .order('updated_at', { ascending: false });

    if (threadsError) {
      console.error('Error fetching threads:', threadsError);
      return NextResponse.json({ error: 'Failed to fetch threads' }, { status: 500 });
    }

    // Process threads to get required format
    const formattedThreads = threads.map((thread: any) => {
      const lastMessage = thread.messages.length > 0
        ? thread.messages.reduce((latest: any, current: any) => 
            new Date(current.created_at) > new Date(latest.created_at) ? current : latest
          )
        : null;

      const unreadCount = thread.messages.filter((m: any) => 
        !m.from_email.includes('@mail.powerbrief.ai') &&
        m.status !== 'read'
      ).length;

      return {
        id: thread.id,
        creator_id: thread.creator_id,
        creator_name: thread.creator.name,
        creator_email: thread.creator.email,
        thread_subject: thread.thread_subject,
        status: thread.status,
        message_count: thread.messages.length,
        last_message_at: lastMessage ? lastMessage.created_at : thread.updated_at,
        last_message_from: lastMessage ? lastMessage.from_email : '',
        last_message_preview: lastMessage ? lastMessage.text_content.substring(0, 100) : '',
        unread_count: unreadCount,
      };
    });

    return NextResponse.json({
      success: true,
      threads: formattedThreads,
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 