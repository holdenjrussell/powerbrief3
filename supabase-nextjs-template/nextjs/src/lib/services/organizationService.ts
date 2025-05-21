import { createSPAClient } from '@/lib/supabase/client';
import { Organization, OrganizationMember, DbOrganization, OrganizationType, OrganizationRole, OrganizationSettings } from '@/lib/types/organization';

const supabase = createSPAClient();

// Organization Services
export async function getOrganizations(userId: string): Promise<Organization[]> {
  // Use a direct SQL query to avoid recursive RLS policy issues
  const { data, error } = await supabase.rpc('get_user_organizations', { 
    user_id_param: userId 
  }) as unknown as { 
    data: DbOrganization[] | null; 
    error: any; 
  };
  
  if (error) {
    console.error('Error fetching organization memberships:', error);
    throw error;
  }
  
  // Transform from DB format to app format
  return (data || []).map((item: DbOrganization) => ({
    ...item,
    type: item.type as OrganizationType,
    settings: item.settings as OrganizationSettings
  }));
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {  // Record not found error
      return null;
    }
    console.error('Error fetching organization:', error);
    throw error;
  }

  return {
    ...data,
    type: data.type as OrganizationType,
    settings: data.settings as OrganizationSettings
  };
}

export async function createOrganization(organization: {
  name: string;
  type: OrganizationType;
  settings?: OrganizationSettings;
}): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .insert([
      {
        name: organization.name,
        type: organization.type,
        settings: organization.settings || {}
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating organization:', error);
    throw error;
  }

  // Get current user session
  const { data: sessionData } = await supabase.auth.getSession();
  
  if (!sessionData?.session?.user?.id) {
    throw new Error('No authenticated user found');
  }

  // Add the current user as the owner
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert([
      {
        organization_id: data.id,
        user_id: sessionData.session.user.id,
        role: 'owner' as OrganizationRole
      }
    ]);

  if (memberError) {
    console.error('Error adding user as organization owner:', memberError);
    throw memberError;
  }

  return {
    ...data,
    type: data.type as OrganizationType,
    settings: data.settings as OrganizationSettings
  };
}

export async function updateOrganization(id: string, updates: {
  name?: string;
  type?: OrganizationType;
  settings?: OrganizationSettings;
}): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating organization:', error);
    throw error;
  }

  return {
    ...data,
    type: data.type as OrganizationType,
    settings: data.settings as OrganizationSettings
  };
}

export async function deleteOrganization(id: string): Promise<void> {
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting organization:', error);
    throw error;
  }
}

// Organization Members Services
export async function getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  // Need to use explicit typing to avoid deep nesting issues
  type MemberWithUser = {
    id: string;
    organization_id: string;
    user_id: string;
    role: string;
    created_at: string;
    updated_at: string;
    user: {
      email: string;
      user_metadata?: {
        full_name?: string;
        avatar_url?: string;
      }
    }
  };

  // Use a basic query instead of a join to avoid policy issues
  const { data: members, error } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error fetching organization members:', error);
    throw error;
  }

  // Get member user details separately
  const result = [];
  for (const member of members || []) {
    const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
    
    result.push({
      id: member.id,
      organization_id: member.organization_id,
      user_id: member.user_id,
      role: member.role as OrganizationRole,
      created_at: member.created_at,
      updated_at: member.updated_at,
      user: {
        email: userData?.user?.email || 'Unknown',
        user_metadata: userData?.user?.user_metadata || {}
      }
    });
  }

  return result;
}

export async function addOrganizationMember(organizationId: string, email: string, role: OrganizationRole): Promise<{ success: boolean; error?: string }> {
  try {
    // First, look up the user by email in auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error finding users:', userError);
      return { success: false, error: 'Error looking up users' };
    }
    
    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
      return { success: false, error: 'User not found with that email' };
    }

    // Check if user is already a member
    const { data: existingMember, error: checkError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing membership:', checkError);
      throw checkError;
    }

    if (existingMember) {
      return { success: false, error: 'User is already a member of this organization' };
    }

    // Add the user as a member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        role: role
      });

    if (memberError) {
      console.error('Error adding organization member:', memberError);
      throw memberError;
    }

    return { success: true };
  } catch (err) {
    console.error('Error in addOrganizationMember:', err);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

export async function updateOrganizationMemberRole(memberId: string, role: OrganizationRole): Promise<void> {
  const { error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('id', memberId);

  if (error) {
    console.error('Error updating member role:', error);
    throw error;
  }
}

export async function removeOrganizationMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('Error removing organization member:', error);
    throw error;
  }
}

// Helper to check if user is in organization with specified role
export async function isUserInOrganizationWithRole(
  userId: string, 
  organizationId: string, 
  roles: OrganizationRole[]
): Promise<boolean> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {  // Record not found error
      return false;
    }
    console.error('Error checking user organization role:', error);
    throw error;
  }

  return roles.includes(data.role as OrganizationRole);
} 