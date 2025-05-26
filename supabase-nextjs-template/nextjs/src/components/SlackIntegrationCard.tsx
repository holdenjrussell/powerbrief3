"use client";
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, ExternalLink, Loader2, Trash2, Settings, ChevronDown, ChevronUp } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  slack_webhook_url?: string;
  slack_channel_name?: string;
  slack_notifications_enabled?: boolean;
  slack_channel_config?: {
    default?: string;
    concept_submission?: string;
    concept_revision?: string;
    concept_approval?: string;
    concept_ready_for_editor?: string;
    ad_launch?: string;
  };
}

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
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Channel configuration state
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [channelConfig, setChannelConfig] = useState({
    default: brand.slack_channel_config?.default || '',
    concept_submission: brand.slack_channel_config?.concept_submission || '',
    concept_revision: brand.slack_channel_config?.concept_revision || '',
    concept_approval: brand.slack_channel_config?.concept_approval || '',
    concept_ready_for_editor: brand.slack_channel_config?.concept_ready_for_editor || '',
    ad_launch: brand.slack_channel_config?.ad_launch || ''
  });

  const isConnected = Boolean(brand.slack_webhook_url && brand.slack_notifications_enabled);

  const updateChannelConfig = (key: keyof typeof channelConfig, value: string) => {
    setChannelConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

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
          notificationsEnabled,
          channelConfig: {
            default: channelConfig.default.trim() || null,
            concept_submission: channelConfig.concept_submission.trim() || null,
            concept_revision: channelConfig.concept_revision.trim() || null,
            concept_approval: channelConfig.concept_approval.trim() || null,
            concept_ready_for_editor: channelConfig.concept_ready_for_editor.trim() || null,
            ad_launch: channelConfig.ad_launch.trim() || null
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save Slack settings');
      }

      const updatedBrand = { 
        ...brand, 
        slack_webhook_url: webhookUrl.trim(),
        slack_channel_name: channelName.trim() || null,
        slack_notifications_enabled: notificationsEnabled,
        slack_channel_config: {
          default: channelConfig.default.trim() || null,
          concept_submission: channelConfig.concept_submission.trim() || null,
          concept_revision: channelConfig.concept_revision.trim() || null,
          concept_approval: channelConfig.concept_approval.trim() || null,
          concept_ready_for_editor: channelConfig.concept_ready_for_editor.trim() || null,
          ad_launch: channelConfig.ad_launch.trim() || null
        }
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
      setTestResult({ success: false, message: 'Please enter a webhook URL first' });
      return;
    }

    setIsTestingWebhook(true);
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
        setTestResult({ success: true, message: 'Test message sent successfully!' });
      } else {
        setTestResult({ success: false, message: result.error || 'Failed to send test message' });
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      setTestResult({ success: false, message: 'Failed to test webhook. Please try again.' });
    } finally {
      setIsTestingWebhook(false);
      // Clear test result after 5 seconds
      setTimeout(() => setTestResult(null), 5000);
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
          Get notified in Slack when concepts are submitted, reviewed, and ads are published
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
                  <p><span className="font-medium">Default Channel:</span> #{brand.slack_channel_name}</p>
                )}
                <p><span className="font-medium">Notifications:</span> {brand.slack_notifications_enabled ? 'Enabled' : 'Disabled'}</p>
                {brand.slack_channel_config && Object.values(brand.slack_channel_config).some(Boolean) && (
                  <p><span className="font-medium">Custom Channels:</span> Configured</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="webhookUrl">Slack Webhook URL</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInstructions(!showInstructions)}
                className="text-xs"
              >
                {showInstructions ? 'Hide' : 'Show'} Setup Guide
              </Button>
            </div>
            
            {showInstructions && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                <h5 className="font-medium text-blue-900 mb-2">🚀 Quick Setup</h5>
                
                {/* Method 1: App Manifest */}
                <div className="p-2 bg-white border border-blue-200 rounded mb-2">
                  <h5 className="font-medium text-blue-900 mb-2">⚡ Method 1: App Manifest (Recommended)</h5>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800 text-xs">
                    <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center">api.slack.com/apps <ExternalLink className="h-3 w-3 ml-1" /></a></li>
                    <li>Click &quot;Create New App&quot; → &quot;From an app manifest&quot;</li>
                    <li>Select your workspace and click &quot;Next&quot;</li>
                    <li>Copy the manifest from our <a href="/slack-app-manifest.json" target="_blank" className="text-blue-600 hover:underline">manifest file</a></li>
                  </ol>
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
                    <li>Name your app (e.g., &quot;PowerBrief Notifications&quot;) and select your workspace</li>
                    <li>Go to &quot;Incoming Webhooks&quot; in the left sidebar</li>
                    <li>Toggle &quot;Activate Incoming Webhooks&quot; to On</li>
                    <li>Click &quot;Add New Webhook to Workspace&quot;</li>
                    <li>Choose the channel where you want notifications</li>
                    <li>Copy the webhook URL that starts with &quot;https://hooks.slack.com/&quot;</li>
                  </ol>
                </div>

                <p className="mt-3 text-xs text-blue-700">
                  💡 <strong>Tip:</strong> You can configure different channels for different notification types below.
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
            <Label htmlFor="channelName">Default Channel (optional)</Label>
            <Input
              id="channelName"
              type="text"
              placeholder="general"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to use webhook&apos;s default channel
            </p>
          </div>

          {/* Advanced Channel Configuration */}
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-between"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            >
              <div className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Advanced Channel Settings
              </div>
              {showAdvancedSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {showAdvancedSettings && (
              <div className="space-y-3 mt-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-3">
                    Configure different channels for different notification types. Leave empty to use the default channel above.
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="concept_submission" className="text-xs">Concept Submissions</Label>
                      <Input
                        id="concept_submission"
                        type="text"
                        placeholder="creative-submissions"
                        value={channelConfig.concept_submission}
                        onChange={(e) => updateChannelConfig('concept_submission', e.target.value)}
                        className="mt-1 text-xs"
                      />
                      <p className="text-xs text-gray-500 mt-1">When concepts are submitted for review</p>
                    </div>

                    <div>
                      <Label htmlFor="concept_revision" className="text-xs">Revision Requests</Label>
                      <Input
                        id="concept_revision"
                        type="text"
                        placeholder="creative-revisions"
                        value={channelConfig.concept_revision}
                        onChange={(e) => updateChannelConfig('concept_revision', e.target.value)}
                        className="mt-1 text-xs"
                      />
                      <p className="text-xs text-gray-500 mt-1">When revisions are requested</p>
                    </div>

                    <div>
                      <Label htmlFor="concept_approval" className="text-xs">Concept Approvals</Label>
                      <Input
                        id="concept_approval"
                        type="text"
                        placeholder="creative-approvals"
                        value={channelConfig.concept_approval}
                        onChange={(e) => updateChannelConfig('concept_approval', e.target.value)}
                        className="mt-1 text-xs"
                      />
                      <p className="text-xs text-gray-500 mt-1">When concepts are approved</p>
                    </div>

                    <div>
                      <Label htmlFor="concept_ready_for_editor" className="text-xs">Concept Ready for Editor</Label>
                      <Input
                        id="concept_ready_for_editor"
                        type="text"
                        placeholder="creative-ready-for-editor"
                        value={channelConfig.concept_ready_for_editor}
                        onChange={(e) => updateChannelConfig('concept_ready_for_editor', e.target.value)}
                        className="mt-1 text-xs"
                      />
                      <p className="text-xs text-gray-500 mt-1">When concepts are ready for editor review</p>
                    </div>

                    <div>
                      <Label htmlFor="ad_launch" className="text-xs">Ad Launches</Label>
                      <Input
                        id="ad_launch"
                        type="text"
                        placeholder="ad-launches"
                        value={channelConfig.ad_launch}
                        onChange={(e) => updateChannelConfig('ad_launch', e.target.value)}
                        className="mt-1 text-xs"
                      />
                      <p className="text-xs text-gray-500 mt-1">When ads are published to Meta</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

        {/* Test Result Display */}
        {testResult && (
          <div className={`p-3 rounded-md ${
            testResult.success 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <p className="text-sm">{testResult.message}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button 
            onClick={handleSaveSettings} 
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
          
          <Button 
            onClick={handleTestWebhook} 
            disabled={isTestingWebhook || !webhookUrl.trim()}
            variant="outline"
          >
            {isTestingWebhook ? 'Testing...' : 'Test'}
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