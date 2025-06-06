import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { NextRequest, NextResponse } from 'next/server';

interface EmailMessage {
  id: string;
  from_email: string;
  text_content: string;
  created_at: string;
  status: string;
}

interface EmailThread {
  id: string;
  creator_id: string;
  brand_id: string;
  thread_subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  creator: {
    name: string;
    email: string;
  } | null;
  messages: EmailMessage[];
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerAdminClient();
    
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Fetch email threads with latest message and creator details
    const { data: threadsData, error: threadsError } = await (supabase as any)
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
    const threads = threadsData as EmailThread[] || [];
    const formattedThreads = threads.map((thread: EmailThread) => {
      const lastMessage = thread.messages.length > 0
        ? thread.messages.reduce((latest: EmailMessage, current: EmailMessage) => 
            new Date(current.created_at) > new Date(latest.created_at) ? current : latest
          )
        : null;

      const unreadCount = thread.messages.filter((m: EmailMessage) => 
        !m.from_email.includes('@mail.powerbrief.ai') &&
        m.status !== 'read'
      ).length;

      return {
        id: thread.id,
        creator_id: thread.creator_id,
        creator_name: thread.creator?.name || 'Unknown Creator',
        creator_email: thread.creator?.email || '',
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