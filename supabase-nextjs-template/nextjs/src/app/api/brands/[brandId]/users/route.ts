import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { brandId: string } }
) {
  const supabase = await createSSRClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const brandId = params.brandId;

    // Check if user has access to this brand
    const { data: brand } = await supabase
      .from('brands')
      .select('id, user_id')
      .eq('id', brandId)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Check if user owns the brand or has accepted brand share
    const isOwner = brand.user_id === user.id;
    
    if (!isOwner) {
      const { data: brandShare } = await supabase
        .from('brand_shares')
        .select('id')
        .eq('brand_id', brandId)
        .eq('shared_with_user_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (!brandShare) {
        return NextResponse.json({ error: 'Unauthorized to view this brand' }, { status: 403 });
      }
    }

    // Get all users with accepted brand shares
    const { data: brandShares, error: sharesError } = await supabase
      .from('brand_shares')
      .select(`
        shared_with_user_id,
        first_name,
        last_name,
        email
      `)
      .eq('brand_id', brandId)
      .eq('status', 'accepted');

    if (sharesError) {
      console.error('Error fetching brand shares:', sharesError);
      return NextResponse.json({ error: 'Failed to fetch brand users' }, { status: 500 });
    }

    // Get brand owner info
    const { data: ownerData } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('id', brand.user_id)
      .single();

    // Format the response
    const users = [];

    // Add brand owner
    if (ownerData) {
      users.push({
        id: ownerData.id,
        email: ownerData.email,
        first_name: 'Brand',
        last_name: 'Owner',
        is_owner: true
      });
    }

    // Add users with brand shares
    if (brandShares) {
      brandShares.forEach(share => {
        users.push({
          id: share.shared_with_user_id,
          email: share.email || '',
          first_name: share.first_name || '',
          last_name: share.last_name || '',
          is_owner: false
        });
      });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in brand users GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 