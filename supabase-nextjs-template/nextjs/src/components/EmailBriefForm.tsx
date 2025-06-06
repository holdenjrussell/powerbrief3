"use client";

import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link2, X, Plus, User, Sparkles } from 'lucide-react';

interface EmailBriefFormProps {
  onSubmit: (briefData: EmailBriefData) => void;
  isGenerating?: boolean;
}

interface EmailBriefData {
  briefType: 'campaign' | 'flow';
  dueDate: string;
  assignedDesigner: string;
  finalAssetsFolder: string;
  inspirationFiles: string[];
  inspirationLinks: string[];
  primaryGoal: string;
  subjectLineVariations: number;
  subjectLineInput: string;
  preheaderText: string;
  campaignDetails?: {
    campaignName: string;
    scheduledSendDate: string;
    offer: string;
    discountCode: string;
    urgencyScarcity: string;
  };
  flowDetails?: {
    flowType: string;
    triggerEvent: string;
    emailSequence: string;
  };
}

export default function EmailBriefForm({ onSubmit, isGenerating = false }: EmailBriefFormProps) {
  const [formData, setFormData] = useState<EmailBriefData>({
    briefType: 'campaign',
    dueDate: '',
    assignedDesigner: '',
    finalAssetsFolder: '',
    inspirationFiles: [],
    inspirationLinks: [''],
    primaryGoal: '',
    subjectLineVariations: 3,
    subjectLineInput: '',
    preheaderText: '',
  });

  const [uploadedFileUrls, setUploadedFileUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: keyof EmailBriefData, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    
    // Upload files to temporary storage and get URLs
    const uploadPromises = newFiles.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        const response = await fetch('/api/uploads/temp', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        const result = await response.json();
        return { url: result.url, name: file.name };
      } catch (error) {
        console.error('Error uploading file:', error);
        return null;
      }
    });

    const uploadResults = await Promise.all(uploadPromises);
    const validResults = uploadResults.filter(result => result !== null);
    
    setUploadedFileUrls(prev => [...prev, ...validResults.map(r => r.url)]);
    setFormData(prev => ({ 
      ...prev, 
      inspirationFiles: [...prev.inspirationFiles, ...validResults.map(r => r.url)]
    }));
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      inspirationFiles: prev.inspirationFiles.filter((_, i) => i !== index)
    }));
  };

  const addLinkField = () => {
    setFormData(prev => ({
      ...prev,
      inspirationLinks: [...prev.inspirationLinks, '']
    }));
  };

  const updateLink = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      inspirationLinks: prev.inspirationLinks.map((link, i) => i === index ? value : link)
    }));
  };

  const removeLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      inspirationLinks: prev.inspirationLinks.filter((_, i) => i !== index)
    }));
  };

  const handleCampaignDetailChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      campaignDetails: {
        ...prev.campaignDetails,
        [field]: value
      } as NonNullable<EmailBriefData['campaignDetails']>
    }));
  };

  const handleFlowDetailChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      flowDetails: {
        ...prev.flowDetails,
        [field]: value
      } as NonNullable<EmailBriefData['flowDetails']>
    }));
  };

  const handleSubmit = () => {
    // Combine uploaded file URLs with inspiration links for Files API
    const allInspirationSources = [
      ...uploadedFileUrls,
      ...formData.inspirationLinks.filter(link => link.trim() !== '')
    ];

    const submissionData: EmailBriefData = {
      ...formData,
      inspirationFiles: allInspirationSources
    };

    onSubmit(submissionData);
  };

  return (
    <div className="space-y-6">
      {/* Top-Level Selections */}
      <Card>
        <CardHeader>
          <CardTitle>Email Brief Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Brief Type */}
          <div>
            <Label className="text-sm font-medium">Brief Type</Label>
            <Tabs 
              value={formData.briefType} 
              onValueChange={(value) => handleInputChange('briefType', value as 'campaign' | 'flow')}
            >
              <TabsList>
                <TabsTrigger value="campaign">Campaign</TabsTrigger>
                <TabsTrigger value="flow">Flow Email</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Due Date */}
          <div>
            <Label htmlFor="dueDate" className="text-sm font-medium">Due Date for First Draft</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleInputChange('dueDate', e.target.value)}
            />
          </div>

          {/* Assign to Designer */}
          <div>
            <Label htmlFor="designer" className="text-sm font-medium">Assign to Designer</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="designer"
                placeholder="Designer name or email"
                value={formData.assignedDesigner}
                onChange={(e) => handleInputChange('assignedDesigner', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Information & Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Assets & Inspiration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Assets for Designer */}
          <div>
            <Label htmlFor="assetsFolder" className="text-sm font-medium">Link to Final Assets Folder</Label>
            <Input
              id="assetsFolder"
              placeholder="e.g., Google Drive, Dropbox link with logos, product shots"
              value={formData.finalAssetsFolder}
              onChange={(e) => handleInputChange('finalAssetsFolder', e.target.value)}
            />
            <p className="text-sm text-gray-600 mt-1">
              This folder is for the designer&apos;s final use. It should contain all necessary brand logos, high-res product photos, etc.
            </p>
          </div>

          {/* Inspiration for AI & Designer */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Inspiration for AI & Designer</Label>
            <Tabs defaultValue="upload" className="w-full">
              <TabsList>
                <TabsTrigger value="upload">Upload Images</TabsTrigger>
                <TabsTrigger value="links">Add Links</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="hidden"
                    aria-label="Upload inspiration images for AI analysis"
                    title="Upload inspiration images"
                  />
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Inspiration Images
                    </Button>
                    <p className="text-sm text-gray-600">
                      Upload 1-3 images. The AI will analyze these for mood, color, and layout to guide the brief.
                    </p>
                    <p className="text-xs text-gray-500">
                      This is the most effective way to provide visual direction.
                    </p>
                  </div>
                </div>

                {/* Display uploaded files */}
                {formData.inspirationFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Uploaded Files:</Label>
                    <div className="space-y-2">
                      {formData.inspirationFiles.map((url, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm text-gray-700">Image {index + 1}</span>
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
              </TabsContent>

              <TabsContent value="links" className="space-y-4">
                {formData.inspirationLinks.map((link, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <Input
                      placeholder="e.g., https://reallygoodemails.com/..."
                      value={link}
                      onChange={(e) => updateLink(index, e.target.value)}
                      className="flex-1"
                    />
                    {formData.inspirationLinks.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLink(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addLinkField}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add another link
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* AI Prompt & Goal */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Goal & Core Message</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Describe your email's main objective, target audience, and key message..."
            value={formData.primaryGoal}
            onChange={(e) => handleInputChange('primaryGoal', e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Conditional Sections based on Brief Type */}
      {formData.briefType === 'campaign' && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="campaignName">Campaign Name</Label>
              <Input
                id="campaignName"
                placeholder="e.g., Black Friday 2024"
                value={formData.campaignDetails?.campaignName || ''}
                onChange={(e) => handleCampaignDetailChange('campaignName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sendDate">Scheduled Send Date & Time</Label>
              <Input
                id="sendDate"
                type="datetime-local"
                value={formData.campaignDetails?.scheduledSendDate || ''}
                onChange={(e) => handleCampaignDetailChange('scheduledSendDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="offer">The Offer / Promotion</Label>
              <Input
                id="offer"
                placeholder="e.g., 25% off sitewide"
                value={formData.campaignDetails?.offer || ''}
                onChange={(e) => handleCampaignDetailChange('offer', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="discountCode">Discount Code</Label>
              <Input
                id="discountCode"
                placeholder="e.g., SAVE25"
                value={formData.campaignDetails?.discountCode || ''}
                onChange={(e) => handleCampaignDetailChange('discountCode', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="urgency">Urgency/Scarcity Element</Label>
              <Input
                id="urgency"
                placeholder="e.g., Limited time offer, only 48 hours left"
                value={formData.campaignDetails?.urgencyScarcity || ''}
                onChange={(e) => handleCampaignDetailChange('urgencyScarcity', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {formData.briefType === 'flow' && (
        <Card>
          <CardHeader>
            <CardTitle>Flow Email Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="flowType">Flow Type</Label>
              <Input
                id="flowType"
                placeholder="e.g., Welcome Series, Abandoned Cart, Post-Purchase"
                value={formData.flowDetails?.flowType || ''}
                onChange={(e) => handleFlowDetailChange('flowType', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="triggerEvent">Trigger Event</Label>
              <Input
                id="triggerEvent"
                placeholder="e.g., User signs up, Cart abandonment, Purchase completion"
                value={formData.flowDetails?.triggerEvent || ''}
                onChange={(e) => handleFlowDetailChange('triggerEvent', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="emailSequence">Email Position in Sequence</Label>
              <Input
                id="emailSequence"
                placeholder="e.g., Email 1 of 3, Welcome email, 24hr follow-up"
                value={formData.flowDetails?.emailSequence || ''}
                onChange={(e) => handleFlowDetailChange('emailSequence', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inbox Presence */}
      <Card>
        <CardHeader>
          <CardTitle>Inbox Presence (Subject Line & Preheader)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="variations">Number of Subject Line Variations</Label>
            <Input
              id="variations"
              type="number"
              min="1"
              max="5"
              value={formData.subjectLineVariations}
              onChange={(e) => handleInputChange('subjectLineVariations', parseInt(e.target.value) || 3)}
            />
          </div>
          <div>
            <Label htmlFor="subjectLine">Subject Line Ideas (Optional)</Label>
            <Input
              id="subjectLine"
              placeholder="Any specific subject line ideas or requirements"
              value={formData.subjectLineInput}
              onChange={(e) => handleInputChange('subjectLineInput', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="preheader">Preheader Text</Label>
            <Input
              id="preheader"
              placeholder="Preview text that appears after the subject line"
              value={formData.preheaderText}
              onChange={(e) => handleInputChange('preheaderText', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Generate Brief Button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handleSubmit}
            disabled={isGenerating || !formData.primaryGoal.trim()}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Generating Email Brief...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                ✨ Generate Brief with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 