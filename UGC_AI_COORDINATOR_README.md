# AI UGC Coordinator System

A comprehensive AI-powered system for managing UGC (User Generated Content) creator relationships, automating email communications, and streamlining the creator pipeline workflow.

## Overview

The AI UGC Coordinator acts as your intelligent assistant for managing creator relationships throughout the entire UGC pipeline. It uses Google's Gemini AI to analyze creator statuses, craft personalized emails, and proactively manage the relationship workflow according to your established SOPs.

## Features

### 🤖 AI-Powered Analysis
- **Pipeline Intelligence**: Automatically analyzes all creators in your pipeline
- **Smart Recommendations**: Provides prioritized action items based on creator status
- **Context-Aware**: Understands your workflow stages and creator history
- **Proactive Monitoring**: Identifies creators who need attention or follow-up

### 📧 Email Automation
- **Template System**: Customizable email templates for different pipeline stages
- **Variable Substitution**: Dynamic content based on creator and script data
- **Thread Management**: Organizes email conversations by creator
- **Email Validation**: Flags creators without valid email addresses
- **One-Click Actions**: Script approval/rejection via email links

### 🔄 Pipeline Integration
- **Onboarding Workflow**: Automated emails for creator onboarding stages
- **Script Pipeline**: Manages script assignment, approval, and production
- **Status Tracking**: Monitors contract, shipping, and payment statuses
- **Multi-Stage Support**: Handles both onboarding and script pipeline workflows

### 💬 Slack Integration
- **Real-Time Notifications**: Updates sent to your Slack workspace
- **Action Alerts**: Notifications when the AI takes actions
- **Pipeline Updates**: Status changes and creator updates
- **Configurable Channels**: Different notifications to different channels

## System Components

### 1. Email Templates & Automation (`ugcEmailService.ts`)
- **Pre-built Templates**: Based on your established SOP
- **Variable System**: Dynamic content insertion
- **Thread Management**: Organized email conversations
- **Automation Triggers**: Status-based email sending

### 2. AI Coordinator (`ugcAiCoordinator.ts`)
- **Gemini Integration**: Uses Gemini 2.5 Pro for analysis
- **Creator Analysis**: Comprehensive status evaluation
- **Email Generation**: AI-crafted personalized emails
- **Action Execution**: Automated task execution
- **Slack Integration**: Proactive team notifications

### 3. Database Schema (`20250115000002_add_ugc_email_automation.sql`)
- **Email Templates**: Customizable template storage
- **Email Threads**: Conversation organization
- **Email Messages**: Individual message tracking
- **AI Coordinator**: Configuration and settings
- **Action Log**: Complete audit trail

### 4. API Endpoints
- **`/api/ugc/ai-coordinator`**: Main coordinator management
- **`/api/ugc/ai-coordinator/analyze`**: Pipeline analysis
- **`/api/ugc/ai-coordinator/execute`**: Action execution
- **`/api/ugc/script-response`**: Email-based script approval

### 5. UI Components (`UgcAiCoordinatorPanel.tsx`)
- **Dashboard**: Overview of pipeline status
- **Actions**: AI-recommended actions
- **Settings**: Coordinator configuration
- **History**: Activity and decision log

## Setup Instructions

### 1. Database Migration
Run the database migration to create the required tables:
```sql
-- Run this migration file:
supabase-nextjs-template/supabase/migrations/20250115000002_add_ugc_email_automation.sql
```

### 2. Environment Variables
Ensure these environment variables are set:
```env
# AI/Gemini Configuration
GOOGLE_API_KEY=your_gemini_api_key
GEMINI_API_KEY=your_gemini_api_key  # Alternative name

# SendGrid Configuration (already existing)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Site URL for email links
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 3. Slack Integration (Optional)
The system integrates with your existing Slack setup. Ensure your Slack webhooks are configured in the brand settings.

### 4. UI Integration
Add the AI UGC Coordinator tab to your existing UGC pipeline page:

```tsx
// In your UGC pipeline page component
import UgcAiCoordinatorPanel from '@/components/ugc-coordinator/UgcAiCoordinatorPanel';

// Add this tab to your existing tabs
<TabsTrigger value="ai-coordinator">AI Coordinator</TabsTrigger>

// Add this tab content
<TabsContent value="ai-coordinator">
  <UgcAiCoordinatorPanel 
    brand={brand} 
    creators={creators} 
    onRefresh={handleRefresh} 
  />
