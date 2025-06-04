-- Fix permission issue for create_default_page_types function
GRANT EXECUTE ON FUNCTION create_default_page_types(UUID, UUID) TO authenticated;

-- Also ensure the function exists with proper permissions
CREATE OR REPLACE FUNCTION create_default_page_types(p_brand_id UUID, p_user_id UUID)
RETURNS void 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.page_types (brand_id, user_id, name, description, is_default)
  VALUES 
    (p_brand_id, p_user_id, 'Home Page', 'Main landing page of the website', true),
    (p_brand_id, p_user_id, 'Collection Page', 'Product collection or category page', true),
    (p_brand_id, p_user_id, 'PDP', 'Product Detail Page', true),
    (p_brand_id, p_user_id, 'Listicle', 'List-based content page', true),
    (p_brand_id, p_user_id, 'Advertorial', 'Advertisement styled as editorial content', true)
  ON CONFLICT DO NOTHING; -- Prevent duplicates if run multiple times
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission again to be sure
GRANT EXECUTE ON FUNCTION create_default_page_types(UUID, UUID) TO authenticated; 