# Complete UGC Dashboard Implementation Guide

## Overview

This document provides comprehensive implementation details for the UGC (User Generated Content) dashboard system with three main components:

1. **Payments Dashboard** - Financial tracking, budgets, and payment management
2. **Contracts Dashboard** - Digital contract management with OpenSign integration
3. **Shipments Dashboard** - Fulfillment workflow with Slack integration

## Database Schema

### Core Tables

```sql
-- Monthly Budget Tracking
CREATE TABLE public.ugc_monthly_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  month_year DATE NOT NULL, -- First day of the month (e.g., 2025-01-01)
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
  payment_method TEXT, -- 'paypal', 'bank_transfer', 'check', etc.
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
  contract_data JSONB DEFAULT '{}', -- Stores filled template data
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

-- Contract Templates
CREATE TABLE public.ugc_contract_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  contract_type TEXT DEFAULT 'creator_agreement' CHECK (contract_type IN ('creator_agreement', 'nda', 'usage_rights', 'custom')),
  template_content TEXT NOT NULL, -- HTML/PDF template with placeholders
  required_fields JSONB DEFAULT '[]', -- Array of required field names
  optional_fields JSONB DEFAULT '[]', -- Array of optional field names
  opensign_template_id TEXT,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
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
  products JSONB NOT NULL DEFAULT '[]', -- Array of product objects
  shipping_address JSONB NOT NULL, -- Complete address object
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'packed', 'shipped', 'in_transit', 'delivered', 'returned', 'cancelled')),
  priority TEXT DEFAULT 'standard' CHECK (priority IN ('low', 'standard', 'high', 'urgent')),
  shipping_method TEXT, -- 'standard', 'express', 'overnight'
  carrier TEXT, -- 'ups', 'fedex', 'usps', 'dhl'
  tracking_number TEXT,
  tracking_url TEXT,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  shipping_cost DECIMAL(10,2),
  weight_lbs DECIMAL(8,2),
  dimensions JSONB, -- {length, width, height}
  special_instructions TEXT,
  slack_notification_sent BOOLEAN DEFAULT false,
  slack_message_ts TEXT, -- Slack message timestamp for updates
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
```

## API Endpoints

### Payments API

#### GET `/api/ugc/payments/dashboard`
Returns comprehensive payment dashboard data including overview metrics, categorized payments, and analytics.

