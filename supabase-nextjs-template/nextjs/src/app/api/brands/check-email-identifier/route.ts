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
    const identifier = searchParams.get('identifier');

    if (!identifier) {
      return NextResponse.json({ error: 'Identifier parameter is required' }, { status: 400 });
    }

    const cleanIdentifier = identifier.toLowerCase().trim();

    // Validate format
    if (!/^[a-z0-9-]+$/.test(cleanIdentifier)) {
      return NextResponse.json({ available: false, reason: 'Invalid format' });
    }

    if (cleanIdentifier.length < 3 || cleanIdentifier.length > 50) {
      return NextResponse.json({ available: false, reason: 'Invalid length' });
    }

    // Check if identifier is already taken
    const { data: existingBrand, error: checkError } = await supabase
      .from('brands')
      .select('id')
      .eq('email_identifier', cleanIdentifier)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    const available = !existingBrand;

    return NextResponse.json({
      available,
      identifier: cleanIdentifier,
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 