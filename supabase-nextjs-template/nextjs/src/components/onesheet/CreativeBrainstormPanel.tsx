"use client";

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Lightbulb, 
  Sparkles,
  Video,
  Image as ImageIcon,
  MessageSquare,
  Download,
  Plus,
  Edit2,
  Save,
  X,
  RefreshCw,
  Zap,
  Palette,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import type {
  CreativeBrainstormData,
  CreativeConcept,
  CreativeHook,
  CreativeVisual,
  OneSheetAIInstructions,
  AdAccountAuditData,
  AudienceResearchData,
  AdData,
  CreativeBestPractices,
  CreativeIteration
} from '@/lib/types/onesheet';
import { GenerationProgressTracker } from './GenerationProgressTracker';
import styles from './CreativeBrainstormPanel.module.scss';

interface ExtendedCreativeConcept extends CreativeConcept {
  duration?: number; // in seconds
  productIntroTime?: number; // in seconds
  sitInProblemTime?: number; // in seconds
  creatorsCount?: number;
  contentVariables?: string[];
  type?: string;
  format?: string;
}

interface ExtendedCreativeVisual extends CreativeVisual {
  duration?: number;
}

interface ExtendedAdData extends AdData {
  assetUrl?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  assetType?: string;
}

interface CreativeBrainstormPanelProps {
  onesheetId: string;
}

