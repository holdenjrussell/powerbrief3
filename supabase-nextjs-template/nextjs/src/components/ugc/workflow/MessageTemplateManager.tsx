'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Edit, 
  Trash2,
  Mail,
  MessageSquare,
  Smartphone,
  Bot,
  Copy,
  Variable
} from 'lucide-react';
import {
  UgcMessageTemplate,
  MessageTemplateType,
  WORKFLOW_VARIABLES
} from '@/lib/types/ugcWorkflow';
import {
  getMessageTemplates,
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  extractTemplateVariables
} from '@/lib/services/ugcWorkflowService';

interface MessageTemplateManagerProps {
  brandId: string;
}

const TEMPLATE_TYPE_ICONS: Record<MessageTemplateType, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  sms: <Smartphone className="h-4 w-4" />,
  slack: <MessageSquare className="h-4 w-4" />
};

const TEMPLATE_TYPE_LABELS: Record<MessageTemplateType, string> = {
  email: 'Email',
  sms: 'SMS',
  slack: 'Slack'
};

export default function MessageTemplateManager({ brandId }: MessageTemplateManagerProps) {
  const [templates, setTemplates] = useState<UgcMessageTemplate[]>([]);
  const [selectedType, setSelectedType] = useState<MessageTemplateType>('email');
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UgcMessageTemplate | null>(null);
  const [showVariableHelper, setShowVariableHelper] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    template_type: 'email' as MessageTemplateType,
    subject: '',
    content: '',
    is_ai_generated: false,
    ai_prompt: ''
  });

  useEffect(() => {
    loadTemplates();
  }, [brandId]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await getMessageTemplates(brandId);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name.trim() || !formData.content.trim()) return;

    try {
      const variables = extractTemplateVariables(formData.content);
      if (formData.subject) {
        variables.push(...extractTemplateVariables(formData.subject));
      }

      const newTemplate = await createMessageTemplate({
        brand_id: brandId,
        name: formData.name,
        template_type: formData.template_type,
        subject: formData.subject || undefined,
        content: formData.content,
        variables: [...new Set(variables)], // Remove duplicates
        is_ai_generated: formData.is_ai_generated,
        ai_prompt: formData.ai_prompt || undefined
      });

      setTemplates([...templates, newTemplate]);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate || !formData.name.trim() || !formData.content.trim()) return;

    try {
      const variables = extractTemplateVariables(formData.content);
      if (formData.subject) {
        variables.push(...extractTemplateVariables(formData.subject));
      }

      const updatedTemplate = await updateMessageTemplate(editingTemplate.id, {
        name: formData.name,
        subject: formData.subject || undefined,
        content: formData.content,
        variables: [...new Set(variables)],
        is_ai_generated: formData.is_ai_generated,
        ai_prompt: formData.ai_prompt || undefined
      });

      setTemplates(templates.map(t => t.id === updatedTemplate.id ? updatedTemplate : t));
      setEditingTemplate(null);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteMessageTemplate(templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleDuplicateTemplate = (template: UgcMessageTemplate) => {
    setFormData({
      name: `${template.name} (Copy)`,
      template_type: template.template_type,
      subject: template.subject || '',
      content: template.content,
      is_ai_generated: false,
      ai_prompt: ''
    });
    setIsDialogOpen(true);
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = 
        formData.content.substring(0, start) + 
        variable + 
        formData.content.substring(end);
      
      setFormData({ ...formData, content: newContent });
      
      // Reset cursor position
      setTimeout(() => {
        textarea.selectionStart = start + variable.length;
        textarea.selectionEnd = start + variable.length;
        textarea.focus();
      }, 0);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      template_type: 'email',
      subject: '',
      content: '',
      is_ai_generated: false,
      ai_prompt: ''
    });
  };

  const openEditDialog = (template: UgcMessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      template_type: template.template_type,
      subject: template.subject || '',
      content: template.content,
      is_ai_generated: template.is_ai_generated,
      ai_prompt: template.ai_prompt || ''
    });
    setIsDialogOpen(true);
  };

  const typeTemplates = templates.filter(t => t.template_type === selectedType);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Message Templates</h2>
          <p className="text-gray-600">Create reusable templates for automated messages</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingTemplate(null);
            resetForm();
            setShowVariableHelper(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate 
                  ? 'Update the message template'
                  : 'Create a reusable message template with variables'
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Welcome Email"
                />
              </div>
              
              {!editingTemplate && (
                <div>
                  <Label>Template Type</Label>
                  <Select
                    value={formData.template_type}
                    onValueChange={(value) => setFormData({ ...formData, template_type: value as MessageTemplateType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            {TEMPLATE_TYPE_ICONS[value as MessageTemplateType]}
                            <span>{label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.template_type === 'email' && (
                <div>
                  <Label>Subject Line</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Welcome to {brand_name}!"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ai_generated">AI Generated</Label>
                  <Switch
                    id="ai_generated"
                    checked={formData.is_ai_generated}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_ai_generated: checked })}
                  />
                </div>
                
                {formData.is_ai_generated && (
                  <div>
                    <Label>AI Prompt</Label>
                    <Textarea
                      value={formData.ai_prompt}
                      onChange={(e) => setFormData({ ...formData, ai_prompt: e.target.value })}
                      placeholder="Describe how the AI should generate this message..."
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The AI will generate the content based on this prompt and available variables.
                    </p>
                  </div>
                )}
              </div>

              {!formData.is_ai_generated && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Content</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowVariableHelper(!showVariableHelper)}
                    >
                      <Variable className="h-4 w-4 mr-1" />
                      Variables
                    </Button>
                  </div>
                  <Textarea
                    id="template-content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter your message content here. Use {variable_name} for dynamic content."
                    rows={8}
                  />
                  
                  {showVariableHelper && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium mb-2">Available Variables</p>
                      <div className="space-y-2">
                        {Object.entries(WORKFLOW_VARIABLES).map(([category, vars]) => (
                          <div key={category}>
                            <p className="text-xs text-gray-500 uppercase mb-1">{category}</p>
                            <div className="flex flex-wrap gap-1">
                              {vars.map((variable) => (
                                <button
                                  key={variable}
                                  type="button"
                                  className="px-2 py-1 text-xs bg-white border rounded hover:bg-gray-50"
                                  onClick={() => insertVariable(variable)}
                                >
                                  {variable}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingTemplate(null);
                    resetForm();
                    setShowVariableHelper(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}>
                  {editingTemplate ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as MessageTemplateType)}>
        <TabsList>
          {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              <div className="flex items-center gap-2">
                {TEMPLATE_TYPE_ICONS[value as MessageTemplateType]}
                <span>{label}</span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(TEMPLATE_TYPE_LABELS).map(([type]) => (
          <TabsContent key={type} value={type}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {typeTemplates.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="text-center py-12">
                    <div className="flex justify-center mb-4">
                      {TEMPLATE_TYPE_ICONS[type as MessageTemplateType]}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No {TEMPLATE_TYPE_LABELS[type as MessageTemplateType]} templates
                    </h3>
                    <p className="text-gray-500">
                      Create your first template to get started
                    </p>
                  </CardContent>
                </Card>
              ) : (
                typeTemplates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          {template.subject && (
                            <CardDescription className="mt-1">
                              Subject: {template.subject}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {template.is_ai_generated && (
                            <Bot className="h-4 w-4 text-purple-500" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm text-gray-600 line-clamp-3">
                          {template.content}
                        </div>
                        
                        {template.variables.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Variables:</p>
                            <div className="flex flex-wrap gap-1">
                              {template.variables.map((variable) => (
                                <Badge key={variable} variant="secondary" className="text-xs">
                                  {variable}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(template)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicateTemplate(template)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Duplicate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
} 