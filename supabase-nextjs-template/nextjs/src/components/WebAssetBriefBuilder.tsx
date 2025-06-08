"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  X, 
  Upload, 
  Sparkles, 
  Loader2, 
  Monitor, 
  Palette, 
  FileText, 
  Settings,
  Eye,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Layout,
  MousePointer,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import WebAssetBriefBuilder from '@/components/WebAssetBriefBuilder';
import CreativeAngleGenerator from '@/components/CreativeAngleGenerator';
import AIMoodBoard from '@/components/AIMoodBoard';
import AnimationSequenceSuggester from '@/components/AnimationSequenceSuggester';

interface WebAssetBriefData {
  // Core Configuration
  assetType: 'landing_page' | 'web_banner_static' | 'web_banner_animated' | 'promotional_popup' | 'homepage_hero' | 'product_explainer' | 'brand_story_video' | 'animated_logo' | 'video_animation' | 'other';
  customAssetType?: string;
  dueDate: string;
  assignedDesigner: string;
  projectName: string;
  finalAssetsFolder: string;
  
  // Core Creative Idea
  primaryMessage: string;
  callToAction: string;
  offer?: string;
  
  // Inspiration & AI Control
  inspirationFiles: File[];
  inspirationLinks: string[];
  lookAndFeelKeywords: string[];
  
  // Visual & Sensory Direction
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    avoidColors: string[];
  };
  typography: {
    fontFamily: string;
    weights: string[];
    styles: string[];
  };
  
  // Mandatory Elements
  mandatoryElements: {
    logo: boolean;
    logoVersion: 'primary' | 'stacked' | 'whiteout';
    productShots: boolean;
    legalDisclaimer: boolean;
    customElements: string[];
  };
  
  // Asset-Specific Structure & Specs
  assetSpecs: {
    dimensions?: string[];
    interactiveNotes?: string;
    animationSequence?: string;
    aspectRatios?: string[];
    sectionFlow?: string[];
  };
  
  // Final Instructions
  strictlyAvoid: string;
  brandGuidelinesLink: string;
}

interface WebAssetBriefBuilderProps {
  onGenerate: (briefData: WebAssetBriefData) => Promise<void>;
  onAutoSave?: (briefData: WebAssetBriefData) => Promise<void>;
  isGenerating: boolean;
  populatedData?: WebAssetBriefData | null;
  onDataPopulated?: () => void;
}

const ASSET_TYPE_OPTIONS = [
  { value: 'landing_page', label: 'Landing Page', icon: Layout },
  { value: 'web_banner_static', label: 'Web Banner (Static)', icon: ImageIcon },
  { value: 'web_banner_animated', label: 'Web Banner (Animated)', icon: Video },
  { value: 'promotional_popup', label: 'Promotional Popup/Modal', icon: MousePointer },
  { value: 'homepage_hero', label: 'Homepage Hero', icon: Monitor },
  { value: 'product_explainer', label: 'Product Explainer', icon: FileText },
  { value: 'brand_story_video', label: 'Brand Story Video', icon: Video },
  { value: 'animated_logo', label: 'Animated Logo/Bumper', icon: Zap },
  { value: 'video_animation', label: 'Video Animation', icon: Video },
  { value: 'other', label: 'Other (Custom)', icon: Settings }
];

const LOOK_AND_FEEL_OPTIONS = [
  'Minimal & Clean', 'Bold & Energetic', 'Nostalgic & Dreamy', 'Luxurious & Sleek',
  'Playful & Fun', 'Professional & Corporate', 'Artistic & Creative', 'Modern & Tech',
  'Warm & Friendly', 'Dark & Moody', 'Bright & Airy', 'Elegant & Sophisticated'
];

const FONT_WEIGHTS = ['Light', 'Regular', 'Medium', 'Semi-Bold', 'Bold', 'Extra-Bold'];
const FONT_STYLES = ['Normal', 'Italic', 'Condensed', 'Extended'];

