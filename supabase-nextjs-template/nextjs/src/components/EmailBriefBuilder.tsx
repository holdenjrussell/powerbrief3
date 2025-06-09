"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link2, X, Plus, Sparkles, GripVertical, Trash2, Calendar, User, Folder, Image, Type, Grid3x3, FileImage, MousePointer2, MessageSquare, Minus } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface EmailBriefBuilderProps {
  onSave?: (briefData: EmailBriefData) => void;
  onAutoSave?: (briefData: EmailBriefData) => void;
  isGenerating?: boolean;
  populatedData?: EmailBriefData | null;
}

interface EmailBriefData {
  // Core Configuration
  briefType: 'campaign' | 'flow';
  dueDate: string;
  assignedDesigner: string;
  strategist: string;
  creativeCoordinator: string;
  campaignFlowName: string;
  finalAssetsFolder: string;
  
  // Inspiration & AI Control
  inspirationFiles: File[];
  inspirationLinks: string[];
  primaryGoal: string;
  
  // Inbox Presence
  subjectLineVariations: Array<{
    id: string;
    subject: string;
    preheader: string;
  }>;
  
  // Email Storyboard
  storyboardSections: EmailSection[];
  
  // Final Instructions
  mandatoryInclusions: string;
  thingsToAvoid: string;
  deliverablesFormat: 'image_slices' | 'full_html';
  emailWidth: '600px' | '640px' | 'custom';
  customWidth?: string;
  brandGuidelinesLink: string;
}

interface EmailSection {
  id: string;
  type: 'hero_image' | 'text_block' | 'product_grid' | 'image_text' | 'cta_button' | 'social_proof' | 'spacer';
  content: Record<string, string>;
}

const SECTION_TYPES = [
  { id: 'hero_image', label: 'Hero Image', icon: Image },
  { id: 'text_block', label: 'Text Block', icon: Type },
  { id: 'product_grid', label: 'Product Grid', icon: Grid3x3 },
  { id: 'image_text', label: 'Image + Text', icon: FileImage },
  { id: 'cta_button', label: 'CTA Button', icon: MousePointer2 },
  { id: 'social_proof', label: 'Social Proof / Testimonial', icon: MessageSquare },
  { id: 'spacer', label: 'Spacer / Divider', icon: Minus },
];

