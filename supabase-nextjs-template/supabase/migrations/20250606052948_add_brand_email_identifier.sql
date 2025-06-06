-- Add unique email identifier for brand creator communications
ALTER TABLE brands 
ADD COLUMN email_identifier TEXT UNIQUE;

-- Add constraint to ensure email_identifier is lowercase and URL-safe
ALTER TABLE brands 
ADD CONSTRAINT brands_email_identifier_format 
CHECK (email_identifier ~ '^[a-z0-9-]+$' AND length(email_identifier) >= 3 AND length(email_identifier) <= 50);

-- Create index for fast lookups
CREATE INDEX idx_brands_email_identifier ON brands(email_identifier);

-- Add comment
COMMENT ON COLUMN brands.email_identifier IS 'Unique identifier for creator email routing (e.g., glamory-official@mail.powerbrief.ai)';

