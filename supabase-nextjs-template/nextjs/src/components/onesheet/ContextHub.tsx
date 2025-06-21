"use client";

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { 
  Globe,
  Instagram,
  Link2,
  MessageSquare,
  FileText,
  CheckCircle2,
  AlertCircle,
  Upload,
  Sparkles,
  Play,
  Hash,
} from 'lucide-react';
import { ContextLoader } from './ContextLoader';
import type { ContextData, ContextLoaded, OneSheet } from '@/lib/types/onesheet';
import { toast } from '@/components/ui/use-toast';

interface ContextHubProps {
  onesheet: OneSheet;
  onUpdate: (updates: Partial<OneSheet>) => void;
}

const contextSources = [
  {
    id: 'brand_website',
    title: 'Brand Website',
    icon: Globe,
    description: 'Your main website content and pages',
    instructions: 'Copy and paste content from your homepage, product pages, about page, and any other relevant pages.',
    required: true,
  },
  {
    id: 'competitor_website',
    title: 'Competitor Websites',
    icon: Link2,
    description: 'Competitor sites and product pages',
    instructions: 'Copy content from competitor homepages, product descriptions, and unique value propositions.',
    required: true,
  },
  {
    id: 'reviews',
    title: 'Customer Reviews',
    icon: MessageSquare,
    description: 'Reviews from your product and competitors',
    instructions: 'Copy and paste reviews from Amazon, Trustpilot, app stores, or anywhere customers leave feedback.',
    required: true,
  },
  {
    id: 'reddit',
    title: 'Reddit & Forums',
    icon: Hash,
    description: 'Relevant Reddit threads and forum discussions',
    instructions: 'Copy entire Reddit threads or forum discussions about your product category or problems you solve.',
    required: false,
  },
  {
    id: 'articles',
    title: 'Articles & Blogs',
    icon: FileText,
    description: 'Industry articles and blog posts',
    instructions: 'Copy relevant articles about your industry, product category, or target audience.',
    required: false,
  },
  {
    id: 'organic_social',
    title: 'Organic Social',
    icon: Instagram,
    description: 'Organic social media content from all platforms',
    instructions: 'Paste links to organic posts from Facebook, Instagram, TikTok, YouTube, etc. You can paste multiple URLs (one per line) for batch processing. We\'ll download, transcribe videos, and provide detailed breakdowns including hooks, structure, emotions, and more.',
    required: false,
  },
  {
    id: 'paid_social',
    title: 'Paid Social',
    icon: Play,
    description: 'Paid social media ads from all platforms',
    instructions: 'Paste links to ads from Facebook Ad Library, TikTok Creative Center, or any paid social content. You can paste multiple URLs (one per line) for batch processing. We\'ll analyze ad formats, copywriting frameworks, targeting emotions, and creative strategies.',
    required: false,
  },
];

