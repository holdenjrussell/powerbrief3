-- UGC Email Automation Tables
-- Migration to add email templates, threads, and message tracking

-- Email Templates Table
CREATE TABLE IF NOT EXISTS public.ugc_email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  trigger_status TEXT,
  pipeline_stage TEXT NOT NULL CHECK (pipeline_stage IN ('onboarding', 'script_pipeline')),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Email Threads Table
CREATE TABLE IF NOT EXISTS public.ugc_email_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  thread_subject TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Email Messages Table
CREATE TABLE IF NOT EXISTS public.ugc_email_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.ugc_email_threads(id) ON DELETE CASCADE,
  message_id TEXT, -- SendGrid message ID
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'opened', 'clicked', 'failed')),
  template_id UUID REFERENCES public.ugc_email_templates(id) ON DELETE SET NULL,
  variables_used JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- AI UGC Coordinator Table
CREATE TABLE IF NOT EXISTS public.ugc_ai_coordinator (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'AI UGC Coordinator',
  enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  system_prompt TEXT,
      model_config JSONB DEFAULT '{"model": "gemini-2.5-pro-preview-06-05", "temperature": 0.7}',
  slack_notifications_enabled BOOLEAN DEFAULT false,
  email_automation_enabled BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- AI Coordinator Actions Log
CREATE TABLE IF NOT EXISTS public.ugc_ai_coordinator_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coordinator_id UUID NOT NULL REFERENCES public.ugc_ai_coordinator(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
  script_id UUID REFERENCES public.ugc_creator_scripts(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('email_sent', 'status_changed', 'script_assigned', 'follow_up', 'slack_notification', 'ai_analysis')),
  action_data JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  ai_reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS ugc_email_templates_brand_id_idx ON public.ugc_email_templates(brand_id);
CREATE INDEX IF NOT EXISTS ugc_email_templates_pipeline_stage_idx ON public.ugc_email_templates(pipeline_stage);
CREATE INDEX IF NOT EXISTS ugc_email_templates_trigger_status_idx ON public.ugc_email_templates(trigger_status);
CREATE INDEX IF NOT EXISTS ugc_email_threads_creator_id_idx ON public.ugc_email_threads(creator_id);
CREATE INDEX IF NOT EXISTS ugc_email_threads_brand_id_idx ON public.ugc_email_threads(brand_id);
CREATE INDEX IF NOT EXISTS ugc_email_threads_status_idx ON public.ugc_email_threads(status);
CREATE INDEX IF NOT EXISTS ugc_email_messages_thread_id_idx ON public.ugc_email_messages(thread_id);
CREATE INDEX IF NOT EXISTS ugc_email_messages_status_idx ON public.ugc_email_messages(status);
CREATE INDEX IF NOT EXISTS ugc_email_messages_sent_at_idx ON public.ugc_email_messages(sent_at);
CREATE INDEX IF NOT EXISTS ugc_ai_coordinator_brand_id_idx ON public.ugc_ai_coordinator(brand_id);
CREATE INDEX IF NOT EXISTS ugc_ai_coordinator_actions_coordinator_id_idx ON public.ugc_ai_coordinator_actions(coordinator_id);
CREATE INDEX IF NOT EXISTS ugc_ai_coordinator_actions_action_type_idx ON public.ugc_ai_coordinator_actions(action_type);
CREATE INDEX IF NOT EXISTS ugc_ai_coordinator_actions_created_at_idx ON public.ugc_ai_coordinator_actions(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.ugc_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_ai_coordinator ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ugc_ai_coordinator_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ugc_email_templates
CREATE POLICY "Users can view templates for their brands" ON public.ugc_email_templates
  FOR SELECT USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage templates for their brands" ON public.ugc_email_templates
  FOR ALL USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for ugc_email_threads
CREATE POLICY "Users can view email threads for their brands" ON public.ugc_email_threads
  FOR SELECT USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage email threads for their brands" ON public.ugc_email_threads
  FOR ALL USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for ugc_email_messages
CREATE POLICY "Users can view email messages for their brands" ON public.ugc_email_messages
  FOR SELECT USING (
    thread_id IN (
      SELECT id FROM public.ugc_email_threads WHERE brand_id IN (
        SELECT id FROM public.brands WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage email messages for their brands" ON public.ugc_email_messages
  FOR ALL USING (
    thread_id IN (
      SELECT id FROM public.ugc_email_threads WHERE brand_id IN (
        SELECT id FROM public.brands WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for ugc_ai_coordinator
CREATE POLICY "Users can view AI coordinator for their brands" ON public.ugc_ai_coordinator
  FOR SELECT USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage AI coordinator for their brands" ON public.ugc_ai_coordinator
  FOR ALL USING (
    brand_id IN (
      SELECT id FROM public.brands WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for ugc_ai_coordinator_actions
CREATE POLICY "Users can view AI coordinator actions for their brands" ON public.ugc_ai_coordinator_actions
  FOR SELECT USING (
    coordinator_id IN (
      SELECT id FROM public.ugc_ai_coordinator WHERE brand_id IN (
        SELECT id FROM public.brands WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage AI coordinator actions for their brands" ON public.ugc_ai_coordinator_actions
  FOR ALL USING (
    coordinator_id IN (
      SELECT id FROM public.ugc_ai_coordinator WHERE brand_id IN (
        SELECT id FROM public.brands WHERE user_id = auth.uid()
      )
    )
  );

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ugc_email_templates_updated_at BEFORE UPDATE ON public.ugc_email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ugc_email_threads_updated_at BEFORE UPDATE ON public.ugc_email_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ugc_ai_coordinator_updated_at BEFORE UPDATE ON public.ugc_ai_coordinator FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.ugc_email_templates IS 'Email templates for UGC creator automation';
COMMENT ON TABLE public.ugc_email_threads IS 'Email conversation threads with UGC creators';
COMMENT ON TABLE public.ugc_email_messages IS 'Individual email messages in threads';
COMMENT ON TABLE public.ugc_ai_coordinator IS 'AI coordinator configuration and settings';
COMMENT ON TABLE public.ugc_ai_coordinator_actions IS 'Log of all AI coordinator actions and decisions'; 