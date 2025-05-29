-- Rename caption_hook_options to text_hook_options in brief_concepts table
ALTER TABLE brief_concepts 
RENAME COLUMN caption_hook_options TO text_hook_options;

-- Update any existing system instructions that reference caption_hook_options
UPDATE brands 
SET system_instructions_video = REPLACE(
    system_instructions_video,
    '"caption_hook_options"',
    '"text_hook_options"'
)
WHERE system_instructions_video IS NOT NULL 
AND system_instructions_video LIKE '%"caption_hook_options"%';

UPDATE brands 
SET system_instructions_video = REPLACE(
    system_instructions_video,
    'caption_hook_options',
    'text_hook_options'
)
WHERE system_instructions_video IS NOT NULL 
AND system_instructions_video LIKE '%caption_hook_options%';

UPDATE brands 
SET system_instructions_image = REPLACE(
    system_instructions_image,
    '"caption_hook_options"',
    '"text_hook_options"'
)
WHERE system_instructions_image IS NOT NULL 
AND system_instructions_image LIKE '%"caption_hook_options"%';

UPDATE brands 
SET system_instructions_image = REPLACE(
    system_instructions_image,
    'caption_hook_options',
    'text_hook_options'
)
WHERE system_instructions_image IS NOT NULL 
AND system_instructions_image LIKE '%caption_hook_options%'; 