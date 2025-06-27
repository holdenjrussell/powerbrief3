import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get the request body
    const body = await request.json();
    const { name, brand_info_data, target_audience_data, competition_data } = body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Brand name is required' },
        { status: 400 }
      );
    }
    
    // Create the brand with the authenticated user's ID
    const dbBrand = {
      id: uuidv4(),
      user_id: user.id, // Use the authenticated user's ID
      name: name.trim(),
      brand_info_data: brand_info_data || {},
      target_audience_data: target_audience_data || {},
      competition_data: competition_data || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Creating brand for user:', user.id);
    console.log('Brand data:', { name: dbBrand.name, user_id: dbBrand.user_id });
    
    const { data, error } = await supabase
      .from('brands')
      .insert(dbBrand)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating brand:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error in brand creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 