-- Create ad_configurations table for saved brand configurations
CREATE TABLE IF NOT EXISTS ad_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Configuration settings (JSON)
    settings JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, brand_id, name)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ad_configurations_user_id ON ad_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_configurations_brand_id ON ad_configurations(brand_id);
CREATE INDEX IF NOT EXISTS idx_ad_configurations_user_brand ON ad_configurations(user_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_ad_configurations_default ON ad_configurations(user_id, brand_id, is_default) WHERE is_default = TRUE;

-- Enable RLS
ALTER TABLE ad_configurations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own ad configurations" ON ad_configurations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ad configurations" ON ad_configurations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ad configurations" ON ad_configurations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ad configurations" ON ad_configurations
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ad_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_ad_configurations_updated_at
    BEFORE UPDATE ON ad_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_ad_configurations_updated_at();

-- Function to ensure only one default configuration per brand
CREATE OR REPLACE FUNCTION ensure_single_default_config()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting this config as default, unset all other defaults for this brand
    IF NEW.is_default = TRUE THEN
        UPDATE ad_configurations 
        SET is_default = FALSE 
        WHERE user_id = NEW.user_id 
        AND brand_id = NEW.brand_id 
        AND id != NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure single default
CREATE TRIGGER ensure_single_default_config_trigger
    BEFORE INSERT OR UPDATE ON ad_configurations
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_config(); 