</TabsContent>
```

## Default Email Templates

The system includes pre-built templates based on your SOP:

### Onboarding Templates
1. **Cold Outreach Invite** - Initial creator contact
2. **Rate Request** - Requesting creator rates with sample briefs
3. **Negotiation Follow-Up** - Rate negotiation
4. **Product Shipping Request** - Collecting shipping address

### Script Pipeline Templates
1. **Script Assignment** - New script assignment with approval links
2. **Script Approved - Payment Info** - Payment details collection
3. **Product Not Shipped Warning** - Shipping status alerts
4. **Contract Not Signed Reminder** - Contract completion reminders

All templates include:
- Variable substitution ({{CREATOR_NAME}}, {{SCRIPT_TITLE}}, etc.)
- Professional HTML styling
- Plain text alternatives
- One-click approval/rejection links

## AI Coordinator Capabilities

### Analysis & Recommendations
The AI coordinator analyzes each creator's:
- Current pipeline status
- Contract and payment status
- Product shipment status
- Script assignments and progress
- Communication history
- Time since last interaction

Based on this analysis, it provides:
- **High Priority**: Urgent issues requiring immediate attention
- **Medium Priority**: Important follow-ups and routine tasks
- **Low Priority**: Optimization opportunities and general maintenance

### Email Generation
The AI can generate:
- **Personalized Outreach**: Custom emails based on creator profile
- **Follow-Up Messages**: Context-aware follow-up communications
- **Status Updates**: Progress updates and next steps
- **Problem Resolution**: Addressing specific issues or concerns

### Automation Features
- **Smart Scheduling**: Respects working hours and time zones
- **Approval Workflows**: Manual or automatic action execution
- **Error Handling**: Graceful failure handling with notifications
- **Audit Trail**: Complete log of all AI decisions and actions

## Configuration Options

### Proactivity Levels
- **Low**: Only critical issues and blocking problems
- **Medium**: Balanced approach with regular follow-ups
- **High**: Proactive outreach and optimization

### Automation Settings
- **Auto-Send Emails**: Send emails without manual approval
- **Require Approval**: Manual approval for all actions
- **Email Automation**: Enable/disable email functionality
- **Slack Notifications**: Control Slack integration

### Working Hours
- Configurable time windows for AI activity
- Time zone support
- Respect for creator and team schedules

## Creator Workflow Integration

### Onboarding Pipeline
```
New Creator Submission → Cold Outreach → Primary Screen → 
Backlog → Approved for Next Steps → Schedule Call → 
Call Scheduled → READY FOR SCRIPTS → REJECTED
```

### Script Pipeline
```
Script Approval → Creator Assignment → Send Script to Creator → 
Creator Shooting → Content Approval → To Edit
```

The AI coordinator monitors all stages and provides appropriate interventions.

## Email Response System

### Script Approval Process
1. Creator receives email with script assignment
2. Email includes one-click approve/reject links
3. Approval triggers automated follow-up for payment details
4. Rejection allows creator to provide feedback
5. All responses logged and processed automatically

### Security Features
- **Token-based links**: Secure, time-limited approval tokens
- **24-hour expiration**: Prevents stale link usage
- **User verification**: Ensures only intended recipients can respond

## Monitoring & Analytics

### Action Logging
Every AI decision and action is logged with:
- Timestamp and context
- AI reasoning and analysis
- Success/failure status
- Error messages and debugging info

### Performance Tracking
- Email delivery rates
- Response times
- Action success rates
- Creator engagement metrics

### Slack Notifications
Real-time updates include:
- Pipeline analysis results
- Action execution status
- Error alerts and warnings
- Creator status changes

## Troubleshooting

### Common Issues

1. **AI Coordinator Not Loading**
   - Check Gemini API key configuration
   - Verify database migration has been run
   - Check user permissions for brand access

2. **Emails Not Sending**
   - Verify SendGrid configuration
   - Check creator email addresses
   - Review email template variables

3. **Slack Notifications Not Working**
   - Confirm Slack webhook configuration
   - Check brand Slack settings
   - Verify webhook URL validity

4. **Script Response Links Not Working**
   - Check NEXT_PUBLIC_SITE_URL configuration
   - Verify token hasn't expired (24 hours)
   - Ensure proper URL routing

### Debug Mode
Enable debug logging by checking the AI coordinator action logs in the database:

```sql
SELECT * FROM ugc_ai_coordinator_actions 
WHERE success = false 
ORDER BY created_at DESC;
```

## Future Enhancements

### Planned Features
- **Contract signature integration**: Direct contract signing via email
- **Payment processing automation**: Automated deposit and payment handling
- **Advanced analytics**: Detailed performance metrics and insights
- **Multi-language support**: International creator communications
- **Calendar integration**: Automated scheduling and reminders

### Customization Options
- **Custom AI prompts**: Brand-specific AI behavior
- **Template designer**: Visual email template editor
- **Webhook integrations**: Third-party service connections
- **Advanced scheduling**: Complex automation rules

## Support

For technical support or questions about the AI UGC Coordinator system:

1. Check the action logs for detailed error information
2. Review the database schema for data structure questions
3. Consult the email template variables for customization
4. Use the Slack integration for real-time monitoring

The system is designed to be self-monitoring and self-healing, with comprehensive logging and error handling to ensure reliable operation. 