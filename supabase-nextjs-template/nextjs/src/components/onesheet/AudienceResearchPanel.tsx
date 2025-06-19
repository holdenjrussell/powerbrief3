'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Edit2, Trash2, Sparkles, Download, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import type { AudienceResearchData, AudienceResearchItem, AudiencePersona } from '@/lib/types/onesheet';

interface AudienceResearchPanelProps {
  onesheetId: string;
  brandId: string;
}

export default function AudienceResearchPanel({ onesheetId, brandId }: AudienceResearchPanelProps) {
  const [audienceData, setAudienceData] = useState<AudienceResearchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingItem, setEditingItem] = useState<{ section: string; item: any } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    angles: true,
    benefits: true,
    painPoints: true,
    features: true,
    objections: true,
    failedSolutions: true,
    other: true,
    personas: true
  });
  const { toast } = useToast();

  const sectionTitles = {
    angles: 'Angles (Overall themes for ads)',
    benefits: 'Benefits (What customers gain)',
    painPoints: 'Pain Points (Problems without product)',
    features: 'Features (Product attributes)',
    objections: 'Objections (Purchase hesitations)',
    failedSolutions: 'Failed Solutions (What didn\'t work)',
    other: 'Other (Miscellaneous insights)',
    personas: 'Personas (Customer profiles)'
  };

  useEffect(() => {
    fetchAudienceResearch();
  }, [onesheetId]);

  const fetchAudienceResearch = async () => {
    try {
      const response = await fetch(`/api/onesheet/audience-research?onesheet_id=${onesheetId}`);
      const data = await response.json();
      
      if (data.success) {
        setAudienceData(data.data);
      }
    } catch (error) {
      console.error('Error fetching audience research:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audience research data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateFromContext = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/onesheet/audience-research/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onesheet_id: onesheetId })
      });

      const data = await response.json();
      
      if (data.success) {
        setAudienceData(data.data);
        // Also refresh from database to ensure consistency
        await fetchAudienceResearch();
        toast({
          title: 'Success',
          description: 'Audience research generated successfully'
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating audience research:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate audience research',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async (section: string, item: any) => {
    try {
      const response = await fetch('/api/onesheet/audience-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onesheet_id: onesheetId,
          section,
          item
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchAudienceResearch();
        toast({
          title: 'Success',
          description: `${section} item added successfully`
        });
      }
    } catch (error) {
      console.error('Error creating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to create item',
        variant: 'destructive'
      });
    }
  };

  const handleUpdate = async (section: string, itemId: string, updates: any) => {
    try {
      const response = await fetch('/api/onesheet/audience-research', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onesheet_id: onesheetId,
          section,
          item_id: itemId,
          updates
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchAudienceResearch();
        setEditingItem(null);
        toast({
          title: 'Success',
          description: 'Item updated successfully'
        });
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (section: string, itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch(`/api/onesheet/audience-research?onesheet_id=${onesheetId}&section=${section}&item_id=${itemId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchAudienceResearch();
        toast({
          title: 'Success',
          description: 'Item deleted successfully'
        });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive'
      });
    }
  };

  const exportToJSON = () => {
    if (!audienceData) return;
    
    const dataStr = JSON.stringify(audienceData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `audience-research-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Stage 1: Audience Research</h2>
        <div className="flex gap-2">
          <Button
            onClick={generateFromContext}
            disabled={generating}
            variant="default"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate from Context
              </>
            )}
          </Button>
          <Button
            onClick={exportToJSON}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Research Sections */}
      <div className="space-y-4">
        {Object.entries(sectionTitles).map(([section, title]) => {
          const items = audienceData?.[section as keyof AudienceResearchData] || [];
          const isExpanded = expandedSections[section];

          return (
            <Card key={section}>
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleSection(section)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription>
                      {items.length} items
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <AddItemDialog
                      section={section}
                      onAdd={(item) => handleCreate(section, item)}
                    />
                    {isExpanded ? <ChevronUp /> : <ChevronDown />}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent>
                  {section === 'personas' ? (
                    <PersonasList
                      personas={items as AudiencePersona[]}
                      onEdit={(persona) => setEditingItem({ section, item: persona })}
                      onDelete={(id) => handleDelete(section, id)}
                    />
                  ) : (
                    <ResearchItemsList
                      items={items as AudienceResearchItem[]}
                      onEdit={(item) => setEditingItem({ section, item })}
                      onDelete={(id) => handleDelete(section, id)}
                    />
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      {editingItem && (
        <EditItemDialog
          section={editingItem.section}
          item={editingItem.item}
          onSave={(updates) => handleUpdate(editingItem.section, editingItem.item.id, updates)}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

// Component for displaying research items
function ResearchItemsList({ 
  items, 
  onEdit, 
  onDelete 
}: { 
  items: AudienceResearchItem[];
  onEdit: (item: AudienceResearchItem) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-muted-foreground">No items yet. Add one or generate from context.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="border rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-medium">{item.content}</p>
              {item.evidence && item.evidence.length > 0 && (
                <div className="mt-2 space-y-1">
                  {item.evidence.map((ev, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground">
                      <Badge variant="outline" className="mr-2">{ev.type}</Badge>
                      {ev.text}
                      {ev.source && <span className="ml-1">- {ev.source}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              {item.priority && (
                <Badge variant="secondary">Priority: {item.priority}</Badge>
              )}
              {item.aiGenerated && (
                <Badge variant="outline">AI</Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(item)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Component for displaying personas
function PersonasList({ 
  personas, 
  onEdit, 
  onDelete 
}: { 
  personas: AudiencePersona[];
  onEdit: (persona: AudiencePersona) => void;
  onDelete: (id: string) => void;
}) {
  if (personas.length === 0) {
    return <p className="text-muted-foreground">No personas yet. Add one or generate from context.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {personas.map((persona) => (
        <Card key={persona.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{persona.name}</CardTitle>
                {persona.quote && (
                  <CardDescription className="mt-2 italic">
                    "{persona.quote}"
                  </CardDescription>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(persona)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(persona.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Demographics</h4>
              <div className="text-sm space-y-1">
                {Object.entries(persona.demographics).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-medium capitalize">{key}:</span> {value}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Psychographics</h4>
              <div className="text-sm space-y-1">
                {Object.entries(persona.psychographics).map(([key, value]) => (
                  <div key={key}>
                    <span className="font-medium capitalize">{key}:</span>{' '}
                    {Array.isArray(value) ? value.join(', ') : value}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <Badge>{persona.awarenessLevel}</Badge>
              {persona.aiGenerated && <Badge variant="outline">AI</Badge>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Add Item Dialog Component
function AddItemDialog({ 
  section, 
  onAdd 
}: { 
  section: string; 
  onAdd: (item: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const handleSubmit = () => {
    onAdd(formData);
    setOpen(false);
    setFormData({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add {section} Item</DialogTitle>
        </DialogHeader>
        
        {section === 'personas' ? (
          <PersonaForm
            persona={formData}
            onChange={setFormData}
            onSubmit={handleSubmit}
          />
        ) : (
          <ResearchItemForm
            item={formData}
            onChange={setFormData}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Edit Item Dialog Component
function EditItemDialog({ 
  section, 
  item, 
  onSave, 
  onClose 
}: { 
  section: string;
  item: any;
  onSave: (updates: any) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState(item);

  const handleSubmit = () => {
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {section} Item</DialogTitle>
        </DialogHeader>
        
        {section === 'personas' ? (
          <PersonaForm
            persona={formData}
            onChange={setFormData}
            onSubmit={handleSubmit}
          />
        ) : (
          <ResearchItemForm
            item={formData}
            onChange={setFormData}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Research Item Form Component
function ResearchItemForm({ 
  item, 
  onChange, 
  onSubmit 
}: { 
  item: any;
  onChange: (item: any) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Content</Label>
        <Textarea
          value={item.content || ''}
          onChange={(e) => onChange({ ...item, content: e.target.value })}
          placeholder="Enter the main content..."
          rows={3}
        />
      </div>
      
      <div>
        <Label>Priority (1-10)</Label>
        <Input
          type="number"
          min="1"
          max="10"
          value={item.priority || 5}
          onChange={(e) => onChange({ ...item, priority: parseInt(e.target.value) })}
        />
      </div>
      
      <Button onClick={onSubmit} className="w-full">
        Save
      </Button>
    </div>
  );
}

// Persona Form Component
function PersonaForm({ 
  persona, 
  onChange, 
  onSubmit 
}: { 
  persona: any;
  onChange: (persona: any) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input
          value={persona.name || ''}
          onChange={(e) => onChange({ ...persona, name: e.target.value })}
          placeholder="e.g., Busy Professional"
        />
      </div>
      
      <div>
        <Label>Quote</Label>
        <Textarea
          value={persona.quote || ''}
          onChange={(e) => onChange({ ...persona, quote: e.target.value })}
          placeholder="Representative quote from this persona..."
          rows={2}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Age</Label>
          <Input
            value={persona.demographics?.age || ''}
            onChange={(e) => onChange({
              ...persona,
              demographics: { ...persona.demographics, age: e.target.value }
            })}
            placeholder="e.g., 25-34"
          />
        </div>
        
        <div>
          <Label>Gender</Label>
          <Input
            value={persona.demographics?.gender || ''}
            onChange={(e) => onChange({
              ...persona,
              demographics: { ...persona.demographics, gender: e.target.value }
            })}
            placeholder="e.g., Female"
          />
        </div>
      </div>
      
      <div>
        <Label>Awareness Level</Label>
        <Select
          value={persona.awarenessLevel || 'problemAware'}
          onValueChange={(value) => onChange({ ...persona, awarenessLevel: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unaware">Unaware</SelectItem>
            <SelectItem value="problemAware">Problem Aware</SelectItem>
            <SelectItem value="solutionAware">Solution Aware</SelectItem>
            <SelectItem value="productAware">Product Aware</SelectItem>
            <SelectItem value="mostAware">Most Aware</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Button onClick={onSubmit} className="w-full">
        Save
      </Button>
    </div>
  );
} 