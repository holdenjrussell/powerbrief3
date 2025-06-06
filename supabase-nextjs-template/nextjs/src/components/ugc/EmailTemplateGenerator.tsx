'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label, Badge, Alert, AlertDescription } from "@/components/ui";
import { Mail, Wand2, Copy, Download, Eye, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  reasoning: string;
}

interface EmailTemplateGeneratorProps {
  brandId: string;
  brandName: string;
}

export default function EmailTemplateGenerator({ brandId, brandName }: EmailTemplateGeneratorProps) {
  const [scenario, setScenario] = useState('');
  const [templateType, setTemplateType] = useState('onboarding');
  const [creatorName, setCreatorName] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const scenarioPresets = [
    { value: 'welcome_onboarding', label: 'Welcome & Onboarding', description: 'Welcome new creators to your brand' },
    { value: 'script_assignment', label: 'Script Assignment', description: 'Assign a new UGC script to creator' },
    { value: 'rate_negotiation', label: 'Rate Negotiation', description: 'Discuss rates and compensation' },
    { value: 'call_scheduling', label: 'Call Scheduling', description: 'Schedule discovery or strategy call' },
    { value: 'product_shipping', label: 'Product Shipping', description: 'Product shipment notifications' },
    { value: 'payment_confirmation', label: 'Payment Confirmation', description: 'Payment processing updates' },
    { value: 'follow_up_response', label: 'Follow-up & Response', description: 'Follow up on previous communications' },
    { value: 'feedback_request', label: 'Feedback Request', description: 'Request feedback on products or process' },
    { value: 'custom', label: 'Custom Scenario', description: 'Create your own scenario' }
  ];

  const templateTypes = [
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'script_pipeline', label: 'Script Pipeline' },
    { value: 'follow_up', label: 'Follow-up' },
    { value: 'transactional', label: 'Transactional' },
    { value: 'promotional', label: 'Promotional' }
  ];

  const generateTemplate = async () => {
    if (!scenario && !customPrompt) {
      setError('Please select a scenario or provide custom instructions');
      return;
    }

    setGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ugc/ai-coordinator/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          creatorName: creatorName || undefined,
          scenario: scenario === 'custom' ? customPrompt : scenario,
          customPrompt: scenario !== 'custom' ? customPrompt : undefined,
          templateType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate template');
      }

      const data = await response.json();
      setTemplate(data.template);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate template');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadTemplate = () => {
    if (!template) return;

    const templateData = {
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent,
      variables: template.variables,
      reasoning: template.reasoning,
      generated: new Date().toISOString(),
      brand: brandName
    };

    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-template-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">AI Email Template Generator</h3>
          <p className="text-sm text-gray-600">Generate personalized email templates for any scenario</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle>Template Configuration</CardTitle>
            <CardDescription>Configure your email template parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="scenario">Email Scenario</Label>
              <Select value={scenario} onValueChange={setScenario}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a scenario" />
                </SelectTrigger>
                <SelectContent>
                  {scenarioPresets.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      <div className="space-y-1">
                        <div className="font-medium">{preset.label}</div>
                        <div className="text-xs text-gray-500">{preset.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="templateType">Template Type</Label>
              <Select value={templateType} onValueChange={setTemplateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templateTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="creatorName">Creator Name (Optional)</Label>
              <Input
                id="creatorName"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g., Sarah Johnson"
              />
            </div>

            <div>
              <Label htmlFor="customPrompt">Custom Instructions (Optional)</Label>
              <Textarea
                id="customPrompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add specific requirements, tone, or details..."
                rows={3}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={generateTemplate}
              disabled={generating || (!scenario && !customPrompt)}
              className="w-full"
            >
              {generating ? (
                <>
                  <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Template...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Template
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Template Result */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Template</CardTitle>
            <CardDescription>
              {template ? 'Your AI-generated email template' : 'Template will appear here after generation'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {template ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Subject Line</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex-1 p-2 bg-gray-50 rounded border text-sm">
                      {template.subject}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(template.subject)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Variables Used</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {template.variables.map((variable) => (
                      <Badge key={variable} variant="secondary" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">AI Reasoning</Label>
                  <p className="text-sm text-gray-600 mt-1">{template.reasoning}</p>
                </div>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(template.htmlContent)}
                    className="flex-1"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy HTML
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadTemplate}
                    className="flex-1"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No template generated yet</p>
                <p className="text-sm">Configure your parameters and click generate</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Template Preview</DialogTitle>
            <DialogDescription>
              Preview of your generated email template
            </DialogDescription>
          </DialogHeader>
          {template && (
            <div className="space-y-4">
              <div>
                <Label className="font-medium">Subject:</Label>
                <p className="text-sm mt-1">{template.subject}</p>
              </div>
              <div>
                <Label className="font-medium">HTML Version:</Label>
                <div 
                  className="border rounded p-4 bg-white mt-1"
                  dangerouslySetInnerHTML={{ __html: template.htmlContent }}
                />
              </div>
              <div>
                <Label className="font-medium">Text Version:</Label>
                <pre className="text-xs bg-gray-50 p-3 rounded border mt-1 whitespace-pre-wrap">
                  {template.textContent}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowPreview(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 