-- Supabase migration script for scorecard_meta_cache table

CREATE TABLE IF NOT EXISTS scorecard_meta_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    metric_config_hash TEXT NOT NULL, -- A hash of the NewMetric's filter configuration
    date DATE NOT NULL,              -- The specific date for which the data is cached (YYYY-MM-DD)
    base_metric_key TEXT NOT NULL,   -- e.g., 'spend', 'impressions'
    value NUMERIC,
    fetched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT unique_metric_cache_entry UNIQUE (brand_id, metric_config_hash, date, base_metric_key)
);

-- Optional: Add a comment to the table or columns if desired, e.g.
-- COMMENT ON COLUMN scorecard_meta_cache.metric_config_hash IS 'MD5 hash of campaign, adset, and ad name filter configurations (sorted and stringified).';

-- Indexes for faster querying
CREATE INDEX IF NOT EXISTS idx_scorecard_meta_cache_brand_date ON scorecard_meta_cache(brand_id, date);
CREATE INDEX IF NOT EXISTS idx_scorecard_meta_cache_config_hash ON scorecard_meta_cache(metric_config_hash);
CREATE INDEX IF NOT EXISTS idx_scorecard_meta_cache_brand_config_date_key ON scorecard_meta_cache(brand_id, metric_config_hash, date, base_metric_key);


-- RLS Policies
ALTER TABLE scorecard_meta_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own brand's cached data" ON scorecard_meta_cache;
CREATE POLICY "Users can manage their own brand's cached data"
ON scorecard_meta_cache
FOR ALL
USING (auth.uid() = (SELECT user_id FROM brands WHERE id = scorecard_meta_cache.brand_id))
WITH CHECK (auth.uid() = (SELECT user_id FROM brands WHERE id = scorecard_meta_cache.brand_id));

-- Function to trigger updated_at change (if not already using a trigger)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_scorecard_meta_cache_updated ON public.scorecard_meta_cache;
CREATE TRIGGER on_scorecard_meta_cache_updated
BEFORE UPDATE ON public.scorecard_meta_cache
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at(); 