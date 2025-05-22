-- Add elevenlabs_api_key column to brands table
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS elevenlabs_api_key TEXT;

-- Create comment to explain the purpose of this field
COMMENT ON COLUMN public.brands.elevenlabs_api_key IS 'API key for ElevenLabs voice generation service, stored per brand'; 