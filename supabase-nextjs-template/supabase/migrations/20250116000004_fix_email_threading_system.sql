-- Fix UGC Email Threading System
-- This migration improves the threading logic to ensure proper conversation management

-- Add new columns to email threads table
ALTER TABLE public.ugc_email_threads 
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS close_reason TEXT;

-- Add soft delete capability to email messages
ALTER TABLE public.ugc_email_messages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for primary threads
CREATE INDEX IF NOT EXISTS ugc_email_threads_primary_idx ON public.ugc_email_threads(creator_id, brand_id, is_primary, status) 
WHERE is_primary = true AND status = 'active';

-- Create index for non-deleted messages
CREATE INDEX IF NOT EXISTS ugc_email_messages_active_idx ON public.ugc_email_messages(thread_id, created_at) 
WHERE deleted_at IS NULL;

-- Update existing data to set primary threads
-- For each creator-brand pair, set the earliest active thread as primary
WITH primary_threads AS (
  SELECT DISTINCT ON (creator_id, brand_id) 
    id,
    creator_id,
    brand_id
  FROM public.ugc_email_threads 
  WHERE status = 'active'
  ORDER BY creator_id, brand_id, created_at ASC
)
UPDATE public.ugc_email_threads 
SET is_primary = true 
WHERE id IN (SELECT id FROM primary_threads);

-- Create function to get or create primary thread for creator-brand pair
CREATE OR REPLACE FUNCTION public.get_or_create_primary_email_thread(
  p_creator_id UUID,
  p_brand_id UUID,
  p_subject TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  thread_id UUID;
  default_subject TEXT;
BEGIN
  -- Try to find existing primary active thread
  SELECT id INTO thread_id
  FROM public.ugc_email_threads
  WHERE creator_id = p_creator_id
    AND brand_id = p_brand_id
    AND is_primary = true
    AND status = 'active'
  LIMIT 1;

  -- If found, return it
  IF thread_id IS NOT NULL THEN
    RETURN thread_id;
  END IF;

  -- Generate default subject if none provided
  IF p_subject IS NULL OR p_subject = '' THEN
    SELECT CONCAT('Communication with ', COALESCE(name, email, 'Creator'))
    INTO default_subject
    FROM public.ugc_creators 
    WHERE id = p_creator_id;
  ELSE
    default_subject := p_subject;
  END IF;

  -- Create new primary thread
  INSERT INTO public.ugc_email_threads (
    creator_id,
    brand_id,
    thread_subject,
    status,
    is_primary
  ) VALUES (
    p_creator_id,
    p_brand_id,
    default_subject,
    'active',
    true
  ) RETURNING id INTO thread_id;

  RETURN thread_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to close email thread
CREATE OR REPLACE FUNCTION public.close_email_thread(
  p_thread_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  thread_record RECORD;
BEGIN
  -- Get thread info
  SELECT * INTO thread_record
  FROM public.ugc_email_threads
  WHERE id = p_thread_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Close the thread
  UPDATE public.ugc_email_threads
  SET 
    status = 'completed',
    closed_at = NOW(),
    closed_by = p_user_id,
    close_reason = p_reason,
    is_primary = false  -- Remove primary status when closed
  WHERE id = p_thread_id;

  -- If this was a primary thread, create a new primary thread for future communications
  IF thread_record.is_primary THEN
    PERFORM public.get_or_create_primary_email_thread(
      thread_record.creator_id,
      thread_record.brand_id,
      'New Communication Thread'
    );
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to soft delete email message
CREATE OR REPLACE FUNCTION public.delete_email_message(
  p_message_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.ugc_email_messages
  SET 
    deleted_at = NOW(),
    deleted_by = p_user_id
  WHERE id = p_message_id
    AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to normalize thread subjects (for reply matching)
CREATE OR REPLACE FUNCTION public.normalize_email_subject(subject TEXT) 
RETURNS TEXT AS $$
BEGIN
  -- Remove common reply prefixes and normalize
  RETURN TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          LOWER(COALESCE(subject, '')),
          '^(re:|fw:|fwd:)\s*',
          '',
          'gi'
        ),
        '\s+',
        ' ',
        'g'
      ),
      '^\s+|\s+$',
      '',
      'g'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Update thread subjects for better consistency
UPDATE public.ugc_email_threads 
SET thread_subject = public.normalize_email_subject(thread_subject)
WHERE thread_subject IS NOT NULL;

-- Add constraint to ensure only one primary active thread per creator-brand pair
CREATE UNIQUE INDEX IF NOT EXISTS ugc_email_threads_unique_primary_idx 
ON public.ugc_email_threads(creator_id, brand_id) 
WHERE is_primary = true AND status = 'active';

-- Add updated triggers for new columns
CREATE TRIGGER update_ugc_email_threads_updated_at_on_close
    BEFORE UPDATE OF status, closed_at ON public.ugc_email_threads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_or_create_primary_email_thread(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_email_thread(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_email_message(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_email_subject(TEXT) TO authenticated;

-- Update RLS policies to handle soft deletes
DROP POLICY IF EXISTS "Users can view email messages for their brands" ON public.ugc_email_messages;
CREATE POLICY "Users can view active email messages for their brands" ON public.ugc_email_messages
  FOR SELECT USING (
    deleted_at IS NULL AND
    thread_id IN (
      SELECT id FROM public.ugc_email_threads WHERE brand_id IN (
        SELECT id FROM public.brands WHERE user_id = auth.uid()
      )
    )
  );

-- Add policy for viewing deleted messages (for admin/audit purposes)
CREATE POLICY "Users can view deleted messages for their brands" ON public.ugc_email_messages
  FOR SELECT USING (
    deleted_at IS NOT NULL AND
    thread_id IN (
      SELECT id FROM public.ugc_email_threads WHERE brand_id IN (
        SELECT id FROM public.brands WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON FUNCTION public.get_or_create_primary_email_thread IS 'Gets existing primary thread or creates new one for creator-brand communication';
COMMENT ON FUNCTION public.close_email_thread IS 'Closes email thread and creates new primary thread if needed';
COMMENT ON FUNCTION public.delete_email_message IS 'Soft deletes an email message';
COMMENT ON FUNCTION public.normalize_email_subject IS 'Normalizes email subject for consistent threading'; 