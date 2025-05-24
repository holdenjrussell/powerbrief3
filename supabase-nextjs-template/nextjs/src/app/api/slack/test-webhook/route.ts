import { NextRequest, NextResponse } from 'next/server';

interface TestWebhookRequest {
  webhookUrl: string;
  channelName?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: TestWebhookRequest = await request.json();
    const { webhookUrl, channelName } = body;

    if (!webhookUrl || !webhookUrl.trim()) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    // Validate webhook URL format
    if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json(
        { error: 'Invalid Slack webhook URL format' },
        { status: 400 }
      );
    }

    // Prepare test message
    const testMessage = {
      text: "🧪 Test message from PowerBrief",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Test Message* 🧪\n\nThis is a test message from your PowerBrief integration. If you're seeing this, your Slack webhook is working correctly!"
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Sent at ${new Date().toLocaleString()}`
            }
          ]
        }
      ]
    };

    // Add channel override if specified
    if (channelName && channelName.trim()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (testMessage as any).channel = channelName.startsWith('#') ? channelName : `#${channelName}`;
    }

    console.log('Sending test message to Slack webhook:', webhookUrl.substring(0, 50) + '...');

    // Send test message to Slack
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Slack webhook test failed:', response.status, errorText);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Webhook URL not found. Please check the URL and try again.' },
          { status: 400 }
        );
      } else if (response.status === 403) {
        return NextResponse.json(
          { error: 'Webhook access denied. Please check your Slack app permissions.' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { error: `Slack API error: ${errorText || 'Unknown error'}` },
          { status: 400 }
        );
      }
    }

    console.log('Test message sent successfully to Slack');
    
    return NextResponse.json({ 
      success: true,
      message: 'Test message sent successfully!'
    });

  } catch (error) {
    console.error('Error in Slack test-webhook API:', error);
    return NextResponse.json(
      { error: 'Failed to send test message. Please check your webhook URL and try again.' },
      { status: 500 }
    );
  }
} 