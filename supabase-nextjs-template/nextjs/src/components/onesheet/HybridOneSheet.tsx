"use client";

import React, { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Textarea,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { 
  Sparkles, 
  CheckCircle2, 
  FileText,
  Search,
  Users,
  BarChart3,
  Edit,
  Save,
  RefreshCw,
  Star,
  Brain,
  Lightbulb,
  Plus,
  Info,
  Zap,
  Target,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { OneSheet, SynthesisItem, Persona, CompetitorAnalysis } from '@/lib/types/onesheet';
import { SynthesisDialog } from './SynthesisDialog';
import { ContextHub } from './ContextHub';

interface HybridOneSheetProps {
  onesheet: OneSheet;
  onUpdate: (updates: Partial<OneSheet>) => void;
}

const awarenessLevels = {
  unaware: { label: 'Unaware', color: 'red', description: 'No knowledge of problem or solution' },
  problemAware: { label: 'Problem Aware', color: 'orange', description: 'Knows they have a problem' },
  solutionAware: { label: 'Solution Aware', color: 'yellow', description: 'Knows solutions exist' },
  productAware: { label: 'Product Aware', color: 'blue', description: 'Knows about your product' },
  mostAware: { label: 'Most Aware', color: 'green', description: 'Ready to buy' }
};

export function HybridOneSheet({ onesheet, onUpdate }: HybridOneSheetProps) {
  const [activeTab, setActiveTab] = useState(onesheet.workflow_stage === 'context_loading' ? 'context' : 'overview');
  const [editingPersona, setEditingPersona] = useState<string | null>(null);
  const [editingCompetitor, setEditingCompetitor] = useState<string | null>(null);
  const [showSynthesisDialog, setShowSynthesisDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Auto-save debounce
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const onAutoSave = useCallback((field: string, value: unknown) => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    const timeout = setTimeout(() => {
      onUpdate({ [field]: value, updated_at: new Date().toISOString() });
    }, 500);
    
    setSaveTimeout(timeout);
  }, [onUpdate, saveTimeout]);

  const getAwarenessLevelInfo = (level: string) => {
    return awarenessLevels[level as keyof typeof awarenessLevels] || awarenessLevels.unaware;
  };

  const addPersona = () => {
    const newPersona: Persona = {
      id: Date.now().toString(),
      title: 'New Persona',
      awarenessLevel: 'unaware',
      demographics: {
        age: '',
        gender: '',
        location: '',
        income: '',
        education: '',
        occupation: ''
      },
      psychographics: {
        interests: [],
        lifestyle: [],
        values: [],
        painPoints: []
      },
      customerLanguage: []
    };
    
    const updatedPersonas = [...(onesheet.personas || []), newPersona];
    onUpdate({ personas: updatedPersonas });
    setEditingPersona(newPersona.id);
  };

  const updatePersona = (id: string, updates: Partial<Persona>) => {
    const updatedPersonas = (onesheet.personas || []).map(p => 
      p.id === id ? { ...p, ...updates } : p
    );
    onUpdate({ personas: updatedPersonas });
  };

  const addCompetitor = () => {
    const newCompetitor: CompetitorAnalysis = {
      id: Date.now().toString(),
      name: 'New Competitor',
      website: '',
      similarities: [],
      differences: [],
      opportunities: [],
      customerComplaints: [],
      adLibraryAnalysis: {
        creators: [],
        formats: [],
        strategies: []
      },
      priceComparison: 'similar',
      qualityComparison: '',
      positioningOpportunity: '',
      landingPagesUsed: [],
      adLinks: [],
      isHigherQuality: '',
      whyBetterChoice: '',
      formatStrategies: [],
      creatorStrategies: [],
      learningsOverTime: []
    };
    
    const updatedCompetitors = [...(onesheet.competitor_analysis || []), newCompetitor];
    onUpdate({ competitor_analysis: updatedCompetitors });
  };

  const updateCompetitor = (id: string, updates: Partial<CompetitorAnalysis>) => {
    const updatedCompetitors = (onesheet.competitor_analysis || []).map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    onUpdate({ competitor_analysis: updatedCompetitors });
  };

  const addSynthesisItem = (item: SynthesisItem) => {
    const currentSynthesis = onesheet.synthesis_data || {
      angles: [],
      benefits: [],
      painPoints: [],
      features: [],
      objections: [],
      failedSolutions: [],
      other: []
    };

    const category = 'other'; // Default category for now - this should be passed from the dialog
    const updatedSynthesis = {
      ...currentSynthesis,
      [category]: [...(currentSynthesis[category as keyof typeof currentSynthesis] || []), item]
    };

    onUpdate({ 
      synthesis_data: updatedSynthesis,
      last_synthesis_update: new Date().toISOString()
    });
  };

  const getCompletionScore = () => {
    let total = 0;
    let completed = 0;

    // Basic info
    total += 3;
    if (onesheet.product) completed++;
    if (onesheet.landing_page_url) completed++;
    if (onesheet.customer_reviews_url) completed++;

    // Personas
    total += 2;
    if ((onesheet.personas || []).length > 0) completed++;
    if ((onesheet.personas || []).some(p => p.demographics.age && p.psychographics.interests.length > 0)) completed++;

    // Competitors
    total += 2;
    if ((onesheet.competitor_analysis || []).length > 0) completed++;
    if ((onesheet.competitor_analysis || []).some(c => c.website && c.whyBetterChoice)) completed++;

    // Synthesis
    total += 1;
    const synthesis = onesheet.synthesis_data;
    if (synthesis && Object.values(synthesis).some(arr => arr && arr.length > 0)) completed++;

    return Math.round((completed / total) * 100);
  };

  // AI Generation function
  const generateAI = async (type: string, additionalData?: Record<string, unknown>) => {
    setIsGenerating(type);
    
    try {
      const data = {
        product: onesheet.product || '',
        website: onesheet.landing_page_url || '',
        reviews: onesheet.customer_reviews_url || '',
        brand: onesheet.product || '',
        ...additionalData
      };

      const response = await fetch('/api/onesheet/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI content');
      }

      const result = await response.json();
      
      if (result.success) {
        // Handle different types of generated content
        switch (type) {
          case 'adAngles':
            if (result.data.angles) {
              const newAngles = result.data.angles.map((angle: {
                title: string;
                description: string;
                priority: number;
              }) => ({
                id: Date.now().toString() + Math.random(),
                ...angle,
                aiGenerated: true
              }));
              onUpdate({ angles: [...(onesheet.angles || []), ...newAngles] });
              toast({
                title: 'Ad Angles Generated',
                description: `Generated ${newAngles.length} ad angles successfully`
              });
            }
            break;

          case 'generatePersonas':
            if (result.data.personas) {
              const newPersonas = result.data.personas;
              onUpdate({ personas: [...(onesheet.personas || []), ...newPersonas] });
              toast({
                title: 'Personas Generated',
                description: `Generated ${newPersonas.length} audience personas successfully`
              });
            }
            break;

          case 'onesheetFillout':
            if (result.data) {
              // Add items to synthesis data
              const newSynthesis = { ...onesheet.synthesis_data };
              
              Object.entries(result.data).forEach(([category, items]) => {
                if (Array.isArray(items) && items.length > 0) {
                  const synthesisItems = items.map((item: {
                    text: string;
                    evidence?: string[];
                  }) => ({
                    id: Date.now().toString() + Math.random(),
                    text: item.text,
                    source: 'ai' as const,
                    sourceDetails: 'Generated from reviews analysis',
                    dateAdded: new Date().toISOString(),
                    relevance: 4,
                    evidence: item.evidence?.map((e: string) => ({
                      type: 'review' as const,
                      text: e,
                      url: undefined
                    })) || []
                  }));
                  
                  newSynthesis[category as keyof typeof newSynthesis] = [
                    ...(newSynthesis[category as keyof typeof newSynthesis] || []),
                    ...synthesisItems
                  ];
                }
              });
              
              onUpdate({ 
                synthesis_data: newSynthesis,
                last_synthesis_update: new Date().toISOString()
              });
              
              toast({
                title: 'OneSheet Analysis Complete',
                description: 'Added insights to synthesis section'
              });
            }
            break;

          case 'competitorGapAnalysis':
            if (result.data.analysis) {
              // Handle competitor gap analysis
              toast({
                title: 'Competitor Gap Analysis',
                description: result.data.analysis
              });
            }
            break;

          default:
            toast({
              title: 'AI Generation Complete',
              description: 'Check the results in the relevant section'
            });
        }
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate AI content. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">OneSheet Research</h2>
          <p className="text-gray-600">Comprehensive creative strategy development</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-500">Completion</div>
            <div className="text-2xl font-bold text-green-600">{getCompletionScore()}%</div>
          </div>
          <div className="w-16 h-16 relative">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="2"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeDasharray={`${getCompletionScore()}, 100`}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Show Context Hub if in context loading stage */}
      {onesheet.workflow_stage === 'context_loading' ? (
        <ContextHub onesheet={onesheet} onUpdate={onUpdate} />
      ) : (
        <>
          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-7 w-full">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="audience" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                1. Audience
              </TabsTrigger>
              <TabsTrigger value="competitors" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                2. Competitors
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                3. Social
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                4. Performance
              </TabsTrigger>
              <TabsTrigger value="synthesis" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                5. Synthesis
              </TabsTrigger>
              <TabsTrigger value="creative" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                6. Creative
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Research Workflow</CardTitle>
                  <CardDescription>
                    Follow this 6-step process to build a comprehensive creative strategy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Info className="h-4 w-4 text-blue-500" />
                          The Process
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3 p-3 border rounded-lg">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">1</div>
                            <div>
                              <h5 className="font-medium">Audience Research</h5>
                              <p className="text-sm text-gray-600">Analyze your website, reviews, and generate personas</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 border rounded-lg">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">2</div>
                            <div>
                              <h5 className="font-medium">Competitor Analysis</h5>
                              <p className="text-sm text-gray-600">Study competitors and identify gaps & opportunities</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 border rounded-lg">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">3</div>
                            <div>
                              <h5 className="font-medium">Social Listening</h5>
                              <p className="text-sm text-gray-600">Analyze Reddit, forums, and organic content</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 border rounded-lg">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">4</div>
                            <div>
                              <h5 className="font-medium">Performance Audit</h5>
                              <p className="text-sm text-gray-600">Review historical ad performance and learnings</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 border rounded-lg">
                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600">5</div>
                            <div>
                              <h5 className="font-medium">Synthesis</h5>
                              <p className="text-sm text-gray-600">Combine all insights into organized categories</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 p-3 border rounded-lg">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-600">6</div>
                            <div>
                              <h5 className="font-medium">Creative Generation</h5>
                              <p className="text-sm text-gray-600">Generate concepts, hooks, and visuals from research</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold flex items-center gap-2">
                          <Zap className="h-4 w-4 text-purple-500" />
                          AI-Powered Features
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <span className="text-sm">Automatic angle generation from website & reviews</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <span className="text-sm">Persona creation with demographics & psychographics</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <span className="text-sm">Competitor gap analysis and positioning</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <span className="text-sm">Social listening and customer language extraction</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <span className="text-sm">Hook generation using real customer language</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            <span className="text-sm">Visual concept generation for Midjourney</span>
                          </div>
                        </div>
                        
                        <Button 
                          className="w-full mt-4"
                          onClick={() => setActiveTab('audience')}
                        >
                          Start Research Process
                        </Button>
                      </div>
                    </div>

                    {/* Basic Information */}
                    <div className="border-t pt-6 mt-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold">Basic Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="product">Product Name</Label>
                            <Input
                              id="product"
                              placeholder="Enter your product name"
                              value={onesheet.product || ''}
                              onChange={(e) => onAutoSave('product', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="landing_page_url">Landing Page URL</Label>
                            <Input
                              id="landing_page_url"
                              placeholder="https://yourwebsite.com"
                              value={onesheet.landing_page_url || ''}
                              onChange={(e) => onAutoSave('landing_page_url', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="customer_reviews_url">Customer Reviews URL</Label>
                            <Input
                              id="customer_reviews_url"
                              placeholder="https://trustpilot.com/yourproduct"
                              value={onesheet.customer_reviews_url || ''}
                              onChange={(e) => onAutoSave('customer_reviews_url', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 1: Audience Research */}
            <TabsContent value="audience" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">1</div>
                        Audience Research
                      </CardTitle>
                      <CardDescription>
                        Analyze your product, reviews, and generate personas
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => generateAI('adAngles')}
                        disabled={isGenerating === 'adAngles' || !onesheet.landing_page_url}
                      >
                        {isGenerating === 'adAngles' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-1" />
                        )}
                        Generate Ad Angles
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => generateAI('generatePersonas', { 
                          hasReviews: !!onesheet.customer_reviews_url 
                        })}
                        disabled={isGenerating === 'generatePersonas' || (!onesheet.landing_page_url && !onesheet.customer_reviews_url)}
                      >
                        {isGenerating === 'generatePersonas' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Users className="h-4 w-4 mr-1" />
                        )}
                        Generate Personas
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* AI Prompts Section */}
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      AI Research Tools
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start text-left h-auto p-3"
                        onClick={() => generateAI('adAngles')}
                        disabled={isGenerating === 'adAngles' || !onesheet.landing_page_url}
                      >
                        <div>
                          <div className="font-medium text-sm">Ad Angles Analysis</div>
                          <div className="text-xs text-gray-600">Generate marketing angles from website & reviews</div>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start text-left h-auto p-3"
                        onClick={() => generateAI('benefits')}
                        disabled={isGenerating === 'benefits' || !onesheet.landing_page_url}
                      >
                        <div>
                          <div className="font-medium text-sm">Benefits & Pain Points</div>
                          <div className="text-xs text-gray-600">Extract key benefits and pain points</div>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start text-left h-auto p-3"
                        onClick={() => generateAI('onesheetFillout')}
                        disabled={isGenerating === 'onesheetFillout' || !onesheet.customer_reviews_url}
                      >
                        <div>
                          <div className="font-medium text-sm">OneSheet Fillout</div>
                          <div className="text-xs text-gray-600">Comprehensive analysis of reviews</div>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start text-left h-auto p-3"
                        onClick={() => generateAI('reviewPatterns')}
                        disabled={isGenerating === 'reviewPatterns' || !onesheet.customer_reviews_url}
                      >
                        <div>
                          <div className="font-medium text-sm">Review Patterns</div>
                          <div className="text-xs text-gray-600">Find hidden patterns humans miss</div>
                        </div>
                      </Button>
                    </div>
                  </div>

                  {/* Ad Angles Section */}
                  {onesheet.angles && onesheet.angles.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Generated Ad Angles</h4>
                      <div className="space-y-3">
                        {onesheet.angles.map((angle, idx) => (
                          <Card key={angle.id || idx} className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="font-medium">{angle.title}</h5>
                                <p className="text-sm text-gray-600 mt-1">{angle.description}</p>
                              </div>
                              {angle.aiGenerated && (
                                <Badge variant="secondary" className="ml-2">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  AI
                                </Badge>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personas Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">Audience Personas</h4>
                      <Button onClick={addPersona} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Persona
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {(onesheet.personas || []).map((persona) => (
                        <Card key={persona.id} className="overflow-hidden">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">{persona.title}</CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline"
                                  className={`text-${getAwarenessLevelInfo(persona.awarenessLevel).color}-600 border-${getAwarenessLevelInfo(persona.awarenessLevel).color}-200`}
                                >
                                  {getAwarenessLevelInfo(persona.awarenessLevel).label}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingPersona(editingPersona === persona.id ? null : persona.id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {editingPersona === persona.id ? (
                              // Edit mode
                              <div className="space-y-4">
                                <Input
                                  placeholder="Persona Title"
                                  value={persona.title}
                                  onChange={(e) => updatePersona(persona.id, { title: e.target.value })}
                                />
                                
                                <div className="space-y-3">
                                  <h5 className="font-medium text-sm">Demographics</h5>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      placeholder="Age"
                                      value={persona.demographics.age}
                                      onChange={(e) => updatePersona(persona.id, {
                                        demographics: { ...persona.demographics, age: e.target.value }
                                      })}
                                    />
                                    <Input
                                      placeholder="Gender"
                                      value={persona.demographics.gender}
                                      onChange={(e) => updatePersona(persona.id, {
                                        demographics: { ...persona.demographics, gender: e.target.value }
                                      })}
                                    />
                                    <Input
                                      placeholder="Location"
                                      value={persona.demographics.location}
                                      onChange={(e) => updatePersona(persona.id, {
                                        demographics: { ...persona.demographics, location: e.target.value }
                                      })}
                                    />
                                    <Input
                                      placeholder="Income"
                                      value={persona.demographics.income}
                                      onChange={(e) => updatePersona(persona.id, {
                                        demographics: { ...persona.demographics, income: e.target.value }
                                      })}
                                    />
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  <h5 className="font-medium text-sm">Awareness Level</h5>
                                  <Select
                                    value={persona.awarenessLevel}
                                    onValueChange={(value) => updatePersona(persona.id, { awarenessLevel: value as Persona['awarenessLevel'] })}
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

                                <Button
                                  size="sm"
                                  onClick={() => setEditingPersona(null)}
                                >
                                  <Save className="h-4 w-4 mr-2" />
                                  Save
                                </Button>
                              </div>
                            ) : (
                              // View mode
                              <div className="space-y-3">
                                <div>
                                  <h5 className="font-medium text-sm mb-2">Demographics</h5>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-gray-500">Age:</span> {persona.demographics.age || 'Not set'}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Gender:</span> {persona.demographics.gender || 'Not set'}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Location:</span> {persona.demographics.location || 'Not set'}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Income:</span> {persona.demographics.income || 'Not set'}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Education:</span> {persona.demographics.education || 'Not set'}
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Occupation:</span> {persona.demographics.occupation || 'Not set'}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <h5 className="font-medium text-sm mb-2">Psychographics</h5>
                                  <div className="space-y-2 text-sm">
                                    {persona.psychographics.interests.length > 0 && (
                                      <div>
                                        <span className="text-gray-500">Interests:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {persona.psychographics.interests.map((interest, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-xs">
                                              {interest}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {persona.psychographics.painPoints.length > 0 && (
                                      <div>
                                        <span className="text-gray-500">Pain Points:</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {persona.psychographics.painPoints.map((pain, idx) => (
                                            <Badge key={idx} variant="destructive" className="text-xs">
                                              {pain}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {persona.customerLanguage.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-sm mb-2">Customer Language</h5>
                                    <div className="space-y-1">
                                      {persona.customerLanguage.map((phrase, idx) => (
                                        <p key={idx} className="text-sm text-gray-600 italic">
                                          &ldquo;{phrase}&rdquo;
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 2: Competitors */}
            <TabsContent value="competitors" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">2</div>
                        Competitor Analysis
                      </CardTitle>
                      <CardDescription>
                        Study competitors and identify opportunities
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          const competitorData = (onesheet.competitor_analysis || [])
                            .map(c => `${c.name}: ${c.website}`)
                            .join('\n')
                          generateAI('competitorGapAnalysis', { 
                            competitors: competitorData,
                            ourProduct: onesheet.product 
                          })
                        }}
                        disabled={isGenerating === 'competitorGapAnalysis' || (onesheet.competitor_analysis || []).length === 0}
                      >
                        {isGenerating === 'competitorGapAnalysis' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Target className="h-4 w-4 mr-1" />
                        )}
                        Analyze Competitors
                      </Button>
                      <Button onClick={addCompetitor} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Competitor
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {(onesheet.competitor_analysis || []).map((competitor) => (
                      <Card key={competitor.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{competitor.name}</CardTitle>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingCompetitor(editingCompetitor === competitor.id ? null : competitor.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {editingCompetitor === competitor.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <Input
                                  placeholder="Competitor Name"
                                  value={competitor.name}
                                  onChange={(e) => updateCompetitor(competitor.id, { name: e.target.value })}
                                />
                                <Input
                                  placeholder="Website URL"
                                  value={competitor.website}
                                  onChange={(e) => updateCompetitor(competitor.id, { website: e.target.value })}
                                />
                              </div>
                              <Textarea
                                placeholder="Why is your product better?"
                                value={competitor.whyBetterChoice}
                                onChange={(e) => updateCompetitor(competitor.id, { whyBetterChoice: e.target.value })}
                              />
                              <Button size="sm" onClick={() => setEditingCompetitor(null)}>
                                <Save className="h-4 w-4 mr-2" />
                                Save
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-600">{competitor.website}</p>
                              {competitor.whyBetterChoice && (
                                <p className="text-sm">{competitor.whyBetterChoice}</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 3: Social Listening */}
            <TabsContent value="social" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">3</div>
                    Social Listening
                  </CardTitle>
                  <CardDescription>
                    Analyze Reddit, forums, and organic content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                      Social Research Tools
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start text-left h-auto p-3"
                        onClick={() => {
                          toast({
                            title: 'Reddit Analysis',
                            description: 'Paste Reddit content in the dialog to analyze'
                          })
                        }}
                      >
                        <div>
                          <div className="font-medium text-sm">Reddit Analysis</div>
                          <div className="text-xs text-gray-600">Extract customer language from Reddit posts</div>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start text-left h-auto p-3"
                        onClick={() => {
                          toast({
                            title: 'Forum Research',
                            description: 'Analyze Quora and niche forums'
                          })
                        }}
                      >
                        <div>
                          <div className="font-medium text-sm">Forum Research</div>
                          <div className="text-xs text-gray-600">Analyze Quora and niche forums</div>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start text-left h-auto p-3"
                        onClick={() => generateAI('shockingStatistics', { 
                          context: `${onesheet.product} in the ${onesheet.product} industry`
                        })}
                        disabled={isGenerating === 'shockingStatistics' || !onesheet.product}
                      >
                        <div>
                          <div className="font-medium text-sm">Shocking Statistics</div>
                          <div className="text-xs text-gray-600">Find relevant industry statistics</div>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start text-left h-auto p-3"
                        onClick={() => {
                          toast({
                            title: 'Trend Analysis',
                            description: 'Identify emerging trends and topics'
                          })
                        }}
                      >
                        <div>
                          <div className="font-medium text-sm">Trend Analysis</div>
                          <div className="text-xs text-gray-600">Identify emerging trends and topics</div>
                        </div>
                      </Button>
                    </div>
                  </div>

                  {/* Add input area for social content */}
                  <div className="mt-6">
                    <Label>Paste Social Content for Analysis</Label>
                    <Textarea 
                      placeholder="Paste Reddit posts, forum discussions, or articles here..."
                      className="mt-2 h-32"
                      onChange={() => {
                        // Store for analysis
                      }}
                    />
                    <Button 
                      className="mt-2"
                      onClick={() => {
                        // Analyze the pasted content
                        toast({
                          title: 'Content Analysis',
                          description: 'Analyzing social content...'
                        })
                      }}
                    >
                      Analyze Content
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 4: Performance */}
            <TabsContent value="performance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">4</div>
                    Performance Audit
                  </CardTitle>
                  <CardDescription>
                    Review historical ad performance and learnings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Meta Ads Sync Interface */}
                  <div className="space-y-6">
                    {/* Date Range and Sync Controls */}
                    {(!onesheet.ad_performance_data || onesheet.ad_performance_data.length === 0) ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h4 className="font-medium mb-4 flex items-center gap-2">
                          <Target className="h-5 w-5 text-blue-600" />
                          Meta Ads Account Sync
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <Label>Date Range</Label>
                            <Select defaultValue="last30">
                              <SelectTrigger>
                                <SelectValue placeholder="Select date range" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="last30">Last 30 Days</SelectItem>
                                <SelectItem value="last90">Last 90 Days</SelectItem>
                                <SelectItem value="last180">Last 6 Months</SelectItem>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="custom">Custom Range</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-end">
                            <Button 
                              className="w-full"
                              onClick={() => {
                                toast({
                                  title: 'Sync Started',
                                  description: 'Fetching your Meta ads data...'
                                });
                              }}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Sync & Analyze Ad Data
                            </Button>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600">
                          This will fetch all your ad data from Meta, download video assets, and analyze performance patterns.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Ad Performance Data</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              toast({
                                title: 'Refreshing data',
                                description: 'Syncing latest ad performance...'
                              });
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                          </Button>
                        </div>
                        
                        {/* Import AdPerformanceTable dynamically to avoid circular dependencies */}
                        <div className="mt-4">
                          <p className="text-sm text-gray-500 mb-4">
                            {onesheet.ad_performance_data.length} ads loaded
                          </p>
                          {/* Placeholder for AdPerformanceTable - will be imported dynamically */}
                          <div className="border rounded-lg p-4">
                            <p className="text-center text-gray-500">
                              Ad performance table will be displayed here
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 5: Synthesis */}
            <TabsContent value="synthesis" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600">5</div>
                        Research Synthesis
                      </CardTitle>
                      <CardDescription>
                        Combine all insights into organized categories
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowSynthesisDialog(true)} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Insight
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {onesheet.synthesis_data && Object.entries(onesheet.synthesis_data).map(([category, items]) => (
                      <div key={category}>
                        <h4 className="font-semibold mb-3 capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</h4>
                        <div className="grid gap-3">
                          {items.map((item: SynthesisItem, idx: number) => (
                            <Card key={idx} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium">{item.text}</p>
                                  <p className="text-sm text-gray-600 mt-1">{item.source}</p>
                                  {item.sourceDetails && (
                                    <p className="text-xs text-gray-500 mt-2">{item.sourceDetails}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 ml-4">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${
                                        i < item.relevance
                                          ? 'text-yellow-400 fill-current'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Step 6: Creative */}
            <TabsContent value="creative" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-600">6</div>
                    Creative Generation
                  </CardTitle>
                  <CardDescription>
                    Generate concepts, hooks, and visuals from research
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-600" />
                      Creative Generation Tools
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start text-left h-auto p-3"
                        onClick={() => generateAI('testimonialHeadlines')}
                        disabled={isGenerating === 'testimonialHeadlines' || !onesheet.customer_reviews_url}
                      >
                        <div>
                          <div className="font-medium text-sm">Testimonial Headlines</div>
                          <div className="text-xs text-gray-600">Generate headlines from customer reviews</div>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start text-left h-auto p-3"
                        onClick={() => generateAI('oneLiners')}
                        disabled={isGenerating === 'oneLiners' || !onesheet.customer_reviews_url}
                      >
                        <div>
                          <div className="font-medium text-sm">Hook Generation</div>
                          <div className="text-xs text-gray-600">Create engaging hooks using customer language</div>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start text-left h-auto p-3"
                        onClick={() => generateAI('midjourneyIdeas')}
                        disabled={isGenerating === 'midjourneyIdeas' || !onesheet.landing_page_url}
                      >
                        <div>
                          <div className="font-medium text-sm">Midjourney Concepts</div>
                          <div className="text-xs text-gray-600">Visual ideas for AI image generation</div>
                        </div>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="justify-start text-left h-auto p-3"
                        onClick={() => generateAI('problemSolutionScenarios')}
                        disabled={isGenerating === 'problemSolutionScenarios' || !onesheet.customer_reviews_url}
                      >
                        <div>
                          <div className="font-medium text-sm">Problem-Solution Scenarios</div>
                          <div className="text-xs text-gray-600">Generate ad scenarios from pain points</div>
                        </div>
                      </Button>
                    </div>
                  </div>

                  {/* Display generated creative content */}
                  <div className="mt-6 space-y-4">
                    <div className="text-center p-8 border-2 border-dashed rounded-lg">
                      <Lightbulb className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600">Generated creative concepts will appear here</p>
                      <p className="text-sm text-gray-500 mt-1">Complete research steps 1-5 first for best results</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Synthesis Dialog */}
          {showSynthesisDialog && (
            <SynthesisDialog
              category="general"
              onAdd={(item) => {
                addSynthesisItem({
                  ...item,
                  id: Date.now().toString(),
                  dateAdded: new Date().toISOString()
                });
                setShowSynthesisDialog(false);
              }}
            />
          )}
        </>
      )}
    </div>
  );
} 