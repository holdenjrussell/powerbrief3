# Creator AI Agent Implementation Guide

This guide will help you set up the AI agent workflow that triggers when a creator status updates to "Approved for Next Steps" and manages ongoing conversations.

## Overview

The system works in this flow:
1. **Manual Process**: Creator status is updated to "Approved for Next Steps" → Triggers n8n workflow
2. **AI Agent**: n8n sends personalized email to creator and waits for response
3. **Response Handling**: When creator responds → Triggers second webhook with AI analysis
4. **Conversation Management**: AI determines next steps and updates creator status
5. **Status Tracking**: All conversations are tracked in the creator inbox

## Environment Variables Setup

### ☐ Add Environment Variables

Add these to your `.env.local` file:

```bash
# Creator Approved Workflow
NEXT_PUBLIC_N8N_CREATOR_APPROVED=https://primary-production-f140.up.railway.app/webhook-test/867ac9d6-87ac-4c91-b8d5-4ff8a73111b1

# Creator Response Workflow  
NEXT_PUBLIC_N8N_CREATOR_APPROVED_RESPONSE=https://primary-production-f140.up.railway.app/webhook-test/7c0199be-6b31-4d1a-8b39-5e46947cb123
```

## Database Setup

### ☐ Run Database Migration

Run the migration to add the new workflow to all brands:

```bash
# From supabase-nextjs-template directory
npx supabase migration new add_creator_approved_workflow
```

Copy the contents from `supabase/migrations/20250203000000_add_creator_approved_workflow.sql` and run:

```bash
npx supabase db push
```

## n8n Workflow Setup

### ☐ Import n8n Workflow

1. **Open your n8n instance**
2. **Import the workflow**:
   - Go to Workflows → Import from File
   - Upload the `n8n-creator-approved-ai-agent-workflow.json` file
   - The workflow will be imported as "PowerBrief - Creator Approved AI Agent"

3. **Configure Credentials**:
   - **SendGrid API Key**: Add your SendGrid API key as "sendgrid_api_key"
   - **Google AI**: Configure Google AI (Gemini) credentials for the AI nodes

4. **Update Webhook URLs**:
   - The workflow has two webhooks:
     - `creator-approved`: For initial trigger (your first env variable)
     - `creator-response`: For responses (your second env variable)
   - Copy these webhook URLs from n8n and update your environment variables

5. **Activate the workflow**

### ☐ Test n8n Workflow

Test the initial trigger:

```bash
curl -X POST "YOUR_N8N_CREATOR_APPROVED_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "brandId": "test-brand-id",
    "creatorId": "test-creator-id", 
    "workflowName": "creator_approved_for_next_steps",
    "brand": {
      "id": "test-brand-id",
      "name": "Test Brand",
      "email_identifier": "testbrand"
    },
    "creator": {
      "id": "test-creator-id",
      "name": "Test Creator",
      "email": "test@example.com"
    }
  }'
```

## PowerBrief Configuration

### ☐ Enable Workflow for Brand

1. **Go to Brand Automation Settings**:
   - Navigate to `/app/powerbrief/[brandId]/ugc-pipeline` 
   - Click on "Automation" tab
   - Find "Creator Approved AI Agent"
   - Toggle it ON

### ☐ Test Creator Status Update

Test the status update trigger:

```bash
curl -X PATCH "http://localhost:3000/api/ugc/creators/CREATOR_ID/status" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Approved for Next Steps",
    "brandId": "BRAND_ID"  
  }'
```

This should trigger the n8n workflow automatically.

### ☐ Test Email Response Flow

1. **Send a test email** to the brand's email address (e.g., `testbrand@mail.powerbrief.ai`)
2. **The system should**:
   - Capture the email via SendGrid inbound webhook
   - Process it through `ugcEmailResponseHandler`  
   - Send response data to n8n response webhook
   - n8n should analyze and respond with AI

## Email Integration Setup

### ☐ Configure SendGrid Inbound Parsing

Make sure SendGrid inbound email parsing is configured:

1. **SendGrid Settings** → **Inbound Parse**
2. **Add your domain**: `mail.powerbrief.ai`
3. **Webhook URL**: `https://your-domain.com/api/webhooks/sendgrid-inbound`
4. **Check "POST the raw, full MIME message"**

### ☐ Test Email Processing

Send an email to `[brand-identifier]@mail.powerbrief.ai` and verify:
- Email appears in creator inbox
- If creator has "Approved for Next Steps" status, it triggers n8n response webhook

## Creator Inbox Integration

### ☐ Verify Conversation Tracking

