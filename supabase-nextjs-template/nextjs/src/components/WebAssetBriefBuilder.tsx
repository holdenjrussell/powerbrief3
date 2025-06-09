"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Sparkles, Upload, X, Plus, Loader2 } from 'lucide-react';

interface WebAssetBriefData {
  // Core Configuration
  assetType: 'landing_page' | 'web_banner' | 'promotional_popup' | 'homepage_hero' | 'product_explainer' | 'brand_story_video' | 'animated_logo' | 'video_animation' | 'custom';
  customAssetType?: string;
  dueDate: string;
  assignedDesigner: string;
  strategist: string;
  creativeCoordinator: string;
  projectName: string;
  finalAssetsFolder: string;
  
  // Inspiration & AI Control
  inspirationFiles: File[];
  inspirationLinks: string[];
  primaryGoal: string;
  
  // Core Creative Idea
  primaryMessage: string;
  callToAction: string;
  theOffer: string;
  
  // Visual Direction
  lookAndFeelKeywords: string[];
  colorPalette: string;
  typography: string;
  mandatoryElements: string;
  strictlyAvoid: string;
  
  // Asset-Specific Specs
  assetSpecs: Record<string, unknown>;
}

interface WebAssetBriefBuilderProps {
  onGenerate: (briefData: WebAssetBriefData) => Promise<void>;
  onAutoSave: (briefData: WebAssetBriefData) => Promise<void>;
  isGenerating: boolean;
  populatedData?: WebAssetBriefData | null;
  onDataPopulated?: () => void;
}

const ASSET_TYPE_OPTIONS = [
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'web_banner', label: 'Web Banner' },
  { value: 'promotional_popup', label: 'Promotional Popup' },
  { value: 'homepage_hero', label: 'Homepage Hero' },
  { value: 'product_explainer', label: 'Product Explainer' },
  { value: 'brand_story_video', label: 'Brand Story Video' },
  { value: 'animated_logo', label: 'Animated Logo' },
  { value: 'video_animation', label: 'Video Animation' },
  { value: 'custom', label: 'Custom Asset Type' }
];

const LOOK_AND_FEEL_OPTIONS = [
  'Modern', 'Minimalist', 'Bold', 'Elegant', 'Playful', 'Professional', 
  'Luxurious', 'Energetic', 'Calm', 'Vibrant', 'Clean', 'Artistic',
  'Tech-forward', 'Organic', 'Geometric', 'Vintage', 'Futuristic', 'Warm'
];

