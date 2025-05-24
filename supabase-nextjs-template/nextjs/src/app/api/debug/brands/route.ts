import { NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSSRClient();
    
    const { data: brands, error } = await supabase
      .from('brands')
      .select('id, name, user_id, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching brands for debug:', error);
      return NextResponse.json(
        { error: 'Failed to fetch brands' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      brands: brands || []
    });

  } catch (error) {
    console.error('Error in debug brands API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 