export function CreativeBrainstormPanel({ onesheetId }: CreativeBrainstormPanelProps) {
  const [data, setData] = useState<CreativeBrainstormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('concepts');
  const [editingConcept, setEditingConcept] = useState<ExtendedCreativeConcept | null>(null);
  const [editingHook, setEditingHook] = useState<{ type: 'visual' | 'audio'; hook: CreativeHook | null }>({ type: 'visual', hook: null });
  const [editingVisual, setEditingVisual] = useState<ExtendedCreativeVisual | null>(null);
  const [editingPractice, setEditingPractice] = useState<{ type: keyof CreativeBestPractices; index: number; value: string } | null>(null);
  const [editingIteration, setEditingIteration] = useState<CreativeIteration | null>(null);
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-pro');
  const [aiInstructions, setAiInstructions] = useState<OneSheetAIInstructions | null>(null);
  const [showAdSelector, setShowAdSelector] = useState(false);
  const [selectedAds, setSelectedAds] = useState<string[]>([]);
  const [selectedIterationAds, setSelectedIterationAds] = useState<string[]>([]);
  const [adAccountAuditData, setAdAccountAuditData] = useState<AdAccountAuditData | null>(null);
  const [audienceResearchData, setAudienceResearchData] = useState<AudienceResearchData | null>(null);
  const [progressSteps, setProgressSteps] = useState<Array<{
    id: string;
    label: string;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
    error?: string;
  }>>([]);
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);

  // Context options state with updated defaults
  const [contextOptions, setContextOptions] = useState({
    contextHub: {
      websites: true,
      reviews: true,
      reddit: true,
      articles: true,
      socialContent: true,
    },
    audienceResearch: {
      angles: true,
      benefits: true,
      painPoints: true,
      features: true,
      objections: true,
      failedSolutions: true,
      other: true,
      personas: true,
    },
    competitorResearch: {
      competitors: true,
      strategicAnalysis: true,
    },
    adAccountAudit: {
      fullDataTable: false, // Default to off as requested
      selectedAds: true, // Default to on as requested
      selectedAdIds: [],
    },
    demographics: {
      includeVisualizations: true,
    },
    aiStrategist: {
      analysisSummary: true,
      strategicSummary: true,
      recommendations: true,
      creativePatterns: true,
      losingElements: true,
      bestPerformingHooks: true,
      optimalSitInProblemRange: true,
      topPerformingAds: true,
      lowPerformingAds: true,
    },
  });

  useEffect(() => {
    fetchData();
    fetchAiInstructions();
    fetchAdAccountAuditData();
    fetchAudienceResearchData();
  }, [onesheetId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/onesheet/creative-brainstorm?onesheetId=${onesheetId}`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching creative brainstorm data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiInstructions = async () => {
    try {
      const response = await fetch(`/api/onesheet/ai-instructions?onesheetId=${onesheetId}`);
      if (response.ok) {
        const result = await response.json();
        console.log('AI Instructions loaded:', result.data);
        setAiInstructions(result.data);
        if (result.data?.creative_brainstorm_context_options) {
          setContextOptions(result.data.creative_brainstorm_context_options);
        }
        // Set default model
        if (result.data?.creative_brainstorm_model) {
          setSelectedModel(result.data.creative_brainstorm_model);
        }
      }
    } catch (error) {
      console.error('Error fetching AI instructions:', error);
    }
  };

  const fetchAdAccountAuditData = async () => {
    try {
      const response = await fetch(`/api/onesheet/${onesheetId}`);
      if (response.ok) {
        const result = await response.json();
        setAdAccountAuditData(result.ad_account_audit);
      }
    } catch (error) {
      console.error('Error fetching ad account audit data:', error);
    }
  };

  const fetchAudienceResearchData = async () => {
    try {
      const response = await fetch(`/api/onesheet/audience-research?onesheet_id=${onesheetId}`);
      if (response.ok) {
        const result = await response.json();
        setAudienceResearchData(result.data);
      }
    } catch (error) {
      console.error('Error fetching audience research data:', error);
    }
  };

  const handleGenerate = async () => {
    // Require ad selection if that option is enabled
    if (contextOptions.adAccountAudit.selectedAds && selectedAds.length === 0) {
      alert('Please select at least one ad to analyze');
      setShowAdSelector(true);
      return;
    }

    setGenerating(true);
    
    // Initialize progress steps
    const steps = [
      { id: 'concepts', label: 'Generating Net New Concepts', status: 'pending' as const },
      { id: 'iterations', label: 'Creating Ad Iterations', status: 'pending' as const },
      { id: 'hooks', label: 'Crafting Visual & Audio Hooks', status: 'pending' as const },
      { id: 'visuals', label: 'Designing Visual Treatments', status: 'pending' as const },
      { id: 'practices', label: 'Extracting Best Practices', status: 'pending' as const }
    ];
    setProgressSteps(steps);
    
    try {
      // Make separate API calls for each prompt type for better results
      const promptTypes = ['concepts', 'iterations', 'hooks', 'visuals', 'practices'];
      const results: Record<string, Partial<CreativeBrainstormData>> = {};

      for (let i = 0; i < promptTypes.length; i++) {
        const promptType = promptTypes[i];
        
        // Update progress to in-progress
        setProgressSteps(prev => prev.map(step => 
          step.id === promptType ? { ...step, status: 'in-progress' } : step
        ));
        
        try {
          const response = await fetch('/api/onesheet/creative-brainstorm/generate-split', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              onesheetId,
              promptType,
              model: selectedModel,
              contextOptions: {
                ...contextOptions,
                adAccountAudit: {
                  ...contextOptions.adAccountAudit,
                  selectedAdIds: selectedAds,
                  selectedIterationAdIds: selectedIterationAds.length > 0 ? selectedIterationAds : undefined,
                },
              },
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error(`Failed to generate ${promptType}:`, error);
            // Update progress to error
            setProgressSteps(prev => prev.map(step => 
              step.id === promptType ? { ...step, status: 'error', error: error.error || 'Failed to generate' } : step
            ));
            continue; // Skip this type and continue with others
          }

          const result = await response.json();
          results[promptType] = result.data;
          
          // Update progress to completed
          setProgressSteps(prev => prev.map(step => 
            step.id === promptType ? { ...step, status: 'completed' } : step
          ));
        } catch (error) {
          console.error(`Error generating ${promptType}:`, error);
          // Update progress to error
          setProgressSteps(prev => prev.map(step => 
            step.id === promptType ? { ...step, status: 'error', error: 'Network error' } : step
          ));
        }
      }

      // Combine all results
      const combinedData: CreativeBrainstormData = {
        netNewConcepts: results.concepts?.netNewConcepts || [],
        iterations: results.iterations?.iterations || [],
        hooks: results.hooks?.hooks || { visual: [], audio: [] },
        visuals: results.visuals?.visuals || [],
        creativeBestPractices: results.practices?.creativeBestPractices || { dos: [], donts: [], keyLearnings: [], recommendations: [] }
      };
      
      setData(combinedData);
      
      // Auto-save after generation
      await handleSave(combinedData);
    } catch (error) {
      console.error('Error generating creative brainstorm:', error);
    } finally {
      setGenerating(false);
      // Clear progress after a delay
      setTimeout(() => setProgressSteps([]), 2000);
    }
  };

  const handleSave = async (dataToSave?: CreativeBrainstormData) => {
    setSaving(true);
    try {
      const response = await fetch('/api/onesheet/creative-brainstorm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onesheetId,
          data: dataToSave || data,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save data');
      }
    } catch (error) {
      console.error('Error saving creative brainstorm:', error);
      alert('Failed to save creative brainstorm data');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/onesheet/creative-brainstorm/export?onesheetId=${onesheetId}&format=${format}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `creative-brainstorm.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting creative brainstorm:', error);
    }
  };

  const handleSaveInstructions = async () => {
    try {
      await fetch('/api/onesheet/ai-instructions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onesheetId,
          ...aiInstructions,
          creative_brainstorm_model: selectedModel,
          creative_brainstorm_context_options: contextOptions,
        }),
      });
      setEditingInstructions(false);
    } catch (error) {
      console.error('Error saving AI instructions:', error);
    }
  };

  const toggleAdSelection = (adId: string) => {
    setSelectedAds(prev => 
      prev.includes(adId) 
        ? prev.filter(id => id !== adId)
        : [...prev, adId]
    );
  };

  const toggleIterationAdSelection = (adId: string) => {
    setSelectedIterationAds(prev => 
      prev.includes(adId) 
        ? prev.filter(id => id !== adId)
        : [...prev, adId]
    );
  };

  const selectAllAds = () => {
    if (adAccountAuditData?.ads) {
      setSelectedAds(adAccountAuditData.ads.map(ad => ad.id));
    }
  };

  const clearAdSelection = () => {
    setSelectedAds([]);
  };

  const renderContextOptionsPanel = () => (
    <Card className={styles.contextPanel}>
        <CardHeader>
        <CardTitle>Context Selection</CardTitle>
              <CardDescription>
          Choose what data to include when generating creative ideas
              </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={styles.contextSections}>
          {/* Context Hub */}
          <div className={styles.contextSection}>
            <h4>Context Hub</h4>
            {Object.entries(contextOptions.contextHub).map(([key, value]) => (
              <div key={key} className={styles.checkboxRow}>
                <Checkbox
                  id={`context-${key}`}
                  checked={value}
                  onCheckedChange={(checked) => {
                    setContextOptions(prev => ({
                      ...prev,
                      contextHub: { ...prev.contextHub, [key]: checked as boolean },
                    }));
                  }}
                />
                <Label htmlFor={`context-${key}`}>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                </Label>
            </div>
            ))}
          </div>

          {/* Audience Research */}
          <div className={styles.contextSection}>
            <h4>Audience Research</h4>
            {Object.entries(contextOptions.audienceResearch).map(([key, value]) => (
              <div key={key} className={styles.checkboxRow}>
                <Checkbox
                  id={`audience-${key}`}
                  checked={value}
                  onCheckedChange={(checked) => {
                    setContextOptions(prev => ({
                      ...prev,
                      audienceResearch: { ...prev.audienceResearch, [key]: checked as boolean },
                    }));
                  }}
                />
                <Label htmlFor={`audience-${key}`}>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                </Label>
              </div>
            ))}
          </div>

          {/* Competitor Research */}
          <div className={styles.contextSection}>
            <h4>Competitor Research</h4>
            {Object.entries(contextOptions.competitorResearch).map(([key, value]) => (
              <div key={key} className={styles.checkboxRow}>
                <Checkbox
                  id={`competitor-${key}`}
                  checked={value}
                  onCheckedChange={(checked) => {
                    setContextOptions(prev => ({
                      ...prev,
                      competitorResearch: { ...prev.competitorResearch, [key]: checked as boolean },
                    }));
                  }}
                />
                <Label htmlFor={`competitor-${key}`}>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                </Label>
              </div>
            ))}
          </div>

          {/* Ad Account Audit - PRIORITY 1 */}
          <div className={styles.contextSection}>
            <h4>Ad Account Audit (Priority 1)</h4>
            <div className={styles.checkboxRow}>
              <Checkbox
                id="ad-full-table"
                checked={contextOptions.adAccountAudit.fullDataTable}
                onCheckedChange={(checked) => {
                  setContextOptions(prev => ({
                    ...prev,
                    adAccountAudit: { ...prev.adAccountAudit, fullDataTable: checked as boolean },
                  }));
                }}
              />
              <Label htmlFor="ad-full-table">Full Data Table</Label>
            </div>
            <div className={styles.checkboxRow}>
              <Checkbox
                id="ad-selected"
                checked={contextOptions.adAccountAudit.selectedAds}
                onCheckedChange={(checked) => {
                  setContextOptions(prev => ({
                    ...prev,
                    adAccountAudit: { ...prev.adAccountAudit, selectedAds: checked as boolean },
                  }));
                }}
              />
              <Label htmlFor="ad-selected">Selected Ads Only (Required)</Label>
            </div>
            {contextOptions.adAccountAudit.selectedAds && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdSelector(true)}
                className={styles.selectAdsButton}
              >
                Select Ads ({selectedAds.length} selected, {selectedIterationAds.length} for iterations)
            </Button>
            )}
          </div>

          {/* AI Strategist - PRIORITY 2 */}
          <div className={styles.contextSection}>
            <h4>AI Strategist Recommendations (Priority 2)</h4>
            {Object.entries(contextOptions.aiStrategist).map(([key, value]) => (
              <div key={key} className={styles.checkboxRow}>
                <Checkbox
                  id={`strategist-${key}`}
                  checked={value}
                  onCheckedChange={(checked) => {
                    setContextOptions(prev => ({
                      ...prev,
                      aiStrategist: { ...prev.aiStrategist, [key]: checked as boolean },
                    }));
                  }}
                />
                <Label htmlFor={`strategist-${key}`}>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                </Label>
              </div>
            ))}
          </div>

          {/* Demographics - PRIORITY 3 */}
          <div className={styles.contextSection}>
            <h4>Demographics (Priority 3)</h4>
            <div className={styles.checkboxRow}>
              <Checkbox
                id="demographics-viz"
                checked={contextOptions.demographics.includeVisualizations}
                onCheckedChange={(checked) => {
                  setContextOptions(prev => ({
                    ...prev,
                    demographics: { includeVisualizations: checked as boolean },
                  }));
                }}
              />
              <Label htmlFor={`demographics-viz`}>Include Audience Demographic Info</Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderNetNewConcepts = () => (
    <div className={styles.conceptsGrid}>
      {(data?.netNewConcepts || []).map((concept) => (
        <Card key={concept.id} className={styles.conceptCard}>
          <CardHeader>
            <div className={styles.conceptHeader}>
              <CardTitle>{concept.name}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingConcept(concept as ExtendedCreativeConcept)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
            <div className={styles.conceptMeta}>
              <Badge variant="secondary">{concept.angle}</Badge>
              <Badge variant="outline">{concept.emotion}</Badge>
              <Badge>{concept.framework}</Badge>
          </div>
        </CardHeader>
        <CardContent>
            <p className={styles.conceptDescription}>{concept.description}</p>
            <div className={styles.conceptDetails}>
              <div>
                <strong>Target Persona:</strong> {concept.targetPersona}
              </div>
              <div>
                <strong>Awareness Level:</strong> {concept.awarenessLevel}
              </div>
              {(concept as ExtendedCreativeConcept).duration && (
                <div>
                  <strong>Duration:</strong> {(concept as ExtendedCreativeConcept).duration}s
                </div>
              )}
              {(concept as ExtendedCreativeConcept).productIntroTime && (
                <div>
                  <strong>Product Intro:</strong> {(concept as ExtendedCreativeConcept).productIntroTime}s
                </div>
              )}
              {(concept as ExtendedCreativeConcept).sitInProblemTime && (
                <div>
                  <strong>Sit in Problem:</strong> {(concept as ExtendedCreativeConcept).sitInProblemTime}
                </div>
              )}
              {(concept as ExtendedCreativeConcept).creatorsCount && (
                <div>
                  <strong>Creators:</strong> {(concept as ExtendedCreativeConcept).creatorsCount}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
      
      <Card className={styles.addCard} onClick={() => {
        const newConcept: ExtendedCreativeConcept = {
          id: `concept-${Date.now()}`,
          name: 'New Concept',
          angle: '',
          targetPersona: '',
          emotion: '',
          framework: '',
          awarenessLevel: '',
          description: '',
          duration: 30,
          productIntroTime: 5,
          sitInProblemTime: 10,
          creatorsCount: 1,
          contentVariables: [],
          type: '',
          format: ''
        };
        setEditingConcept(newConcept);
      }}>
        <CardContent className={styles.addCardContent}>
          <Plus className="h-8 w-8" />
          <span>Add New Concept</span>
        </CardContent>
      </Card>
    </div>
  );

  const renderIterations = () => (
    <div className={styles.iterationsContainer}>
      {['early', 'script', 'fine_tuning', 'late'].map((type) => (
        <div key={type} className={styles.iterationSection}>
          <div className={styles.iterationSectionHeader}>
            <div>
              <h3 className={styles.iterationTitle}>
                {type === 'early' && 'Early Iterations'}
                {type === 'script' && 'Script Iterations'}
                {type === 'fine_tuning' && 'Fine Tuning'}
                {type === 'late' && 'Late Iterations'}
              </h3>
              <p className={styles.iterationDescription}>
                {type === 'early' && 'New hooks (audio/visual), voiceovers for low attention rates'}
                {type === 'script' && 'USP testing, length variations for hold rate improvement'}
                {type === 'fine_tuning' && 'Replicate winners with different creators'}
                {type === 'late' && 'New angles, formats, or transformations'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newIteration: CreativeIteration = {
                  adId: '',
                  adName: '',
                  iterationType: type as 'early' | 'script' | 'fine_tuning' | 'late',
                  suggestion: '',
                  expectedImpact: ''
                };
                setEditingIteration(newIteration);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Iteration
            </Button>
          </div>
          <div className={styles.iterationCards}>
            {(data?.iterations || [])
              .filter(iter => iter.iterationType === type)
              .map((iteration) => (
                <Card key={`${iteration.adId}-${iteration.iterationType}`} className={styles.iterationCard}>
                  <CardHeader>
                    <div className={styles.iterationCardHeader}>
                      <CardTitle className={styles.iterationAdName}>{iteration.adName}</CardTitle>
                      <div className={styles.iterationActions}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingIteration(iteration)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (data) {
                              setData({
                                ...data,
                                iterations: data.iterations.filter(i => 
                                  !(i.adId === iteration.adId && i.iterationType === iteration.iterationType)
                                )
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className={styles.iterationSuggestion}>{iteration.suggestion}</p>
                    <div className={styles.iterationImpact}>
                      <AlertCircle className="h-4 w-4" />
                      <span>{iteration.expectedImpact}</span>
          </div>
        </CardContent>
      </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderHooks = () => (
    <div className={styles.hooksContainer}>
      <Tabs defaultValue="visual" className={styles.hooksTabs}>
        <TabsList className={styles.hooksTabsList}>
          <TabsTrigger value="visual">Visual Hooks</TabsTrigger>
          <TabsTrigger value="audio">Audio Hooks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="visual" className={styles.hooksContent}>
          <div className={styles.hooksGrid}>
            {(data?.hooks?.visual || []).map((hook) => (
              <Card key={hook.id} className={styles.hookCard}>
                <CardContent className={styles.hookContent}>
                  <p className={styles.hookText}>{hook.hook}</p>
                  <p className={styles.hookRationale}>{hook.rationale}</p>
                  {hook.conceptId && (
                    <Badge variant="outline" className={styles.hookConcept}>
                      {(data?.netNewConcepts || []).find(c => c.id === hook.conceptId)?.name}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={styles.editHookButton}
                    onClick={() => setEditingHook({ type: 'visual', hook })}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Card 
              className={styles.addCard} 
              onClick={() => {
                const newHook: CreativeHook = {
                  id: `hook-${Date.now()}`,
                  hook: '',
                  rationale: '',
                };
                setEditingHook({ type: 'visual', hook: newHook });
              }}
            >
              <CardContent className={styles.addCardContent}>
                <Plus className="h-8 w-8" />
                <span>Add Visual Hook</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="audio" className={styles.hooksContent}>
          <div className={styles.hooksGrid}>
            {(data?.hooks?.audio || []).map((hook) => (
              <Card key={hook.id} className={styles.hookCard}>
                <CardContent className={styles.hookContent}>
                  <p className={styles.hookText}>{hook.hook}</p>
                  <p className={styles.hookRationale}>{hook.rationale}</p>
                  {hook.conceptId && (
                    <Badge variant="outline" className={styles.hookConcept}>
                      {(data?.netNewConcepts || []).find(c => c.id === hook.conceptId)?.name}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={styles.editHookButton}
                    onClick={() => setEditingHook({ type: 'audio', hook })}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Card 
              className={styles.addCard} 
              onClick={() => {
                const newHook: CreativeHook = {
                  id: `hook-${Date.now()}`,
                  hook: '',
                  rationale: '',
                };
                setEditingHook({ type: 'audio', hook: newHook });
              }}
            >
              <CardContent className={styles.addCardContent}>
                <Plus className="h-8 w-8" />
                <span>Add Audio Hook</span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderVisuals = () => (
    <div className={styles.visualsGrid}>
      {(data?.visuals || []).map((visual) => (
        <Card key={visual.id} className={styles.visualCard}>
          <CardHeader>
            <div className={styles.visualHeader}>
              <Badge variant={visual.type === 'video' ? 'default' : 'secondary'}>
                {visual.type === 'video' && <Video className="h-3 w-3 mr-1" />}
                {visual.type === 'static' && <ImageIcon className="h-3 w-3 mr-1" />}
                {visual.type}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingVisual(visual as ExtendedCreativeVisual)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className={styles.visualDescription}>{visual.description}</p>
            {visual.scenes && visual.scenes.length > 0 && (
              <div className={styles.visualScenes}>
                <strong>Scenes:</strong>
                <ul>
                  {visual.scenes.map((scene, idx) => (
                    <li key={idx}>{scene}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className={styles.visualDetails}>
              <div className={styles.colorScheme}>
                <Palette className="h-4 w-4" />
                <span>{visual.colorScheme}</span>
              </div>
              <div className={styles.keyElements}>
                <strong>Key Elements:</strong>
                {(visual.keyElements || []).map((element, idx) => (
                  <Badge key={idx} variant="outline">{element}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      <Card className={styles.addCard} onClick={() => {
        const newVisual: ExtendedCreativeVisual = {
          id: `visual-${Date.now()}`,
          type: 'static',
          description: '',
          colorScheme: '',
          keyElements: [],
          duration: 30
        };
        setEditingVisual(newVisual);
      }}>
        <CardContent className={styles.addCardContent}>
          <Plus className="h-8 w-8" />
          <span>Add New Visual</span>
        </CardContent>
      </Card>
    </div>
  );

  const renderBestPractices = () => (
    <div className={styles.bestPracticesContainer}>
      <div className={styles.practicesGrid}>
        <Card className={styles.practiceCard}>
          <CardHeader>
            <CardTitle className={styles.practiceTitle}>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Do&apos;s
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className={styles.practiceList}>
              {(data?.creativeBestPractices?.dos || []).map((item, idx) => (
                <li key={idx} className={styles.practiceItem}>
                  <span>{item}</span>
                  <div className={styles.practiceActions}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingPractice({ type: 'dos', index: idx, value: item })}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (data) {
                          const updatedDos = [...data.creativeBestPractices.dos];
                          updatedDos.splice(idx, 1);
                          setData({
                            ...data,
                            creativeBestPractices: {
                              ...data.creativeBestPractices,
                              dos: updatedDos
                            }
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className={styles.addPracticeButton}
              onClick={() => setEditingPractice({ type: 'dos', index: -1, value: '' })}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Do
            </Button>
          </CardContent>
        </Card>

        <Card className={styles.practiceCard}>
          <CardHeader>
            <CardTitle className={styles.practiceTitle}>
              <X className="h-5 w-5 text-red-600" />
              Don&apos;ts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className={styles.practiceList}>
              {(data?.creativeBestPractices?.donts || []).map((item, idx) => (
                <li key={idx} className={styles.practiceItem}>
                  <span>{item}</span>
                  <div className={styles.practiceActions}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingPractice({ type: 'donts', index: idx, value: item })}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (data) {
                          const updatedDonts = [...data.creativeBestPractices.donts];
                          updatedDonts.splice(idx, 1);
                          setData({
                            ...data,
                            creativeBestPractices: {
                              ...data.creativeBestPractices,
                              donts: updatedDonts
                            }
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className={styles.addPracticeButton}
              onClick={() => setEditingPractice({ type: 'donts', index: -1, value: '' })}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Don&apos;t
            </Button>
          </CardContent>
        </Card>

        <Card className={styles.practiceCard}>
          <CardHeader>
            <CardTitle className={styles.practiceTitle}>
              <BookOpen className="h-5 w-5 text-blue-600" />
              Key Learnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className={styles.practiceList}>
              {(data?.creativeBestPractices?.keyLearnings || []).map((item, idx) => (
                <li key={idx} className={styles.practiceItem}>
                  <span>{item}</span>
                  <div className={styles.practiceActions}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingPractice({ type: 'keyLearnings', index: idx, value: item })}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (data) {
                          const updatedLearnings = [...data.creativeBestPractices.keyLearnings];
                          updatedLearnings.splice(idx, 1);
                          setData({
                            ...data,
                            creativeBestPractices: {
                              ...data.creativeBestPractices,
                              keyLearnings: updatedLearnings
                            }
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className={styles.addPracticeButton}
              onClick={() => setEditingPractice({ type: 'keyLearnings', index: -1, value: '' })}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Learning
            </Button>
          </CardContent>
        </Card>

        <Card className={styles.practiceCard}>
          <CardHeader>
            <CardTitle className={styles.practiceTitle}>
              <Zap className="h-5 w-5 text-yellow-600" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className={styles.practiceList}>
              {(data?.creativeBestPractices?.recommendations || []).map((item, idx) => (
                <li key={idx} className={styles.practiceItem}>
                  <span>{item}</span>
                  <div className={styles.practiceActions}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingPractice({ type: 'recommendations', index: idx, value: item })}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (data) {
                          const updatedRecs = [...data.creativeBestPractices.recommendations];
                          updatedRecs.splice(idx, 1);
                          setData({
                            ...data,
                            creativeBestPractices: {
                              ...data.creativeBestPractices,
                              recommendations: updatedRecs
                            }
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className={styles.addPracticeButton}
              onClick={() => setEditingPractice({ type: 'recommendations', index: -1, value: '' })}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Recommendation
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className={styles.settingsContainer}>
      <Card>
        <CardHeader>
          <CardTitle>AI Model Selection</CardTitle>
          <CardDescription>
            Choose the AI model for generating creative concepts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={styles.modelSelection}>
            <Label htmlFor="model-select">AI Model</Label>
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
            >
              <SelectTrigger id="model-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-2.5-pro">
                  <div>
                    <div className={styles.modelName}>Gemini 2.5 Pro</div>
                    <div className={styles.modelDescription}>Most capable, best for complex analysis</div>
                  </div>
                </SelectItem>
                <SelectItem value="gemini-2.5-flash">
                  <div>
                    <div className={styles.modelName}>Gemini 2.5 Flash</div>
                    <div className={styles.modelDescription}>Fast and efficient, good balance</div>
                  </div>
                </SelectItem>
                <SelectItem value="gemini-2.5-flash-lite-preview-06-17">
                  <div>
                    <div className={styles.modelName}>Gemini 2.5 Flash Lite</div>
                    <div className={styles.modelDescription}>Fastest, most cost-effective</div>
                  </div>
                </SelectItem>
                <SelectItem value="claude-sonnet-4-20250514">
                  <div>
                    <div className={styles.modelName}>Claude 4 Sonnet</div>
                    <div className={styles.modelDescription}>Latest Claude with superior intelligence and reasoning</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className={styles.instructionsCard}>
        <CardHeader>
          <div className={styles.instructionsHeader}>
            <CardTitle>AI Instructions</CardTitle>
            <Button
              variant={editingInstructions ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (editingInstructions) {
                  handleSaveInstructions();
                } else {
                  setEditingInstructions(true);
                }
              }}
            >
              {editingInstructions ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              ) : (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={selectedModel.startsWith('gemini') ? 'gemini' : 'claude'}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gemini">Gemini</TabsTrigger>
              <TabsTrigger value="claude">Claude</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gemini" className={styles.instructionsContent}>
              <Tabs defaultValue="concepts" className={styles.nestedTabs}>
                <TabsList className={styles.sectionTabsList}>
                  <TabsTrigger value="concepts">Concepts</TabsTrigger>
                  <TabsTrigger value="iterations">Iterations</TabsTrigger>
                  <TabsTrigger value="hooks">Hooks</TabsTrigger>
                  <TabsTrigger value="visuals">Visuals</TabsTrigger>
                  <TabsTrigger value="practices">Practices</TabsTrigger>
                </TabsList>
                
                <TabsContent value="concepts">
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-concepts-system">System Instructions</Label>
                    <Textarea
                      id="gemini-concepts-system"
                      value={aiInstructions?.creative_brainstorm_concepts_system_instructions || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_concepts_system_instructions: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={6}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-concepts-prompt">Prompt Template</Label>
                    <Textarea
                      id="gemini-concepts-prompt"
                      value={aiInstructions?.creative_brainstorm_concepts_prompt_template || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_concepts_prompt_template: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-concepts-schema">Response Schema</Label>
                    <Textarea
                      id="gemini-concepts-schema"
                      value={JSON.stringify(aiInstructions?.creative_brainstorm_concepts_response_schema || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_concepts_response_schema: parsed } : null);
                        } catch {
                          // Invalid JSON, don't update
                        }
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                      className={styles.codeTextarea}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="iterations">
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-iterations-system">System Instructions</Label>
                    <Textarea
                      id="gemini-iterations-system"
                      value={aiInstructions?.creative_brainstorm_iterations_system_instructions || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_iterations_system_instructions: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={6}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-iterations-prompt">Prompt Template</Label>
                    <Textarea
                      id="gemini-iterations-prompt"
                      value={aiInstructions?.creative_brainstorm_iterations_prompt_template || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_iterations_prompt_template: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-iterations-schema">Response Schema</Label>
                    <Textarea
                      id="gemini-iterations-schema"
                      value={JSON.stringify(aiInstructions?.creative_brainstorm_iterations_response_schema || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_iterations_response_schema: parsed } : null);
                        } catch {
                          // Invalid JSON, don't update
                        }
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                      className={styles.codeTextarea}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="hooks">
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-hooks-system">System Instructions</Label>
                    <Textarea
                      id="gemini-hooks-system"
                      value={aiInstructions?.creative_brainstorm_hooks_system_instructions || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_hooks_system_instructions: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={6}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-hooks-prompt">Prompt Template</Label>
                    <Textarea
                      id="gemini-hooks-prompt"
                      value={aiInstructions?.creative_brainstorm_hooks_prompt_template || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_hooks_prompt_template: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-hooks-schema">Response Schema</Label>
                    <Textarea
                      id="gemini-hooks-schema"
                      value={JSON.stringify(aiInstructions?.creative_brainstorm_hooks_response_schema || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_hooks_response_schema: parsed } : null);
                        } catch {
                          // Invalid JSON, don't update
                        }
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                      className={styles.codeTextarea}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="visuals">
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-visuals-system">System Instructions</Label>
                    <Textarea
                      id="gemini-visuals-system"
                      value={aiInstructions?.creative_brainstorm_visuals_system_instructions || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_visuals_system_instructions: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={6}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-visuals-prompt">Prompt Template</Label>
                    <Textarea
                      id="gemini-visuals-prompt"
                      value={aiInstructions?.creative_brainstorm_visuals_prompt_template || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_visuals_prompt_template: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-visuals-schema">Response Schema</Label>
                    <Textarea
                      id="gemini-visuals-schema"
                      value={JSON.stringify(aiInstructions?.creative_brainstorm_visuals_response_schema || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_visuals_response_schema: parsed } : null);
                        } catch {
                          // Invalid JSON, don't update
                        }
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                      className={styles.codeTextarea}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="practices">
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-practices-system">System Instructions</Label>
                    <Textarea
                      id="gemini-practices-system"
                      value={aiInstructions?.creative_brainstorm_practices_system_instructions || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_practices_system_instructions: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={6}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-practices-prompt">Prompt Template</Label>
                    <Textarea
                      id="gemini-practices-prompt"
                      value={aiInstructions?.creative_brainstorm_practices_prompt_template || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_practices_prompt_template: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="gemini-practices-schema">Response Schema</Label>
                    <Textarea
                      id="gemini-practices-schema"
                      value={JSON.stringify(aiInstructions?.creative_brainstorm_practices_response_schema || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setAiInstructions(prev => prev ? { ...prev, creative_brainstorm_practices_response_schema: parsed } : null);
                        } catch {
                          // Invalid JSON, don't update
                        }
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                      className={styles.codeTextarea}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
            
            <TabsContent value="claude" className={styles.instructionsContent}>
              <Tabs defaultValue="concepts" className={styles.nestedTabs}>
                <TabsList className={styles.sectionTabsList}>
                  <TabsTrigger value="concepts">Concepts</TabsTrigger>
                  <TabsTrigger value="iterations">Iterations</TabsTrigger>
                  <TabsTrigger value="hooks">Hooks</TabsTrigger>
                  <TabsTrigger value="visuals">Visuals</TabsTrigger>
                  <TabsTrigger value="practices">Practices</TabsTrigger>
                </TabsList>
                
                <TabsContent value="concepts">
                  <div className={styles.instructionField}>
                    <Label htmlFor="claude-concepts-system">System Instructions</Label>
                    <Textarea
                      id="claude-concepts-system"
                      value={aiInstructions?.claude_concepts_system_instructions || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, claude_concepts_system_instructions: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={6}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="claude-concepts-prompt">Prompt Template</Label>
                    <Textarea
                      id="claude-concepts-prompt"
                      value={aiInstructions?.claude_concepts_prompt_template || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, claude_concepts_prompt_template: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="iterations">
                  <div className={styles.instructionField}>
                    <Label htmlFor="claude-iterations-system">System Instructions</Label>
                    <Textarea
                      id="claude-iterations-system"
                      value={aiInstructions?.claude_iterations_system_instructions || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, claude_iterations_system_instructions: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={6}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="claude-iterations-prompt">Prompt Template</Label>
                    <Textarea
                      id="claude-iterations-prompt"
                      value={aiInstructions?.claude_iterations_prompt_template || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, claude_iterations_prompt_template: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="hooks">
                  <div className={styles.instructionField}>
                    <Label htmlFor="claude-hooks-system">System Instructions</Label>
                    <Textarea
                      id="claude-hooks-system"
                      value={aiInstructions?.claude_hooks_system_instructions || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, claude_hooks_system_instructions: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={6}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="claude-hooks-prompt">Prompt Template</Label>
                    <Textarea
                      id="claude-hooks-prompt"
                      value={aiInstructions?.claude_hooks_prompt_template || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, claude_hooks_prompt_template: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="visuals">
                  <div className={styles.instructionField}>
                    <Label htmlFor="claude-visuals-system">System Instructions</Label>
                    <Textarea
                      id="claude-visuals-system"
                      value={aiInstructions?.claude_visuals_system_instructions || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, claude_visuals_system_instructions: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={6}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="claude-visuals-prompt">Prompt Template</Label>
                    <Textarea
                      id="claude-visuals-prompt"
                      value={aiInstructions?.claude_visuals_prompt_template || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, claude_visuals_prompt_template: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="practices">
                  <div className={styles.instructionField}>
                    <Label htmlFor="claude-practices-system">System Instructions</Label>
                    <Textarea
                      id="claude-practices-system"
                      value={aiInstructions?.claude_practices_system_instructions || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, claude_practices_system_instructions: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={6}
                    />
                  </div>
                  
                  <div className={styles.instructionField}>
                    <Label htmlFor="claude-practices-prompt">Prompt Template</Label>
                    <Textarea
                      id="claude-practices-prompt"
                      value={aiInstructions?.claude_practices_prompt_template || ''}
                      onChange={(e) => {
                        setAiInstructions(prev => prev ? { ...prev, claude_practices_prompt_template: e.target.value } : null);
                      }}
                      disabled={!editingInstructions}
                      rows={10}
                    />
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className={styles.noteCard}>
                <AlertCircle className="h-4 w-4" />
                <p>Claude returns JSON directly without a separate schema definition. Ensure your prompt template includes the exact JSON structure you expect.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Loading creative brainstorm data...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>Creative Brainstorm</h2>
          <div className={styles.actions}>
            <Button
              variant="outline"
              onClick={() => handleExport('json')}
              disabled={!data}
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
              disabled={!data}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() => handleSave()}
              disabled={!data || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Tracker */}
      {generating && progressSteps.length > 0 && (
        <GenerationProgressTracker 
          steps={progressSteps}
          currentStep={progressSteps.find(s => s.status === 'in-progress')?.id}
        />
      )}

      <div className={styles.mainContent}>
        <div className={styles.contextColumn}>
          {renderContextOptionsPanel()}
          <Button
            className={styles.generateButton}
            onClick={handleGenerate}
            disabled={generating}
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Generating Ideas...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Generate Creative Ideas
              </>
            )}
          </Button>
        </div>

        <div className={styles.contentColumn}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className={styles.mainTabs}>
            <TabsList className={styles.mainTabsList}>
              <TabsTrigger value="concepts">Net New Concepts</TabsTrigger>
              <TabsTrigger value="iterations">Iterations</TabsTrigger>
              <TabsTrigger value="hooks">Hooks</TabsTrigger>
              <TabsTrigger value="visuals">Visuals</TabsTrigger>
              <TabsTrigger value="practices">Best Practices</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="concepts" className={styles.tabContent}>
              {data ? renderNetNewConcepts() : (
                <Card className={styles.emptyState}>
                  <CardContent>
                    <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                    <p>No concepts generated yet. Configure your context options and click Generate to create ideas.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="iterations" className={styles.tabContent}>
              {data ? renderIterations() : (
                <Card className={styles.emptyState}>
                  <CardContent>
                    <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
                    <p>No iteration suggestions yet. Generate ideas to see ad iteration recommendations.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="hooks" className={styles.tabContent}>
              {data ? renderHooks() : (
                <Card className={styles.emptyState}>
                  <CardContent>
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <p>No hooks generated yet. Generate ideas to see hook suggestions.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="visuals" className={styles.tabContent}>
              {data ? renderVisuals() : (
                <Card className={styles.emptyState}>
                  <CardContent>
                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <p>No visuals generated yet. Generate ideas to see visual concepts.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="practices" className={styles.tabContent}>
              {data ? renderBestPractices() : (
                <Card className={styles.emptyState}>
                  <CardContent>
                    <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <p>No best practices generated yet. Generate ideas to see recommendations.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settings" className={styles.tabContent}>
              {renderSettings()}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Enhanced Ad Selector Dialog with Full Table */}
      <Dialog open={showAdSelector} onOpenChange={setShowAdSelector}>
        <DialogContent className={styles.adSelectorDialog} style={{ maxWidth: '90vw', height: '85vh' }}>
          <DialogHeader>
            <DialogTitle>Select Ads for Creative Brainstorm</DialogTitle>
            <DialogDescription>
              Choose ads to analyze and select which ones to generate iteration ideas for
            </DialogDescription>
          </DialogHeader>
          
          <div className={styles.adSelectorActions}>
            <Button variant="outline" size="sm" onClick={selectAllAds}>
              Select All
            </Button>
            <Button variant="outline" size="sm" onClick={clearAdSelection}>
              Clear Selection
            </Button>
            <div className={styles.selectionCount}>
              {selectedAds.length} ads selected, {selectedIterationAds.length} for iterations
            </div>
          </div>

          <ScrollArea className={styles.adSelectorContent} style={{ height: 'calc(100% - 120px)' }}>
            <div className={styles.adTable}>
              <table>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Iterate</th>
                    <th>Asset</th>
                    <th>Ad Name</th>
                    <th>Landing Page</th>
                    <th>Spend</th>
                    <th>CPA</th>
                    <th>ROAS</th>
                    <th>Hook Rate</th>
                    <th>Hold Rate</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Product Intro</th>
                    <th>Sit in Problem</th>
                    <th>Creators</th>
                    <th>Angle</th>
                    <th>Format</th>
                    <th>Emotion</th>
                    <th>Framework</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(adAccountAuditData?.ads || []).map((ad) => (
                    <tr key={ad.id} className={selectedAds.includes(ad.id) ? styles.selectedRow : ''}>
                      <td>
                        <Checkbox
                          checked={selectedAds.includes(ad.id)}
                          onCheckedChange={() => toggleAdSelection(ad.id)}
                        />
                      </td>
                      <td>
                        <Checkbox
                          checked={selectedIterationAds.includes(ad.id)}
                          onCheckedChange={() => toggleIterationAdSelection(ad.id)}
                          disabled={!selectedAds.includes(ad.id)}
                        />
                      </td>
                      <td>
                        {(ad as ExtendedAdData).assetUrl ? (
                          ad.type === 'highProductionVideo' || ad.type === 'lowProductionVideo' ? (
                            // For videos, show thumbnail with play overlay
                            <div 
                              className={styles.videoPreviewContainer}
                              onClick={() => setExpandedAsset((ad as ExtendedAdData).thumbnailUrl || (ad as ExtendedAdData).imageUrl || (ad as ExtendedAdData).assetUrl || '')}
                            >
                              <img 
                                src={(ad as ExtendedAdData).thumbnailUrl || (ad as ExtendedAdData).imageUrl || (ad as ExtendedAdData).assetUrl} 
                                alt={ad.adName || 'Ad preview'} 
                                className={styles.assetPreview}
                                onError={(e) => {
                                  // Fallback to video icon if thumbnail fails
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>';
                                  }
                                }}
                              />
                              <div className={styles.videoPlayOverlay}>
                                <div className={styles.videoPlayIcon}>
                                  <Video className="h-3 w-3" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <img 
                              src={(ad as ExtendedAdData).assetUrl} 
                              alt={ad.adName || 'Ad preview'} 
                              className={styles.assetPreview}
                              onError={(e) => {
                                // Fallback to image icon if image fails
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                                }
                              }}
                            />
                          )
                        ) : (
                          ad.type === 'highProductionVideo' || ad.type === 'lowProductionVideo' ? (
                            <Video className="h-4 w-4" />
                          ) : (
                            <ImageIcon className="h-4 w-4" />
                          )
                        )}
                      </td>
                      <td className={styles.adName}>{ad.adName || ad.id}</td>
                      <td className={styles.landingPage}>
                        {ad.landingPage ? (
                          <a href={ad.landingPage} target="_blank" rel="noopener noreferrer">
                            {(() => {
                              try {
                                return new URL(ad.landingPage).hostname;
                              } catch {
                                return ad.landingPage;
                              }
                            })()}
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td>${ad.spend}</td>
                      <td>${ad.cpa || 'N/A'}</td>
                      <td>N/A</td>
                      <td>{ad.hookRate || 'N/A'}%</td>
                      <td>{ad.holdRate || 'N/A'}%</td>
                      <td>{ad.type || 'N/A'}</td>
                      <td>{ad.duration || 'N/A'}s</td>
                      <td>{ad.productIntro || 'N/A'}s</td>
                      <td>N/A</td>
                      <td>{ad.creatorsUsed || 'N/A'}</td>
                      <td><Badge variant="secondary">{ad.angle || 'N/A'}</Badge></td>
                      <td><Badge variant="outline">{ad.format || 'N/A'}</Badge></td>
                      <td><Badge>{ad.emotion || 'N/A'}</Badge></td>
                      <td>{ad.framework || 'N/A'}</td>
                      <td>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`https://www.facebook.com/ads/manager/account/ads/?act=${ad.id}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>

          <div className={styles.dialogFooter}>
            <Button variant="outline" onClick={() => setShowAdSelector(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAdSelector(false)}>
              Confirm Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Concept Edit Dialog */}
      <Dialog open={!!editingConcept} onOpenChange={(open) => !open && setEditingConcept(null)}>
        <DialogContent className={styles.editDialog}>
          <DialogHeader>
            <DialogTitle>
              {editingConcept?.name === 'New Concept' ? 'Create New Concept' : 'Edit Concept'}
            </DialogTitle>
            <DialogDescription>
              Configure the creative concept details and target audience.
            </DialogDescription>
          </DialogHeader>
          
          {editingConcept && (
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <Label htmlFor="concept-name">Concept Name</Label>
                <Input
                  id="concept-name"
                  value={editingConcept.name}
                  onChange={(e) => setEditingConcept({ ...editingConcept, name: e.target.value })}
                  placeholder="Enter concept name"
                />
              </div>
              
              <div className={styles.formGroup}>
                <Label htmlFor="concept-description">Description</Label>
                <Textarea
                  id="concept-description"
                  value={editingConcept.description}
                  onChange={(e) => setEditingConcept({ ...editingConcept, description: e.target.value })}
                  placeholder="Describe the concept in detail..."
                  rows={4}
                />
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <Label htmlFor="concept-angle">Angle</Label>
                  <Select
                    value={editingConcept.angle}
                    onValueChange={(value) => setEditingConcept({ ...editingConcept, angle: value })}
                  >
                    <SelectTrigger id="concept-angle">
                      <SelectValue placeholder="Select angle" />
                    </SelectTrigger>
                    <SelectContent>
                      {(aiInstructions?.analysis_fields?.angle || []).map((angle) => (
                        <SelectItem key={angle.name} value={angle.name}>
                          {angle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className={styles.formGroup}>
                  <Label htmlFor="concept-emotion">Emotion</Label>
                  <Select
                    value={editingConcept.emotion}
                    onValueChange={(value) => setEditingConcept({ ...editingConcept, emotion: value })}
                  >
                    <SelectTrigger id="concept-emotion">
                      <SelectValue placeholder="Select emotion" />
                    </SelectTrigger>
                    <SelectContent>
                      {(aiInstructions?.analysis_fields?.emotion || []).map((emotion) => (
                        <SelectItem key={emotion.name} value={emotion.name}>
                          {emotion.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <Label htmlFor="concept-framework">Framework</Label>
                  <Select
                    value={editingConcept.framework}
                    onValueChange={(value) => setEditingConcept({ ...editingConcept, framework: value })}
                  >
                    <SelectTrigger id="concept-framework">
                      <SelectValue placeholder="Select framework" />
                    </SelectTrigger>
                    <SelectContent>
                      {(aiInstructions?.analysis_fields?.framework || []).map((framework) => (
                        <SelectItem key={framework.name} value={framework.name}>
                          {framework.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className={styles.formGroup}>
                  <Label htmlFor="concept-awareness">Awareness Level</Label>
                  <Select
                    value={editingConcept.awarenessLevel}
                    onValueChange={(value) => setEditingConcept({ ...editingConcept, awarenessLevel: value })}
                  >
                    <SelectTrigger id="concept-awareness">
                      <SelectValue placeholder="Select awareness level" />
                    </SelectTrigger>
                    <SelectContent>
                      {(aiInstructions?.awareness_levels || []).map((level) => (
                        <SelectItem key={level.name} value={level.name}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <Label htmlFor="concept-type">Type</Label>
                  <Select
                    value={editingConcept.type || ''}
                    onValueChange={(value) => setEditingConcept({ ...editingConcept, type: value })}
                  >
                    <SelectTrigger id="concept-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(aiInstructions?.analysis_fields?.type || []).map((type) => (
                        <SelectItem key={type.name} value={type.name}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className={styles.formGroup}>
                  <Label htmlFor="concept-format">Format</Label>
                  <Select
                    value={editingConcept.format || ''}
                    onValueChange={(value) => setEditingConcept({ ...editingConcept, format: value })}
                  >
                    <SelectTrigger id="concept-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      {(aiInstructions?.analysis_fields?.format || []).map((format) => (
                        <SelectItem key={format.name} value={format.name}>
                          {format.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <Label htmlFor="concept-persona">Target Persona</Label>
                <Select
                  value={editingConcept.targetPersona}
                  onValueChange={(value) => setEditingConcept({ ...editingConcept, targetPersona: value })}
                >
                  <SelectTrigger id="concept-persona">
                    <SelectValue placeholder="Select target persona" />
                  </SelectTrigger>
                  <SelectContent>
                    {(audienceResearchData?.personas || []).map((persona) => (
                      <SelectItem key={persona.id} value={persona.name}>
                        {persona.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <Label htmlFor="concept-duration">Duration (seconds)</Label>
                  <Input
                    id="concept-duration"
                    type="number"
                    value={editingConcept.duration || 30}
                    onChange={(e) => setEditingConcept({ ...editingConcept, duration: parseInt(e.target.value) || 30 })}
                    placeholder="30"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <Label htmlFor="concept-product-intro">Product Intro (seconds)</Label>
                  <Input
                    id="concept-product-intro"
                    type="number"
                    value={editingConcept.productIntroTime || 5}
                    onChange={(e) => setEditingConcept({ ...editingConcept, productIntroTime: parseInt(e.target.value) || 5 })}
                    placeholder="5"
                  />
                </div>
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <Label htmlFor="concept-sit-problem">Sit in Problem (seconds)</Label>
                  <Input
                    id="concept-sit-problem"
                    type="number"
                    value={editingConcept.sitInProblemTime || 10}
                    onChange={(e) => setEditingConcept({ ...editingConcept, sitInProblemTime: parseInt(e.target.value) || 10 })}
                    placeholder="10"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <Label htmlFor="concept-creators">Number of Creators</Label>
                  <Input
                    id="concept-creators"
                    type="number"
                    value={editingConcept.creatorsCount || 1}
                    onChange={(e) => setEditingConcept({ ...editingConcept, creatorsCount: parseInt(e.target.value) || 1 })}
                    placeholder="1"
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <Label htmlFor="concept-variables">Content Variables</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && editingConcept.contentVariables && !editingConcept.contentVariables.includes(value)) {
                      setEditingConcept({ 
                        ...editingConcept, 
                        contentVariables: [...(editingConcept.contentVariables || []), value] 
                      });
                    }
                  }}
                >
                  <SelectTrigger id="concept-variables">
                    <SelectValue placeholder="Add content variable" />
                  </SelectTrigger>
                  <SelectContent>
                    {(aiInstructions?.content_variables || []).map((variable) => (
                      <SelectItem key={variable.name} value={variable.name}>
                        {variable.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className={styles.selectedVariables}>
                  {(editingConcept.contentVariables || []).map((variable, idx) => (
                    <Badge key={idx} variant="secondary" className={styles.variableBadge}>
                      {variable}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={styles.removeVariable}
                        onClick={() => {
                          setEditingConcept({
                            ...editingConcept,
                            contentVariables: editingConcept.contentVariables?.filter((_, i) => i !== idx)
                          });
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className={styles.dialogActions}>
                <Button
                  variant="outline"
                  onClick={() => setEditingConcept(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (data) {
                      const isNew = editingConcept.id.startsWith('concept-')
                      const updatedConcepts = isNew
                        ? [...data.netNewConcepts, editingConcept as CreativeConcept]
                        : data.netNewConcepts.map(c => c.id === editingConcept.id ? editingConcept as CreativeConcept : c)
                      
                      setData({
                        ...data,
                        netNewConcepts: updatedConcepts
                      })
                    }
                    setEditingConcept(null)
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Concept
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Hook Edit Dialog */}
      <Dialog open={!!editingHook.hook} onOpenChange={(open) => !open && setEditingHook({ type: 'visual', hook: null })}>
        <DialogContent className={styles.editDialog}>
          <DialogHeader>
            <DialogTitle>
              {editingHook.hook?.hook === '' ? `Create New ${editingHook.type} Hook` : `Edit ${editingHook.type} Hook`}
            </DialogTitle>
            <DialogDescription>
              Create compelling {editingHook.type} hooks that grab attention and drive engagement.
            </DialogDescription>
          </DialogHeader>
          
          {editingHook.hook && (
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <Label htmlFor="hook-text">Hook Text</Label>
                <Textarea
                  id="hook-text"
                  value={editingHook.hook.hook}
                  onChange={(e) => setEditingHook({
                    ...editingHook,
                    hook: { ...editingHook.hook!, hook: e.target.value }
                  })}
                  placeholder={editingHook.type === 'visual' 
                    ? "Visual text overlay that appears on screen..."
                    : "Spoken words that grab attention in the first 3 seconds..."
                  }
                  rows={3}
                />
              </div>
              
              <div className={styles.formGroup}>
                <Label htmlFor="hook-rationale">Rationale</Label>
                <Textarea
                  id="hook-rationale"
                  value={editingHook.hook.rationale}
                  onChange={(e) => setEditingHook({
                    ...editingHook,
                    hook: { ...editingHook.hook!, rationale: e.target.value }
                  })}
                  placeholder="Why this hook will work for the target audience..."
                  rows={2}
                />
              </div>
              
              <div className={styles.formGroup}>
                <Label htmlFor="hook-concept">Link to Concept (Optional)</Label>
                <Select
                  value={editingHook.hook.conceptId || '__none__'}
                  onValueChange={(value) => setEditingHook({
                    ...editingHook,
                    hook: { ...editingHook.hook!, conceptId: value === '__none__' ? undefined : value }
                  })}
                >
                  <SelectTrigger id="hook-concept">
                    <SelectValue placeholder="Select related concept" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No concept link</SelectItem>
                    {(data?.netNewConcepts || []).map((concept) => (
                      <SelectItem key={concept.id} value={concept.id}>
                        {concept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className={styles.dialogActions}>
                <Button
                  variant="outline"
                  onClick={() => setEditingHook({ type: 'visual', hook: null })}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (data) {
                      const hookType = editingHook.type
                      const isNew = editingHook.hook!.id.startsWith('hook-')
                      const updatedHooks = isNew
                        ? [...(data.hooks[hookType] || []), editingHook.hook!]
                        : (data.hooks[hookType] || []).map(h => h.id === editingHook.hook!.id ? editingHook.hook! : h)
                      
                      setData({
                        ...data,
                        hooks: {
                          ...data.hooks,
                          [hookType]: updatedHooks
                        }
                      })
                    }
                    setEditingHook({ type: 'visual', hook: null })
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Hook
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Visual Edit Dialog */}
      <Dialog open={!!editingVisual} onOpenChange={(open) => !open && setEditingVisual(null)}>
        <DialogContent className={styles.editDialog}>
          <DialogHeader>
            <DialogTitle>
              {editingVisual?.description === '' ? 'Create New Visual' : 'Edit Visual'}
            </DialogTitle>
            <DialogDescription>
              Define the visual concept including type, scenes, and key elements.
            </DialogDescription>
          </DialogHeader>
          
          {editingVisual && (
            <div className={styles.editForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <Label htmlFor="visual-type">Visual Type</Label>
                  <Select
                    value={editingVisual.type}
                    onValueChange={(value) => setEditingVisual({ 
                      ...editingVisual, 
                      type: value as 'video' | 'static' | 'carousel' | 'gif' 
                    })}
                  >
                    <SelectTrigger id="visual-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="static">Static Image</SelectItem>
                      <SelectItem value="carousel">Carousel</SelectItem>
                      <SelectItem value="gif">GIF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className={styles.formGroup}>
                  <Label htmlFor="visual-duration">Duration (seconds)</Label>
                  <Input
                    id="visual-duration"
                    type="number"
                    value={editingVisual.duration || 30}
                    onChange={(e) => setEditingVisual({ ...editingVisual, duration: parseInt(e.target.value) || 30 })}
                    placeholder="30"
                    disabled={editingVisual.type !== 'video' && editingVisual.type !== 'gif'}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <Label htmlFor="visual-concept">Link to Concept (Optional)</Label>
                <Select
                  value={editingVisual.conceptId || '__none__'}
                  onValueChange={(value) => setEditingVisual({ 
                    ...editingVisual, 
                    conceptId: value === '__none__' ? undefined : value 
                  })}
                >
                  <SelectTrigger id="visual-concept">
                    <SelectValue placeholder="Select related concept" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No concept link</SelectItem>
                    {(data?.netNewConcepts || []).map((concept) => (
                      <SelectItem key={concept.id} value={concept.id}>
                        {concept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className={styles.formGroup}>
                <Label htmlFor="visual-description">Description</Label>
                <Textarea
                  id="visual-description"
                  value={editingVisual.description}
                  onChange={(e) => setEditingVisual({ ...editingVisual, description: e.target.value })}
                  placeholder="Describe the visual concept, shots, angles, and overall aesthetic..."
                  rows={4}
                />
              </div>
              
              <div className={styles.formGroup}>
                <Label htmlFor="visual-color">Color Scheme</Label>
                <Input
                  id="visual-color"
                  value={editingVisual.colorScheme}
                  onChange={(e) => setEditingVisual({ ...editingVisual, colorScheme: e.target.value })}
                  placeholder="e.g., Warm earth tones, Bright and energetic, Minimal white/blue"
                />
              </div>
              
              {editingVisual.type === 'video' && (
                <div className={styles.formGroup}>
                  <Label htmlFor="visual-scenes">Scenes (One per line)</Label>
                  <Textarea
                    id="visual-scenes"
                    value={editingVisual.scenes?.join('\n') || ''}
                    onChange={(e) => setEditingVisual({ 
                      ...editingVisual, 
                      scenes: e.target.value.split('\n').filter(s => s.trim()) 
                    })}
                    placeholder="Scene 1: Person waking up tired&#10;Scene 2: Taking the product&#10;Scene 3: Feeling energized"
                    rows={4}
                  />
                </div>
              )}
              
              <div className={styles.formGroup}>
                <Label htmlFor="visual-elements">Key Elements (Comma separated)</Label>
                <Input
                  id="visual-elements"
                  value={(editingVisual.keyElements || []).join(', ')}
                  onChange={(e) => setEditingVisual({ 
                    ...editingVisual, 
                    keyElements: e.target.value.split(',').map(e => e.trim()).filter(e => e) 
                  })}
                  placeholder="Product shot, Before/after, Testimonial overlay, Call-to-action text"
                />
              </div>
              
              <div className={styles.dialogActions}>
                <Button
                  variant="outline"
                  onClick={() => setEditingVisual(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (data) {
                      const isNew = editingVisual.id.startsWith('visual-')
                      const updatedVisuals = isNew
                        ? [...data.visuals, editingVisual as CreativeVisual]
                        : data.visuals.map(v => v.id === editingVisual.id ? editingVisual as CreativeVisual : v)
                      
                      setData({
                        ...data,
                        visuals: updatedVisuals
                      })
                    }
                    setEditingVisual(null)
                  }}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Visual
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Practice Edit Dialog */}
      <Dialog open={!!editingPractice} onOpenChange={(open) => !open && setEditingPractice(null)}>
        <DialogContent className={styles.editDialog}>
          <DialogHeader>
            <DialogTitle>
              {editingPractice?.index === -1 
                ? `Add New ${editingPractice?.type.replace(/([A-Z])/g, ' $1').trim()}`
                : `Edit ${editingPractice?.type.replace(/([A-Z])/g, ' $1').trim()}`
              }
            </DialogTitle>
            <DialogDescription>
              {editingPractice?.type === 'dos' && 'Best practices that should be followed for success'}
              {editingPractice?.type === 'donts' && 'Common mistakes to avoid'}
              {editingPractice?.type === 'keyLearnings' && 'Important insights from the data'}
              {editingPractice?.type === 'recommendations' && 'Strategic recommendations for future campaigns'}
            </DialogDescription>
          </DialogHeader>
          {editingPractice && (
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <Label htmlFor="practice-text">Content</Label>
                <Textarea
                  id="practice-text"
                  value={editingPractice.value}
                  onChange={(e) => setEditingPractice({ ...editingPractice, value: e.target.value })}
                  placeholder={
                    editingPractice.type === 'dos' ? 'e.g., Always lead with the problem before introducing the solution' :
                    editingPractice.type === 'donts' ? 'e.g., Avoid using technical jargon in the first 3 seconds' :
                    editingPractice.type === 'keyLearnings' ? 'e.g., Videos with testimonials convert 2x better than product demos' :
                    'e.g., Test more UGC-style content with authentic creators'
                  }
                  rows={4}
                />
              </div>
              <div className={styles.dialogActions}>
                <Button variant="outline" onClick={() => setEditingPractice(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (data && editingPractice && editingPractice.value.trim()) {
                      if (editingPractice.index === -1) {
                        // Adding new item
                        setData({
                          ...data,
                          creativeBestPractices: {
                            ...data.creativeBestPractices,
                            [editingPractice.type]: [...data.creativeBestPractices[editingPractice.type], editingPractice.value]
                          }
                        });
                      } else {
                        // Editing existing item
                        const updated = [...data.creativeBestPractices[editingPractice.type]];
                        updated[editingPractice.index] = editingPractice.value;
                        setData({
                          ...data,
                          creativeBestPractices: {
                            ...data.creativeBestPractices,
                            [editingPractice.type]: updated
                          }
                        });
                      }
                    }
                    setEditingPractice(null);
                  }}
                  disabled={!editingPractice.value.trim()}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingPractice.index === -1 ? 'Add' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Iteration Edit Dialog */}
      <Dialog open={!!editingIteration} onOpenChange={(open) => !open && setEditingIteration(null)}>
        <DialogContent className={styles.editDialog}>
          <DialogHeader>
            <DialogTitle>
              {editingIteration?.adName === '' ? 'Create New Iteration' : 'Edit Iteration'}
            </DialogTitle>
            <DialogDescription>
              Define iteration suggestions for improving ad performance.
            </DialogDescription>
          </DialogHeader>
          
          {editingIteration && (
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <Label htmlFor="iteration-ad">Select Ad</Label>
                <Select
                  value={editingIteration.adId}
                  onValueChange={(value) => {
                    const selectedAd = adAccountAuditData?.ads.find(ad => ad.id === value);
                    setEditingIteration({ 
                      ...editingIteration, 
                      adId: value,
                      adName: selectedAd?.adName || selectedAd?.id || ''
                    });
                  }}
                >
                  <SelectTrigger id="iteration-ad">
                    <SelectValue placeholder="Select an ad to iterate on" />
                  </SelectTrigger>
                  <SelectContent>
                    {(adAccountAuditData?.ads || []).map((ad) => (
                      <SelectItem key={ad.id} value={ad.id}>
                        {ad.adName || ad.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className={styles.formGroup}>
                <Label htmlFor="iteration-type">Iteration Type</Label>
                <Select
                  value={editingIteration.iterationType}
                  onValueChange={(value) => setEditingIteration({ 
                    ...editingIteration, 
                    iterationType: value as 'early' | 'script' | 'fine_tuning' | 'late' 
                  })}
                >
                  <SelectTrigger id="iteration-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="early">Early Iterations</SelectItem>
                    <SelectItem value="script">Script Iterations</SelectItem>
                    <SelectItem value="fine_tuning">Fine Tuning</SelectItem>
                    <SelectItem value="late">Late Iterations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className={styles.formGroup}>
                <Label htmlFor="iteration-suggestion">Suggestion</Label>
                <Textarea
                  id="iteration-suggestion"
                  value={editingIteration.suggestion}
                  onChange={(e) => setEditingIteration({ ...editingIteration, suggestion: e.target.value })}
                  placeholder="Describe the specific changes to make for this iteration..."
                  rows={4}
                />
              </div>
              
              <div className={styles.formGroup}>
                <Label htmlFor="iteration-impact">Expected Impact</Label>
                <Textarea
                  id="iteration-impact"
                  value={editingIteration.expectedImpact}
                  onChange={(e) => setEditingIteration({ ...editingIteration, expectedImpact: e.target.value })}
                  placeholder="What performance improvements do you expect from this iteration?"
                  rows={2}
                />
              </div>
              
              <div className={styles.dialogActions}>
                <Button
                  variant="outline"
                  onClick={() => setEditingIteration(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (data && editingIteration.adId && editingIteration.suggestion) {
                      const existingIndex = data.iterations.findIndex(i => 
                        i.adId === editingIteration.adId && i.iterationType === editingIteration.iterationType
                      );
                      
                      if (existingIndex >= 0) {
                        // Update existing
                        const updated = [...data.iterations];
                        updated[existingIndex] = editingIteration;
                        setData({ ...data, iterations: updated });
                      } else {
                        // Add new
                        setData({ ...data, iterations: [...data.iterations, editingIteration] });
                      }
                    }
                    setEditingIteration(null);
                  }}
                  disabled={!editingIteration.adId || !editingIteration.suggestion}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Iteration
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Expanded Asset Preview */}
      {expandedAsset && (
        <>
          <div 
            className={styles.assetPreviewOverlay} 
            onClick={() => setExpandedAsset(null)}
          />
          <img 
            src={expandedAsset} 
            alt="Expanded preview" 
            className={styles.assetPreviewExpanded}
            onClick={() => setExpandedAsset(null)}
          />
        </>
      )}
    </div>
  );
} 