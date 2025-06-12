import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface ProviderSelectorProps {
  provider: string;
  model: string;
  onUpdate: (updates: Partial<{ provider: string; model: string }>) => void;
}

const providers = [
  {
    id: 'vercel-ai',
    name: 'Vercel AI',
    description: 'Versatile provider supporting multiple LLMs',
    models: [
      { id: 'gpt-4o', name: 'GPT-4 Optimized' },
      { id: 'gpt-4o-mini', name: 'GPT-4 Mini' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    ]
  },
  {
    id: 'google-ai',
    name: 'Google AI',
    description: 'Google Gemini models',
    models: [
      { id: 'gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ]
  },
  {
    id: 'groq-ai',
    name: 'Groq',
    description: 'High-speed inference',
    models: [
      { id: 'llama3-70b-8192', name: 'Llama 3 70B' },
      { id: 'llama3-8b-8192', name: 'Llama 3 8B' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    ]
  },
  {
    id: 'anthropic-ai',
    name: 'Anthropic',
    description: 'Claude models with advanced reasoning',
    models: [
      { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ]
  },
  {
    id: 'xsai',
    name: 'xsAI',
    description: 'OpenAI-compatible endpoints',
    models: [
      { id: 'custom', name: 'Custom Model' },
    ]
  }
];

export default function ProviderSelector({ provider, model, onUpdate }: ProviderSelectorProps) {
  const selectedProvider = providers.find(p => p.id === provider);
  const availableModels = selectedProvider?.models || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Provider & Model</CardTitle>
        <CardDescription>
          Select the AI provider and model that powers your agent&apos;s intelligence. Different models offer varying capabilities, costs, and performance characteristics.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Select value={provider} onValueChange={(value) => {
            onUpdate({ provider: value });
            // Reset model when provider changes
            const newProvider = providers.find(p => p.id === value);
            if (newProvider && newProvider.models.length > 0) {
              onUpdate({ model: newProvider.models[0].id });
            }
          }}>
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select a provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-500">{p.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          {provider === 'xsai' ? (
            <Input
              id="model"
              placeholder="Enter custom model name"
              value={model}
              onChange={(e) => onUpdate({ model: e.target.value })}
            />
          ) : (
            <Select value={model} onValueChange={(value) => onUpdate({ model: value })}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Make sure you have the required API keys configured in your environment variables:
            <ul className="mt-2 text-sm list-disc list-inside">
              {provider === 'vercel-ai' && <li>OPENAI_API_KEY or ANTHROPIC_API_KEY</li>}
              {provider === 'google-ai' && <li>GOOGLE_GENERATIVE_AI_API_KEY</li>}
              {provider === 'groq-ai' && <li>GROQ_API_KEY</li>}
              {provider === 'anthropic-ai' && <li>ANTHROPIC_API_KEY</li>}
              {provider === 'xsai' && <li>OPENAI_API_KEY or custom endpoint configuration</li>}
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
} 