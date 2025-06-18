import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    console.log('[TestAuth] Starting authentication test...');
    
    console.log('[TestAuth] Creating Supabase client...');
    
    const supabase = createRouteHandlerClient({ cookies });
    console.log('[TestAuth] Supabase client created');
    
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('[TestAuth] Auth result:', { user: user?.id, error });
    
    if (error) {
      console.error('[TestAuth] Auth error:', error);
      return NextResponse.json({ 
        error: 'Authentication error', 
        details: error.message,
        authenticated: false 
      }, { status: 401 });
    }
    
    if (!user) {
      console.log('[TestAuth] No user found');
      return NextResponse.json({ 
        error: 'No user found', 
        authenticated: false 
      }, { status: 401 });
    }

    console.log('[TestAuth] User authenticated:', user.id);
    
    // Test a simple brands query
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name')
      .limit(5);
      
    console.log('[TestAuth] Brands query result:', { count: brands?.length, error: brandsError });

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      email: user.email,
      brandsCount: brands?.length || 0,
      brands: brands || [],
      brandsError: brandsError?.message || null
    });

  } catch (error) {
    console.error('[TestAuth] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      authenticated: false 
    }, { status: 500 });
  }
} 