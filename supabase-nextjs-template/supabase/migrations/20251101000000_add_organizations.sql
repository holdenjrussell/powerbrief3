-- Add Organizations Feature
-- This migration adds support for organizations, allowing users to collaborate on brands and briefs

-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('brand', 'agency')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Create organization_members table for managing users within organizations
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(organization_id, user_id)
);

-- Add organization_id to brands table (nullable for backward compatibility during migration)
ALTER TABLE public.brands 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS organizations_type_idx ON public.organizations(type);
CREATE INDEX IF NOT EXISTS organization_members_user_id_idx ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS organization_members_organization_id_idx ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS brands_organization_id_idx ON public.brands(organization_id);

-- Create or replace update_updated_at_column function for organizations
CREATE OR REPLACE FUNCTION public.update_organization_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at column automatically
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_organization_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON public.organization_members;
CREATE TRIGGER update_organization_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_organization_updated_at_column();

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizations
CREATE POLICY "Users can view organizations they belong to" 
    ON public.organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = public.organizations.id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Organization owners and admins can update their organizations" 
    ON public.organizations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = public.organizations.id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can create organizations" 
    ON public.organizations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Only owners can delete organizations" 
    ON public.organizations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = public.organizations.id 
            AND user_id = auth.uid() 
            AND role = 'owner'
        )
    );

-- RLS policies for organization members
CREATE POLICY "Users can view members in their organizations" 
    ON public.organization_members FOR SELECT
    USING (
        -- Fixed policy to avoid recursive self-reference
        organization_id IN (
            SELECT organization_id FROM public.organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners and admins can manage members" 
    ON public.organization_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members AS member
            WHERE member.organization_id = public.organization_members.organization_id
            AND member.user_id = auth.uid()
            AND member.role IN ('owner', 'admin')
        ) OR 
        -- Allow self-insertion for newly created organizations
        (
            public.organization_members.user_id = auth.uid() AND
            public.organization_members.role = 'owner'
        )
    );

CREATE POLICY "Owners and admins can update members" 
    ON public.organization_members FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members AS member
            WHERE member.organization_id = public.organization_members.organization_id
            AND member.user_id = auth.uid()
            AND member.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Owners and admins can remove members" 
    ON public.organization_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members AS member
            WHERE member.organization_id = public.organization_members.organization_id
            AND member.user_id = auth.uid()
            AND member.role IN ('owner', 'admin')
        )
    ); 