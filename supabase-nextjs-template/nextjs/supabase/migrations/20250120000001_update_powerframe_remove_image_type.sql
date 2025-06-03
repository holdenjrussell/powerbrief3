-- Remove 'image' from module type enum
ALTER TABLE wireframe_modules 
DROP CONSTRAINT IF EXISTS wireframe_modules_type_check;

ALTER TABLE wireframe_modules 
ADD CONSTRAINT wireframe_modules_type_check 
CHECK (type IN ('text', 'video', 'button', 'container', 'header', 'footer'));

-- Update any existing image modules to container type with placeholder content
UPDATE wireframe_modules 
SET 
  type = 'container',
  content = jsonb_build_object(
    'placeholder', COALESCE(content->>'placeholder', content->>'alt', 'Image placeholder'),
    'backgroundColor', '#f3f4f6'
  )
WHERE type = 'image'; 