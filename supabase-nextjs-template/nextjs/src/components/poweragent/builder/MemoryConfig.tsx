"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Database, Brain, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MemoryConfigData {
  provider?: string;
  supabase?: {
    tableName: string;
    maxMessages: number;
  };
  customRetriever?: boolean;
  retriever?: {
    type: string;
    topK: number;
    threshold: number;
    customCode: string;
  };
  contextLimit?: number;
}

interface MemoryConfigProps {
  config: MemoryConfigData;
  onChange: (config: MemoryConfigData) => void;
}

export function MemoryConfig({ config, onChange }: MemoryConfigProps) {
  const [memoryProvider, setMemoryProvider] = useState(config?.provider || "supabase");
  const [customRetriever, setCustomRetriever] = useState(config?.customRetriever || false);
  const [retrieverConfig, setRetrieverConfig] = useState({
    type: config?.retriever?.type || "similarity",
    topK: config?.retriever?.topK || 5,
    threshold: config?.retriever?.threshold || 0.7,
    customCode: config?.retriever?.customCode || "",
  });
  const [contextLimit, setContextLimit] = useState(config?.contextLimit || 4000);

  const handleProviderChange = (provider: string) => {
    setMemoryProvider(provider);
    updateConfig({ provider });
  };

  const handleRetrieverConfigChange = (field: string, value: string | number) => {
    const newConfig = { ...retrieverConfig, [field]: value };
    setRetrieverConfig(newConfig);
    updateConfig({ retriever: newConfig });
  };

  const updateConfig = (updates: Partial<MemoryConfigData>) => {
    onChange({
      ...config,
      ...updates,
      provider: memoryProvider,
      customRetriever,
      contextLimit,
    });
  };

  return (
    <div className="space-y-6">
      {/* Memory Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Memory Provider
          </CardTitle>
          <CardDescription>
            Enable your agent to remember past conversations and maintain context. Memory allows for more personalized and coherent interactions across multiple sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={memoryProvider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a memory provider" />
              </SelectTrigger>
                              <SelectContent>
                  <SelectItem value="supabase">Supabase Memory (Default)</SelectItem>
                  <SelectItem value="in-memory">In-Memory (Session Only)</SelectItem>
                  <SelectItem value="none">No Memory (Stateless)</SelectItem>
                </SelectContent>
            </Select>
          </div>

          {memoryProvider === "supabase" && (
            <div className="space-y-4 pt-4 border-t">
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Using your existing Supabase configuration from environment variables.
                  Memory will be automatically segregated by brand.
                </AlertDescription>
              </Alert>


            </div>
          )}


        </CardContent>
      </Card>

      {/* Retriever Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Retriever Configuration
          </CardTitle>
          <CardDescription>
            Fine-tune how your agent searches through stored memories to find the most relevant context. This affects response quality and relevance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Custom Retriever</Label>
              <p className="text-sm text-muted-foreground">
                Use a custom retriever for advanced memory search
              </p>
            </div>
            <Switch
              checked={customRetriever}
              onCheckedChange={(checked) => {
                setCustomRetriever(checked);
                updateConfig({ customRetriever: checked });
              }}
            />
          </div>

          {customRetriever && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>Retriever Type</Label>
                <Select
                  value={retrieverConfig.type}
                  onValueChange={(value) => handleRetrieverConfigChange("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="similarity">Similarity Search</SelectItem>
                    <SelectItem value="keyword">Keyword Search</SelectItem>
                    <SelectItem value="hybrid">Hybrid Search</SelectItem>
                    <SelectItem value="custom">Custom Implementation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Top K Results</Label>
                  <Input
                    type="number"
                    value={retrieverConfig.topK}
                    onChange={(e) => handleRetrieverConfigChange("topK", parseInt(e.target.value))}
                    min="1"
                    max="20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Similarity Threshold</Label>
                  <Input
                    type="number"
                    value={retrieverConfig.threshold}
                    onChange={(e) => handleRetrieverConfigChange("threshold", parseFloat(e.target.value))}
                    min="0"
                    max="1"
                    step="0.1"
                  />
                </div>
              </div>

              {retrieverConfig.type === "custom" && (
                <div className="space-y-2">
                  <Label>Custom Retriever Code</Label>
                  <Textarea
                    value={retrieverConfig.customCode}
                    onChange={(e) => handleRetrieverConfigChange("customCode", e.target.value)}
                    placeholder="// Implement your custom retriever logic here
// Must return an array of relevant documents/messages"
                    className="font-mono text-sm h-32"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Context Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Context Configuration
          </CardTitle>
          <CardDescription>
            Configure context limits and conversation management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Context Token Limit</Label>
            <Input
              type="number"
              value={contextLimit}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setContextLimit(value);
                updateConfig({ contextLimit: value });
              }}
              min="1000"
              max="128000"
              step="1000"
            />
            <p className="text-sm text-muted-foreground">
              Maximum number of tokens to include in the context window
            </p>
          </div>

                      <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Context Window Guidelines:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li><strong>1K-4K tokens:</strong> Quick responses, lower cost, minimal context</li>
                  <li><strong>4K-16K tokens:</strong> Balanced performance, good for most use cases</li>
                  <li><strong>16K-32K tokens:</strong> Rich context, better for complex conversations</li>
                  <li><strong>32K+ tokens:</strong> Maximum context, higher costs and latency</li>
                </ul>
                <p className="mt-2 text-sm">Adjust based on your agent&apos;s needs and budget constraints.</p>
              </AlertDescription>
            </Alert>
        </CardContent>
      </Card>
    </div>
  );
} 