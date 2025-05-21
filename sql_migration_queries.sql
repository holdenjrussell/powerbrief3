-- Find all scripts without a creative strategist assigned
SELECT id, title, status, created_at 
FROM public.ugc_creator_scripts 
WHERE creative_strategist IS NULL OR creative_strategist = ''
ORDER BY created_at DESC;

-- Find all AI-generated scripts
SELECT id, title, status, creative_strategist, created_at 
FROM public.ugc_creator_scripts 
WHERE is_ai_generated = true
ORDER BY created_at DESC;

-- Find AI-generated scripts without a creative strategist
SELECT id, title, status, created_at 
FROM public.ugc_creator_scripts 
WHERE is_ai_generated = true 
AND (creative_strategist IS NULL OR creative_strategist = '')
ORDER BY created_at DESC;

-- Count of scripts by creative strategist
SELECT 
    COALESCE(creative_strategist, 'Unassigned') as strategist,
    COUNT(*) as script_count,
    SUM(CASE WHEN is_ai_generated THEN 1 ELSE 0 END) as ai_generated_count
FROM public.ugc_creator_scripts
GROUP BY creative_strategist
ORDER BY script_count DESC; 