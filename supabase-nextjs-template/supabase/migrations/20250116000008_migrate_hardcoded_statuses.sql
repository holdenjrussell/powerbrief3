-- Migrate hardcoded creator statuses to custom status system for all existing brands
-- This ensures backward compatibility while moving to the flexible status system

-- Insert default onboarding statuses for all existing brands
INSERT INTO public.ugc_custom_creator_statuses (brand_id, status_name, category, display_order, color, is_final)
SELECT 
    brands.id as brand_id,
    status_name,
    'onboarding' as category,
    display_order,
    color,
    is_final
FROM public.brands
CROSS JOIN (
    VALUES 
        ('New Creator Submission', 0, '#94A3B8', false),
        ('Cold Outreach', 1, '#94A3B8', false),
        ('Primary Screen', 2, '#F59E0B', false),
        ('Backlog', 3, '#6B7280', false),
        ('Approved for Next Steps', 4, '#10B981', false),
        ('Schedule Call', 5, '#3B82F6', false),
        ('Call Schedule Attempted', 6, '#8B5CF6', false),
        ('Call Scheduled', 7, '#06B6D4', false),
        ('READY FOR SCRIPTS', 8, '#10B981', true),
        ('REJECTED', 9, '#EF4444', true)
) AS onboarding_statuses(status_name, display_order, color, is_final)
ON CONFLICT (brand_id, status_name) DO NOTHING;

-- Insert script pipeline statuses for all existing brands
INSERT INTO public.ugc_custom_creator_statuses (brand_id, status_name, category, display_order, color, is_final)
SELECT 
    brands.id as brand_id,
    status_name,
    'script_pipeline' as category,
    display_order,
    color,
    is_final
FROM public.brands
CROSS JOIN (
    VALUES 
        ('PENDING_APPROVAL', 0, '#F59E0B', false),
        ('REVISION_REQUESTED', 1, '#EF4444', false),
        ('APPROVED', 2, '#10B981', false),
        ('CREATOR_REASSIGNMENT', 3, '#8B5CF6', false),
        ('SCRIPT_ASSIGNED', 4, '#3B82F6', false),
        ('CREATOR_APPROVED', 5, '#10B981', false),
        ('CONTENT_REVISION_REQUESTED', 6, '#EF4444', false),
        ('CONTENT_SUBMITTED', 7, '#06B6D4', false),
        ('COMPLETED', 8, '#10B981', true)
) AS script_statuses(status_name, display_order, color, is_final)
ON CONFLICT (brand_id, status_name) DO NOTHING;

-- Insert script concept statuses for all existing brands
INSERT INTO public.ugc_custom_creator_statuses (brand_id, status_name, category, display_order, color, is_final)
SELECT 
    brands.id as brand_id,
    status_name,
    'production' as category,
    display_order,
    color,
    is_final
FROM public.brands
CROSS JOIN (
    VALUES 
        ('Script Approval', 0, '#F59E0B', false),
        ('Creator Assignment', 1, '#3B82F6', false),
        ('Send Script to Creator', 2, '#06B6D4', false),
        ('Creator Shooting', 3, '#8B5CF6', false),
        ('Content Approval', 4, '#F59E0B', false),
        ('To Edit', 5, '#10B981', true)
) AS concept_statuses(status_name, display_order, color, is_final)
ON CONFLICT (brand_id, status_name) DO NOTHING;

-- Insert contract statuses for all existing brands
INSERT INTO public.ugc_custom_creator_statuses (brand_id, status_name, category, display_order, color, is_final)
SELECT 
    brands.id as brand_id,
    status_name,
    'negotiation' as category,
    display_order,
    color,
    is_final
FROM public.brands
CROSS JOIN (
    VALUES 
        ('not signed', 0, '#94A3B8', false),
        ('contract sent', 1, '#F59E0B', false),
        ('contract signed', 2, '#10B981', true)
) AS contract_statuses(status_name, display_order, color, is_final)
ON CONFLICT (brand_id, status_name) DO NOTHING;

-- Insert creator general statuses for all existing brands
INSERT INTO public.ugc_custom_creator_statuses (brand_id, status_name, category, display_order, color, is_final)
SELECT 
    brands.id as brand_id,
    status_name,
    'onboarding' as category,
    display_order,
    color,
    is_final
FROM public.brands
CROSS JOIN (
    VALUES 
        ('Active', 0, '#10B981', false),
        ('Inactive', 1, '#6B7280', false),
        ('Paused', 2, '#F59E0B', false),
        ('Active in Slack', 3, '#06B6D4', false)
) AS general_statuses(status_name, display_order, color, is_final)
ON CONFLICT (brand_id, status_name) DO NOTHING;

-- Insert delivery/shipment statuses for all existing brands
INSERT INTO public.ugc_custom_creator_statuses (brand_id, status_name, category, display_order, color, is_final)
SELECT 
    brands.id as brand_id,
    status_name,
    'delivery' as category,
    display_order,
    color,
    is_final
