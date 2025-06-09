-- UGC Dashboard Tables Migration (Simplified)
-- Run this in Supabase SQL Editor

-- Monthly Budget Tracking
CREATE TABLE public.ugc_monthly_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  month_year DATE NOT NULL,
  budget_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  spent_amount DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(brand_id, month_year)
);

-- Enhanced Payment Tracking
CREATE TABLE public.ugc_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
  script_id UUID REFERENCES public.ugc_creator_scripts(id) ON DELETE SET NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'final', 'bonus', 'expense_reimbursement')),
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  paid_date TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  transaction_id TEXT,
  invoice_number TEXT,
  notes TEXT,
  reminder_sent_count INTEGER DEFAULT 0,
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  paid_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Contract Templates (create first)
CREATE TABLE public.ugc_contract_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  contract_type TEXT DEFAULT 'creator_agreement' CHECK (contract_type IN ('creator_agreement', 'nda', 'usage_rights', 'custom')),
  template_content TEXT NOT NULL,
  required_fields JSONB DEFAULT '[]',
  optional_fields JSONB DEFAULT '[]',
  opensign_template_id TEXT,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Contract Management
CREATE TABLE public.ugc_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
  workflow_execution_id UUID REFERENCES public.ugc_workflow_executions(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.ugc_contract_templates(id) ON DELETE SET NULL,
  opensign_document_id TEXT,
  contract_title TEXT NOT NULL,
  contract_type TEXT DEFAULT 'creator_agreement' CHECK (contract_type IN ('creator_agreement', 'nda', 'usage_rights', 'custom')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'completed', 'expired', 'cancelled')),
  contract_data JSONB DEFAULT '{}',
  signing_url TEXT,
  signed_document_url TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  reminder_count INTEGER DEFAULT 0,
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Shipment Management
CREATE TABLE public.ugc_shipments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
  workflow_execution_id UUID REFERENCES public.ugc_workflow_executions(id) ON DELETE SET NULL,
  shipment_title TEXT NOT NULL,
  products JSONB NOT NULL DEFAULT '[]',
  shipping_address JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'packed', 'shipped', 'in_transit', 'delivered', 'returned', 'cancelled')),
  priority TEXT DEFAULT 'standard' CHECK (priority IN ('low', 'standard', 'high', 'urgent')),
  shipping_method TEXT,
  carrier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  shipping_cost DECIMAL(10,2),
  weight_lbs DECIMAL(8,2),
  dimensions JSONB,
  special_instructions TEXT,
  slack_notification_sent BOOLEAN DEFAULT false,
  slack_message_ts TEXT,
  created_by UUID REFERENCES auth.users(id),
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Shipment Status History
CREATE TABLE public.ugc_shipment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.ugc_shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  location TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_ugc_monthly_budgets_brand_month ON public.ugc_monthly_budgets(brand_id, month_year);
CREATE INDEX idx_ugc_payments_brand_id ON public.ugc_payments(brand_id);
CREATE INDEX idx_ugc_payments_creator_id ON public.ugc_payments(creator_id);
CREATE INDEX idx_ugc_payments_status ON public.ugc_payments(status);
CREATE INDEX idx_ugc_payments_due_date ON public.ugc_payments(due_date);
CREATE INDEX idx_ugc_contracts_brand_id ON public.ugc_contracts(brand_id);
CREATE INDEX idx_ugc_contracts_creator_id ON public.ugc_contracts(creator_id);
CREATE INDEX idx_ugc_contracts_status ON public.ugc_contracts(status);
CREATE INDEX idx_ugc_contract_templates_brand_id ON public.ugc_contract_templates(brand_id);
CREATE INDEX idx_ugc_shipments_brand_id ON public.ugc_shipments(brand_id);
CREATE INDEX idx_ugc_shipments_creator_id ON public.ugc_shipments(creator_id);
CREATE INDEX idx_ugc_shipments_status ON public.ugc_shipments(status);

-- Enable RLS
ALTER TABLE public.ugc_monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_shipment_history ENABLE ROW LEVEL SECURITY;

-- Simplified RLS Policies (allow authenticated users to access all data for now)
-- You can make these more restrictive later based on your auth setup

CREATE POLICY "Allow authenticated users to manage budgets" ON public.ugc_monthly_budgets
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to manage payments" ON public.ugc_payments
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to manage contracts" ON public.ugc_contracts
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to manage contract templates" ON public.ugc_contract_templates
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to manage shipments" ON public.ugc_shipments
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to view shipment history" ON public.ugc_shipment_history
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Triggers for updated_at (only if the function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    EXECUTE 'CREATE TRIGGER update_ugc_monthly_budgets_updated_at 
      BEFORE UPDATE ON public.ugc_monthly_budgets 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
      
    EXECUTE 'CREATE TRIGGER update_ugc_payments_updated_at 
      BEFORE UPDATE ON public.ugc_payments 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
      
    EXECUTE 'CREATE TRIGGER update_ugc_contracts_updated_at 
      BEFORE UPDATE ON public.ugc_contracts 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
      
    EXECUTE 'CREATE TRIGGER update_ugc_contract_templates_updated_at 
      BEFORE UPDATE ON public.ugc_contract_templates 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
      
    EXECUTE 'CREATE TRIGGER update_ugc_shipments_updated_at 
      BEFORE UPDATE ON public.ugc_shipments 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()';
  END IF;
END $$;

-- Functions for dashboard calculations
CREATE OR REPLACE FUNCTION get_monthly_budget_summary(brand_uuid UUID, target_month DATE)
RETURNS TABLE (
  budget_amount DECIMAL(12,2),
  spent_amount DECIMAL(12,2),
  remaining_amount DECIMAL(12,2),
  percentage_used DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(b.budget_amount, 0) as budget_amount,
    COALESCE(b.spent_amount, 0) as spent_amount,
    COALESCE(b.budget_amount - b.spent_amount, 0) as remaining_amount,
    CASE 
      WHEN COALESCE(b.budget_amount, 0) > 0 
      THEN ROUND((COALESCE(b.spent_amount, 0) / b.budget_amount * 100), 2)
      ELSE 0 
    END as percentage_used
  FROM public.ugc_monthly_budgets b
  WHERE b.brand_id = brand_uuid 
    AND b.month_year = target_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update budget spent amount
CREATE OR REPLACE FUNCTION update_monthly_budget_spent(brand_uuid UUID, payment_amount DECIMAL(12,2), payment_date TIMESTAMP WITH TIME ZONE)
RETURNS VOID AS $$
DECLARE
  target_month DATE;
BEGIN
  target_month := DATE_TRUNC('month', payment_date)::DATE;
  
  INSERT INTO public.ugc_monthly_budgets (brand_id, month_year, spent_amount)
  VALUES (brand_uuid, target_month, payment_amount)
  ON CONFLICT (brand_id, month_year)
  DO UPDATE SET 
    spent_amount = ugc_monthly_budgets.spent_amount + payment_amount,
    updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update budget when payments are made
CREATE OR REPLACE FUNCTION trigger_update_budget_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    PERFORM update_monthly_budget_spent(NEW.brand_id, NEW.amount, NEW.paid_date);
  END IF;
  
  IF NEW.status IN ('cancelled', 'failed') AND OLD.status = 'paid' THEN
    PERFORM update_monthly_budget_spent(NEW.brand_id, -NEW.amount, NEW.paid_date);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_budget_update
  AFTER UPDATE ON public.ugc_payments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_budget_on_payment();

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_monthly_budget_summary(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION update_monthly_budget_spent(UUID, DECIMAL, TIMESTAMP WITH TIME ZONE) TO authenticated;