**Query Parameters:**
- `brandId` (required): Brand UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalPaid": 15000,
      "totalDue": 5000,
      "totalOverdue": 1200,
      "monthlyBudget": {
        "budget_amount": 20000,
        "spent_amount": 15000,
        "remaining_amount": 5000,
        "percentage_used": 75
      }
    },
    "payments": {
      "due": [...],
      "overdue": [...],
      "recent": [...],
      "upcoming": [...]
    },
    "analytics": {
      "monthlySpend": [...],
      "paymentsByType": [...],
      "creatorPayments": [...]
    }
  }
}
```

#### POST `/api/ugc/payments`
Creates a new payment record.

#### PUT `/api/ugc/payments/[id]`
Updates payment status and details.

#### POST `/api/ugc/payments/[id]/reminder`
Sends payment reminder to creator.

#### GET `/api/ugc/payments/export`
Exports payment data as CSV.

### Contracts API

#### GET `/api/ugc/contracts/dashboard`
Returns contract dashboard data with overview and categorized contracts.

#### POST `/api/ugc/contracts`
Creates new contract from template.

#### POST `/api/ugc/contracts/[id]/send`
Sends contract to creator via OpenSign.

#### POST `/api/ugc/contracts/[id]/reminder`
Sends signing reminder.

#### POST `/api/ugc/contracts/webhook`
OpenSign webhook endpoint for status updates.

### Shipments API

#### GET `/api/ugc/shipments/dashboard`
Returns shipment dashboard data.

#### POST `/api/ugc/shipments`
Creates new shipment.

#### PUT `/api/ugc/shipments/[id]`
Updates shipment status and tracking.

#### POST `/api/ugc/shipments/[id]/slack-notify`
Sends Slack notification to fulfillment team.

## OpenSign Integration Specifications

### Overview
OpenSign is an open-source alternative to DocuSign that provides digital signature capabilities. It can be self-hosted for complete data privacy and control.

### Setup Requirements

1. **Self-Hosted OpenSign Instance**
   ```bash
   # Docker deployment
   docker run -d \
     --name opensign \
     -p 3000:3000 \
     -e DATABASE_URL="postgresql://user:pass@localhost:5432/opensign" \
     -e NEXTAUTH_SECRET="your-secret-key" \
     -e NEXTAUTH_URL="https://your-opensign-domain.com" \
     opensignlabs/opensign:latest
   ```

2. **Environment Variables**
   ```env
   OPENSIGN_API_URL=https://your-opensign-domain.com/api
   OPENSIGN_API_KEY=your-api-key
   OPENSIGN_WEBHOOK_URL=https://your-app.com/api/ugc/contracts/webhook
   OPENSIGN_WEBHOOK_SECRET=your-webhook-secret
   ```

### API Integration

#### Authentication
```typescript
const opensignHeaders = {
  'Authorization': `Bearer ${process.env.OPENSIGN_API_KEY}`,
  'Content-Type': 'application/json'
};
```

#### Create Document from Template
```typescript
async function createContractFromTemplate(templateId: string, contractData: any) {
  const response = await fetch(`${process.env.OPENSIGN_API_URL}/documents`, {
    method: 'POST',
    headers: opensignHeaders,
    body: JSON.stringify({
      templateId,
      title: contractData.contract_title,
      signers: [
        {
          email: contractData.creator_email,
          name: contractData.creator_name,
          role: 'signer'
        }
      ],
      fields: contractData.contract_data,
      expiresAt: contractData.expires_at
    })
  });
  
  return response.json();
}
```

#### Send Document for Signature
```typescript
async function sendDocumentForSignature(documentId: string) {
  const response = await fetch(`${process.env.OPENSIGN_API_URL}/documents/${documentId}/send`, {
    method: 'POST',
    headers: opensignHeaders
  });
  
  return response.json();
}
```

#### Get Document Status
```typescript
async function getDocumentStatus(documentId: string) {
  const response = await fetch(`${process.env.OPENSIGN_API_URL}/documents/${documentId}`, {
    headers: opensignHeaders
  });
  
  return response.json();
}
```

### Webhook Implementation

#### Webhook Endpoint (`/api/ugc/contracts/webhook`)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-opensign-signature');
  
  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.OPENSIGN_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');
  
  if (signature !== `sha256=${expectedSignature}`) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const event = JSON.parse(body);
  
  switch (event.type) {
    case 'document.viewed':
      await updateContractStatus(event.data.documentId, 'viewed', {
        viewed_at: new Date().toISOString()
      });
      break;
      
    case 'document.signed':
      await updateContractStatus(event.data.documentId, 'signed', {
        signed_at: new Date().toISOString(),
        signed_document_url: event.data.documentUrl
      });
      break;
      
    case 'document.completed':
      await updateContractStatus(event.data.documentId, 'completed');
      break;
      
    case 'document.expired':
      await updateContractStatus(event.data.documentId, 'expired');
      break;
  }
  
  return NextResponse.json({ success: true });
}
```

### Template Management

#### Template Structure
```json
{
  "name": "Creator Agreement Template",
  "description": "Standard creator collaboration agreement",
  "contract_type": "creator_agreement",
  "template_content": "<!DOCTYPE html>...",
  "required_fields": [
    "creator_name",
    "creator_email",
    "payment_amount",
    "deliverables",
    "deadline"
  ],
  "optional_fields": [
    "special_requirements",
    "usage_rights_duration"
  ]
}
```

