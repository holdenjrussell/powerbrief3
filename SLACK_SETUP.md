# Slack Integration Setup Guide

This guide will help you set up Slack notifications for your PowerBrief application.

## Quick Setup (Recommended)

### Step 1: Create Slack App with Manifest

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From an app manifest"**
3. Select your workspace and click **"Next"**
4. Copy and paste the following manifest:

```json
{
  "display_information": {
    "name": "PowerBrief Notifications",
    "description": "Get notified when new ad batches are published from PowerBrief",
    "background_color": "#2563eb",
    "long_description": "This app sends notifications to your Slack workspace when new ad batches are published through PowerBrief. Stay updated on your advertising campaigns and ad launches in real-time."
  },
  "features": {
    "bot_user": {
      "display_name": "PowerBrief",
      "always_online": false
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "incoming-webhook"
      ]
    }
  },
  "settings": {
    "interactivity": {
      "is_enabled": false
    },
    "org_deploy_enabled": false,
    "socket_mode_enabled": false,
    "token_rotation_enabled": false
  }
}
```

5. Click **"Next"** → **"Create"**

### Step 2: Set Up Webhook

1. In your newly created app, go to **"Incoming Webhooks"** in the left sidebar
2. Click **"Add New Webhook to Workspace"**
3. Choose the channel where you want to receive notifications
4. Click **"Allow"**
5. Copy the webhook URL (starts with `https://hooks.slack.com/`)

### Step 3: Configure in PowerBrief

1. Go to your brand settings in PowerBrief
2. Find the **"Slack Integration"** section
3. Paste your webhook URL
4. Optionally specify a default channel name
5. Configure specific channels for different notification types (optional)
6. Enable notifications
7. Test the webhook to ensure it's working
8. Save your settings

## Manual Setup (Alternative)

If you prefer to set up the app manually:

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Name your app (e.g., "Ad Brief Notifications") and select your workspace
4. Go to **"Incoming Webhooks"** in the left sidebar
5. Toggle **"Activate Incoming Webhooks"** to On
6. Click **"Add New Webhook to Workspace"**
7. Choose the channel where you want notifications
8. Copy the webhook URL that starts with `https://hooks.slack.com/`

## Channel Configuration

PowerBrief supports sending different types of notifications to different Slack channels. This allows you to organize your workflow and ensure the right people see the right notifications.

### Default Channel
Set a default channel that will be used for all notifications unless a specific channel is configured for that notification type.

### Specific Channels
Configure specific channels for different notification types:

- **Concept Submissions** - When creators submit concepts for review
- **Revision Requests** - When reviewers request changes to concepts  
- **Concept Approvals** - When concepts are approved and ready for upload
- **Concept Ready for Editor** - When concepts are marked ready for editor/designer review
- **Ad Launches** - When ads are successfully published to Meta

### Channel Priority
The system uses the following priority order when determining which channel to use:

1. **Specific Channel** - If configured for the notification type
2. **Default Channel** - If no specific channel is set
3. **Webhook Default** - If no channels are configured in PowerBrief

### Example Setup
```
Default Channel: #general
Concept Submissions: #creative-submissions  
Revision Requests: #creative-revisions
Concept Approvals: #creative-approvals
Concept Ready for Editor: #creative-ready-for-editor
Ad Launches: #ad-launches
```

With this setup:
- Concept submissions go to `#creative-submissions`
- Revision requests go to `#creative-revisions`  
- Concept approvals go to `#creative-approvals`
- Concepts ready for editor go to `#creative-ready-for-editor`
- Ad launches go to `#ad-launches`
- Any other notifications go to `#general`

## Notification Types

PowerBrief sends notifications for the following events:

### 1. Ad Batch Published
When ads are successfully published to Meta, you'll receive notifications like this:

```
✅ New Ad Batch Published

Brand: Your Brand Name
Batch: Campaign Batch #1
Campaign: Summer Sale Campaign
Ad Set: Lookalike Audience - Purchase

Total Ads: 5
Successful: 5
Failed: 0
Status: All Success

Ads Launched:
• Summer Sale Video Ad 1
• Summer Sale Image Ad 2
• Summer Sale Carousel Ad 3
• Summer Sale Story Ad 4
• Summer Sale Feed Ad 5

[View in Ads Manager] (if available)

Published at 12/15/2024, 2:30:45 PM
```

### 2. Concept Submitted for Review
When a concept is submitted for review (either via Frame.io link or uploaded assets):

