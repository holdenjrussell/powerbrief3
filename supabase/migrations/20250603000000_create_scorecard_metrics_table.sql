-- Migration script for creating scorecard_metrics table

CREATE TABLE IF NOT EXISTS public.scorecard_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE, -- Optional: if you link metrics to brands
    metric_config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_user_id ON public.scorecard_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_brand_id ON public.scorecard_metrics(brand_id);

-- RLS Policies
ALTER TABLE public.scorecard_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own scorecard metrics" ON public.scorecard_metrics;
CREATE POLICY "Users can manage their own scorecard metrics"
ON public.scorecard_metrics
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Optional: If metrics are linked to brands and users manage brands
-- DROP POLICY IF EXISTS "Users can manage metrics for their brands" ON public.scorecard_metrics;
-- CREATE POLICY "Users can manage metrics for their brands"
-- ON public.scorecard_metrics
-- FOR ALL
-- USING (
--   EXISTS (
--     SELECT 1
--     FROM public.brands b
--     WHERE b.id = scorecard_metrics.brand_id AND b.user_id = auth.uid()
--   )
-- )
-- WITH CHECK (
--   EXISTS (
--     SELECT 1
--     FROM public.brands b
--     WHERE b.id = scorecard_metrics.brand_id AND b.user_id = auth.uid()
--   )
-- );


-- Trigger for updated_at
-- Ensure the handle_updated_at function exists from a previous migration or create it
-- CREATE OR REPLACE FUNCTION public.handle_updated_at()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = now();
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_scorecard_metrics_updated ON public.scorecard_metrics;
CREATE TRIGGER on_scorecard_metrics_updated
BEFORE UPDATE ON public.scorecard_metrics
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.scorecard_metrics IS 'Stores user-defined metrics for scorecards.';
COMMENT ON COLUMN public.scorecard_metrics.metric_config IS 'JSONB object containing the configuration for a scorecard metric.';
COMMENT ON COLUMN public.scorecard_metrics.brand_id IS 'Optional foreign key to link metric to a specific brand.'; 