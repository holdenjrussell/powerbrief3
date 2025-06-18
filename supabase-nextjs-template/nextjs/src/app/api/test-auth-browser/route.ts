import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('[TestAuthBrowser] Headers:', Object.fromEntries(request.headers.entries()));
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Try different approaches to get the user
    console.log('[TestAuthBrowser] Trying getUser()...');
    const { data: { user }, error } = await supabase.auth.getUser();
    
    console.log('[TestAuthBrowser] getUser result:', { 
      hasUser: !!user, 
      userId: user?.id, 
      email: user?.email,
      error: error?.message 
    });
    
    if (!user) {
      // Try getting session instead
      console.log('[TestAuthBrowser] Trying getSession()...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('[TestAuthBrowser] getSession result:', { 
        hasSession: !!session, 
        sessionUserId: session?.user?.id,
        sessionEmail: session?.user?.email,
        error: sessionError?.message 
      });
      
      return NextResponse.json({
        method: 'browser-test',
        userFromGetUser: user,
        sessionFromGetSession: session,
        userError: error?.message,
        sessionError: sessionError?.message,
        authenticated: !!session?.user
      });
    }

    return NextResponse.json({
      method: 'browser-test',
      authenticated: true,
      userId: user.id,
      email: user.email
    });

  } catch (error) {
    console.error('[TestAuthBrowser] Error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 