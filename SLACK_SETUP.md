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
4. Optionally specify a channel name to override the default
5. Enable notifications
6. Test the webhook to ensure it's working
7. Save your settings

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

## Notification Format

When ads are published, you'll receive notifications like this:

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

### Getting Help

If you encounter issues:

1. Use the **"Test Webhook"** button in the Slack Integration settings
2. Check the browser console for error messages
3. Verify your Slack app permissions
4. Ensure the webhook URL is correctly copied

## Channel Override

You can specify a different channel for notifications by:

1. Entering the channel name in the "Channel Name" field (with or without #)
2. The channel must exist and the app must have permission to post there
3. Leave empty to use the webhook's default channel

## Security Notes

- Webhook URLs are stored securely in your database
- Only users with access to your brand can configure Slack settings
- Webhook URLs can be regenerated in Slack if compromised
- No sensitive ad data is included in notifications (only names and counts) 