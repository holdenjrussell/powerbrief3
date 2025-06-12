"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { MessageSquare, History, Zap, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

interface ConversationConfig {
  sessionManagement?: {
    enabled: boolean;
    sessionTimeout: number;
    maxSessionLength: number;
  };
  messageFormatting?: {
    includeTimestamps: boolean;
    includeUserMetadata: boolean;
    formatStyle: string;
  };
  contextWindow?: {
    strategy: string;
    maxTokens: number;
    summarizationThreshold: number;
  };
  systemPromptBehavior?: {
    includeInEveryMessage: boolean;
    prependToFirstMessage: boolean;
    customSystemPrompt: string;
  };
}

interface ConversationManagerProps {
  config: ConversationConfig;
  onChange: (config: ConversationConfig) => void;
}

export function ConversationManager({ config, onChange }: ConversationManagerProps) {
  const [sessionConfig, setSessionConfig] = useState({
    enabled: config?.sessionManagement?.enabled ?? true,
    sessionTimeout: config?.sessionManagement?.sessionTimeout ?? 13.3,
    maxSessionLength: config?.sessionManagement?.maxSessionLength ?? 100,
  });

  const [messageConfig, setMessageConfig] = useState({
    includeTimestamps: config?.messageFormatting?.includeTimestamps ?? true,
    includeUserMetadata: config?.messageFormatting?.includeUserMetadata ?? false,
    formatStyle: config?.messageFormatting?.formatStyle ?? "standard",
  });

  const [contextConfig, setContextConfig] = useState({
    strategy: config?.contextWindow?.strategy ?? "sliding",
    maxTokens: config?.contextWindow?.maxTokens ?? 4000,
    summarizationThreshold: config?.contextWindow?.summarizationThreshold ?? 8000,
  });

  const [systemPromptConfig, setSystemPromptConfig] = useState({
    includeInEveryMessage: config?.systemPromptBehavior?.includeInEveryMessage ?? false,
    prependToFirstMessage: config?.systemPromptBehavior?.prependToFirstMessage ?? true,
    customSystemPrompt: config?.systemPromptBehavior?.customSystemPrompt ?? "",
  });

  const updateConfig = () => {
    onChange({
      sessionManagement: sessionConfig,
      messageFormatting: messageConfig,
      contextWindow: contextConfig,
      systemPromptBehavior: systemPromptConfig,
    });
  };

  const handleSessionConfigChange = (field: string, value: boolean | number) => {
    const newConfig = { ...sessionConfig, [field]: value };
    setSessionConfig(newConfig);
    updateConfig();
  };

  const handleMessageConfigChange = (field: string, value: boolean | string) => {
    const newConfig = { ...messageConfig, [field]: value };
    setMessageConfig(newConfig);
    updateConfig();
  };

  const handleContextConfigChange = (field: string, value: string | number) => {
    const newConfig = { ...contextConfig, [field]: value };
    setContextConfig(newConfig);
    updateConfig();
  };

  const handleSystemPromptConfigChange = (field: string, value: boolean | string) => {
    const newConfig = { ...systemPromptConfig, [field]: value };
    setSystemPromptConfig(newConfig);
    updateConfig();
  };

  return (
    <div className="space-y-6">
      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Session Management
          </CardTitle>
          <CardDescription>
            Configure how conversations are managed and persisted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Session Management</Label>
              <p className="text-sm text-muted-foreground">
                Track and manage conversation sessions
              </p>
            </div>
            <Switch
              checked={sessionConfig.enabled}
              onCheckedChange={(checked) => handleSessionConfigChange("enabled", checked)}
            />
          </div>

          {sessionConfig.enabled && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Session Timeout (minutes)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[sessionConfig.sessionTimeout]}
                    onValueChange={([value]) => handleSessionConfigChange("sessionTimeout", value)}
                    min={5}
                    max={13.3}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="w-12 text-sm text-muted-foreground">
                    {sessionConfig.sessionTimeout}m
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Max Messages per Session</Label>
                <Input
                  type="number"
                  value={sessionConfig.maxSessionLength}
                  onChange={(e) => handleSessionConfigChange("maxSessionLength", parseInt(e.target.value))}
                  min="10"
                  max="1000"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Formatting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message Formatting
          </CardTitle>
          <CardDescription>
            Control how messages are formatted and stored
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Include Timestamps</Label>
              <p className="text-sm text-muted-foreground">
                Add timestamps to each message
              </p>
            </div>
            <Switch
              checked={messageConfig.includeTimestamps}
              onCheckedChange={(checked) => handleMessageConfigChange("includeTimestamps", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Include User Metadata</Label>
              <p className="text-sm text-muted-foreground">
                Store user ID and other metadata
              </p>
            </div>
            <Switch
              checked={messageConfig.includeUserMetadata}
              onCheckedChange={(checked) => handleMessageConfigChange("includeUserMetadata", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Format Style</Label>
            <Select
              value={messageConfig.formatStyle}
              onValueChange={(value) => handleMessageConfigChange("formatStyle", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="openai">OpenAI Format</SelectItem>
                <SelectItem value="anthropic">Anthropic Format</SelectItem>
                <SelectItem value="custom">Custom Format</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Context Window Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Context Window Management
          </CardTitle>
          <CardDescription>
            Optimize how conversation history is included in prompts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Context Strategy</Label>
            <Select
              value={contextConfig.strategy}
              onValueChange={(value) => handleContextConfigChange("strategy", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sliding">Sliding Window</SelectItem>
                <SelectItem value="summarization">Summarization</SelectItem>
                <SelectItem value="importance">Importance-based</SelectItem>
                <SelectItem value="hybrid">Hybrid Approach</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Max Context Tokens</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[contextConfig.maxTokens]}
                onValueChange={([value]) => handleContextConfigChange("maxTokens", value)}
                min={1000}
                max={32000}
                step={1000}
                className="flex-1"
              />
              <span className="w-16 text-sm text-muted-foreground">
                {contextConfig.maxTokens.toLocaleString()}
              </span>
            </div>
          </div>

          {contextConfig.strategy === "summarization" && (
            <div className="space-y-2">
              <Label>Summarization Threshold</Label>
              <Input
                type="number"
                value={contextConfig.summarizationThreshold}
                onChange={(e) => handleContextConfigChange("summarizationThreshold", parseInt(e.target.value))}
                min="2000"
                max="64000"
                step="1000"
              />
              <p className="text-sm text-muted-foreground">
                Summarize conversation when context exceeds this token count
              </p>
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The context strategy affects how much conversation history is sent to the LLM.
              Choose based on your use case and token budget.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* System Prompt Behavior */}
      <Card>
        <CardHeader>
          <CardTitle>System Prompt Behavior</CardTitle>
          <CardDescription>
            Configure how system prompts are handled in conversations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Include in Every Message</Label>
              <p className="text-sm text-muted-foreground">
                Prepend system prompt to every request
              </p>
            </div>
            <Switch
              checked={systemPromptConfig.includeInEveryMessage}
              onCheckedChange={(checked) => handleSystemPromptConfigChange("includeInEveryMessage", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Prepend to First Message Only</Label>
              <p className="text-sm text-muted-foreground">
                Include system prompt only at conversation start
              </p>
            </div>
            <Switch
              checked={systemPromptConfig.prependToFirstMessage}
              onCheckedChange={(checked) => handleSystemPromptConfigChange("prependToFirstMessage", checked)}
            />
          </div>

          <div className="space-y-2">
            <Label>Custom System Prompt Override</Label>
            <Textarea
              value={systemPromptConfig.customSystemPrompt}
              onChange={(e) => handleSystemPromptConfigChange("customSystemPrompt", e.target.value)}
              placeholder="Override the default system prompt with custom instructions..."
              rows={4}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 