#### Dynamic Field Replacement
```typescript
function populateTemplate(templateContent: string, contractData: Record<string, any>) {
  let populatedContent = templateContent;
  
  Object.entries(contractData).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    populatedContent = populatedContent.replace(
      new RegExp(placeholder, 'g'), 
      String(value.value)
    );
  });
  
  return populatedContent;
}
```

## Slack Integration Specifications

### Overview
Slack integration provides real-time notifications to fulfillment teams when new shipments are created or status updates occur.

### Setup Requirements

1. **Slack App Configuration**
   - Create Slack app in your workspace
   - Enable Incoming Webhooks
   - Add webhook URL to brand configuration

2. **Brand Configuration**
   ```json
   {
     "slack_config": {
       "fulfillment_webhook_url": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
       "fulfillment_channel": "#fulfillment",
       "notification_enabled": true
     }
   }
   ```

### Webhook Message Formats

#### New Shipment Notification
```typescript
interface SlackShipmentMessage {
  text: string;
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🚚 New Shipment Request"
      }
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Creator:* ${creatorName}`
        },
        {
          type: "mrkdwn",
          text: `*Priority:* ${priority}`
        },
        {
          type: "mrkdwn",
          text: `*Products:* ${productCount} items`
        },
        {
          type: "mrkdwn",
          text: `*Destination:* ${city}, ${state}`
        }
      ]
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Shipping Address:*\n${formattedAddress}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Products to Ship:*\n${productList}`
      }
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View in Dashboard"
          },
          url: `${dashboardUrl}/shipments/${shipmentId}`,
          style: "primary"
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Mark Processing"
          },
          action_id: "mark_processing",
          value: shipmentId
        }
      ]
    }
  ]
}
```

