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

    // Check if user is owner or has accepted share
    const isOwner = brand.user_id === user.id;
    
    if (!isOwner) {
      const { data: share } = await supabase
        .from('brand_shares')
        .select('id')
        .eq('brand_id', brandId)
        .eq('shared_with_user_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (!share) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Get all users with accepted shares for this brand
    const { data: shares, error: sharesError } = await supabase
      .from('brand_shares')
      .select(`
        id,
        shared_with_user_id,
        shared_with_email,
        role,
        status,
        first_name,
        last_name,
        accepted_at,
        profiles:shared_with_user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('brand_id', brandId)
      .eq('status', 'accepted');

    if (sharesError) {
      console.error('Error fetching brand shares:', sharesError);
      return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
    }

    // Get the brand owner's profile
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('id', brand.user_id)
      .single();

    // Format the response
    const users = [];

    // Add owner
    if (ownerProfile) {
      users.push({
        id: ownerProfile.id,
        email: ownerProfile.email,
        fullName: ownerProfile.full_name,
        avatarUrl: ownerProfile.avatar_url,
        role: 'owner',
        isOwner: true
      });
    }

    // Add shared users
    if (shares) {
      shares.forEach(share => {
        if (share.profiles) {
          users.push({
            id: share.profiles.id,
            email: share.profiles.email || share.shared_with_email,
            fullName: share.profiles.full_name || `${share.first_name || ''} ${share.last_name || ''}`.trim() || share.shared_with_email,
            avatarUrl: share.profiles.avatar_url,
            role: share.role,
            isOwner: false,
            shareId: share.id,
            acceptedAt: share.accepted_at
          });
        }
      });
    }

    return NextResponse.json({ users });

  } catch (error) {
    console.error('Error in /api/brands/[brandId]/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 