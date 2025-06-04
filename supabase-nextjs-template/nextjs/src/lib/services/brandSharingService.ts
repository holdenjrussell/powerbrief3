import { createSPAClient } from '@/lib/supabase/client';
import { 
  BrandShare, 
  BrandShareWithDetails, 
  SharedUser, 
  CreateBrandShareRequest,
  AcceptBrandShareResult,
  BrandShareRole 
} from '@/lib/types/brand-sharing';

const supabase = createSPAClient();

// Share a brand with another user
export async function shareBrandWithUser(request: CreateBrandShareRequest): Promise<{ success: boolean; error?: string; share?: BrandShare }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user owns the brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', request.brand_id)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      console.error('Error checking brand ownership:', brandError);
      return { success: false, error: 'You do not have permission to share this brand' };
    }

    // Check if share already exists
    const { data: existingShare } = await supabase
      .from('brand_shares' as any)
      .select('*')
      .eq('brand_id', request.brand_id)
      .eq('shared_with_email', request.email)
      .single();

    if (existingShare) {
      return { success: false, error: 'This brand is already shared with this email' };
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Create the share without checking if user exists
    // The user will be linked when they accept the invitation
    const { data: share, error: shareError } = await supabase
      .from('brand_shares' as any)
      .insert({
        brand_id: request.brand_id,
        shared_by_user_id: user.id,
        shared_with_email: request.email,
        shared_with_user_id: null, // Will be set when invitation is accepted
        role: request.role || 'viewer',
        status: 'pending',
        invitation_token: invitationToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single();

    if (shareError) {
      console.error('Error creating brand share:', shareError);
      console.error('Share details:', {
        brand_id: request.brand_id,
        shared_by_user_id: user.id,
        shared_with_email: request.email,
        role: request.role
      });
      return { success: false, error: `Failed to create share: ${shareError.message || 'Unknown error'}` };
    }

    // Send invitation email
    try {
      const inviteUrl = `${window.location.origin}/app/brands/invite/${(share as any)?.invitation_token || invitationToken}`;
      
      await fetch('/api/brand-share/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: request.email,
          brandName: brand.name,
          inviteUrl,
          invitationToken: (share as any)?.invitation_token || invitationToken
        })
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Continue even if email fails
    }

    return { success: true, share: share as unknown as BrandShare };
  } catch (error) {
    console.error('Error sharing brand:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get all shares for a brand
export async function getBrandSharedUsers(brandId: string): Promise<SharedUser[]> {
  try {
    const { data, error } = await supabase.rpc('get_brand_shared_users' as any, {
      p_brand_id: brandId
    });

    if (error) {
      console.error('Error fetching brand shared users:', error);
      throw error;
    }

    return (data as unknown as SharedUser[]) || [];
  } catch (error) {
    console.error('Error in getBrandSharedUsers:', error);
    return [];
  }
}

// Remove a user's access to a brand
export async function removeBrandShare(shareId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('brand_shares' as any)
      .delete()
      .eq('id', shareId);

    if (error) {
      console.error('Error removing brand share:', error);
      return { success: false, error: 'Failed to remove share' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in removeBrandShare:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Update a user's role for a brand
export async function updateBrandShareRole(shareId: string, role: BrandShareRole): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('brand_shares' as any)
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', shareId);

    if (error) {
      console.error('Error updating brand share role:', error);
      return { success: false, error: 'Failed to update role' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateBrandShareRole:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get brands shared with the current user
export async function getSharedBrands(): Promise<BrandShareWithDetails[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // First, get the basic brand shares data
    const { data: shares, error: sharesError } = await supabase
      .from('brand_shares' as any)
      .select('*')
      .or(`shared_with_user_id.eq.${user.id},shared_with_email.eq.${user.email}`)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (sharesError) {
      console.error('Error fetching brand shares:', sharesError);
      return [];
    }

    if (!shares || shares.length === 0) {
      return [];
    }

    // Get unique brand IDs
    const brandIds = [...new Set(shares.map((share: any) => share.brand_id))];

    // Fetch brands data
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id, name')
      .in('id', brandIds);

    if (brandsError) {
      console.error('Error fetching brands:', brandsError);
      return [];
    }

    // Combine the data
    const result: BrandShareWithDetails[] = shares.map((share: any) => {
      const brand = brands?.find(b => b.id === share.brand_id);

      return {
        ...share,
        brand: brand ? { id: brand.id, name: brand.name } : undefined,
        shared_by_user: {
          email: 'Unknown', // We'll improve this later
          full_name: 'Unknown User'
        }
      };
    });

    return result;
  } catch (error) {
    console.error('Error in getSharedBrands:', error);
    return [];
  }
}

// Accept a brand share invitation
export async function acceptBrandShareInvitation(invitationToken: string): Promise<AcceptBrandShareResult> {
  try {
    const { data, error } = await supabase.rpc('accept_brand_share_invitation' as any, {
      p_invitation_token: invitationToken
    });

    if (error) {
      console.error('Error accepting brand share invitation:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }

    return data as unknown as AcceptBrandShareResult;
  } catch (error) {
    console.error('Error in acceptBrandShareInvitation:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// Get pending invitations for the current user
export async function getPendingInvitations(): Promise<BrandShareWithDetails[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('brand_shares' as any)
      .select(`
        *,
        brands:brand_id (
          id,
          name
        ),
        shared_by:shared_by_user_id (
          email,
          profiles!inner (
            full_name
          )
        )
      `)
      .eq('shared_with_email', user.email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending invitations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPendingInvitations:', error);
    return [];
  }
}

// Check if user has permission to perform an action on a brand
export async function checkBrandPermission(brandId: string, action: 'view' | 'edit' | 'delete'): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if user owns the brand
    const { data: brand } = await supabase
      .from('brands')
      .select('user_id')
      .eq('id', brandId)
      .single();

    if (brand?.user_id === user.id) {
      return true; // Owner has all permissions
    }

    // Check if user has shared access
    const { data: share } = await supabase
      .from('brand_shares' as any)
      .select('role')
      .eq('brand_id', brandId)
      .eq('shared_with_user_id', user.id)
      .eq('status', 'accepted')
      .single();

    if (!share) return false;

    // Check permissions based on role and action
    if (action === 'view') {
      return true; // Both viewer and editor can view
    } else if (action === 'edit') {
      return share.role === 'editor';
    } else if (action === 'delete') {
      return false; // Only owners can delete
    }

    return false;
  } catch (error) {
    console.error('Error checking brand permission:', error);
    return false;
  }
}

// Create invitation link without sending email
export async function createBrandInvitationLink(request: CreateBrandShareRequest): Promise<{ success: boolean; error?: string; inviteUrl?: string; share?: BrandShare }> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user owns the brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', request.brand_id)
      .eq('user_id', user.id)
      .single();

    if (brandError || !brand) {
      console.error('Error checking brand ownership:', brandError);
      return { success: false, error: 'You do not have permission to share this brand' };
    }

    // Check if share already exists
    const { data: existingShare } = await supabase
      .from('brand_shares' as any)
      .select('*')
      .eq('brand_id', request.brand_id)
      .eq('shared_with_email', request.email)
      .single();

    if (existingShare) {
      // Return existing invitation link
      const inviteUrl = `${window.location.origin}/app/brands/invite/${(existingShare as any).invitation_token}`;
      return { success: true, inviteUrl, share: existingShare as unknown as BrandShare };
    }

    // Generate invitation token
    const invitationToken = crypto.randomUUID();

    // Create the share without sending email
    const { data: share, error: shareError } = await supabase
      .from('brand_shares' as any)
      .insert({
        brand_id: request.brand_id,
        shared_by_user_id: user.id,
        shared_with_email: request.email,
        shared_with_user_id: null, // Will be set when invitation is accepted
        role: request.role || 'viewer',
        status: 'pending',
        invitation_token: invitationToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single();

    if (shareError) {
      console.error('Error creating brand share:', shareError);
      console.error('Share details:', {
        brand_id: request.brand_id,
        shared_by_user_id: user.id,
        shared_with_email: request.email,
        role: request.role
      });
      return { success: false, error: `Failed to create share: ${shareError.message || 'Unknown error'}` };
    }

    const inviteUrl = `${window.location.origin}/app/brands/invite/${(share as any)?.invitation_token || invitationToken}`;
    
    return { success: true, inviteUrl, share: share as unknown as BrandShare };
  } catch (error) {
    console.error('Error creating brand invitation link:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
} 