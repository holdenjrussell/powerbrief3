# SendGrid Email Response System Setup

This guide explains how to set up the email communication system for creator responses across multiple brands.

## Overview

The system allows creators to reply to emails and automatically:
1. **Store** their responses in threaded conversations
2. **Update** creator status based on email content
3. **Trigger** AI analysis for next actions
4. **Scale** across unlimited brands

## Email Routing Strategy

### Unique Email Identifiers (Recommended)
Each brand configures their own unique identifier:
- `glamory-official@mail.powerbrief.ai`
- `skincare-brand@mail.powerbrief.ai`
- `fitness-co@mail.powerbrief.ai`

**Benefits:**
- No name collisions between brands
- Professional, branded email addresses
- Easy to remember and share
- Complete isolation between brands

### Example Email Flow
```
1. Brand sets up identifier: "glamory-official"
2. Send email from: noreply@powerbrief.ai
3. Reply-to header: glamory-official@mail.powerbrief.ai
4. Creator replies to: glamory-official@mail.powerbrief.ai
5. Webhook processes response and identifies brand
6. AI analyzes and takes action
```

## DNS Configuration (with existing Google Workspace)

### Keep Your Existing Google Workspace MX Records
```
Type: MX
Name: @
Value: aspmx.l.google.com
Priority: 1

Type: MX
Name: @
Value: alt1.aspmx.l.google.com
Priority: 5

(etc. - keep all your existing Google MX records)
```

### Add New SendGrid MX for Creator Communications
```
Type: MX
Name: mail
Value: mx.sendgrid.net
Priority: 10
```

## SendGrid Configuration

### 1. Domain Authentication
Set up domain authentication for `powerbrief.ai` in SendGrid:
1. Go to Settings > Sender Authentication
2. Add `powerbrief.ai` domain
3. Verify DNS records

### 2. Inbound Parse Setup
Configure SendGrid to forward ALL emails from the subdomain:

1. Go to Settings > Inbound Parse
2. Add hostname: `mail.powerbrief.ai` (catches all subdomains)
3. URL: `https://powerbrief.ai/api/webhooks/sendgrid-inbound`
4. Check "POST the raw, full MIME message"

## Email Examples

### Your Regular Business Emails (Google Workspace)
- `hello@powerbrief.ai` → Gmail
- `support@powerbrief.ai` → Gmail
- `team@powerbrief.ai` → Gmail

### Brand Creator Communications (SendGrid)
- `glamory-official@mail.powerbrief.ai` → Glamory brand webhook
- `skincare-brand@mail.powerbrief.ai` → Skincare brand webhook
- `fitness-co@mail.powerbrief.ai` → Fitness brand webhook

## Environment Variables

Add to your `.env.local`:
```bash
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@powerbrief.ai
SENDGRID_INBOUND_WEBHOOK_SECRET=your_webhook_secret
```

## Creator Communication Features

### Automatic Thread Management
- Groups related emails by subject and creator
- Stores full conversation history
- Links to creator profiles

### Smart Status Updates
Email content automatically updates creator status:
- "Yes, interested" → `INTERESTED`
- "Need clarification" → `NEEDS_CLARIFICATION`
- "What are your rates?" → `NEGOTIATING_RATES`
- "I'm ready for scripts" → `READY_FOR_SCRIPTS`

### AI Integration
When creators reply:
1. Email stored in database
2. Creator status updated
3. AI coordinator analyzes situation
4. Automatic actions triggered (follow-ups, status changes, etc.)

## Dashboard Integration

### Creator Profile View
Each creator shows:
- Full email thread history
- Sent and received messages
- AI analysis results
- Recommended next actions

### Thread Management
- View complete conversation
- Send manual replies
- See AI-suggested responses
- Track response rates

## Brand Scaling

### Multiple Brand Support
The system handles unlimited brands by:
- Brand-specific reply-to addresses
- Automatic brand identification
- Isolated creator databases per brand
- Brand-specific AI prompts

### Custom Domains (Advanced)
For white-label solutions:
```
From: noreply@yourbrand.com
Reply-To: creators@yourbrand.com
```

## Testing

### Email Flow Test
1. Send test email to creator
2. Have creator reply
3. Check webhook logs
4. Verify thread storage
5. Confirm AI analysis

### Webhook Testing
```bash
# Test with curl
curl -X POST https://yourdomain.com/api/webhooks/sendgrid-inbound \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "to=creators+testbrand@powerbrief.ai&from=creator@test.com&subject=Test&text=I'm interested!"
```

## Monitoring

### Key Metrics
- Email delivery rates
- Response rates by brand
- AI action accuracy
- Thread engagement

### Logs to Watch
- Webhook processing success
- Brand identification accuracy
- Creator matching/creation
- AI analysis triggers

## Troubleshooting

### Common Issues
1. **Webhook not receiving emails**: Check MX records and inbound parse config
2. **Brand not found**: Verify brand name extraction logic
3. **Creator not matched**: Check email address normalization
4. **AI not triggering**: Verify coordinator settings and permissions

### Debug Mode
Add to webhook for testing:
```typescript
console.log('Debug email data:', emailData);
console.log('Extracted brand:', brandIdentifier);
```

## Security

### Webhook Verification
Verify SendGrid webhooks to prevent spam:
```typescript
const signature = request.headers.get('x-twilio-email-event-webhook-signature');
// Verify signature matches your webhook secret
```

### Email Validation
- Validate sender domains
- Check for spam indicators
- Rate limit processing

## Future Enhancements

### Planned Features
- Email template editor in dashboard
- Advanced AI prompts per brand
- Creator communication analytics
- Automated follow-up sequences
- Integration with CRM systems

This system provides a robust foundation for managing creator communications at scale while maintaining brand isolation and AI-powered automation. 

## Brand Management

### Email Identifier Rules
- **Length**: 3-50 characters
- **Format**: Lowercase letters, numbers, hyphens only
- **Unique**: No two brands can have the same identifier
- **Professional**: Cannot start/end with hyphen or have consecutive hyphens

### Suggestions System
- Auto-suggests based on brand name
- Checks availability in real-time
- Shows validation errors instantly
- One-click copy of final email address 