"use client";

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  Label,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { 
  Plus,
  Edit3,
  X,
  Check,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

type ItemType = 'angle' | 'benefit' | 'painPoint' | 'feature' | 'objection' | 'failedSolution' | 'persona' | 'hook' | 'visual';

interface BaseFormData {
  id?: string;
  dateAdded?: string;
  isManual?: boolean;
}

interface AngleFormData extends BaseFormData {
  title: string;
  description: string;
  priority: number;
  aiGenerated: boolean;
}

interface PersonaFormData extends BaseFormData {
  title: string;
  demographics: {
    age: string;
    gender: string;
    location: string;
    income: string;
    education: string;
    occupation: string;
  };
  psychographics: {
    interests: string[];
    lifestyle: string[];
    values: string[];
    painPoints: string[];
  };
  awarenessLevel: string;
  customerLanguage: string[];
}

interface HookFormData extends BaseFormData {
  text: string;
  angle: string;
  persona: string;
  format: string;
  priority: number;
  testVariations: string[];
}

interface VisualFormData extends BaseFormData {
  description: string;
  type: string;
  angle: string;
  priority: number;
  productionNotes: string;
}

interface SynthesisFormData extends BaseFormData {
  text: string;
  source: string;
  sourceDetails: string;
  relevance: number;
}

type FormData = AngleFormData | PersonaFormData | HookFormData | VisualFormData | SynthesisFormData;

interface ManualEntryFormProps {
  type: ItemType;
  onSave: (item: FormData) => void;
  onCancel?: () => void;
  existingItem?: FormData;
  mode?: 'create' | 'edit';
}

export function ManualEntryForm({ 
  type, 
  onSave, 
  onCancel,
  existingItem,
  mode = 'create'
}: ManualEntryFormProps) {
  const [formData, setFormData] = useState<FormData>(() => {
    if (existingItem) return existingItem;
    
    // Default form data based on type
    switch (type) {
      case 'angle':
        return {
          title: '',
          description: '',
          priority: 1,
          aiGenerated: false,
        } as AngleFormData;
      case 'persona':
        return {
          title: '',
          demographics: {
            age: '',
            gender: '',
            location: '',
            income: '',
            education: '',
            occupation: '',
          },
          psychographics: {
            interests: [],
            lifestyle: [],
            values: [],
            painPoints: [],
          },
          awarenessLevel: 'unaware',
          customerLanguage: [],
        } as PersonaFormData;
      case 'hook':
        return {
          text: '',
          angle: '',
          persona: '',
          format: '',
          priority: 1,
          testVariations: [],
        } as HookFormData;
      case 'visual':
        return {
          description: '',
          type: 'static',
          angle: '',
          priority: 1,
          productionNotes: '',
        } as VisualFormData;
      default:
        return {
          text: '',
          source: 'manual',
          sourceDetails: 'Manually entered',
          relevance: 4,
        } as SynthesisFormData;
    }
  });

  const handleSubmit = () => {
    // Validate required fields
    let isValid = true;
    let errorMessage = '';

    switch (type) {
      case 'angle':
        const angleData = formData as AngleFormData;
        if (!angleData.title || !angleData.description) {
          isValid = false;
          errorMessage = 'Title and description are required';
        }
        break;
      case 'persona':
        const personaData = formData as PersonaFormData;
        if (!personaData.title) {
          isValid = false;
          errorMessage = 'Persona title is required';
        }
        break;
      case 'hook':
        const hookData = formData as HookFormData;
        if (!hookData.text) {
          isValid = false;
          errorMessage = 'Hook text is required';
        }
        break;
      case 'visual':
        const visualData = formData as VisualFormData;
        if (!visualData.description) {
          isValid = false;
          errorMessage = 'Visual description is required';
        }
        break;
      default:
        const synthesisData = formData as SynthesisFormData;
        if (!synthesisData.text) {
          isValid = false;
          errorMessage = 'Text is required';
        }
    }

    if (!isValid) {
      toast({
        title: 'Validation Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }

    // Add metadata
    const itemToSave = {
      ...formData,
      id: existingItem?.id || Date.now().toString(),
      dateAdded: existingItem?.dateAdded || new Date().toISOString(),
      isManual: true,
    };

    onSave(itemToSave);
    
    toast({
      title: mode === 'create' ? 'Item Created' : 'Item Updated',
      description: `Your ${type} has been ${mode === 'create' ? 'added' : 'updated'} successfully.`,
    });
  };

  const renderFormFields = () => {
    switch (type) {
      case 'angle':
        const angleData = formData as AngleFormData;
        return (
          <>
            <div>
              <Label htmlFor="title">Angle Title</Label>
              <Input
                id="title"
                placeholder="e.g., Social Proof, Problem/Solution, Transformation"
                value={angleData.title}
                onChange={(e) => setFormData({ ...angleData, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe how this angle appeals to the audience..."
                value={angleData.description}
                onChange={(e) => setFormData({ ...angleData, description: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority (1-10)</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="10"
                value={angleData.priority}
                onChange={(e) => setFormData({ ...angleData, priority: parseInt(e.target.value) || 1 })}
                className="mt-1 w-24"
              />
            </div>
          </>
        );

      case 'persona':
        const personaData = formData as PersonaFormData;
        return (
          <>
            <div>
              <Label htmlFor="title">Persona Name</Label>
              <Input
                id="title"
                placeholder="e.g., Busy Professional Mom, Health-Conscious Millennial"
                value={personaData.title}
                onChange={(e) => setFormData({ ...personaData, title: e.target.value })}
                className="mt-1"
              />
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Demographics</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Age"
                  value={personaData.demographics.age}
                  onChange={(e) => setFormData({
                    ...personaData,
                    demographics: { ...personaData.demographics, age: e.target.value }
                  })}
                />
                <Input
                  placeholder="Gender"
                  value={personaData.demographics.gender}
                  onChange={(e) => setFormData({
                    ...personaData,
                    demographics: { ...personaData.demographics, gender: e.target.value }
                  })}
                />
                <Input
                  placeholder="Location"
                  value={personaData.demographics.location}
                  onChange={(e) => setFormData({
                    ...personaData,
                    demographics: { ...personaData.demographics, location: e.target.value }
                  })}
                />
                <Input
                  placeholder="Income"
                  value={personaData.demographics.income}
                  onChange={(e) => setFormData({
                    ...personaData,
                    demographics: { ...personaData.demographics, income: e.target.value }
                  })}
                />
              </div>
            </div>

            <div>
              <Label>Awareness Level</Label>
              <Select
                value={personaData.awarenessLevel}
                onValueChange={(value) => setFormData({ ...personaData, awarenessLevel: value })}
              >
                <SelectTrigger className="mt-1">
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
          </>
        );

      case 'hook':
        const hookData = formData as HookFormData;
        return (
          <>
            <div>
              <Label htmlFor="text">Hook Text</Label>
              <Textarea
                id="text"
                placeholder="Enter your hook text..."
                value={hookData.text}
                onChange={(e) => setFormData({ ...hookData, text: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="angle">Related Angle</Label>
              <Input
                id="angle"
                placeholder="Which angle does this hook support?"
                value={hookData.angle}
                onChange={(e) => setFormData({ ...hookData, angle: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="format">Format</Label>
              <Input
                id="format"
                placeholder="e.g., UGC, Static, Carousel"
                value={hookData.format}
                onChange={(e) => setFormData({ ...hookData, format: e.target.value })}
                className="mt-1"
              />
            </div>
          </>
        );

      case 'visual':
        const visualData = formData as VisualFormData;
        return (
          <>
            <div>
              <Label htmlFor="description">Visual Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the visual concept..."
                value={visualData.description}
                onChange={(e) => setFormData({ ...visualData, description: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label>Visual Type</Label>
              <Select
                value={visualData.type}
                onValueChange={(value) => setFormData({ ...visualData, type: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="testimonial">Testimonial</SelectItem>
                  <SelectItem value="demonstration">Demonstration</SelectItem>
                  <SelectItem value="lifestyle">Lifestyle</SelectItem>
                  <SelectItem value="ugc">UGC</SelectItem>
                  <SelectItem value="static">Static</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="productionNotes">Production Notes</Label>
              <Textarea
                id="productionNotes"
                placeholder="Any specific production requirements..."
                value={visualData.productionNotes}
                onChange={(e) => setFormData({ ...visualData, productionNotes: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>
          </>
        );

      default:
        // For synthesis items (benefits, pain points, etc.)
        const synthesisData = formData as SynthesisFormData;
        return (
          <>
            <div>
              <Label htmlFor="text">Content</Label>
              <Textarea
                id="text"
                placeholder={`Enter ${type}...`}
                value={synthesisData.text}
                onChange={(e) => setFormData({ ...synthesisData, text: e.target.value })}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="relevance">Relevance (1-5)</Label>
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3, 4, 5].map((num) => (
                  <Button
                    key={num}
                    variant={synthesisData.relevance >= num ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...synthesisData, relevance: num })}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="sourceDetails">Source Details (Optional)</Label>
              <Input
                id="sourceDetails"
                placeholder="Where did this insight come from?"
                value={synthesisData.sourceDetails}
                onChange={(e) => setFormData({ ...synthesisData, sourceDetails: e.target.value })}
                className="mt-1"
              />
            </div>
          </>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              {mode === 'create' ? 'Add' : 'Edit'} {type.charAt(0).toUpperCase() + type.slice(1)}
            </CardTitle>
            <CardDescription>
              Manually enter information to complement AI-generated content
            </CardDescription>
          </div>
          <Badge variant="outline">
            <Edit3 className="h-3 w-3 mr-1" />
            Manual Entry
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {renderFormFields()}
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
            <Button onClick={handleSubmit}>
              {mode === 'create' ? (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {type.charAt(0).toUpperCase() + type.slice(1)}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 