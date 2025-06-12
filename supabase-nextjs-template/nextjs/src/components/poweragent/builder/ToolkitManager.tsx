import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Plus, 
  Edit,
  Trash2,
  Save,
  X,
  Wrench
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'built-in' | 'custom' | 'mcp';
  category?: string;
  parameters?: Record<string, unknown>;
  enabled: boolean;
}

interface Toolkit {
  id: string;
  name: string;
  description: string;
  tools: string[]; // Tool IDs
  instructions?: string;
  addInstructions: boolean;
}

interface ToolkitManagerProps {
  toolkits: Toolkit[];
  availableTools: Tool[];
  onAdd: (toolkit: Toolkit) => void;
  onUpdate: (toolkit: Toolkit) => void;
  onDelete: (toolkitId: string) => void;
}

export default function ToolkitManager({ 
  toolkits, 
  availableTools, 
  onAdd, 
  onUpdate, 
  onDelete 
}: ToolkitManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Toolkit>>({
    name: '',
    description: '',
    tools: [],
    instructions: '',
    addInstructions: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      tools: [],
      instructions: '',
      addInstructions: true
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleEdit = (toolkit: Toolkit) => {
    setFormData(toolkit);
    setEditingId(toolkit.id);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!formData.name || !formData.description) return;
    
    const toolkit: Toolkit = {
      id: editingId || '',
      name: formData.name,
      description: formData.description,
      tools: formData.tools || [],
      instructions: formData.instructions || '',
      addInstructions: formData.addInstructions ?? true
    };
    
    if (editingId) {
      onUpdate(toolkit);
    } else {
      onAdd(toolkit);
    }
    
    resetForm();
  };

  const handleToggleTool = (toolId: string) => {
    const currentTools = formData.tools || [];
    const newTools = currentTools.includes(toolId)
      ? currentTools.filter(id => id !== toolId)
      : [...currentTools, toolId];
    setFormData({ ...formData, tools: newTools });
  };

  const renderForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{editingId ? 'Edit Toolkit' : 'Create New Toolkit'}</span>
          <Button variant="ghost" size="icon" onClick={resetForm}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="toolkit-name">Toolkit Name *</Label>
          <Input
            id="toolkit-name"
            placeholder="e.g., weather_toolkit"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="toolkit-description">Description *</Label>
          <Textarea
            id="toolkit-description"
            placeholder="Describe what this toolkit does..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>Select Tools</Label>
          <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
            {availableTools.map(tool => (
              <label
                key={tool.id}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.tools?.includes(tool.id) || false}
                    onCheckedChange={() => handleToggleTool(tool.id)}
                  />
                  <div>
                    <p className="font-medium text-sm">{tool.name}</p>
                    <p className="text-xs text-gray-600">{tool.description}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {tool.type}
                </Badge>
              </label>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            {formData.tools?.length || 0} tools selected
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="toolkit-instructions">Toolkit Instructions</Label>
          <Textarea
            id="toolkit-instructions"
            placeholder="Instructions for how to use these tools together..."
            value={formData.instructions}
            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
            rows={4}
          />
          <p className="text-sm text-gray-500">
            These instructions will be added to the agent&apos;s system prompt
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="add-instructions"
            checked={formData.addInstructions}
            onCheckedChange={(checked) => setFormData({ ...formData, addInstructions: checked })}
          />
          <Label htmlFor="add-instructions">
            Add instructions to agent&apos;s system prompt
          </Label>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={resetForm}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.name || !formData.description}
          >
            <Save className="h-4 w-4 mr-2" />
            {editingId ? 'Update Toolkit' : 'Create Toolkit'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (isCreating || editingId) {
    return renderForm();
  }

  return (
    <div className="space-y-4">
      <Button
        onClick={() => setIsCreating(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create New Toolkit
      </Button>

      {toolkits.length > 0 ? (
        <div className="space-y-3">
          {toolkits.map(toolkit => {
            const toolCount = toolkit.tools.length;
            const toolNames = toolkit.tools
              .map(toolId => availableTools.find(t => t.id === toolId)?.name)
              .filter(Boolean)
              .slice(0, 3);
            
            return (
              <Card key={toolkit.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-5 w-5 text-gray-500" />
                        <h4 className="font-medium">{toolkit.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {toolCount} tool{toolCount !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{toolkit.description}</p>
                      
                      {toolNames.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Wrench className="h-3 w-3" />
                          <span>
                            {toolNames.join(', ')}
                            {toolkit.tools.length > 3 && ` +${toolkit.tools.length - 3} more`}
                          </span>
                        </div>
                      )}
                      
                      {toolkit.addInstructions && toolkit.instructions && (
                        <p className="text-xs text-primary mt-2">
                          ✓ Instructions will be added to system prompt
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(toolkit)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Delete toolkit "${toolkit.name}"?`)) {
                            onDelete(toolkit.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No toolkits created yet</p>
          <p className="text-sm mt-2">
            Group related tools together for easier management
          </p>
        </div>
      )}
    </div>
  );
} 