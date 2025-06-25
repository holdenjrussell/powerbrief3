"use client";
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MessageSquare, ExternalLink, Loader2, Trash2, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  ugc_slack_channel?: string;
  ugc_slack_notifications_enabled?: boolean;
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
  
  // UGC Pipeline settings
  const [ugcChannelName, setUgcChannelName] = useState(brand.ugc_slack_channel || '');
  const [ugcNotificationsEnabled, setUgcNotificationsEnabled] = useState(brand.ugc_slack_notifications_enabled || false);
  const [isTestingUgc, setIsTestingUgc] = useState(false);
  
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
          ugcSlackChannel: ugcChannelName.trim() || null,
          ugcSlackNotificationsEnabled: ugcNotificationsEnabled,
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
        ugc_slack_channel: ugcChannelName.trim() || null,
        ugc_slack_notifications_enabled: ugcNotificationsEnabled,
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

      if (response.ok && result.success) {
        setTestResult({ success: true, message: 'Test message sent successfully! Check your Slack channel.' });
      } else {
        setTestResult({ success: false, message: result.error || 'Failed to send test message. Please check your webhook URL.' });
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      setTestResult({ success: false, message: 'Failed to test webhook. Please try again.' });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleTestUgcNotification = async () => {
    if (!webhookUrl.trim()) {
      alert('Please save your Slack settings first');
      return;
    }

    setIsTestingUgc(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/ugc/slack-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: brand.id
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTestResult({ success: true, message: 'UGC test notification sent! Check your Slack channel.' });
      } else {
        setTestResult({ success: false, message: result.error || 'Failed to send UGC test notification.' });
      }
    } catch (error) {
      console.error('Error testing UGC notification:', error);
      setTestResult({ success: false, message: 'Failed to test UGC notification. Please try again.' });
    } finally {
      setIsTestingUgc(false);
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
        slack_notifications_enabled: false,
        ugc_slack_channel: null,
        ugc_slack_notifications_enabled: false
      };
      
      onSlackSettingsUpdated(updatedBrand);
      setWebhookUrl('');
      setChannelName('');
      setNotificationsEnabled(false);
      setUgcChannelName('');
      setUgcNotificationsEnabled(false);
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
                {brand.ugc_slack_channel && (
                  <p><span className="font-medium">UGC Channel:</span> #{brand.ugc_slack_channel}</p>
                )}
                {brand.ugc_slack_notifications_enabled && (
                  <p><span className="font-medium">UGC Notifications:</span> Enabled</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Test Result Alert */}
        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"} className="mb-4">
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}

        {/* Setup Instructions Toggle */}
        <Button 
          variant="link" 
          onClick={() => setShowInstructions(!showInstructions)}
          className="p-0 h-auto font-normal text-sm"
        >
          {showInstructions ? 'Hide' : 'Show'} setup instructions
        </Button>

        {showInstructions && (
          <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900">Quick Setup:</p>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="underline">api.slack.com/apps</a></li>
              <li>Create a new app or select existing</li>
              <li>Go to &quot;Incoming Webhooks&quot; → Enable → Add New Webhook</li>
              <li>Select your channel and copy the webhook URL</li>
              <li>Paste it below and save</li>
            </ol>

            <div className="mt-2 flex items-center gap-2">
              <a 
                href="https://api.slack.com/apps" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-700 hover:underline flex items-center gap-1"
              >
                Open Slack Apps <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <p className="mt-3 text-xs text-blue-700">
              💡 <strong>Tip:</strong> You can configure different channels for different notification types below.
            </p>
          </div>
        )}
        
        {/* Slack Configuration Form */}
        {!isConnected && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhookUrl">Slack Webhook URL</Label>
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
                        <Label htmlFor="default" className="text-xs">Default Override</Label>
                        <Input
                          id="default"
                          type="text"
                          placeholder="general"
                          value={channelConfig.default}
                          onChange={(e) => updateChannelConfig('default', e.target.value)}
                          className="mt-1 text-xs"
                        />
                        <p className="text-xs text-gray-500 mt-1">Overrides webhook default</p>
                      </div>

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
                        <p className="text-xs text-gray-500 mt-1">When creators submit concepts</p>
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

                  {/* UGC Pipeline Settings */}
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <h4 className="text-sm font-medium text-purple-900 mb-3">UGC Pipeline Notifications</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="ugcChannel" className="text-xs">UGC Channel</Label>
                        <Input
                          id="ugcChannel"
                          type="text"
                          placeholder="ugc-pipeline"
                          value={ugcChannelName}
                          onChange={(e) => setUgcChannelName(e.target.value)}
                          className="mt-1 text-xs"
                        />
                        <p className="text-xs text-gray-500 mt-1">Channel for UGC script and creator updates</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="ugcNotifications"
                          checked={ugcNotificationsEnabled}
                          onCheckedChange={setUgcNotificationsEnabled}
                        />
                        <Label htmlFor="ugcNotifications" className="text-xs">
                          Enable UGC Pipeline notifications
                        </Label>
                      </div>

                      <p className="text-xs text-gray-600">
                        Get notified about script approvals, creator assignments, content submissions, and more.
                      </p>
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
              <Label htmlFor="notifications">
                Enable notifications
              </Label>
            </div>
          </div>
        )}

        {/* Connected State Actions */}
        {isConnected && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleTestWebhook}
                disabled={isTestingWebhook}
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
              
              {brand.ugc_slack_notifications_enabled && (
                <Button 
                  variant="outline" 
                  onClick={handleTestUgcNotification}
                  disabled={isTestingUgc}
                  className="flex-1"
                >
                  {isTestingUgc ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test UGC'
                  )}
                </Button>
              )}
            </div>
            
            <Button 
              variant="destructive" 
              onClick={handleDisconnect}
              disabled={isLoading}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Disconnect Slack
            </Button>
          </div>
        )}

        {/* Save Button */}
        {!isConnected && (
          <div className="space-y-2">
            <Button 
              onClick={handleTestWebhook}
              variant="outline"
              disabled={isTestingWebhook || !webhookUrl.trim()}
              className="w-full"
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
              className="w-full"
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
        )}
      </CardContent>
    </Card>
  );
};

export default SlackIntegrationCard; 