export default function WebAssetBriefBuilder({
  onGenerate,
  onAutoSave,
  isGenerating,
  populatedData,
  onDataPopulated
}: WebAssetBriefBuilderProps) {
  const [briefData, setBriefData] = useState<WebAssetBriefData>({
    assetType: 'landing_page',
    customAssetType: '',
    dueDate: '',
    assignedDesigner: '',
    strategist: '',
    creativeCoordinator: '',
    projectName: '',
    finalAssetsFolder: '',
    inspirationFiles: [],
    inspirationLinks: [''],
    primaryGoal: '',
    primaryMessage: '',
    callToAction: '',
    theOffer: '',
    lookAndFeelKeywords: [],
    colorPalette: '',
    typography: '',
    mandatoryElements: '',
    strictlyAvoid: '',
    assetSpecs: {}
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Populate data when AI generates content
  useEffect(() => {
    if (populatedData) {
      setBriefData(populatedData);
      if (onDataPopulated) {
        onDataPopulated();
      }
    }
  }, [populatedData, onDataPopulated]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      onAutoSave(briefData);
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [briefData, onAutoSave]);

  const updateBriefData = (updates: Partial<WebAssetBriefData>) => {
    setBriefData(prev => ({ ...prev, ...updates }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    updateBriefData({
      inspirationFiles: [...briefData.inspirationFiles, ...files]
    });
  };

  const removeFile = (index: number) => {
    const newFiles = briefData.inspirationFiles.filter((_, i) => i !== index);
    updateBriefData({ inspirationFiles: newFiles });
  };

  const addInspirationLink = () => {
    updateBriefData({
      inspirationLinks: [...briefData.inspirationLinks, '']
    });
  };

  const updateInspirationLink = (index: number, value: string) => {
    const newLinks = [...briefData.inspirationLinks];
    newLinks[index] = value;
    updateBriefData({ inspirationLinks: newLinks });
  };

  const removeInspirationLink = (index: number) => {
    const newLinks = briefData.inspirationLinks.filter((_, i) => i !== index);
    updateBriefData({ inspirationLinks: newLinks });
  };

  const toggleKeyword = (keyword: string) => {
    const newKeywords = briefData.lookAndFeelKeywords.includes(keyword)
      ? briefData.lookAndFeelKeywords.filter(k => k !== keyword)
      : [...briefData.lookAndFeelKeywords, keyword];
    updateBriefData({ lookAndFeelKeywords: newKeywords });
  };

  const getAssetSpecificFields = () => {
    switch (briefData.assetType) {
      case 'landing_page':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="sections">Page Sections</Label>
              <Textarea
                id="sections"
                placeholder="e.g., Hero, Features, Testimonials, CTA, Footer"
                value={(briefData.assetSpecs.sections as string) || ''}
                onChange={(e) => updateBriefData({
                  assetSpecs: { ...briefData.assetSpecs, sections: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="responsiveNotes">Responsive Requirements</Label>
              <Textarea
                id="responsiveNotes"
                placeholder="Mobile, tablet, desktop specific requirements"
                value={(briefData.assetSpecs.responsiveNotes as string) || ''}
                onChange={(e) => updateBriefData({
                  assetSpecs: { ...briefData.assetSpecs, responsiveNotes: e.target.value }
                })}
              />
            </div>
          </div>
        );
      
      case 'web_banner':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="dimensions">Banner Dimensions</Label>
              <Input
                id="dimensions"
                placeholder="e.g., 728x90, 300x250, 320x50"
                value={(briefData.assetSpecs.dimensions as string) || ''}
                onChange={(e) => updateBriefData({
                  assetSpecs: { ...briefData.assetSpecs, dimensions: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="animationType">Animation Type</Label>
              <Select
                value={(briefData.assetSpecs.animationType as string) || ''}
                onValueChange={(value) => updateBriefData({
                  assetSpecs: { ...briefData.assetSpecs, animationType: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select animation type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="static">Static</SelectItem>
                  <SelectItem value="simple_animation">Simple Animation</SelectItem>
                  <SelectItem value="complex_animation">Complex Animation</SelectItem>
                  <SelectItem value="video">Video Banner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      case 'promotional_popup':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="triggerType">Popup Trigger</Label>
              <Select
                value={(briefData.assetSpecs.triggerType as string) || ''}
                onValueChange={(value) => updateBriefData({
                  assetSpecs: { ...briefData.assetSpecs, triggerType: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_based">Time-based</SelectItem>
                  <SelectItem value="scroll_based">Scroll-based</SelectItem>
                  <SelectItem value="exit_intent">Exit Intent</SelectItem>
                  <SelectItem value="click_triggered">Click Triggered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="popupSize">Popup Size</Label>
              <Input
                id="popupSize"
                placeholder="e.g., 500x400, fullscreen overlay"
                value={(briefData.assetSpecs.popupSize as string) || ''}
                onChange={(e) => updateBriefData({
                  assetSpecs: { ...briefData.assetSpecs, popupSize: e.target.value }
                })}
              />
            </div>
          </div>
        );
      
      case 'brand_story_video':
      case 'video_animation':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="duration">Video Duration</Label>
              <Input
                id="duration"
                placeholder="e.g., 30 seconds, 1-2 minutes"
                value={(briefData.assetSpecs.duration as string) || ''}
                onChange={(e) => updateBriefData({
                  assetSpecs: { ...briefData.assetSpecs, duration: e.target.value }
                })}
              />
            </div>
            <div>
              <Label htmlFor="videoStyle">Video Style</Label>
              <Select
                value={(briefData.assetSpecs.videoStyle as string) || ''}
                onValueChange={(value) => updateBriefData({
                  assetSpecs: { ...briefData.assetSpecs, videoStyle: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select video style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live_action">Live Action</SelectItem>
                  <SelectItem value="animation">Animation</SelectItem>
                  <SelectItem value="motion_graphics">Motion Graphics</SelectItem>
                  <SelectItem value="mixed_media">Mixed Media</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      
      default:
        return (
          <div>
            <Label htmlFor="customSpecs">Asset Specifications</Label>
            <Textarea
              id="customSpecs"
              placeholder="Describe specific requirements for this asset type"
              value={(briefData.assetSpecs.customSpecs as string) || ''}
              onChange={(e) => updateBriefData({
                assetSpecs: { ...briefData.assetSpecs, customSpecs: e.target.value }
              })}
            />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Initial Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Initial Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assetType">Asset Type</Label>
              <Select
                value={briefData.assetType}
                onValueChange={(value: WebAssetBriefData['assetType']) => updateBriefData({ assetType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {briefData.assetType === 'custom' && (
              <div>
                <Label htmlFor="customAssetType">Custom Asset Type</Label>
                <Input
                  id="customAssetType"
                  placeholder="Specify custom asset type"
                  value={briefData.customAssetType || ''}
                  onChange={(e) => updateBriefData({ customAssetType: e.target.value })}
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                placeholder="Enter project name"
                value={briefData.projectName}
                onChange={(e) => updateBriefData({ projectName: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={briefData.dueDate}
                onChange={(e) => updateBriefData({ dueDate: e.target.value })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="strategist">Strategist</Label>
              <Input
                id="strategist"
                placeholder="Enter strategist name"
                value={briefData.strategist}
                onChange={(e) => updateBriefData({ strategist: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="creativeCoordinator">Creative Coordinator</Label>
              <Input
                id="creativeCoordinator"
                placeholder="Enter coordinator name"
                value={briefData.creativeCoordinator}
                onChange={(e) => updateBriefData({ creativeCoordinator: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="assignedDesigner">Assigned Designer</Label>
              <Input
                id="assignedDesigner"
                placeholder="Enter designer name"
                value={briefData.assignedDesigner}
                onChange={(e) => updateBriefData({ assignedDesigner: e.target.value })}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="finalAssetsFolder">Final Assets Folder</Label>
            <Input
              id="finalAssetsFolder"
              placeholder="Enter folder path or link"
              value={briefData.finalAssetsFolder}
              onChange={(e) => updateBriefData({ finalAssetsFolder: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Inspiration Section */}
      <Card>
        <CardHeader>
          <CardTitle>Inspiration (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Inspiration Files</Label>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Inspiration Files
              </Button>
            </div>
            
            {briefData.inspirationFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {briefData.inspirationFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <Button
                      type="button"
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
          
          <div>
            <Label>Inspiration Links</Label>
            <div className="space-y-2 mt-2">
              {briefData.inspirationLinks.map((link, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder="https://example.com/inspiration"
                    value={link}
                    onChange={(e) => updateInspirationLink(index, e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInspirationLink(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInspirationLink}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompt Field */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Goal & Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="primaryGoal">Primary Goal</Label>
            <Textarea
              id="primaryGoal"
              placeholder="Describe the primary goal and context for this web asset. What should it achieve? Who is the target audience? What's the main message?"
              value={briefData.primaryGoal}
              onChange={(e) => updateBriefData({ primaryGoal: e.target.value })}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Core Creative Idea */}
      <Card>
        <CardHeader>
          <CardTitle>Core Creative Idea</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="primaryMessage">Primary Message/Hook</Label>
            <Textarea
              id="primaryMessage"
              placeholder="The main message or hook that will capture attention"
              value={briefData.primaryMessage}
              onChange={(e) => updateBriefData({ primaryMessage: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="callToAction">Call to Action</Label>
            <Input
              id="callToAction"
              placeholder="e.g., Shop Now, Learn More, Get Started"
              value={briefData.callToAction}
              onChange={(e) => updateBriefData({ callToAction: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="theOffer">The Offer</Label>
            <Textarea
              id="theOffer"
              placeholder="What specific offer, value proposition, or benefit are we promoting?"
              value={briefData.theOffer}
              onChange={(e) => updateBriefData({ theOffer: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Visual Direction */}
      <Card>
        <CardHeader>
          <CardTitle>Visual & Sensory Direction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Look & Feel Keywords</Label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2">
              {LOOK_AND_FEEL_OPTIONS.map(keyword => (
                <Button
                  key={keyword}
                  type="button"
                  variant={briefData.lookAndFeelKeywords.includes(keyword) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleKeyword(keyword)}
                  className="text-xs"
                >
                  {keyword}
                </Button>
              ))}
            </div>
          </div>
          
          <div>
            <Label htmlFor="colorPalette">Color Palette</Label>
            <Textarea
              id="colorPalette"
              placeholder="Describe the color scheme, specific colors, or hex codes"
              value={briefData.colorPalette}
              onChange={(e) => updateBriefData({ colorPalette: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="typography">Typography</Label>
            <Textarea
              id="typography"
              placeholder="Font families, weights, styles, and text hierarchy"
              value={briefData.typography}
              onChange={(e) => updateBriefData({ typography: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="mandatoryElements">Mandatory Elements</Label>
            <Textarea
              id="mandatoryElements"
              placeholder="Required elements that must be included (logo, legal text, specific imagery, etc.)"
              value={briefData.mandatoryElements}
              onChange={(e) => updateBriefData({ mandatoryElements: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="strictlyAvoid">Strictly Avoid</Label>
            <Textarea
              id="strictlyAvoid"
              placeholder="Elements, colors, styles, or approaches to avoid"
              value={briefData.strictlyAvoid}
              onChange={(e) => updateBriefData({ strictlyAvoid: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Asset-Specific Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>Asset-Specific Specifications</CardTitle>
        </CardHeader>
        <CardContent>
          {getAssetSpecificFields()}
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={() => onGenerate(briefData)}
            disabled={isGenerating || !briefData.primaryGoal.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating with Gemini 2.5...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Generate & Populate Brief
              </>
            )}
          </Button>
          
          {!briefData.primaryGoal.trim() && (
            <p className="text-sm text-gray-500 text-center mt-2">
              Please fill in the Primary Goal to generate your brief
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}