import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AgentBasicInfoProps {
  config: {
    name: string;
    purpose: string;
    description: string;
  };
  onUpdate: (updates: Partial<{
    name: string;
    purpose: string;
    description: string;
  }>) => void;
}

export default function AgentBasicInfo({ config, onUpdate }: AgentBasicInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
        <CardDescription>
          Define your agent&apos;s identity and purpose. These foundational settings help shape how your agent presents itself and interacts with users.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="agent-name">Agent Name *</Label>
          <Input
            id="agent-name"
            placeholder="e.g., Customer Support Agent, Data Analyst, Creative Writer"
            value={config.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
          <p className="text-sm text-gray-500">
            Choose a descriptive name that clearly identifies your agent&apos;s role. This will be displayed to users and in your agent list.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-purpose">Purpose</Label>
          <Input
            id="agent-purpose"
            placeholder="e.g., Handle customer inquiries and provide 24/7 support"
            value={config.purpose}
            onChange={(e) => onUpdate({ purpose: e.target.value })}
          />
          <p className="text-sm text-gray-500">
            A concise statement of your agent&apos;s primary function. This helps users understand what the agent can do at a glance.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-description">Description</Label>
          <Textarea
            id="agent-description"
            placeholder="Example: This agent specializes in providing customer support for e-commerce platforms. It can handle order inquiries, process returns, answer product questions, and escalate complex issues. The agent maintains a friendly, professional tone and follows company guidelines for customer interaction."
            value={config.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={4}
          />
          <p className="text-sm text-gray-500">
            Provide a comprehensive overview of your agent&apos;s capabilities, behavior patterns, and any specific guidelines it should follow. This helps maintain consistency in the agent&apos;s responses.
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 