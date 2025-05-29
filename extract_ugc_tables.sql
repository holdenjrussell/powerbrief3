-- Extract UGC Tables from Backup
-- Run this against your backup file to extract only UGC data

-- First, find the backup data for ugc_creators
-- Look for lines like: COPY public.ugc_creators (id, user_id, brand_id, name, ...) FROM stdin;
-- Copy everything from that line until the next table or "\\." 

-- Example extraction (replace with your actual backup data):
-- COPY public.ugc_creators (id, user_id, brand_id, name, gender, status, products, content_types, contract_status, portfolio_link, per_script_fee, email, phone_number, instagram_handle, tiktok_handle, platforms, address_line1, address_line2, city, state, zip, country, contacted_by, created_at, updated_at) FROM stdin;
-- [Your creator data rows here]
-- \.

-- Then find ugc_creator_scripts data:
-- COPY public.ugc_creator_scripts (id, creator_id, user_id, brand_id, title, script_content, status, b_roll_shot_list, ai_custom_prompt, system_instructions, hook_type, hook_count, company_description, guide_description, filming_instructions, final_content_link, linked_brief_concept_id, linked_brief_batch_id, original_creator_script, creator_footage, public_share_id, created_at, updated_at) FROM stdin;
-- [Your script data rows here]
-- \.

-- Manual extraction steps:
-- 1. Search your backup.sql file for "COPY public.ugc_creators"
-- 2. Copy that entire COPY block (including the \. at the end)
-- 3. Search for "COPY public.ugc_creator_scripts" 
-- 4. Copy that entire COPY block
-- 5. Create a new file with just those COPY statements
-- 6. Run the restoration steps below

-- Verification queries (run after restore):
SELECT 'ugc_creators' as table_name, count(*) as restored_rows FROM public.ugc_creators
UNION ALL  
SELECT 'ugc_creator_scripts' as table_name, count(*) as restored_rows FROM public.ugc_creator_scripts; 