The AI agent conversations should appear in:
- **Creator Inbox**: `/app/powerbrief/[brandId]/ugc-pipeline/inbox`
- **Individual Creator View**: Shows conversation history
- **Email threads**: Properly threaded conversations
- **Both directions**: AI messages AND creator replies are tracked

### ☐ Message Storage Flow

**How messages are tracked:**

1. **AI Sends Email** → n8n calls `/api/ugc/email/store-outbound` → Stored in `ugc_email_messages`
2. **Creator Replies** → SendGrid webhook → `ugcEmailResponseHandler` → Stored in `ugc_email_messages`
3. **AI Responds** → n8n calls `/api/ugc/email/store-outbound` again → Stored in `ugc_email_messages`
4. **All messages** appear threaded in creator inbox

**Message metadata includes:**
- Source: `"n8n_ai_agent"` for AI messages
- Message type: `"initial_approval_message"`, `"ai_response_message"`
- Workflow execution ID for tracking
- AI generated flag: `true`

### ☐ Check AI Conversation Status

When AI agent is active, creator status should update to:
- `"AI Conversation Active"` - During active conversation
- `"READY FOR SCRIPTS"` - When conversation is complete
- Custom statuses based on AI analysis

## Testing Checklist

### ☐ End-to-End Test

1. **Create a test creator**
2. **Update status to "Approved for Next Steps"**
3. **Verify AI email is sent**  
4. **Reply to the email**
5. **Check AI responds appropriately**
6. **Verify status updates correctly**
7. **Check conversation appears in inbox**

### ☐ Test Different Response Types

Test AI handling of:

- ☐ **Complete information** (shipping + payment)
- ☐ **Partial information** (missing shipping or payment)  
- ☐ **Questions** (creator asks clarifying questions)
- ☐ **Hesitation** (creator seems unsure)
- ☐ **Enthusiasm** (creator is very excited)

### ☐ Test Brand-Specific Configuration

- ☐ **Enable/disable workflow** per brand
- ☐ **Different brand email identifiers**
- ☐ **Multiple brands simultaneously**

## Status Updates Reference

The AI agent uses these status transitions:

```
Approved for Next Steps → AI Conversation Active → [Various end states]
```

**Possible end states from AI**:
- `READY FOR SCRIPTS` - Creator provided all info, ready for work
- `NEEDS_INFO` - Still waiting for shipping/payment details  
- `QUESTIONS_PENDING` - Creator has questions to answer
- `NEGOTIATING_RATES` - Discussing compensation
- `NOT_INTERESTED` - Creator declined collaboration

## Troubleshooting

### ☐ Common Issues

**Workflow not triggering:**
- Check environment variables are set correctly
- Verify brand has workflow enabled in automation settings
- Check n8n workflow is active

**AI responses not working:**
- Verify Google AI credentials in n8n
- Check SendGrid API key is configured
- Ensure response webhook URL is correct

**Email threading issues:**
- Check SendGrid inbound parsing is configured
- Verify brand email identifier exists
- Check email subject normalization

**Status not updating:**
- Check n8n callback URL is accessible
- Verify creator and brand IDs are correct
- Check API endpoint authentication

### ☐ Debugging

**Enable verbose logging:**
```bash
VERBOSE_LOGGING=true
```

**Check logs for:**
- n8n webhook triggers
- Email processing
- AI response generation
- Status update callbacks

## Advanced Configuration

### ☐ Customize AI Prompts

Edit the n8n workflow to customize:
- Initial email tone and content
- Response analysis logic  
- Status transition rules
- Follow-up sequences

### ☐ Add More Conversation Flows

Extend the AI agent to handle:
- Contract negotiation
- Scheduling calls
- Product questions
- Rate discussions

### ☐ Integration with Other Systems

The AI agent can be extended to:
- Create calendar events
- Generate contracts automatically
- Update CRM systems
- Send Slack notifications

## Completion Checklist

- ☐ Environment variables configured
- ☐ Database migration applied  
- ☐ n8n workflow imported and active
- ☐ SendGrid credentials configured
- ☐ Brand automation enabled
- ☐ Email inbound parsing working
- ☐ Creator inbox displaying conversations
- ☐ End-to-end test completed successfully
- ☐ Multiple response types tested
- ☐ Status transitions working correctly

## Next Steps

Once implemented, you can:
1. **Monitor AI conversations** in the creator inbox
2. **Adjust AI prompts** based on creator responses
3. **Add more workflow triggers** for other creator statuses
4. **Expand to other communication channels** (SMS, Slack, etc.)
5. **Add conversation analytics** and reporting

The system is designed to scale and can handle multiple brands and creators simultaneously while maintaining conversation context and proper email threading. 