-- Add n8n Integration Tables for PowerBrief UGC Pipeline
-- Migration to support n8n workflow automation system

-- Brand n8n Workflows Mapping Table
-- Maps PowerBrief brands to their n8n workflows
CREATE TABLE IF NOT EXISTS public.brand_n8n_workflows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  n8n_workflow_id TEXT NOT NULL, -- n8n workflow ID
  template_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(brand_id, template_name)
);

-- n8n Execution Logs Table
-- Track all n8n workflow executions for monitoring and debugging
CREATE TABLE IF NOT EXISTS public.n8n_execution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id TEXT NOT NULL, -- n8n execution ID
  workflow_id TEXT NOT NULL, -- n8n workflow ID
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES public.ugc_creators(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'waiting', 'running')),
  data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- n8n Automation Templates Table
-- Store pre-configured automation templates
CREATE TABLE IF NOT EXISTS public.n8n_automation_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('onboarding', 'script_pipeline', 'rate_negotiation', 'product_shipment', 'contract_signing', 'content_delivery', 'custom')),
  workflow_definition JSONB NOT NULL, -- n8n workflow JSON
  required_variables JSONB DEFAULT '[]'::jsonb, -- Array of required variable names
  optional_variables JSONB DEFAULT '{}'::jsonb, -- Object with default values
  is_system BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Brand Automation Settings Table
-- Store brand-specific automation preferences
CREATE TABLE IF NOT EXISTS public.brand_automation_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  automation_enabled BOOLEAN DEFAULT false,
  default_timezone TEXT DEFAULT 'America/New_York',
  business_hours_start TIME DEFAULT '09:00:00',
  business_hours_end TIME DEFAULT '17:00:00',
  business_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Monday = 1, Sunday = 7
  notification_emails TEXT[] DEFAULT '{}',
  webhook_secret TEXT, -- For webhook validation
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(brand_id)
);

