# Brand Sharing Feature

This document describes the brand sharing functionality that allows users to share brands with other users via email.

## Overview

The brand sharing feature enables brand owners to:
- Share their brands with other users via email invitation
- Grant either "viewer" (read-only) or "editor" (full access except delete) permissions
- Manage shared users and their permissions
- Revoke access at any time

Users who receive invitations can:
- Accept invitations to access shared brands
- View or edit brands based on their assigned role
- Access all brand features except deletion (which is reserved for owners)

## Database Schema

### New Table: `brand_shares`

```sql
CREATE TABLE public.brand_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_with_email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    invitation_token UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    accepted_at TIMESTAMPTZ,
    UNIQUE(brand_id, shared_with_email)
);
```

### Updated RLS Policies

The following tables have updated RLS policies to support brand sharing:
- `brands` - Users can view brands they own or have been shared with
- `brief_batches` - Users can access batches for brands they have access to
- `brief_concepts` - Users can access concepts for brands they have access to

## Implementation Steps

### 1. Run the Migration

```bash
# Apply the migration to your Supabase database
supabase db push
```

### 2. Generate TypeScript Types

After running the migration, generate new TypeScript types:

```bash
npm run db:generate-types
```

### 3. Update the PowerBrief Service

After generating types, update the `getBrands` function in `powerbriefService.ts` to include shared brands:

```typescript
export async function getBrands(userId: string): Promise<Brand[]> {
  const supabase = await getSupabaseClient();
  
  // Get both owned brands and shared brands
  const [ownedBrandsResult, sharedBrandsResult] = await Promise.all([
    // Get brands owned by the user
    supabase
      .from('brands')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    
    // Get brands shared with the user
    supabase
      .from('brand_shares')
      .select(`
        brand_id,
        role,
        status,
        brands!inner (*)
      `)
      .eq('shared_with_user_id', userId)
      .eq('status', 'accepted')
  ]);

  // ... handle results and combine brands
}
```

### 4. Remove Type Assertions

After generating types, remove the `@ts-expect-error` comments from `brandSharingService.ts`.

## Usage

### Sharing a Brand

1. Navigate to the brand configuration page
2. Find the "Brand Sharing" section
3. Click "Invite User"
4. Enter the email address and select the access level
5. Click "Send Invitation"

### Accepting an Invitation

1. Recipients receive an email with an invitation link
2. Clicking the link takes them to the acceptance page
3. If not logged in, they'll be prompted to sign in or create an account
4. Once authenticated, the invitation is automatically accepted
5. The brand appears in their brand list

### Managing Shared Users

1. Brand owners can view all users with access in the "Brand Sharing" section
2. They can change user roles between "viewer" and "editor"
3. They can revoke access by removing users

## Permissions

### Viewer Role
- Can view all brand information
- Can view brief batches and concepts
- Cannot make any edits
- Cannot delete anything

### Editor Role
- Full access to view and edit brand information
- Can create, edit, and delete brief batches and concepts
- Can manage products and integrations
- Cannot delete the brand itself
- Cannot manage brand sharing (only owner can do this)

### Owner
- Full control over the brand
- Can share the brand with others
- Can manage shared user permissions
- Can delete the brand

## Email Integration

The feature includes email notifications but requires configuration:

1. Set up an email service (e.g., Resend, SendGrid)
2. Update the `/api/brand-share/send-invitation/route.ts` file with your email service integration
3. Configure environment variables for your email service

## Security Considerations

- Invitation tokens are unique and can only be used once
- Invitations are tied to specific email addresses
- Users must be authenticated to accept invitations
- RLS policies ensure users can only access brands they own or have been shared with
- Shared users cannot delete brands or manage sharing settings 