```
📝 New Concept Submitted for Review

Brand: Your Brand Name
Batch: Summer Campaign
Concept: Product Demo Video
Creator: John Doe

Content Type: 📁 Uploaded Assets
(or 🔗 Frame.io Link)

[View Public Share] [Review & Approve]

Submitted at 12/15/2024, 2:30:45 PM
```

### 3. Concept Revisions Requested
When a reviewer requests revisions on a concept:

```
🔄 Concept Revisions Requested

Brand: Your Brand Name
Batch: Summer Campaign
Concept: Product Demo Video
Creator: John Doe

Feedback: Please adjust the lighting in the first scene and make the call-to-action more prominent.

Next Steps: Please review the feedback, make the requested changes, and resubmit the concept for review.

[View & Revise] [Review Dashboard]

Revisions requested at 12/15/2024, 2:30:45 PM
```

### 4. Concept Approved
When a concept is approved and ready for Meta upload:

```
✅ Concept Approved!

Brand: Your Brand Name
Batch: Summer Campaign
Concept: Product Demo Video
Creator: John Doe

Reviewer Notes: Great work! The lighting looks perfect now.

Status: ✅ Ready for Meta upload via the Ad Upload Tool

[View Concept] [Upload to Meta]

Approved at 12/15/2024, 2:30:45 PM
```

### 5. Concept Ready for Editor
When a concept is marked ready for editor/designer review:

```
✅ Concept Ready for Editor

Brand: Your Brand Name
Batch: Summer Campaign
Concept: Product Demo Video
Assigned Editor: John Doe
Assigned Strategist: Jane Smith

[View Concept] [View Batch]

Ready for editor at 12/15/2024, 2:30:45 PM
```

## Troubleshooting

### Common Issues

1. **"Invalid webhook URL"**
   - Ensure the URL starts with `https://hooks.slack.com/`
   - Make sure you copied the complete URL

2. **"Test message failed"**
   - Check that the webhook is still active in your Slack app
   - Verify the channel still exists
   - Ensure the app has permission to post to the channel

3. **"No notifications received"**
   - Check that notifications are enabled in your brand settings
   - Verify the webhook URL is correct
   - Test the webhook using the test button

4. **"Notifications going to wrong channel"**
   - Check your channel configuration in Advanced Settings
   - Verify channel names don't include the # symbol (it's added automatically)
   - Ensure the channels exist and the app has permission to post

### Getting Help

If you encounter issues:

1. Use the **"Test Webhook"** button in the Slack Integration settings
2. Check the browser console for error messages
3. Verify your Slack app permissions
4. Ensure the webhook URL is correctly copied

## Channel Override

You can specify different channels for notifications in two ways:

### Method 1: Default Channel Override
1. Enter the channel name in the "Default Channel" field (with or without #)
2. This channel will be used for all notifications unless specific channels are configured

### Method 2: Advanced Channel Settings
1. Click "Advanced Channel Settings" to expand the configuration
2. Configure specific channels for each notification type
3. Leave fields empty to use the default channel
4. Channel names can be entered with or without the # symbol

**Important Notes:**
- All channels must exist and the app must have permission to post there
- Channel names are case-sensitive
- Private channels require the app to be invited to the channel

## Security Notes

- Webhook URLs are stored securely in your database
- Only users with access to your brand can configure Slack settings
- Webhook URLs can be regenerated in Slack if compromised
- No sensitive ad data is included in notifications (only names and counts)
- Public share links in notifications are the same ones you would manually share with team members

## Workflow Integration

The Slack notifications integrate seamlessly with your PowerBrief workflow:

1. **Content Creation**: Creators submit concepts via public share links
2. **Review Process**: Notifications alert reviewers of new submissions
3. **Feedback Loop**: Revision requests are automatically communicated
4. **Approval**: Approved concepts trigger notifications with upload links
5. **Publishing**: Final ad launches are reported with performance links

This ensures your entire team stays informed throughout the creative and advertising process.

## Best Practices

### Channel Organization
- Use dedicated channels for different notification types to reduce noise
- Consider creating channels like:
  - `#creative-submissions` for new concept submissions
  - `#creative-feedback` for revision requests
  - `#creative-approvals` for approved concepts
  - `#ad-launches` for published ads

### Team Setup
- Invite relevant team members to appropriate channels
- Use channel-specific notifications to ensure the right people are alerted
- Consider using different channels for different brands if you manage multiple

### Notification Management
- Test your webhook setup before going live
- Regularly review and update channel configurations
- Monitor notification volume and adjust channels as needed 