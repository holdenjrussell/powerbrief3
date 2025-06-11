import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Admin client to bypass RLS restrictions for team collaboration
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Use regular client for authentication with RLS
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    // First verify user has access to this brand using regular client (respects RLS)
    const { error: brandAccessError } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brandId)
      .single();

    if (brandAccessError) {
      // If direct brand access fails, check if user has access via brand_shares
      const { data: shareAccess, error: shareAccessError } = await supabase
        .from('brand_shares')
        .select('id')
        .eq('brand_id', brandId)
        .eq('shared_with_user_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (shareAccessError || !shareAccess) {
        return NextResponse.json({ error: 'Access denied to this brand' }, { status: 403 });
      }
    }

    // Now use admin client to get all team data (bypasses RLS for team collaboration)
    // Get the brand to find the owner
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('id, name, user_id')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Get the brand owner's profile
    const { data: ownerProfile, error: ownerError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', brand.user_id)
      .single();

    // Get users who have been shared with the brand (including pending invitations)
    const { data: sharedUsers, error: sharedError } = await supabaseAdmin
      .from('brand_shares')
      .select('shared_with_user_id, shared_with_email, role, status')
      .eq('brand_id', brandId)
      .in('status', ['accepted', 'pending']);

    if (sharedError) {
      console.error('Error fetching shared users:', sharedError);
      return NextResponse.json({ error: 'Failed to fetch shared users' }, { status: 500 });
    }

    // Combine brand owner and shared users
    const brandUsers = [];

    // Add brand owner
    if (ownerProfile || ownerError) {
      brandUsers.push({
        id: brand.user_id,
        full_name: ownerProfile?.full_name || 'Brand Owner',
        email: ownerProfile?.email || 'Unknown',
        role: 'owner',
        is_owner: true
      });
    }

    // Add shared users
    if (sharedUsers && sharedUsers.length > 0) {
      // Get profile data for users who have been shared with
      const userIds = sharedUsers
        .filter(share => share.shared_with_user_id)
        .map(share => share.shared_with_user_id);

      let profilesData: { id: string; full_name: string | null; email: string | null; }[] = [];
      if (userIds.length > 0) {
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        profilesData = profiles || [];
      }

      sharedUsers.forEach((share) => {
        if (share.shared_with_user_id) {
          const profile = profilesData.find(p => p.id === share.shared_with_user_id);
          brandUsers.push({
            id: share.shared_with_user_id,
            full_name: profile?.full_name || share.shared_with_email,
            email: profile?.email || share.shared_with_email,
            role: share.role,
            is_owner: false,
            is_pending: share.status === 'pending' // Mark as pending if invitation not accepted
          });
        } else if (share.shared_with_email) {
          // User hasn't signed up yet but has been invited
          brandUsers.push({
            id: null, // No user ID yet
            full_name: share.shared_with_email,
            email: share.shared_with_email,
            role: share.role,
            is_owner: false,
            is_pending: true
          });
        }
      });
    }

    // Remove duplicates (in case owner also appears in shared users)
    const uniqueUsers = brandUsers.filter((user, index, self) => 
      index === self.findIndex(u => u.email === user.email)
    );

    console.log(`[TEAM-SYNC] Brand users for ${brandId}:`, {
      totalUsers: uniqueUsers.length,
      acceptedUsers: uniqueUsers.filter(u => !u.is_pending).length,
      pendingUsers: uniqueUsers.filter(u => u.is_pending).length,
      userEmails: uniqueUsers.map(u => ({ email: u.email, pending: u.is_pending }))
    });

    return NextResponse.json({ 
      brandUsers: uniqueUsers,
      brandName: brand.name 
    });

  } catch (error) {
    console.error('Error in GET /api/team-sync/brand-users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 