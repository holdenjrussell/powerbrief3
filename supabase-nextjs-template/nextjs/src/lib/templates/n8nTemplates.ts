/**
 * n8n Automation Templates for PowerBrief
 * 
 * This file contains the template definitions that can be customized
 * before inserting into the database.
 */

// N8n Workflow Type (local definition to avoid import issues)
interface N8nWorkflow {
  id?: string;
  name: string;
  active: boolean;
  tags?: string[];
  nodes: Record<string, unknown>[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

// N8n Automation Template Type
export interface N8nAutomationTemplate {
  name: string;
  description: string;
  category: 'onboarding' | 'script_pipeline' | 'content_delivery' | 'communication' | 'creator_management';
  workflow_definition: Partial<N8nWorkflow>;
  required_variables: string[];
  optional_variables: Record<string, unknown>;
  trigger_events?: string[];
  required_data?: string[];
  configuration_fields?: { name: string; label: string; type: string; default?: string; description?: string }[];
}


export const AUTOMATION_TEMPLATES: N8nAutomationTemplate[] = [
  {
    name: 'creator_application_acknowledgment',
    description: 'Send confirmation email when creator applies to brand',
    category: 'onboarding',
    workflow_definition: {
      name: "Send Confirmation Email For Creator Submission",
      nodes: [
        {
          parameters: {
            method: "POST",
            url: "https://api.sendgrid.com/v3/mail/send",
            authentication: "genericCredentialType",
            genericAuthType: "httpHeaderAuth",
            sendHeaders: true,
            headerParameters: {
              parameters: [
                {
                  name: "Content-Type",
                  value: "application/json"
                }
              ]
            },
            sendBody: true,
            specifyBody: "json",
            jsonBody: "={\n  \"personalizations\": [\n    {\n      \"to\": [\n        {\n          \"email\": \"{{$json.body.creatorEmail}}\",\n          \"name\": \"{{$json.body.creatorName}}\"\n        }\n      ],\n      \"subject\": \"Thanks for applying to {{$json.body.brandName}}!\"\n    }\n  ],\n  \"from\": {\n    \"email\": \"support@powerbrief.ai\",\n    \"name\": \"{{$json.body.brandName}}\"\n  },\n  \"reply_to\": {\n    \"email\": \"{{$json.body.brandEmail}}\",\n    \"name\": \"{{$json.body.brandName}}\"\n  },\n  \"content\": [\n    {\n      \"type\": \"text/html\",\n      \"value\": \"<p>Hi {{$json.body.creatorName}},</p><p>Thanks so much for applying to be a creator for {{$json.body.brandName}}! We are reviewing your portfolio and will get back to you soon if we think you're a great fit.</p><p>Best regards,<br>The {{$json.body.brandName}} Team</p>\"\n    }\n  ]\n}",
            options: {
              redirect: {
                redirect: {}
              }
            }
          },
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 4.2,
          position: [
            460,
            -40
          ],
          id: "f5bda49c-065e-4f38-b931-f90cc9a59357",
          name: "HTTP Request",
          credentials: {
            httpHeaderAuth: "IR5TeZiJLiu40Kb2"
          }
        },
        {
          parameters: {
            httpMethod: "POST",
            path: "powerbrief-creator-application-acknowledgment",
            responseMode: "responseNode",
            options: {
              rawBody: false
            }
          },
          type: "n8n-nodes-base.webhook",
          typeVersion: 2,
          position: [
            220,
            -40
          ],
          id: "e58c7aaa-90d4-4c59-bdfd-2cfb47d9c57e",
          name: "Webhook"
        },
        {
          parameters: {
            respondWith: "json",
            responseBody: "   {\n     \"success\": true,\n     \"message\": \"Email sent successfully\"\n   }",
            options: {
              responseCode: 200
            }
          },
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.4,
          position: [
            660,
            -40
          ],
          id: "f611ca0c-ff5e-4111-bc30-3403ea754b73",
          name: "Respond to Webhook"
        }
      ],
      connections: {
        Webhook: {
          main: [
            [
              {
                node: "HTTP Request",
                type: "main",
                index: 0
              }
            ]
          ]
        },
        "HTTP Request": {
          main: [
            [
              {
                node: "Respond to Webhook",
                type: "main",
                index: 0
              }
            ]
          ]
        }
      },
      active: true,
      settings: {
        executionOrder: "v1"
      },
      meta: {
        instanceId: "a5bc18468da06fe502f370ca500085d808f313ecb13f4d19f5cb9b56b01c904c"
      },
      tags: []
    },
    required_variables: ['creatorEmail', 'creatorName', 'brandName', 'brandEmail'],
    optional_variables: {},
    trigger_events: ['creator_application_submitted'],
    required_data: ['creatorId', 'brandId', 'creatorEmail', 'creatorName', 'brandName', 'brandEmail']
  }
];

/**
 * Helper function to generate SQL INSERT statements for templates
 */
export function generateTemplateInsertSQL(): string {
  const values = AUTOMATION_TEMPLATES.map(template => `
(
  '${template.name}',
  '${template.description}',
  '${template.category}',
  '${JSON.stringify(template.workflow_definition).replace(/'/g, "''")}',
  '${JSON.stringify(template.required_variables)}',
  '${JSON.stringify(template.optional_variables)}'
)`).join(',');

  return `
INSERT INTO public.n8n_automation_templates (name, description, category, workflow_definition, required_variables, optional_variables) VALUES
${values};
`;
} 