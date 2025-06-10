-- Update contract_fields table to support additional field types
ALTER TABLE public.contract_fields 
DROP CONSTRAINT IF EXISTS contract_fields_type_check;

ALTER TABLE public.contract_fields 
ADD CONSTRAINT contract_fields_type_check 
CHECK (type IN ('signature', 'date', 'text', 'checkbox', 'initial', 'email', 'number', 'name'));

-- Add comment to document the field types
COMMENT ON COLUMN public.contract_fields.type IS 'Field type: signature, date, text, checkbox, initial, email, number, name'; 