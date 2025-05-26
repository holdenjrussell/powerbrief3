import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  // Create Supabase client
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { brandId, settings } = await request.json();

    if (!brandId || !settings) {
      return NextResponse.json({ 
        error: 'Missing required fields: brandId and settings' 
      }, { status: 400 });
    }

    // Update the brand's naming convention settings
    const { data, error } = await supabase
      .from('brands')
      .update({ naming_convention_settings: settings })
      .eq('id', brandId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating naming convention settings:', error);
      return NextResponse.json({ 
        error: 'Failed to update naming convention settings' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      settings: data.naming_convention_settings 
    });

  } catch (error: unknown) {
    console.error('Error in naming convention settings API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: `Failed to save naming convention settings: ${errorMessage}`
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Create Supabase client
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ 
        error: 'Missing required parameter: brandId' 
      }, { status: 400 });
    }

    // Get the brand's naming convention settings
    const { data, error } = await supabase
      .from('brands')
      .select('naming_convention_settings')
      .eq('id', brandId)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching naming convention settings:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch naming convention settings' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      settings: data.naming_convention_settings || {} 
    });

  } catch (error: unknown) {
    console.error('Error in naming convention settings API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: `Failed to fetch naming convention settings: ${errorMessage}`
    }, { status: 500 });
  }
} 