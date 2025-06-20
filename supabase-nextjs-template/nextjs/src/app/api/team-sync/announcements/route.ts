import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'brandId parameter is required' }, { status: 400 });
    }

    // First get the announcements
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Then get user emails for each announcement
    const announcementsWithEmails = await Promise.all(
      (announcements || []).map(async (announcement) => {
        let userEmail = 'Team Member'; // Default fallback
        
        if (announcement.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', announcement.user_id)
            .single();
          
          if (profile?.email) {
            userEmail = profile.email;
          }
        }
        
        return {
          ...announcement,
          profiles: { email: userEmail }
        };
      })
    );

    return NextResponse.json({ announcements: announcementsWithEmails });
  } catch (error) {
    console.error('Error in GET /api/team-sync/announcements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, priority = 'normal', brand_id } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    if (!brand_id) {
      return NextResponse.json({ error: 'brand_id is required' }, { status: 400 });
    }

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert({
        user_id: user.id,
        brand_id,
        title,
        content,
        priority
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Get the user's email for the response
    let userEmail = 'Team Member'; // Default fallback
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();
    
    if (profile?.email) {
      userEmail = profile.email;
    }

    const announcementWithEmail = {
      ...announcement,
      profiles: { email: userEmail }
    };

    return NextResponse.json({ announcement: announcementWithEmail });
  } catch (error) {
    console.error('Error creating announcement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, content, priority } = body;

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const updateData: {
      updated_at: string;
      title?: string;
      content?: string;
      priority?: string;
    } = { updated_at: new Date().toISOString() };
    
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (priority !== undefined) updateData.priority = priority;

    const { data: announcement, error } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Get the user's email for the response
    let userEmail = 'Team Member'; // Default fallback
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();
    
    if (profile?.email) {
      userEmail = profile.email;
    }

    const announcementWithEmail = {
      ...announcement,
      profiles: { email: userEmail }
    };

    return NextResponse.json({ announcement: announcementWithEmail });
  } catch (error) {
    console.error('Error updating announcement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 