-- Enable RLS on all tables
ALTER TABLE public.brand_n8n_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_automation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_automation_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_n8n_workflows
CREATE POLICY "Users can view their brand's n8n workflows" 
  ON public.brand_n8n_workflows FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM public.brands 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their brand's n8n workflows" 
  ON public.brand_n8n_workflows FOR ALL
  USING (
    brand_id IN (
      SELECT id FROM public.brands 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for n8n_execution_logs  
CREATE POLICY "Users can view their brand's execution logs" 
  ON public.n8n_execution_logs FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM public.brands 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert execution logs" 
  ON public.n8n_execution_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for n8n_automation_templates
CREATE POLICY "Anyone can view automation templates" 
  ON public.n8n_automation_templates FOR SELECT
  USING (true);

CREATE POLICY "Only system can manage automation templates" 
  ON public.n8n_automation_templates FOR ALL
  USING (false); -- Only through direct database access or special service account

-- RLS Policies for brand_automation_settings
CREATE POLICY "Users can manage their brand's automation settings" 
  ON public.brand_automation_settings FOR ALL
  USING (
    brand_id IN (
      SELECT id FROM public.brands 
      WHERE user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_brand_n8n_workflows_brand_id ON public.brand_n8n_workflows(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_n8n_workflows_template_name ON public.brand_n8n_workflows(template_name);
CREATE INDEX IF NOT EXISTS idx_n8n_execution_logs_brand_id ON public.n8n_execution_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_n8n_execution_logs_creator_id ON public.n8n_execution_logs(creator_id);
CREATE INDEX IF NOT EXISTS idx_n8n_execution_logs_status ON public.n8n_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_n8n_execution_logs_created_at ON public.n8n_execution_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_brand_automation_settings_brand_id ON public.brand_automation_settings(brand_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_brand_n8n_workflows_updated_at ON public.brand_n8n_workflows;
CREATE TRIGGER update_brand_n8n_workflows_updated_at
    BEFORE UPDATE ON public.brand_n8n_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_n8n_automation_templates_updated_at ON public.n8n_automation_templates;
CREATE TRIGGER update_n8n_automation_templates_updated_at
    BEFORE UPDATE ON public.n8n_automation_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_brand_automation_settings_updated_at ON public.brand_automation_settings;
CREATE TRIGGER update_brand_automation_settings_updated_at
    BEFORE UPDATE ON public.brand_automation_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default automation templates with SendGrid configuration
INSERT INTO public.n8n_automation_templates (name, description, category, workflow_definition) VALUES
(
  'Creator Onboarding Email Sequence',
  'Automated welcome email sequence for new UGC creators with follow-up',
  'onboarding',
  '{
    "name": "Creator Onboarding Email Sequence",
    "nodes": [
      {
        "parameters": {},
        "id": "start",
        "name": "Start",
        "type": "n8n-nodes-base.start",
        "typeVersion": 1,
        "position": [240, 300]
      },
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "powerbrief-webhook",
          "responseMode": "responseNode",
          "options": {}
        },
        "id": "webhook",
        "name": "PowerBrief Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [460, 300]
      },
      {
        "parameters": {
          "url": "https://api.sendgrid.com/v3/mail/send",
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth",
          "httpMethod": "POST",
          "options": {
            "headers": {
              "Authorization": "Bearer {{sendgridApiKey}}",
              "Content-Type": "application/json"
            },
            "body": {
              "personalizations": [
                {
                  "to": [{"email": "={{$json.creator_email}}"}],
                  "subject": "Welcome to {{brandName}} Creator Program! 🎉"
                }
              ],
              "from": {
                "email": "={{$parameter[\"fromEmail\"]}}",
                "name": "={{$parameter[\"brandName\"]}}"
              },
              "reply_to": {
                "email": "={{$parameter[\"replyToEmail\"]}}",
                "name": "={{$parameter[\"brandName\"]}} Creator Team"
              },
              "content": [
                {
                  "type": "text/html",
                  "value": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\"><h1 style=\"color: #333;\">Welcome {{creator_name}}!</h1><p>We are excited to have you join the <strong>{{brandName}}</strong> creator program.</p><div style=\"background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;\"><h3>Next Steps:</h3><ul><li>Complete your creator profile</li><li>Review our brand guidelines</li><li>Wait for your first script assignment</li></ul></div><p>If you have any questions, feel free to reach out!</p><p>Best regards,<br>The {{brandName}} Team</p></div>"
                }
              ]
            }
          }
        },
        "id": "welcome_email",
        "name": "Send Welcome Email",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [680, 300]
      },
      {
        "parameters": {
          "amount": 1,
          "unit": "days"
        },
        "id": "wait_1_day",
        "name": "Wait 1 Day",
        "type": "n8n-nodes-base.wait",
        "typeVersion": 1,
        "position": [900, 300]
      },
      {
        "parameters": {
          "url": "https://api.sendgrid.com/v3/mail/send",
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth",
          "httpMethod": "POST",
          "options": {
            "headers": {
              "Authorization": "Bearer {{sendgridApiKey}}",
              "Content-Type": "application/json"
            },
            "body": {
              "personalizations": [
                {
                  "to": [{"email": "={{$json.creator_email}}"}],
                  "subject": "How are things going with {{brandName}}?"
                }
              ],
              "from": {
                "email": "={{$parameter[\"fromEmail\"]}}",
                "name": "={{$parameter[\"brandName\"]}}"
              },
              "reply_to": {
                "email": "={{$parameter[\"replyToEmail\"]}}",
                "name": "={{$parameter[\"brandName\"]}} Creator Team"
              },
              "content": [
                {
                  "type": "text/html",
                  "value": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\"><h2>Quick Check-in</h2><p>Hi {{creator_name}},</p><p>Just wanted to check in and see how you are settling into the {{brandName}} creator program.</p><p>Have any questions or need help with anything? Just reply to this email!</p><p>Looking forward to seeing your amazing content!</p><p>Best,<br>The {{brandName}} Team</p></div>"
                }
              ]
            }
          }
        },
        "id": "followup_email",
        "name": "Send Follow-up Email",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [1120, 300]
      },
      {
        "parameters": {
          "url": "{{webhookUrl}}",
          "options": {
            "headers": {
              "Content-Type": "application/json"
            },
            "body": {
              "executionId": "={{$workflow.id}}",
              "workflowId": "={{$workflow.name}}",
              "brandId": "={{$json.brand_id}}",
              "creatorId": "={{$json.creator_id}}",
              "stepName": "onboarding_complete",
              "status": "success",
              "data": {
                "emails_sent": 2,
                "sequence_completed": true
              }
            }
          }
        },
        "id": "notify_completion",
        "name": "Notify PowerBrief",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [1340, 300]
      }
    ],
    "connections": {
      "Start": {
        "main": [
          [
            {
              "node": "PowerBrief Webhook",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "PowerBrief Webhook": {
        "main": [
          [
            {
              "node": "Send Welcome Email",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Send Welcome Email": {
        "main": [
          [
            {
              "node": "Wait 1 Day",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Wait 1 Day": {
        "main": [
          [
            {
              "node": "Send Follow-up Email",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Send Follow-up Email": {
        "main": [
          [
            {
              "node": "Notify PowerBrief",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    }
  }'
),
(
  'Creator Application Acknowledgment',
  'Automatic acknowledgment email when new creators apply or are added manually',
  'onboarding',
  '{
    "name": "Creator Application Acknowledgment",
    "nodes": [
      {
        "parameters": {},
        "id": "start",
        "name": "Start",
        "type": "n8n-nodes-base.start",
        "typeVersion": 1,
        "position": [240, 300]
      },
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "creator-application",
          "responseMode": "responseNode",
          "options": {}
        },
        "id": "webhook",
        "name": "Creator Application Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [460, 300]
      },
      {
        "parameters": {
          "url": "https://api.sendgrid.com/v3/mail/send",
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth",
          "httpMethod": "POST",
          "options": {
            "headers": {
              "Authorization": "Bearer {{sendgridApiKey}}",
              "Content-Type": "application/json"
            },
            "body": {
              "personalizations": [
                {
                  "to": [{"email": "={{$json.creator_email}}"}],
                  "subject": "Thank you for applying to {{brandName}} Creator Program! 📝"
                }
              ],
              "from": {
                "email": "={{$parameter[\"fromEmail\"]}}",
                "name": "={{$parameter[\"brandName\"]}}"
              },
              "reply_to": {
                "email": "={{$parameter[\"replyToEmail\"]}}",
                "name": "={{$parameter[\"brandName\"]}} Creator Team"
              },
              "content": [
                {
                  "type": "text/html",
                  "value": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\"><h1 style=\"color: #333;\">Thank You for Your Application! 📝</h1><p>Hi {{creator_name}},</p><p>Thanks so much for applying to be a creator for <strong>{{brandName}}</strong>!</p><div style=\"background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;\"><h3 style=\"margin-top: 0; color: #28a745;\">What happens next?</h3><p>We are currently reviewing your portfolio and application. Our team carefully evaluates each submission to ensure the best fit for our brand.</p><p><strong>Timeline:</strong> You will hear back from us within 3-5 business days.</p></div><div style=\"background: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;\"><h4 style=\"margin-top: 0; color: #0066cc;\">📋 Application Status</h4><p><strong>Status:</strong> Under Review</p><p><strong>Submitted:</strong> {{application_date}}</p><p><strong>Application ID:</strong> {{creator_id}}</p></div><p>If we think you are a great fit for our creator program, we will reach out with next steps and onboarding information.</p><p>Questions? Just reply to this email – we are here to help!</p><p>Best regards,<br>The {{brandName}} Creator Team</p></div>"
                }
              ]
            }
          }
        },
        "id": "acknowledgment_email",
        "name": "Send Acknowledgment Email",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [680, 300]
      },
      {
        "parameters": {
          "url": "{{webhookUrl}}",
          "options": {
            "headers": {
              "Content-Type": "application/json"
            },
            "body": {
              "executionId": "={{$workflow.id}}",
              "workflowId": "={{$workflow.name}}",
              "brandId": "={{$json.brand_id}}",
              "creatorId": "={{$json.creator_id}}",
              "stepName": "application_acknowledged",
              "status": "success",
              "data": {
                "acknowledgment_sent": true,
                "application_id": "={{$json.creator_id}}",
                "notification_time": "={{new Date().toISOString()}}"
              }
            }
          }
        },
        "id": "notify_completion",
        "name": "Notify PowerBrief",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [900, 300]
      }
    ],
    "connections": {
      "Start": {
        "main": [
          [
            {
              "node": "Creator Application Webhook",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Creator Application Webhook": {
        "main": [
          [
            {
              "node": "Send Acknowledgment Email",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Send Acknowledgment Email": {
        "main": [
          [
            {
              "node": "Notify PowerBrief",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    }
  }'
),
(
  'Script Assignment Notification',
  'Notify creators when new scripts are assigned with detailed information',
  'script_pipeline',
  '{
    "name": "Script Assignment Notification",
    "nodes": [
      {
        "parameters": {},
        "id": "start",
        "name": "Start",
        "type": "n8n-nodes-base.start",
        "typeVersion": 1,
        "position": [240, 300]
      },
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "script-assignment",
          "responseMode": "responseNode",
          "options": {}
        },
        "id": "webhook",
        "name": "Script Assignment Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [460, 300]
      },
      {
        "parameters": {
          "url": "https://api.sendgrid.com/v3/mail/send",
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth",
          "httpMethod": "POST",
          "options": {
            "headers": {
              "Authorization": "Bearer {{sendgridApiKey}}",
              "Content-Type": "application/json"
            },
            "body": {
              "personalizations": [
                {
                  "to": [{"email": "={{$json.creator_email}}"}],
                  "subject": "📝 New Script Assignment from {{brandName}}"
                }
              ],
              "from": {
                "email": "={{$parameter[\"fromEmail\"]}}",
                "name": "={{$parameter[\"brandName\"]}}"
              },
              "reply_to": {
                "email": "={{$parameter[\"replyToEmail\"]}}",
                "name": "={{$parameter[\"brandName\"]}} Creator Team"
              },
              "content": [
                {
                  "type": "text/html",
                  "value": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\"><h1 style=\"color: #333;\">New Script Assigned! 🎬</h1><p>Hi {{creator_name}},</p><p>Great news! You have been assigned a new script from <strong>{{brandName}}</strong>.</p><div style=\"background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;\"><h3 style=\"margin-top: 0; color: #007bff;\">Script Details:</h3><p><strong>Title:</strong> {{script_title}}</p><p><strong>Due Date:</strong> {{due_date}}</p><p><strong>Priority:</strong> {{priority}}</p><p><strong>Description:</strong> {{script_description}}</p></div><div style=\"background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;\"><h4 style=\"margin-top: 0;\">⚡ Action Required</h4><p>Please log into your creator portal to review the full script details and start working on your content.</p></div><p>Best regards,<br>The {{brandName}} Team</p></div>"
                }
              ]
            }
          }
        },
        "id": "assignment_email",
        "name": "Send Assignment Email",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [680, 300]
      },
      {
        "parameters": {
          "url": "{{webhookUrl}}",
          "options": {
            "headers": {
              "Content-Type": "application/json"
            },
            "body": {
              "executionId": "={{$workflow.id}}",
              "workflowId": "={{$workflow.name}}",
              "brandId": "={{$json.brand_id}}",
              "creatorId": "={{$json.creator_id}}",
              "stepName": "script_assigned",
              "status": "success",
              "data": {
                "script_id": "={{$json.script_id}}",
                "assignment_sent": true,
                "notification_time": "={{new Date().toISOString()}}"
              }
            }
          }
        },
        "id": "notify_completion",
        "name": "Notify PowerBrief",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [900, 300]
      }
    ],
    "connections": {
      "Start": {
        "main": [
          [
            {
              "node": "Script Assignment Webhook",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Script Assignment Webhook": {
        "main": [
          [
            {
              "node": "Send Assignment Email",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Send Assignment Email": {
        "main": [
          [
            {
              "node": "Notify PowerBrief",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    }
  }'
),
(
  'Content Submission Reminder',
  'Automated reminders for creators to submit their content',
  'content_delivery',
  '{
    "name": "Content Submission Reminder",
    "nodes": [
      {
        "parameters": {},
        "id": "start",
        "name": "Start",
        "type": "n8n-nodes-base.start",
        "typeVersion": 1,
        "position": [240, 300]
      },
      {
        "parameters": {
          "httpMethod": "POST",
          "path": "content-reminder",
          "responseMode": "responseNode",
          "options": {}
        },
        "id": "webhook",
        "name": "Content Reminder Webhook",
        "type": "n8n-nodes-base.webhook",
        "typeVersion": 1,
        "position": [460, 300]
      },
      {
        "parameters": {
          "amount": 2,
          "unit": "days"
        },
        "id": "wait_2_days",
        "name": "Wait 2 Days",
        "type": "n8n-nodes-base.wait",
        "typeVersion": 1,
        "position": [680, 300]
      },
      {
        "parameters": {
          "url": "https://api.sendgrid.com/v3/mail/send",
          "authentication": "genericCredentialType",
          "genericAuthType": "httpHeaderAuth",
          "httpMethod": "POST",
          "options": {
            "headers": {
              "Authorization": "Bearer {{sendgridApiKey}}",
              "Content-Type": "application/json"
            },
            "body": {
              "personalizations": [
                {
                  "to": [{"email": "={{$json.creator_email}}"}],
                  "subject": "⏰ Friendly Reminder: Content Due Soon for {{brandName}}"
                }
              ],
              "from": {
                "email": "={{$parameter[\"fromEmail\"]}}",
                "name": "={{$parameter[\"brandName\"]}}"
              },
              "reply_to": {
                "email": "={{$parameter[\"replyToEmail\"]}}",
                "name": "={{$parameter[\"brandName\"]}} Creator Team"
              },
              "content": [
                {
                  "type": "text/html",
                  "value": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;\"><h2 style=\"color: #ff6b35;\">Friendly Reminder ⏰</h2><p>Hi {{creator_name}},</p><p>This is a gentle reminder that your content for <strong>{{brandName}}</strong> is due soon.</p><div style=\"background: #fff5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fed7d7;\"><h3 style=\"margin-top: 0; color: #c53030;\">Script: {{script_title}}</h3><p><strong>Due Date:</strong> {{due_date}}</p><p><strong>Days Remaining:</strong> {{days_remaining}}</p></div><p>If you need any help or have questions, please do not hesitate to reach out!</p><p>Thanks for being an amazing creator!</p><p>Best,<br>The {{brandName}} Team</p></div>"
                }
              ]
            }
          }
        },
        "id": "reminder_email",
        "name": "Send Reminder Email",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [900, 300]
      }
    ],
    "connections": {
      "Start": {
        "main": [
          [
            {
              "node": "Content Reminder Webhook",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Content Reminder Webhook": {
        "main": [
          [
            {
              "node": "Wait 2 Days",
              "type": "main",
              "index": 0
            }
          ]
        ]
      },
      "Wait 2 Days": {
        "main": [
          [
            {
              "node": "Send Reminder Email",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    }
  }'
);

-- Add comment explaining the system
COMMENT ON TABLE public.brand_n8n_workflows IS 'Maps PowerBrief brands to their n8n automation workflows';
COMMENT ON TABLE public.n8n_execution_logs IS 'Logs all n8n workflow executions for monitoring and debugging';
COMMENT ON TABLE public.n8n_automation_templates IS 'Pre-configured automation templates that can be instantiated for brands';
COMMENT ON TABLE public.brand_automation_settings IS 'Brand-specific automation preferences and configuration'; 