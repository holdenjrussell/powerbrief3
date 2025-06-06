import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    // Use SSR client for user authentication
    const supabaseSSR = await createSSRClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabaseSSR.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brandId } = params;

    // Use admin client for database operations
    const supabase = await createServerAdminClient();
    
    // Check if user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('email_identifier')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      emailIdentifier: brand.email_identifier,
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  try {
    // Use SSR client for user authentication
    const supabaseSSR = await createSSRClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabaseSSR.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { brandId } = params;
    const { emailIdentifier } = await request.json();

    // Validate email identifier
    if (!emailIdentifier || typeof emailIdentifier !== 'string') {
      return NextResponse.json({ error: 'Email identifier is required' }, { status: 400 });
    }

    const cleanIdentifier = emailIdentifier.toLowerCase().trim();
    
    // Validate format
    if (!/^[a-z0-9-]+$/.test(cleanIdentifier)) {
      return NextResponse.json({ 
        error: 'Email identifier can only contain lowercase letters, numbers, and hyphens' 
      }, { status: 400 });
    }

    if (cleanIdentifier.length < 3 || cleanIdentifier.length > 50) {
      return NextResponse.json({ 
        error: 'Email identifier must be between 3 and 50 characters' 
      }, { status: 400 });
    }

    if (cleanIdentifier.startsWith('-') || cleanIdentifier.endsWith('-')) {
      return NextResponse.json({ 
        error: 'Email identifier cannot start or end with hyphen' 
      }, { status: 400 });
    }

    // Use admin client for database operations
    const supabase = await createServerAdminClient();

    // Check if user has access to this brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, email_identifier')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 404 });
    }

    // Check if identifier is already taken (by another brand)
    if (cleanIdentifier !== brand.email_identifier) {
      const { data: existingBrand, error: checkError } = await supabase
        .from('brands')
        .select('id')
        .eq('email_identifier', cleanIdentifier)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingBrand) {
        return NextResponse.json({ 
          error: 'This email identifier is already taken' 
        }, { status: 409 });
      }
    }

    // Update brand with new email identifier
    const { error: updateError } = await supabase
      .from('brands')
      .update({ email_identifier: cleanIdentifier })
      .eq('id', brandId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      emailIdentifier: cleanIdentifier,
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 