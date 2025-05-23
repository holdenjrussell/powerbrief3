-- Add payment tracking fields to ugc_creator_scripts table
-- This migration adds the payment tracking functionality to the UGC creator pipeline

-- Add payment and other missing fields to ugc_creator_scripts table
ALTER TABLE public.ugc_creator_scripts 
ADD COLUMN IF NOT EXISTS payment_status TEXT,
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS final_payment_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS payment_notes TEXT,
ADD COLUMN IF NOT EXISTS deposit_paid_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS final_payment_paid_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS concept_status TEXT,
ADD COLUMN IF NOT EXISTS revision_notes TEXT,
ADD COLUMN IF NOT EXISTS inspiration_video_url TEXT,
ADD COLUMN IF NOT EXISTS inspiration_video_notes TEXT,
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS creative_strategist TEXT,
ADD COLUMN IF NOT EXISTS ugc_guide_description TEXT;

-- Add missing fields to ugc_creators table
ALTER TABLE public.ugc_creators
ADD COLUMN IF NOT EXISTS product_shipment_status TEXT,
ADD COLUMN IF NOT EXISTS product_shipped BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tracking_number TEXT; 