export function ContextHub({ onesheet, onUpdate }: ContextHubProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('brand_website');
  const [contextData, setContextData] = useState<ContextData[]>([]);

  // Load context data on mount
  useEffect(() => {
    fetchContextData();
  }, [onesheet.id]);

  const fetchContextData = async () => {
    try {
      const response = await fetch(`/api/onesheet/context?onesheet_id=${onesheet.id}`);
      if (response.ok) {
        const data = await response.json();
        setContextData(data);
        
        // Map source IDs to ContextLoaded property names
        const sourceMapping: Record<string, keyof ContextLoaded> = {
          'brand_website': 'brandWebsite',
          'competitor_website': 'competitorWebsite',
          'reviews': 'reviews',
          'reddit': 'reddit',
          'articles': 'articles',
          'organic_social': 'organicContent',
          'paid_social': 'competitorAds', // Reuse competitorAds for paid social
        };
        
        const contextLoaded: Partial<ContextLoaded> = {};
        contextSources.forEach(source => {
          const hasData = data.some((item: ContextData) => item.source_type === source.id);
          const mappedKey = sourceMapping[source.id];
          if (mappedKey) {
            contextLoaded[mappedKey] = hasData;
          }
        });
        
        // Update the onesheet context_loaded if it differs from current state
        const currentLoaded = onesheet.context_loaded || {};
        const hasChanges = Object.keys(contextLoaded).some(key => 
          currentLoaded[key as keyof ContextLoaded] !== contextLoaded[key as keyof ContextLoaded]
        );
        
        if (hasChanges) {
          onUpdate({ 
            context_loaded: { ...currentLoaded, ...contextLoaded } as ContextLoaded,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching context data:', error);
    }
  };

  const handleContextSave = async (sourceType: string, data: Partial<ContextData>) => {
    setLoading(true);
    
    const saveWithRetry = async (retryCount = 0): Promise<any> => {
      try {
        console.log(`Attempting to save context (attempt ${retryCount + 1}):`, { sourceType, onesheetId: onesheet.id });
        
        const response = await fetch('/api/onesheet/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            onesheet_id: onesheet.id,
            source_type: sourceType,
          }),
        });

        console.log('Context save response:', response.status, response.statusText);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Context save error details:', errorData);
          
          // If it's a 401 and we haven't retried yet, try once more
          if (response.status === 401 && retryCount === 0) {
            console.log('Got 401, retrying after brief delay...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            return saveWithRetry(1);
          }
          
          throw new Error(errorData.error || `Failed to save context: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (retryCount === 0 && (error as Error).message.includes('fetch')) {
          console.log('Network error, retrying after brief delay...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return saveWithRetry(1);
        }
        throw error;
      }
    };

    try {
      await saveWithRetry();
      
      // Refresh all context data from server to ensure we have the complete list
      // This is especially important for Reddit extraction which may create multiple entries
      await fetchContextData();

      toast({
        title: 'Context Saved',
        description: 'Your context has been saved and is ready for analysis.',
      });

    } catch (error) {
      console.error('Error saving context:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save context. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContextUpdate = async (id: string, data: Partial<ContextData>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/onesheet/context', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ...data,
        }),
      });

      if (!response.ok) throw new Error('Failed to update context');

      await response.json(); // Consume the response
      
      // Refresh all context data from server to ensure consistency
      await fetchContextData();

      toast({
        title: 'Context Updated',
        description: 'Your context has been updated successfully.',
      });

    } catch (error) {
      console.error('Error updating context:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update context. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContextDelete = async (id: string, sourceType: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/onesheet/context', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error('Failed to delete context');

      // Remove from local state
      setContextData(prev => prev.filter(c => c.id !== id));
      
      // Update context_loaded status if no more items of this type
      const remainingItems = contextData.filter(c => c.source_type === sourceType && c.id !== id);
      if (remainingItems.length === 0) {
        const sourceMapping: Record<string, keyof ContextLoaded> = {
          'brand_website': 'brandWebsite',
          'competitor_website': 'competitorWebsite',
          'reviews': 'reviews',
          'reddit': 'reddit',
          'articles': 'articles',
          'organic_social': 'organicContent',
          'paid_social': 'competitorAds',
        };
        
        const mappedKey = sourceMapping[sourceType];
        const updatedContextLoaded = {
          ...onesheet.context_loaded,
          [mappedKey || sourceType]: false,
        };
        onUpdate({ 
          context_loaded: updatedContextLoaded,
          last_context_update: new Date().toISOString(),
        });
      }

      toast({
        title: 'Context Deleted',
        description: 'Context item has been removed.',
      });

    } catch (error) {
      console.error('Error deleting context:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete context. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCompletionPercentage = () => {
    const loaded = onesheet.context_loaded || {};
    const sourceMapping: Record<string, keyof ContextLoaded> = {
      'brand_website': 'brandWebsite',
      'competitor_website': 'competitorWebsite',
      'reviews': 'reviews',
      'reddit': 'reddit',
      'articles': 'articles',
      'organic_social': 'organicContent',
      'paid_social': 'competitorAds', // Reuse competitorAds for paid social
    };
    
    const requiredSources = contextSources.filter(s => s.required);
    const completedRequired = requiredSources.filter(s => {
      const mappedKey = sourceMapping[s.id];
      return mappedKey ? loaded[mappedKey] : false;
    }).length;
    return Math.round((completedRequired / requiredSources.length) * 100);
  };

  const canProceed = () => {
    const loaded = onesheet.context_loaded || {};
    const sourceMapping: Record<string, keyof ContextLoaded> = {
      'brand_website': 'brandWebsite',
      'competitor_website': 'competitorWebsite',
      'reviews': 'reviews',
      'reddit': 'reddit',
      'articles': 'articles',
      'organic_social': 'organicContent',
      'paid_social': 'competitorAds', // Reuse competitorAds for paid social
    };
    
    return contextSources.filter(s => s.required).every(s => {
      const mappedKey = sourceMapping[s.id];
      return mappedKey ? loaded[mappedKey] : false;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Context Hub
              </CardTitle>
              <CardDescription>
                Load all your research materials in one place. This context will be used across all AI prompts.
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Required Context</div>
              <div className="flex items-center gap-2">
                <Progress value={getCompletionPercentage()} className="w-32" />
                <span className="text-sm font-medium">{getCompletionPercentage()}%</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!canProceed() && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please complete all required context sources before proceeding to research. 
                Required sources are marked with a red asterisk (*).
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full mb-6">
              {contextSources.map((source) => {
                const Icon = source.icon;
                // Map source ID to ContextLoaded property name
                const sourceMapping: Record<string, keyof ContextLoaded> = {
                  'brand_website': 'brandWebsite',
                  'competitor_website': 'competitorWebsite',
                  'reviews': 'reviews',
                  'reddit': 'reddit',
                  'articles': 'articles',
                  'organic_social': 'organicContent',
                  'paid_social': 'competitorAds', // Reuse competitorAds for paid social
                };
                const mappedKey = sourceMapping[source.id];
                const isLoaded = mappedKey ? onesheet.context_loaded?.[mappedKey] : false;
                
                return (
                  <TabsTrigger
                    key={source.id}
                    value={source.id}
                    className="relative"
                  >
                    <Icon className="h-4 w-4" />
                    {source.required && !isLoaded && (
                      <span className="absolute -top-1 -right-1 text-red-500 text-xs">*</span>
                    )}
                    {isLoaded && (
                      <CheckCircle2 className="h-3 w-3 text-green-500 absolute -top-1 -right-1" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {contextSources.map((source) => {
              const existingData = contextData.filter(c => c.source_type === source.id);
              return (
                <TabsContent key={source.id} value={source.id}>
                  <ContextLoader
                    sourceType={source.id}
                    title={source.title}
                    description={source.description}
                    instructions={source.instructions}
                    existingData={existingData}
                    onSave={(data) => handleContextSave(source.id, data)}
                    onUpdate={handleContextUpdate}
                    onDelete={handleContextDelete}
                    loading={loading}
                    brandId={onesheet.brand_id}
                  />
                </TabsContent>
              );
            })}
          </Tabs>

          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {canProceed() ? (
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  All required context loaded. Ready to proceed!
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Complete required sources to continue
                </span>
              )}
            </div>
            <Button
              disabled={!canProceed()}
              onClick={() => onUpdate({ workflow_stage: 'audience_research' })}
            >
              Proceed to Research
              <Sparkles className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 