export default function EmailBriefBuilder({ onSave, onAutoSave, isGenerating = false, populatedData }: EmailBriefBuilderProps) {
  const [briefData, setBriefData] = useState<EmailBriefData>({
    briefType: 'campaign',
    dueDate: '',
    assignedDesigner: '',
    strategist: '',
    creativeCoordinator: '',
    campaignFlowName: '',
    finalAssetsFolder: '',
    inspirationFiles: [],
    inspirationLinks: [''],
    primaryGoal: '',
    subjectLineVariations: [
      { id: '1', subject: '', preheader: '' }
    ],
    storyboardSections: [],
    mandatoryInclusions: '',
    thingsToAvoid: '',
    deliverablesFormat: 'image_slices',
    emailWidth: '600px',
    brandGuidelinesLink: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🚀 NEW: Effect to populate data when AI generates content
  useEffect(() => {
    if (populatedData) {
      setBriefData(populatedData);
    }
  }, [populatedData]);

  // 🚀 NEW: Autosave functionality with debouncing
  const triggerAutosave = useCallback(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    
    autosaveTimeoutRef.current = setTimeout(() => {
      if (onAutoSave) {
        onAutoSave(briefData);
      }
    }, 1000); // 1 second debounce
  }, [briefData, onAutoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced update functions that trigger autosave
  const updateCoreConfigWithAutosave = (field: string, value: string) => {
    setBriefData(prev => ({ ...prev, [field]: value }));
    triggerAutosave();
  };

  const updateSubjectLineVariationWithAutosave = (id: string, field: 'subject' | 'preheader', value: string) => {
    setBriefData(prev => ({
      ...prev,
      subjectLineVariations: prev.subjectLineVariations.map(variation =>
        variation.id === id ? { ...variation, [field]: value } : variation
      )
    }));
    triggerAutosave();
  };

  const updateStoryboardSectionWithAutosave = (id: string, field: string, value: string) => {
    setBriefData(prev => ({
      ...prev,
      storyboardSections: prev.storyboardSections.map(section =>
        section.id === id 
          ? { ...section, content: { ...section.content, [field]: value } }
          : section
      )
    }));
    triggerAutosave();
  };

  // Core Configuration Handlers
  const updateCoreConfig = (field: string, value: string) => {
    setBriefData(prev => ({ ...prev, [field]: value }));
  };

  // Inspiration Handlers
  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setBriefData(prev => ({
      ...prev,
      inspirationFiles: [...prev.inspirationFiles, ...newFiles]
    }));
    triggerAutosave();
  };

  const removeFile = (index: number) => {
    setBriefData(prev => ({
      ...prev,
      inspirationFiles: prev.inspirationFiles.filter((_, i) => i !== index)
    }));
    triggerAutosave();
  };

  const addInspirationLink = () => {
    setBriefData(prev => ({
      ...prev,
      inspirationLinks: [...prev.inspirationLinks, '']
    }));
    triggerAutosave();
  };

  const updateInspirationLink = (index: number, value: string) => {
    setBriefData(prev => ({
      ...prev,
      inspirationLinks: prev.inspirationLinks.map((link, i) => i === index ? value : link)
    }));
    triggerAutosave();
  };

  const removeInspirationLink = (index: number) => {
    setBriefData(prev => ({
      ...prev,
      inspirationLinks: prev.inspirationLinks.filter((_, i) => i !== index)
    }));
    triggerAutosave();
  };

  // Subject Line Handlers
  const addSubjectLineVariation = () => {
    const newId = (briefData.subjectLineVariations.length + 1).toString();
    setBriefData(prev => ({
      ...prev,
      subjectLineVariations: [
        ...prev.subjectLineVariations,
        { id: newId, subject: '', preheader: '' }
      ]
    }));
    triggerAutosave();
  };

  const updateSubjectLineVariation = (id: string, field: 'subject' | 'preheader', value: string) => {
    setBriefData(prev => ({
      ...prev,
      subjectLineVariations: prev.subjectLineVariations.map(variation =>
        variation.id === id ? { ...variation, [field]: value } : variation
      )
    }));
  };

  const removeSubjectLineVariation = (id: string) => {
    if (briefData.subjectLineVariations.length <= 1) return;
    setBriefData(prev => ({
      ...prev,
      subjectLineVariations: prev.subjectLineVariations.filter(variation => variation.id !== id)
    }));
    triggerAutosave();
  };

  // Storyboard Section Handlers
  const addStoryboardSection = (type: string) => {
    const newSection: EmailSection = {
      id: Date.now().toString(),
      type: type as EmailSection['type'],
      content: getDefaultContentForType(type)
    };
    
    setBriefData(prev => ({
      ...prev,
      storyboardSections: [...prev.storyboardSections, newSection]
    }));
    triggerAutosave();
  };

  const getDefaultContentForType = (type: string): Record<string, string> => {
    switch (type) {
      case 'hero_image':
        return { headline: '', subheadline: '', visualNotes: '' };
      case 'text_block':
        return { bodyText: '', visualNotes: '' };
      case 'product_grid':
        return { columns: '2', headline: '', visualNotes: '' };
      case 'image_text':
        return { layout: 'left', headline: '', bodyText: '', visualNotes: '' };
      case 'cta_button':
        return { buttonText: '', destinationUrl: '', visualNotes: '' };
      case 'social_proof':
        return { testimonialText: '', authorName: '', visualNotes: '' };
      case 'spacer':
        return { height: 'medium', style: 'line' };
      default:
        return {};
    }
  };

  const updateStoryboardSection = (id: string, field: string, value: string) => {
    setBriefData(prev => ({
      ...prev,
      storyboardSections: prev.storyboardSections.map(section =>
        section.id === id 
          ? { ...section, content: { ...section.content, [field]: value } }
          : section
      )
    }));
  };

  const removeStoryboardSection = (id: string) => {
    setBriefData(prev => ({
      ...prev,
      storyboardSections: prev.storyboardSections.filter(section => section.id !== id)
    }));
    triggerAutosave();
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(briefData.storyboardSections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setBriefData(prev => ({
      ...prev,
      storyboardSections: items
    }));
    triggerAutosave();
  };

  // AI Generation Handler
  const handleGenerateAndPopulate = async () => {
    // This will trigger AI generation and populate the brief
    if (onSave) {
      onSave(briefData);
    }
  };

  // Render Section Component
  const renderSectionComponent = (section: EmailSection, index: number) => {
    const SectionIcon = SECTION_TYPES.find(type => type.id === section.type)?.icon || Type;
    
    return (
      <Draggable key={section.id} draggableId={section.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`bg-white border rounded-lg p-4 mb-3 transition-all ${
              snapshot.isDragging ? 'shadow-lg rotate-1' : 'shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div
                  {...provided.dragHandleProps}
                  className="cursor-move text-gray-400 hover:text-gray-600"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
                <SectionIcon className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">
                  {SECTION_TYPES.find(type => type.id === section.type)?.label}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeStoryboardSection(section.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            {renderSectionFields(section)}
          </div>
        )}
      </Draggable>
    );
  };

  const renderSectionFields = (section: EmailSection) => {
    switch (section.type) {
      case 'hero_image':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Headline</Label>
              <Input
                value={section.content.headline || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'headline', e.target.value)}
                placeholder="Main headline for hero section"
              />
            </div>
            <div>
              <Label className="text-xs">Subheadline</Label>
              <Input
                value={section.content.subheadline || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'subheadline', e.target.value)}
                placeholder="Supporting text below headline"
              />
            </div>
            <div>
              <Label className="text-xs">Visual Notes</Label>
              <Textarea
                value={section.content.visualNotes || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'visualNotes', e.target.value)}
                placeholder="Describe the hero image, layout, styling..."
                rows={2}
              />
            </div>
          </div>
        );
        
      case 'text_block':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Body Text</Label>
              <Textarea
                value={section.content.bodyText || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'bodyText', e.target.value)}
                placeholder="Main body text content..."
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs">Visual Notes</Label>
              <Textarea
                value={section.content.visualNotes || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'visualNotes', e.target.value)}
                placeholder="Typography, styling, layout notes..."
                rows={2}
              />
            </div>
          </div>
        );

      case 'product_grid':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Grid Columns</Label>
              <Select
                value={section.content.columns || '2'}
                onValueChange={(value) => updateStoryboardSectionWithAutosave(section.id, 'columns', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Section Headline</Label>
              <Input
                value={section.content.headline || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'headline', e.target.value)}
                placeholder="Optional headline above products"
              />
            </div>
            <div>
              <Label className="text-xs">Visual Notes</Label>
              <Textarea
                value={section.content.visualNotes || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'visualNotes', e.target.value)}
                placeholder="Product selection, styling, layout notes..."
                rows={2}
              />
            </div>
          </div>
        );

      case 'image_text':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Layout</Label>
              <Select
                value={section.content.layout || 'left'}
                onValueChange={(value) => updateStoryboardSectionWithAutosave(section.id, 'layout', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Image Left, Text Right</SelectItem>
                  <SelectItem value="right">Text Left, Image Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Headline</Label>
              <Input
                value={section.content.headline || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'headline', e.target.value)}
                placeholder="Section headline"
              />
            </div>
            <div>
              <Label className="text-xs">Body Text</Label>
              <Textarea
                value={section.content.bodyText || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'bodyText', e.target.value)}
                placeholder="Supporting text content..."
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Visual Notes</Label>
              <Textarea
                value={section.content.visualNotes || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'visualNotes', e.target.value)}
                placeholder="Image requirements, styling notes..."
                rows={2}
              />
            </div>
          </div>
        );

      case 'cta_button':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Button Text</Label>
              <Input
                value={section.content.buttonText || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'buttonText', e.target.value)}
                placeholder="Shop Now, Learn More, etc."
              />
            </div>
            <div>
              <Label className="text-xs">Destination URL</Label>
              <Input
                value={section.content.destinationUrl || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'destinationUrl', e.target.value)}
                placeholder="Where the button should link"
              />
            </div>
            <div>
              <Label className="text-xs">Visual Notes</Label>
              <Textarea
                value={section.content.visualNotes || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'visualNotes', e.target.value)}
                placeholder="Button styling, colors, size..."
                rows={2}
              />
            </div>
          </div>
        );

      case 'social_proof':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Testimonial Text</Label>
              <Textarea
                value={section.content.testimonialText || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'testimonialText', e.target.value)}
                placeholder="Customer testimonial or review..."
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Author Name</Label>
              <Input
                value={section.content.authorName || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'authorName', e.target.value)}
                placeholder="Customer name, title, or company"
              />
            </div>
            <div>
              <Label className="text-xs">Visual Notes</Label>
              <Textarea
                value={section.content.visualNotes || ''}
                onChange={(e) => updateStoryboardSectionWithAutosave(section.id, 'visualNotes', e.target.value)}
                placeholder="Styling, layout, additional elements..."
                rows={2}
              />
            </div>
          </div>
        );

      case 'spacer':
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Height</Label>
              <Select
                value={section.content.height || 'medium'}
                onValueChange={(value) => updateStoryboardSectionWithAutosave(section.id, 'height', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (20px)</SelectItem>
                  <SelectItem value="medium">Medium (40px)</SelectItem>
                  <SelectItem value="large">Large (60px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Style</Label>
              <Select
                value={section.content.style || 'line'}
                onValueChange={(value) => updateStoryboardSectionWithAutosave(section.id, 'style', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empty">Empty Space</SelectItem>
                  <SelectItem value="line">Horizontal Line</SelectItem>
                  <SelectItem value="dots">Dotted Line</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return <div>Unknown section type</div>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Section 1: Core Configuration (Fixed Top Panel) */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Core Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Brief Type */}
            <div>
              <Label className="text-sm font-medium">Brief Type</Label>
              <Tabs 
                value={briefData.briefType} 
                onValueChange={(value) => updateCoreConfigWithAutosave('briefType', value)}
              >
                <TabsList className="w-full">
                  <TabsTrigger value="campaign" className="flex-1">Campaign</TabsTrigger>
                  <TabsTrigger value="flow" className="flex-1">Flow Email</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Due Date */}
            <div>
              <Label className="text-sm font-medium">Due Date for First Draft</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={briefData.dueDate}
                  onChange={(e) => updateCoreConfigWithAutosave('dueDate', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Campaign/Flow Name */}
            <div>
              <Label className="text-sm font-medium">
                {briefData.briefType === 'campaign' ? 'Campaign Name' : 'Flow Name'}
              </Label>
              <Input
                value={briefData.campaignFlowName}
                onChange={(e) => updateCoreConfigWithAutosave('campaignFlowName', e.target.value)}
                placeholder={briefData.briefType === 'campaign' ? 'e.g., Black Friday Sale' : 'e.g., Welcome Email #1'}
              />
            </div>

            {/* Strategist */}
            <div>
              <Label className="text-sm font-medium">Strategist</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  value={briefData.strategist}
                  onChange={(e) => updateCoreConfigWithAutosave('strategist', e.target.value)}
                  placeholder="Strategist name"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Creative Coordinator */}
            <div>
              <Label className="text-sm font-medium">Creative Coordinator</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  value={briefData.creativeCoordinator}
                  onChange={(e) => updateCoreConfigWithAutosave('creativeCoordinator', e.target.value)}
                  placeholder="Coordinator name"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Assign to Designer */}
            <div>
              <Label className="text-sm font-medium">Assign to Designer</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  value={briefData.assignedDesigner}
                  onChange={(e) => updateCoreConfigWithAutosave('assignedDesigner', e.target.value)}
                  placeholder="Designer name or email"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Final Assets Folder */}
            <div className="md:col-span-3">
              <Label className="text-sm font-medium">Link to Final Assets Folder</Label>
              <div className="relative">
                <Folder className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  value={briefData.finalAssetsFolder}
                  onChange={(e) => updateCoreConfigWithAutosave('finalAssetsFolder', e.target.value)}
                  placeholder="Google Drive, Dropbox link with logos, product shots"
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: The Builder (Main Content Area) */}
      
      {/* Module: Inspiration & AI Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2" />
            Inspiration & AI Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Inspiration Images */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Upload Inspiration Images</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files)}
                className="hidden"
                title="Upload inspiration images"
              />
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Images
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                Upload inspiration images for AI analysis
              </p>
            </div>

            {/* Display uploaded files */}
            {briefData.inspirationFiles.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label className="text-sm font-medium">Uploaded Files:</Label>
                <div className="space-y-2">
                  {briefData.inspirationFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inspiration URLs */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Link to Inspiration URLs</Label>
            <div className="space-y-2">
              {briefData.inspirationLinks.map((link, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <Input
                    placeholder="e.g., https://reallygoodemails.com/..."
                    value={link}
                    onChange={(e) => updateInspirationLink(index, e.target.value)}
                    className="flex-1"
                  />
                  {briefData.inspirationLinks.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInspirationLink(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addInspirationLink}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add another link
              </Button>
            </div>
          </div>

          {/* Primary Goal & Key Message */}
          <div>
            <Label className="text-sm font-medium">Primary Goal & Key Message</Label>
            <Textarea
              value={briefData.primaryGoal}
              onChange={(e) => updateCoreConfigWithAutosave('primaryGoal', e.target.value)}
              placeholder="The goal is to... The key message is... The target audience is..."
              rows={4}
              className="mt-2"
            />
          </div>

          {/* Generate & Populate Brief Button */}
          <div className="text-center">
            <Button
              onClick={handleGenerateAndPopulate}
              disabled={isGenerating || !briefData.primaryGoal.trim()}
              className={`px-8 py-3 text-white ${
                isGenerating 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
              }`}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    <span>Analyzing & Generating Brief...</span>
                  </div>
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  ✨ Generate & Populate Brief
                </>
              )}
            </Button>
            
            {isGenerating && (
              <div className="mt-4 text-center">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md mx-auto">
                  <div className="flex items-center justify-center">
                    <div className="animate-pulse flex space-x-4">
                      <div className="rounded-full bg-blue-400 h-2 w-2"></div>
                      <div className="rounded-full bg-blue-400 h-2 w-2"></div>
                      <div className="rounded-full bg-blue-400 h-2 w-2"></div>
                    </div>
                  </div>
                  <p className="text-sm text-blue-700 mt-2">
                    AI is analyzing your inspiration and generating email content...
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Module: Inbox Presence */}
      <Card>
        <CardHeader>
          <CardTitle>Inbox Presence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {briefData.subjectLineVariations.map((variation) => (
              <div key={variation.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Subject Line Variation</Label>
                  {briefData.subjectLineVariations.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSubjectLineVariation(variation.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Subject Line</Label>
                    <Input
                      value={variation.subject}
                      onChange={(e) => updateSubjectLineVariationWithAutosave(variation.id, 'subject', e.target.value)}
                      placeholder="Your compelling subject line"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Preheader Text</Label>
                    <Input
                      value={variation.preheader}
                      onChange={(e) => updateSubjectLineVariationWithAutosave(variation.id, 'preheader', e.target.value)}
                      placeholder="Preview text after subject line"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addSubjectLineVariation}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Variation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Module: Email Storyboard (The Core Builder) */}
      <Card>
        <CardHeader>
          <CardTitle>Email Storyboard</CardTitle>
        </CardHeader>
        <CardContent>
          {briefData.storyboardSections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-4">Your email storyboard is empty.</p>
              <p className="text-sm">Add sections below to build your email structure.</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="storyboard">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {briefData.storyboardSections.map((section, index) =>
                      renderSectionComponent(section, index)
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}

          {/* Add Section Button */}
          <div className="mt-6">
            <Label className="text-sm font-medium mb-3 block">Add Section</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SECTION_TYPES.map((sectionType) => {
                const Icon = sectionType.icon;
                return (
                  <Button
                    key={sectionType.id}
                    variant="outline"
                    onClick={() => addStoryboardSection(sectionType.id)}
                    className="flex flex-col items-center p-4 h-auto"
                  >
                    <Icon className="h-5 w-5 mb-2" />
                    <span className="text-xs text-center">{sectionType.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Module: Final Instructions & Specs */}
      <Card>
        <CardHeader>
          <CardTitle>Final Instructions & Specs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Mandatory Inclusions</Label>
                <Textarea
                  value={briefData.mandatoryInclusions}
                  onChange={(e) => updateCoreConfigWithAutosave('mandatoryInclusions', e.target.value)}
                  placeholder="Elements that must be included..."
                  rows={3}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label className="text-sm font-medium">Things to Avoid</Label>
                <Textarea
                  value={briefData.thingsToAvoid}
                  onChange={(e) => updateCoreConfigWithAutosave('thingsToAvoid', e.target.value)}
                  placeholder="Elements to avoid or exclude..."
                  rows={3}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Deliverables Format</Label>
                <Select
                  value={briefData.deliverablesFormat}
                  onValueChange={(value) => updateCoreConfigWithAutosave('deliverablesFormat', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image_slices">Image Slices</SelectItem>
                    <SelectItem value="full_html">Full HTML</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium">Email Width</Label>
                <Select
                  value={briefData.emailWidth}
                  onValueChange={(value) => updateCoreConfigWithAutosave('emailWidth', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="600px">600px</SelectItem>
                    <SelectItem value="640px">640px</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {briefData.emailWidth === 'custom' && (
                  <Input
                    value={briefData.customWidth || ''}
                    onChange={(e) => updateCoreConfigWithAutosave('customWidth', e.target.value)}
                    placeholder="Enter custom width"
                    className="mt-2"
                  />
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Link to Brand Guidelines</Label>
                <Input
                  value={briefData.brandGuidelinesLink}
                  onChange={(e) => updateCoreConfigWithAutosave('brandGuidelinesLink', e.target.value)}
                  placeholder="Brand guidelines URL"
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 