#### Status Update Notification
```typescript
async function sendStatusUpdateNotification(shipment: UgcShipment, oldStatus: string, newStatus: string) {
  const message = {
    text: `Shipment ${shipment.shipment_title} status updated`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `📦 *${shipment.shipment_title}* status changed from \`${oldStatus}\` to \`${newStatus}\``
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Creator: ${shipment.creator_name} | ${new Date().toLocaleString()}`
          }
        ]
      }
    ]
  };

  if (shipment.tracking_number) {
    message.blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Tracking Number:* \`${shipment.tracking_number}\``
      },
      accessory: {
        type: "button",
        text: {
          type: "plain_text",
          text: "Track Package"
        },
        url: shipment.tracking_url
      }
    });
  }

  return sendSlackMessage(shipment.brand_id, message);
}
```

### Interactive Components

#### Slack Actions Handler
```typescript
// /api/slack/actions
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const payload = JSON.parse(formData.get('payload') as string);
  
  if (payload.actions[0].action_id === 'mark_processing') {
    const shipmentId = payload.actions[0].value;
    
    // Update shipment status
    await updateShipmentStatus(shipmentId, 'processing');
    
    // Update the original message
    return NextResponse.json({
      replace_original: true,
      text: "Shipment marked as processing ✅",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `✅ Shipment marked as processing by <@${payload.user.id}>`
          }
        }
      ]
    });
  }
  
  return NextResponse.json({ success: true });
}
```

### Message Threading

#### Update Existing Messages
```typescript
async function updateSlackMessage(shipment: UgcShipment, newStatus: string) {
  if (!shipment.slack_message_ts) return;
  
  const slackConfig = await getBrandSlackConfig(shipment.brand_id);
  
  await fetch('https://slack.com/api/chat.update', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${slackConfig.bot_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel: slackConfig.fulfillment_channel,
      ts: shipment.slack_message_ts,
      text: `Shipment ${shipment.shipment_title} - ${newStatus}`,
      blocks: generateUpdatedBlocks(shipment, newStatus)
    })
  });
}
```

## Component Architecture

### Dashboard Navigation
```typescript
// Main dashboard component with tabbed interface
export default function UgcDashboards({ brandId }: { brandId: string }) {
  const [activeTab, setActiveTab] = useState<'payments' | 'contracts' | 'shipments'>('payments');
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="payments">💰 Payments</TabsTrigger>
          <TabsTrigger value="contracts">📄 Contracts</TabsTrigger>
          <TabsTrigger value="shipments">📦 Shipments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="payments">
          <PaymentsDashboard brandId={brandId} />
        </TabsContent>
        
        <TabsContent value="contracts">
          <ContractsDashboard brandId={brandId} />
        </TabsContent>
        
        <TabsContent value="shipments">
          <ShipmentsDashboard brandId={brandId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Shared Components
- `StatusBadge` - Consistent status indicators across all dashboards
- `PriorityBadge` - Priority level indicators
- `ActionButtons` - Standardized action button groups
- `SearchAndFilter` - Reusable search and filter interface
- `ExportButton` - Data export functionality

## Security Considerations

### Data Protection
1. **RLS Policies**: All tables have Row Level Security enabled
2. **Brand Access Control**: Users can only access data for brands they have permission to view
3. **Webhook Verification**: All webhooks verify signatures to prevent unauthorized access
4. **API Authentication**: All API endpoints require valid user authentication

### OpenSign Security
1. **Self-Hosted**: Complete control over document data
2. **Encrypted Storage**: Documents encrypted at rest
3. **Audit Trail**: Complete signature audit trail
4. **Access Control**: Role-based access to documents

### Slack Security
1. **Webhook URLs**: Secure webhook URLs with proper validation
2. **Message Encryption**: Sensitive data not exposed in Slack messages
3. **Access Control**: Channel-based access control for notifications

## Deployment Checklist

### Database Setup
- [ ] Run migration files in order
- [ ] Verify RLS policies are active
- [ ] Test database functions
- [ ] Set up proper indexes

### OpenSign Setup
- [ ] Deploy OpenSign instance
- [ ] Configure environment variables
- [ ] Set up webhook endpoints
- [ ] Test document creation and signing flow
- [ ] Create default contract templates

### Slack Setup
- [ ] Create Slack app
- [ ] Configure incoming webhooks
- [ ] Set up interactive components
- [ ] Test notification delivery
- [ ] Configure brand-specific channels

### Application Deployment
- [ ] Deploy dashboard components
- [ ] Configure API endpoints
- [ ] Test all integrations
- [ ] Set up monitoring and logging
- [ ] Configure error handling

## Testing Strategy

### Unit Tests
- Component rendering and interaction
- API endpoint functionality
- Database operations
- Webhook processing

### Integration Tests
- OpenSign document lifecycle
- Slack notification delivery
- Payment processing workflow
- Contract signing flow

### End-to-End Tests
- Complete payment workflow
- Contract creation to signing
- Shipment creation to delivery
- Multi-user collaboration scenarios

## Monitoring and Analytics

### Key Metrics
- Payment processing times
- Contract signing rates
- Shipment delivery performance
- User engagement with dashboards

### Error Tracking
- API endpoint failures
- Webhook delivery failures
- Integration service downtime
- User interface errors

### Performance Monitoring
- Dashboard load times
- Database query performance
- External service response times
- User session analytics

## Future Enhancements

### Planned Features
1. **Advanced Analytics**: Predictive analytics for payment and delivery times
2. **Mobile App**: Native mobile app for on-the-go management
3. **AI Integration**: Automated contract generation and risk assessment
4. **Multi-Currency**: Support for international payments and contracts
5. **Advanced Reporting**: Custom report builder with export options

### Integration Opportunities
1. **Accounting Software**: QuickBooks, Xero integration
2. **Shipping Carriers**: Direct API integration with UPS, FedEx, DHL
3. **Payment Processors**: Stripe, PayPal, bank transfer automation
4. **CRM Systems**: Salesforce, HubSpot integration
5. **Project Management**: Asana, Monday.com workflow integration

This comprehensive implementation provides a robust foundation for UGC campaign management with full financial, legal, and operational oversight capabilities.