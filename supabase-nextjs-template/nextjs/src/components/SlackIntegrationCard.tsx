"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, MessageSquare, CheckCircle, AlertCircle, Trash2, ChevronDown, ChevronUp, ExternalLink, HelpCircle } from 'lucide-react';
import { Brand } from '@/lib/types/powerbrief';

interface SlackIntegrationCardProps {
  brand: Brand;
  onSlackSettingsUpdated: (updatedBrand: Brand) => void;
}

const SlackIntegrationCard: React.FC<SlackIntegrationCardProps> = ({ 
  brand, 
  onSlackSettingsUpdated 
}) => {
  const [webhookUrl, setWebhookUrl] = useState(brand.slack_webhook_url || '');
  const [channelName, setChannelName] = useState(brand.slack_channel_name || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(brand.slack_notifications_enabled || false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const isConnected = Boolean(brand.slack_webhook_url && brand.slack_notifications_enabled);

  const handleSaveSettings = async () => {
    if (!webhookUrl.trim()) {
      alert('Please enter a Slack webhook URL');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/slack/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: brand.id,
          webhookUrl: webhookUrl.trim(),
          channelName: channelName.trim() || null,
          notificationsEnabled
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save Slack settings');
      }

      const updatedBrand = { 
        ...brand, 
        slack_webhook_url: webhookUrl.trim(),
        slack_channel_name: channelName.trim() || null,
        slack_notifications_enabled: notificationsEnabled
      };
      
      onSlackSettingsUpdated(updatedBrand);
      setTestResult({ success: true, message: 'Slack settings saved successfully!' });
      
      // Clear test result after 3 seconds
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      console.error('Error saving Slack settings:', error);
      setTestResult({ success: false, message: 'Failed to save Slack settings. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      alert('Please enter a Slack webhook URL first');
      return;
    }

    setIsTestingWebhook(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/slack/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: webhookUrl.trim(),
          channelName: channelName.trim() || null
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResult({ success: true, message: 'Test message sent successfully! Check your Slack channel.' });
      } else {
        setTestResult({ success: false, message: result.error || 'Failed to send test message' });
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      setTestResult({ success: false, message: 'Failed to test webhook. Please check the URL and try again.' });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Slack? This will disable all notifications.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/slack/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: brand.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Slack');
      }

      const updatedBrand = { 
        ...brand, 
        slack_webhook_url: null,
        slack_channel_name: null,
        slack_notifications_enabled: false
      };
      
      onSlackSettingsUpdated(updatedBrand);
      setWebhookUrl('');
      setChannelName('');
      setNotificationsEnabled(false);
      setTestResult({ success: true, message: 'Slack disconnected successfully!' });
      
      // Clear test result after 3 seconds
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      console.error('Error disconnecting Slack:', error);
      setTestResult({ success: false, message: 'Failed to disconnect Slack. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="min-w-[420px] max-w-[420px] flex-shrink-0">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Slack Integration
        </CardTitle>
        <CardDescription>
          Get notified in Slack when ad batches are published
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Status: <span className={`font-semibold ${
              isConnected ? 'text-green-600' : 'text-gray-600'
            }`}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </span>
          </p>
          
          {isConnected && (
            <div className="p-3 border rounded-md bg-green-50 border-green-200 mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-green-800">Connected to Slack</h4>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div className="space-y-1 text-xs text-green-700">
                {brand.slack_channel_name && (
                  <p><span className="font-medium">Channel:</span> #{brand.slack_channel_name}</p>
                )}
                <p><span className="font-medium">Notifications:</span> {brand.slack_notifications_enabled ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="webhookUrl">Slack Webhook URL *</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInstructions(!showInstructions)}
                className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
              >
                <HelpCircle className="h-3 w-3 mr-1" />
                How to get webhook
                {showInstructions ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
              </Button>
            </div>
            
            {showInstructions && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                <h4 className="font-medium text-blue-900 mb-3">How to create a Slack webhook:</h4>
                
                {/* Method Selection */}
                <div className="mb-3">
                  <div className="flex space-x-2 mb-2">
                    <span className="text-xs font-medium text-blue-900">Choose your setup method:</span>
                  </div>
                </div>

                {/* Method 1: Using Manifest (Recommended) */}
                <div className="mb-4 p-2 bg-white border border-blue-200 rounded">
                  <h5 className="font-medium text-blue-900 mb-2">✨ Method 1: Quick Setup (Recommended)</h5>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800 text-xs">
                    <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">api.slack.com/apps <ExternalLink className="h-3 w-3 ml-1" /></a></li>
                    <li>Click &quot;Create New App&quot; → &quot;From an app manifest&quot;</li>
                    <li>Select your workspace and click &quot;Next&quot;</li>
                    <li>Copy and paste this manifest:</li>
                  </ol>
                  <div className="mt-2 p-2 bg-gray-100 border rounded text-xs font-mono overflow-x-auto">
                    <pre>{`{
  "display_information": {
    "name": "PowerBrief Notifications",
    "description": "Get notified when new ad batches are published"
  },
  "features": {
    "bot_user": {
      "display_name": "PowerBrief",
      "always_online": false
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["incoming-webhook"]
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
}`}</pre>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800 text-xs mt-2" start={5}>
                    <li>Click &quot;Next&quot; → &quot;Create&quot;</li>
                    <li>Go to &quot;Incoming Webhooks&quot; in the left sidebar</li>
                    <li>Click &quot;Add New Webhook to Workspace&quot;</li>
                    <li>Choose your notification channel and click &quot;Allow&quot;</li>
                    <li>Copy the webhook URL that starts with &quot;https://hooks.slack.com/&quot;</li>
                  </ol>
                </div>

                {/* Method 2: Manual Setup */}
                <div className="p-2 bg-white border border-blue-200 rounded">
                  <h5 className="font-medium text-blue-900 mb-2">🔧 Method 2: Manual Setup</h5>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800 text-xs">
                    <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">api.slack.com/apps <ExternalLink className="h-3 w-3 ml-1" /></a></li>
                    <li>Click &quot;Create New App&quot; → &quot;From scratch&quot;</li>
                    <li>Name your app (e.g., &quot;Ad Brief Notifications&quot;) and select your workspace</li>
                    <li>Go to &quot;Incoming Webhooks&quot; in the left sidebar</li>
                    <li>Toggle &quot;Activate Incoming Webhooks&quot; to On</li>
                    <li>Click &quot;Add New Webhook to Workspace&quot;</li>
                    <li>Choose the channel where you want notifications</li>
                    <li>Copy the webhook URL that starts with &quot;https://hooks.slack.com/&quot;</li>
                  </ol>
                </div>

                <p className="mt-3 text-xs text-blue-700">
                  💡 <strong>Tip:</strong> You can override the default channel by specifying a channel name below.
                </p>
              </div>
            )}
            
            <Input
              id="webhookUrl"
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Create a webhook in your Slack workspace settings
            </p>
          </div>

          <div>
            <Label htmlFor="channelName">Channel Name (optional)</Label>
            <Input
              id="channelName"
              type="text"
              placeholder="ad-notifications"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use webhook&apos;s default channel
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="notifications"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
            <Label htmlFor="notifications">Enable notifications</Label>
          </div>
        </div>

        {testResult && (
          <div className={`p-3 rounded-md border ${
            testResult.success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <AlertCircle className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm">{testResult.message}</span>
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            onClick={handleTestWebhook}
            disabled={isTestingWebhook || !webhookUrl.trim()}
            variant="outline"
            className="flex-1"
          >
            {isTestingWebhook ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Webhook'
            )}
          </Button>

          <Button
            onClick={handleSaveSettings}
            disabled={isLoading || !webhookUrl.trim()}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>

        {isConnected && (
          <Button
            onClick={handleDisconnect}
            disabled={isLoading}
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Disconnecting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Disconnect Slack
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default SlackIntegrationCard; 