export default function WebAssetBriefBuilder({
  onGenerate,
  onAutoSave,
  isGenerating,
  populatedData,
  onDataPopulated
}: WebAssetBriefBuilderProps) {
  const [briefData, setBriefData] = useState<WebAssetBriefData>({
    assetType: 'landing_page',
    dueDate: '',
    assignedDesigner: '',
    projectName: '',
    finalAssetsFolder: '',
    primaryMessage: '',
    callToAction: '',
    offer: '',
    inspirationFiles: [],
    inspirationLinks: [''],
    lookAndFeelKeywords: [],
    colorPalette: {
      primary: '',
      secondary: '',
      accent: '',
      avoidColors: []
    },
    typography: {
      fontFamily: '',
      weights: [],
      styles: []
    },
    mandatoryElements: {
      logo: false,
      logoVersion: 'primary',
      productShots: false,
      legalDisclaimer: false,
      customElements: []
    },
    assetSpecs: {
      dimensions: [''],
      aspectRatios: [''],
      sectionFlow: ['']
    },
    strictlyAvoid: '',
    brandGuidelinesLink: ''
  });

  const [newCustomElement, setNewCustomElement] = useState('');
  const [newAvoidColor, setNewAvoidColor] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  // Auto-save functionality
  const debouncedAutoSave = useCallback(
    debounce((data: WebAssetBriefData) => {
      if (onAutoSave) {
        onAutoSave(data);
      }
    }, 2000),
    [onAutoSave]
  );

  useEffect(() => {
    debouncedAutoSave(briefData);
  }, [briefData, debouncedAutoSave]);

  // Handle populated data from AI generation
  useEffect(() => {
    if (populatedData) {
      setBriefData(populatedData);
      if (onDataPopulated) {
        onDataPopulated();
      }
    }
  }, [populatedData, onDataPopulated]);

  const updateBriefData = (updates: Partial<WebAssetBriefData>) => {
    setBriefData(prev => ({ ...prev, ...updates }));
  };

  const updateNestedData = (path: string, value: any) => {
    setBriefData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const addToArray = (path: string, value: string) => {
    if (!value.trim()) return;
    
    setBriefData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      const array = current[keys[keys.length - 1]] || [];
      current[keys[keys.length - 1]] = [...array, value];
      return newData;
    });
  };

  const removeFromArray = (path: string, index: number) => {
    setBriefData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      const array = current[keys[keys.length - 1]] || [];
      current[keys[keys.length - 1]] = array.filter((_: any, i: number) => i !== index);
      return newData;
    });
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files);
    setBriefData(prev => ({
      ...prev,
      inspirationFiles: [...prev.inspirationFiles, ...newFiles]
    }));
  };

  const removeFile = (index: number) => {
    setBriefData(prev => ({
      ...prev,
      inspirationFiles: prev.inspirationFiles.filter((_, i) => i !== index)
    }));
  };

  const handleGenerate = async () => {
    await onGenerate(briefData);
  };

  const getAssetSpecificFields = () => {
    switch (briefData.assetType) {
      case 'landing_page':
      case 'homepage_hero':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="sectionFlow">Section Flow / Wireframe</Label>
              <div className="space-y-2">
                {briefData.assetSpecs.sectionFlow?.map((section, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={section}
                      onChange={(e) => {
                        const newFlow = [...(briefData.assetSpecs.sectionFlow || [])];
                        newFlow[index] = e.target.value;
                        updateNestedData('assetSpecs.sectionFlow', newFlow);
                      }}
                      placeholder={`Section ${index + 1} (e.g., Full-width Hero Image)`}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromArray('assetSpecs.sectionFlow', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addToArray('assetSpecs.sectionFlow', '')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="interactiveNotes">Interactive Notes</Label>
              <Textarea
                id="interactiveNotes"
                value={briefData.assetSpecs.interactiveNotes || ''}
                onChange={(e) => updateNestedData('assetSpecs.interactiveNotes', e.target.value)}
                placeholder="Describe hover states, animations, or interactive elements..."
                rows={3}
              />
            </div>
          </div>
        );
        
      case 'web_banner_static':
      case 'web_banner_animated':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dimensions">Dimensions</Label>
              <div className="space-y-2">
                {briefData.assetSpecs.dimensions?.map((dimension, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={dimension}
                      onChange={(e) => {
                        const newDimensions = [...(briefData.assetSpecs.dimensions || [])];
                        newDimensions[index] = e.target.value;
                        updateNestedData('assetSpecs.dimensions', newDimensions);
                      }}
                      placeholder="e.g., 300x250, 728x90, 160x600"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromArray('assetSpecs.dimensions', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addToArray('assetSpecs.dimensions', '')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Dimension
                </Button>
              </div>
            </div>
            
            {briefData.assetType === 'web_banner_animated' && (
              <div>
                <Label htmlFor="animationSequence">Animation Sequence</Label>
                <Textarea
                  id="animationSequence"
                  value={briefData.assetSpecs.animationSequence || ''}
                  onChange={(e) => updateNestedData('assetSpecs.animationSequence', e.target.value)}
                  placeholder="Frame 1: Product appears. Frame 2: Headline animates in. Frame 3: CTA button pulses."
                  rows={4}
                />
              </div>
            )}
          </div>
        );
        
      case 'brand_story_video':
      case 'product_explainer':
      case 'video_animation':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="aspectRatios">Aspect Ratios</Label>
              <div className="space-y-2">
                {briefData.assetSpecs.aspectRatios?.map((ratio, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={ratio}
                      onChange={(e) => {
                        const newRatios = [...(briefData.assetSpecs.aspectRatios || [])];
                        newRatios[index] = e.target.value;
                        updateNestedData('assetSpecs.aspectRatios', newRatios);
                      }}
                      placeholder="e.g., 16:9, 9:16, 1:1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromArray('assetSpecs.aspectRatios', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addToArray('assetSpecs.aspectRatios', '')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Aspect Ratio
                </Button>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          PowerBrief Creative Execution Brief
        </h1>
        <p className="text-gray-600">For Designers & Video Editors</p>
        <p className="text-sm text-gray-500 mt-2">
          Single source of truth for exceptional web asset creation
        </p>
      </div>

      {/* Initial Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2 text-blue-600" />
            Initial Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assetType">Select Asset Type</Label>
              <Select
                value={briefData.assetType}
                onValueChange={(value) => updateBriefData({ assetType: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose asset type" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPE_OPTIONS.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center">
                          <IconComponent className="h-4 w-4 mr-2" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {briefData.assetType === 'other' && (
              <div>
                <Label htmlFor="customAssetType">Custom Asset Type</Label>
                <Input
                  id="customAssetType"
                  value={briefData.customAssetType || ''}
                  onChange={(e) => updateBriefData({ customAssetType: e.target.value })}
                  placeholder="Enter custom asset type"
                />
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={briefData.dueDate}
                onChange={(e) => updateBriefData({ dueDate: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="assignedDesigner">Assigned Designer</Label>
              <Input
                id="assignedDesigner"
                value={briefData.assignedDesigner}
                onChange={(e) => updateBriefData({ assignedDesigner: e.target.value })}
                placeholder="Designer name"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={briefData.projectName}
                onChange={(e) => updateBriefData({ projectName: e.target.value })}
                placeholder="Clear, descriptive title for the asset"
              />
            </div>
            
            <div>
              <Label htmlFor="finalAssetsFolder">Final Assets Folder</Label>
              <Input
                id="finalAssetsFolder"
                value={briefData.finalAssetsFolder}
                onChange={(e) => updateBriefData({ finalAssetsFolder: e.target.value })}
                placeholder="Link to final assets folder"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1: The Core Creative Idea */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
            Section 1: The Core Creative Idea
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="primaryMessage">Primary Message / The Hook</Label>
            <Textarea
              id="primaryMessage"
              value={briefData.primaryMessage}
              onChange={(e) => updateBriefData({ primaryMessage: e.target.value })}
              placeholder="What is the single most important idea the viewer must see, feel, and understand?"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="callToAction">Call to Action (CTA)</Label>
              <Input
                id="callToAction"
                value={briefData.callToAction}
                onChange={(e) => updateBriefData({ callToAction: e.target.value })}
                placeholder="e.g., Shop Now, Watch Now, Get 20% Off"
              />
            </div>
            
            <div>
              <Label htmlFor="offer">The Offer (if applicable)</Label>
              <Input
                id="offer"
                value={briefData.offer || ''}
                onChange={(e) => updateBriefData({ offer: e.target.value })}
                placeholder="e.g., Buy One, Get One Free"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Visual & Sensory Direction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="h-5 w-5 mr-2 text-green-600" />
            Section 2: Visual & Sensory Direction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Inspiration Gallery */}
          <div>
            <Label>Inspiration Gallery</Label>
            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <Label htmlFor="inspirationFiles">Upload Images</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    id="inspirationFiles"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <label
                    htmlFor="inspirationFiles"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      Click to upload inspiration images
                    </span>
                  </label>
                </div>
                
                {briefData.inspirationFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {briefData.inspirationFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm">{file.name}</span>
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
                )}
              </div>
              
              {/* URL Links */}
              <div>
                <Label>Inspiration Links</Label>
                <div className="space-y-2">
                  {briefData.inspirationLinks.map((link, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={link}
                        onChange={(e) => {
                          const newLinks = [...briefData.inspirationLinks];
                          newLinks[index] = e.target.value;
                          updateBriefData({ inspirationLinks: newLinks });
                        }}
                        placeholder="https://behance.net/gallery/..."
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFromArray('inspirationLinks', index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addToArray('inspirationLinks', '')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Link
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Look & Feel Keywords */}
          <div>
            <Label>Look & Feel Keywords</Label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {LOOK_AND_FEEL_OPTIONS.map((option) => (
                  <Badge
                    key={option}
                    variant={briefData.lookAndFeelKeywords.includes(option) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      const keywords = briefData.lookAndFeelKeywords.includes(option)
                        ? briefData.lookAndFeelKeywords.filter(k => k !== option)
                        : [...briefData.lookAndFeelKeywords, option];
                      updateBriefData({ lookAndFeelKeywords: keywords });
                    }}
                  >
                    {option}
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add custom keyword"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newKeyword.trim()) {
                      updateBriefData({
                        lookAndFeelKeywords: [...briefData.lookAndFeelKeywords, newKeyword.trim()]
                      });
                      setNewKeyword('');
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newKeyword.trim()) {
                      updateBriefData({
                        lookAndFeelKeywords: [...briefData.lookAndFeelKeywords, newKeyword.trim()]
                      });
                      setNewKeyword('');
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <Label>Color Palette</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={briefData.colorPalette.primary}
                    onChange={(e) => updateNestedData('colorPalette.primary', e.target.value)}
                    className="w-16"
                  />
                  <Input
                    value={briefData.colorPalette.primary}
                    onChange={(e) => updateNestedData('colorPalette.primary', e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={briefData.colorPalette.secondary}
                    onChange={(e) => updateNestedData('colorPalette.secondary', e.target.value)}
                    className="w-16"
                  />
                  <Input
                    value={briefData.colorPalette.secondary}
                    onChange={(e) => updateNestedData('colorPalette.secondary', e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accentColor"
                    type="color"
                    value={briefData.colorPalette.accent}
                    onChange={(e) => updateNestedData('colorPalette.accent', e.target.value)}
                    className="w-16"
                  />
                  <Input
                    value={briefData.colorPalette.accent}
                    onChange={(e) => updateNestedData('colorPalette.accent', e.target.value)}
                    placeholder="#000000"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <Label>Colors to Avoid</Label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {briefData.colorPalette.avoidColors.map((color, index) => (
                    <Badge key={index} variant="destructive" className="flex items-center gap-1">
                      {color}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeFromArray('colorPalette.avoidColors', index)}
                      />
                    </Badge>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={newAvoidColor}
                    onChange={(e) => setNewAvoidColor(e.target.value)}
                    placeholder="Color to avoid (e.g., red, #FF0000)"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newAvoidColor.trim()) {
                        addToArray('colorPalette.avoidColors', newAvoidColor.trim());
                        setNewAvoidColor('');
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newAvoidColor.trim()) {
                        addToArray('colorPalette.avoidColors', newAvoidColor.trim());
                        setNewAvoidColor('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div>
            <Label>Typography</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fontFamily">Font Family</Label>
                <Input
                  id="fontFamily"
                  value={briefData.typography.fontFamily}
                  onChange={(e) => updateNestedData('typography.fontFamily', e.target.value)}
                  placeholder="e.g., Helvetica, Arial, Custom Font"
                />
              </div>
              
              <div>
                <Label>Font Weights</Label>
                <div className="flex flex-wrap gap-1">
                  {FONT_WEIGHTS.map((weight) => (
                    <Badge
                      key={weight}
                      variant={briefData.typography.weights.includes(weight) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        const weights = briefData.typography.weights.includes(weight)
                          ? briefData.typography.weights.filter(w => w !== weight)
                          : [...briefData.typography.weights, weight];
                        updateNestedData('typography.weights', weights);
                      }}
                    >
                      {weight}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <Label>Font Styles</Label>
                <div className="flex flex-wrap gap-1">
                  {FONT_STYLES.map((style) => (
                    <Badge
                      key={style}
                      variant={briefData.typography.styles.includes(style) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        const styles = briefData.typography.styles.includes(style)
                          ? briefData.typography.styles.filter(s => s !== style)
                          : [...briefData.typography.styles, style];
                        updateNestedData('typography.styles', styles);
                      }}
                    >
                      {style}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mandatory Elements */}
          <div>
            <Label>Mandatory Elements</Label>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="logo"
                  checked={briefData.mandatoryElements.logo}
                  onCheckedChange={(checked) => 
                    updateNestedData('mandatoryElements.logo', checked)
                  }
                />
                <Label htmlFor="logo">Logo</Label>
                {briefData.mandatoryElements.logo && (
                  <Select
                    value={briefData.mandatoryElements.logoVersion}
                    onValueChange={(value) => 
                      updateNestedData('mandatoryElements.logoVersion', value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="stacked">Stacked</SelectItem>
                      <SelectItem value="whiteout">Whiteout</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="productShots"
                  checked={briefData.mandatoryElements.productShots}
                  onCheckedChange={(checked) => 
                    updateNestedData('mandatoryElements.productShots', checked)
                  }
                />
                <Label htmlFor="productShots">Specific Product Shots</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="legalDisclaimer"
                  checked={briefData.mandatoryElements.legalDisclaimer}
                  onCheckedChange={(checked) => 
                    updateNestedData('mandatoryElements.legalDisclaimer', checked)
                  }
                />
                <Label htmlFor="legalDisclaimer">Legal Disclaimer / Fine Print</Label>
              </div>
              
              <div>
                <Label>Custom Elements</Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {briefData.mandatoryElements.customElements.map((element, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {element}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeFromArray('mandatoryElements.customElements', index)}
                        />
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      value={newCustomElement}
                      onChange={(e) => setNewCustomElement(e.target.value)}
                      placeholder="Add custom mandatory element"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && newCustomElement.trim()) {
                          addToArray('mandatoryElements.customElements', newCustomElement.trim());
                          setNewCustomElement('');
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (newCustomElement.trim()) {
                          addToArray('mandatoryElements.customElements', newCustomElement.trim());
                          setNewCustomElement('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Asset-Specific Structure & Specs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-orange-600" />
            Section 3: Asset-Specific Structure & Specs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getAssetSpecificFields()}
        </CardContent>
      </Card>

      {/* Final Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="h-5 w-5 mr-2 text-red-600" />
            Final Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="strictlyAvoid">Strictly Avoid</Label>
            <Textarea
              id="strictlyAvoid"
              value={briefData.strictlyAvoid}
              onChange={(e) => updateBriefData({ strictlyAvoid: e.target.value })}
              placeholder="Clear list of things not to do (e.g., No lifestyle images with faces, Avoid the color red)"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="brandGuidelinesLink">Brand Guidelines Link</Label>
            <Input
              id="brandGuidelinesLink"
              value={briefData.brandGuidelinesLink}
              onChange={(e) => updateBriefData({ brandGuidelinesLink: e.target.value })}
              placeholder="Link to brand guidelines document"
            />
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <div className="text-center">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          size="lg"
          className="px-8"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Generating Brief...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Generate & Populate Brief
            </>
          )}
        </Button>
      </div>

      {/* AI Enhancement Tools */}
      <div className="space-y-8 mt-12 border-t pt-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            AI Enhancement Tools
          </h2>
          <p className="text-gray-600">
            Use these AI-powered tools to enhance your brief with creative angles, mood boards, and animations
          </p>
        </div>

        {/* Creative Angle Generator */}
        <CreativeAngleGenerator
          productInfo={briefData.primaryMessage}
          offer={briefData.offer}
          onAngleSelect={(angle) => {
            updateBriefData({ primaryMessage: angle.angle });
          }}
        />

        {/* AI Mood Board */}
        <AIMoodBoard
          lookAndFeelKeywords={briefData.lookAndFeelKeywords}
          onMoodBoardSelect={(moodBoard) => {
            // Apply mood board to brief data
            updateBriefData({
              lookAndFeelKeywords: [moodBoard.theme, ...briefData.lookAndFeelKeywords]
            });
          }}
          onColorPaletteSelect={(colors) => {
            if (colors.length >= 3) {
              updateNestedData('colorPalette.primary', colors[0]);
              updateNestedData('colorPalette.secondary', colors[1]);
              updateNestedData('colorPalette.accent', colors[2]);
            }
          }}
        />

        {/* Animation Sequence Suggester - Only for animated assets */}
        {(briefData.assetType === 'web_banner_animated' || 
          briefData.assetType === 'video_animation' || 
          briefData.assetType === 'animated_logo') && (
          <AnimationSequenceSuggester
            contentElements={briefData.mandatoryElements.customElements}
            bannerDimensions={briefData.assetSpecs.dimensions?.join(', ')}
            onSequenceSelect={(sequence) => {
              updateNestedData('assetSpecs.animationSequence', sequence.description);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}