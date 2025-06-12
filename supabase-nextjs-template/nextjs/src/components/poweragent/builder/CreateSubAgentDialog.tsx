'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

interface CreateSubAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAgent: (agent: {
    name: string;
    purpose: string;
    description: string;
    type: string;
    capabilities: string[];
    instructions: string;
  }) => void;
}

export function CreateSubAgentDialog({ open, onOpenChange, onCreateAgent }: CreateSubAgentDialogProps) {
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('general');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [newCapability, setNewCapability] = useState('');
  const [instructions, setInstructions] = useState('');

  const handleAddCapability = () => {
    if (newCapability.trim() && !capabilities.includes(newCapability.trim())) {
      setCapabilities([...capabilities, newCapability.trim()]);
      setNewCapability('');
    }
  };

  const handleRemoveCapability = (cap: string) => {
    setCapabilities(capabilities.filter(c => c !== cap));
  };

  const handleCreate = () => {
    if (name && purpose) {
      onCreateAgent({
        name,
        purpose,
        description,
        type,
        capabilities,
        instructions
      });
      
      // Reset form
      setName('');
      setPurpose('');
      setDescription('');
      setType('general');
      setCapabilities([]);
      setInstructions('');
      onOpenChange(false);
    }
  };

  const agentTypes = [
    { value: 'general', label: 'General Purpose' },
    { value: 'research', label: 'Research & Analysis' },
    { value: 'creative', label: 'Creative & Writing' },
    { value: 'analytical', label: 'Data & Analytics' },
    { value: 'language', label: 'Language & Translation' },
    { value: 'technical', label: 'Technical & Coding' },
    { value: 'customer', label: 'Customer Service' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Sub-Agent</DialogTitle>
          <DialogDescription>
            Define a new specialized agent to add to your team. Each agent should have a clear purpose and specific capabilities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Agent Name */}
          <div className="space-y-2">
            <Label htmlFor="agent-name">Agent Name *</Label>
            <Input
              id="agent-name"
              placeholder="e.g., SEO Content Writer, Data Analyst, Code Reviewer"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Choose a descriptive name that clearly identifies the agent&apos;s role
            </p>
          </div>

          {/* Agent Type */}
          <div className="space-y-2">
            <Label htmlFor="agent-type">Agent Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="agent-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {agentTypes.map((agentType) => (
                  <SelectItem key={agentType.value} value={agentType.value}>
                    {agentType.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label htmlFor="agent-purpose">Purpose *</Label>
            <Input
              id="agent-purpose"
              placeholder="e.g., Creates SEO-optimized blog posts and articles"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              A brief statement of what this agent does
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="agent-description">Description</Label>
            <Textarea
              id="agent-description"
              placeholder="Provide more details about the agent's expertise, approach, and any specific guidelines it follows..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Capabilities */}
          <div className="space-y-2">
            <Label>Capabilities</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a capability (e.g., 'Keyword Research')"
                value={newCapability}
                onChange={(e) => setNewCapability(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCapability())}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddCapability}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {capabilities.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {capabilities.map((cap) => (
                  <Badge key={cap} variant="secondary" className="gap-1">
                    {cap}
                    <button
                      onClick={() => handleRemoveCapability(cap)}
                      className="ml-1 hover:text-destructive"
                      aria-label={`Remove ${cap} capability`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              List specific skills or tasks this agent excels at
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="agent-instructions">Agent Instructions</Label>
            <Textarea
              id="agent-instructions"
              placeholder="Example: You are an expert SEO content writer. Always research keywords before writing. Structure articles with clear headings. Include meta descriptions. Aim for 1500-2000 words unless specified otherwise..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Detailed instructions that will guide this agent&apos;s behavior
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!name || !purpose}
          >
            Create Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 