FROM public.brands
CROSS JOIN (
    VALUES 
        ('Not Shipped', 0, '#94A3B8', false),
        ('Processing', 1, '#F59E0B', false),
        ('Shipped', 2, '#06B6D4', false),
        ('Delivered', 3, '#10B981', true),
        ('Returned', 4, '#EF4444', false)
) AS shipment_statuses(status_name, display_order, color, is_final)
ON CONFLICT (brand_id, status_name) DO NOTHING;

-- Create a function to automatically add default statuses for new brands
CREATE OR REPLACE FUNCTION public.add_default_creator_statuses_for_brand()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default onboarding statuses for the new brand
    INSERT INTO public.ugc_custom_creator_statuses (brand_id, status_name, category, display_order, color, is_final)
    VALUES 
        (NEW.id, 'New Creator Submission', 'onboarding', 0, '#94A3B8', false),
        (NEW.id, 'Cold Outreach', 'onboarding', 1, '#94A3B8', false),
        (NEW.id, 'Primary Screen', 'onboarding', 2, '#F59E0B', false),
        (NEW.id, 'Backlog', 'onboarding', 3, '#6B7280', false),
        (NEW.id, 'Approved for Next Steps', 'onboarding', 4, '#10B981', false),
        (NEW.id, 'Schedule Call', 'onboarding', 5, '#3B82F6', false),
        (NEW.id, 'Call Schedule Attempted', 'onboarding', 6, '#8B5CF6', false),
        (NEW.id, 'Call Scheduled', 'onboarding', 7, '#06B6D4', false),
        (NEW.id, 'READY FOR SCRIPTS', 'onboarding', 8, '#10B981', true),
        (NEW.id, 'REJECTED', 'onboarding', 9, '#EF4444', true),
        
        (NEW.id, 'PENDING_APPROVAL', 'script_pipeline', 0, '#F59E0B', false),
        (NEW.id, 'REVISION_REQUESTED', 'script_pipeline', 1, '#EF4444', false),
        (NEW.id, 'APPROVED', 'script_pipeline', 2, '#10B981', false),
        (NEW.id, 'CREATOR_REASSIGNMENT', 'script_pipeline', 3, '#8B5CF6', false),
        (NEW.id, 'SCRIPT_ASSIGNED', 'script_pipeline', 4, '#3B82F6', false),
        (NEW.id, 'CREATOR_APPROVED', 'script_pipeline', 5, '#10B981', false),
        (NEW.id, 'CONTENT_REVISION_REQUESTED', 'script_pipeline', 6, '#EF4444', false),
        (NEW.id, 'CONTENT_SUBMITTED', 'script_pipeline', 7, '#06B6D4', false),
        (NEW.id, 'COMPLETED', 'script_pipeline', 8, '#10B981', true),
        
        (NEW.id, 'Script Approval', 'production', 0, '#F59E0B', false),
        (NEW.id, 'Creator Assignment', 'production', 1, '#3B82F6', false),
        (NEW.id, 'Send Script to Creator', 'production', 2, '#06B6D4', false),
        (NEW.id, 'Creator Shooting', 'production', 3, '#8B5CF6', false),
        (NEW.id, 'Content Approval', 'production', 4, '#F59E0B', false),
        (NEW.id, 'To Edit', 'production', 5, '#10B981', true),
        
        (NEW.id, 'not signed', 'negotiation', 0, '#94A3B8', false),
        (NEW.id, 'contract sent', 'negotiation', 1, '#F59E0B', false),
        (NEW.id, 'contract signed', 'negotiation', 2, '#10B981', true),
        
        (NEW.id, 'Active', 'onboarding', 10, '#10B981', false),
        (NEW.id, 'Inactive', 'onboarding', 11, '#6B7280', false),
        (NEW.id, 'Paused', 'onboarding', 12, '#F59E0B', false),
        (NEW.id, 'Active in Slack', 'onboarding', 13, '#06B6D4', false),
        
        (NEW.id, 'Not Shipped', 'delivery', 0, '#94A3B8', false),
        (NEW.id, 'Processing', 'delivery', 1, '#F59E0B', false),
        (NEW.id, 'Shipped', 'delivery', 2, '#06B6D4', false),
        (NEW.id, 'Delivered', 'delivery', 3, '#10B981', true),
        (NEW.id, 'Returned', 'delivery', 4, '#EF4444', false)
    ON CONFLICT (brand_id, status_name) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-add default statuses for new brands
DROP TRIGGER IF EXISTS add_default_creator_statuses_trigger ON public.brands;
CREATE TRIGGER add_default_creator_statuses_trigger
    AFTER INSERT ON public.brands
    FOR EACH ROW
    EXECUTE FUNCTION public.add_default_creator_statuses_for_brand(); 