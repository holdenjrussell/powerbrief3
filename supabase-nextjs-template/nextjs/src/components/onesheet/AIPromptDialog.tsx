"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
  Label,
  Textarea,
  Alert,
  AlertDescription
} from '@/components/ui';
import { Loader2, Bot, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { PromptTemplate } from '@/lib/prompts/onesheet-prompts';
import { toast } from '@/components/ui/use-toast';

interface AIPromptResult {
  aiOutput: string;
  processedData: unknown;
  updatedOneSheet: unknown;
  usage: {
    model: string;
    promptUsed: string;
  };
}

interface AIPromptDialogProps {
  promptTemplate: PromptTemplate;
  onesheetId: string;
  onSuccess?: (result: AIPromptResult) => void;
  trigger?: React.ReactNode;
}

export function AIPromptDialog({ 
  promptTemplate, 
  onesheetId, 
  onSuccess,
  trigger 
}: AIPromptDialogProps) {
  const [open, setOpen] = useState(false);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIPromptResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const validateInputs = () => {
    for (const field of promptTemplate.inputFields) {
      if (field.required && !inputs[field.key]?.trim()) {
        return `${field.label} is required`;
      }
    }
    return null;
  };

  const runPrompt = async () => {
    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/onesheet/run-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId: promptTemplate.id,
          inputs,
          onesheetId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to run prompt');
      }

      const data = await response.json();
      setResult(data);
      onSuccess?.(data);

      toast({
        title: "AI Analysis Complete",
        description: `Successfully generated ${promptTemplate.name} and updated your OneSheet.`,
        variant: "default",
      });

      // Auto-close dialog after successful completion
      setTimeout(() => {
        setOpen(false);
        setResult(null);
        setInputs({});
      }, 2000);

    } catch (err) {
      console.error('Error running prompt:', err);
      setError('Failed to run AI prompt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setInputs({});
    setResult(null);
    setError(null);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="h-8">
      <Bot className="h-4 w-4 mr-1" />
      {promptTemplate.name}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            {promptTemplate.name}
          </DialogTitle>
          <DialogDescription>
            {promptTemplate.description}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            {/* Input fields */}
            {promptTemplate.inputFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.key}
                    placeholder={field.placeholder}
                    value={inputs[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                ) : (
                  <Input
                    id={field.key}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={inputs[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={runPrompt}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running AI Analysis...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Success state */
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Analysis complete! Your OneSheet has been updated with the new insights.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">AI Output Preview:</h4>
              <div className="text-sm text-gray-600 max-h-32 overflow-y-auto">
                {result.aiOutput?.substring(0, 300)}
                {result.aiOutput?.length > 300 && '...'}
              </div>
            </div>

            <div className="text-sm text-gray-500">
              <p>• Generated {Array.isArray(result.processedData) ? result.processedData.length : 'multiple'} items</p>
              <p>• Updated in {promptTemplate.outputTarget} section</p>
              <p>• Model: {result.usage?.model}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 