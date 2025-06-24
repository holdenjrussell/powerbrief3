'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, RefreshCw, Trash2, ExternalLink, Image, Video, Sparkles, Play, X, AlertTriangle, Upload, BarChart3, PieChart as PieChartIcon, Users, MapPin, Settings, Plus, Edit, Trash, MessageSquare, Shield, Bot, Info, Code, Brain } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AdData {
  id: string;
  name: string;
  status: string;
  assetUrl: string;
  assetType: string;
  assetId: string;
  assetLoadFailed: boolean;
  manuallyUploaded?: boolean;
  landingPage: string;
  spend: string;
  impressions: number;
  cpa: string;
  roas: string;
  purchaseRevenue: string;
  hookRate: string;
  holdRate: string;
  purchases: number;
  video3s: number;
  video25: number;
  video50: number;
  video75: number;
  video100: number;
  campaignName: string;
  adsetName: string;
  creativeTitle: string;
  creativeBody: string;
  // Creative preview fields
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  videoId?: string | null;
  // Gemini analysis fields
  type?: string | null;
  adDuration?: number | string | null;
  productIntro?: number | string | null;
  sitInProblemSeconds?: number | null;
  sitInProblem?: string | null;
  sitInProblemPercent?: number | null;
  creatorsUsed?: number | null;
  angle?: string | null;
  format?: string | null;
  emotion?: string | null;
  framework?: string | null;
  awarenessLevel?: string | null;
  contentVariables?: string | null;
  transcription?: string | null;
  visualDescription?: string | null;
}

interface AdAccountAuditDashboardProps {
  onesheetId: string;
  brandId: string;
  initialData?: {
    ad_account_audit?: {
      ads?: AdData[];
      demographicBreakdown?: {
        age: Record<string, number>;
        gender: Record<string, number>;
        placement: Record<string, number>;
      };
      lastImported?: string;
      dateRange?: string;
      totalAdsImported?: number;
      importMethod?: string;
    };
  };
}

export function AdAccountAuditDashboard({ onesheetId, brandId, initialData }: AdAccountAuditDashboardProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [dateRange, setDateRange] = useState('last_30d');
  const [maxAds, setMaxAds] = useState(100);
  const [auditData, setAuditData] = useState<typeof initialData['ad_account_audit'] | null>(initialData?.ad_account_audit || null);
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
  const [selectedVideo, setSelectedVideo] = useState<{ videoId: string; thumbnailUrl: string; adName: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ imageUrl: string; adName: string } | null>(null);
  const [uploadingAd, setUploadingAd] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState<{ adId: string; adName: string } | null>(null);
  const [activeTab, setActiveTab] = useState('data');
  const [aiInstructions, setAiInstructions] = useState<{
    contentVariables: Array<{ name: string; description: string }>;
    awarenessLevels: Array<{ name: string; description: string }>;
    discoveredContentVariables: Array<{ name: string; description: string }>;
    discoveredAwarenessLevels: Array<{ name: string; description: string }>;
    returnMultiple: boolean;
    selectionGuidance: string;
    allowNewContentVariables: boolean;
    allowNewAwarenessLevels: boolean;
    mainAnalysisPrompt?: string;
    contentVariablesPrompt?: string;
    awarenessLevelsPrompt?: string;
    typePrompt?: string;
    adDurationPrompt?: string;
    productIntroPrompt?: string;
    creatorsUsedPrompt?: string;
    sitInProblemSecondsPrompt?: string;
    sitInProblemPrompt?: string;
    anglePrompt?: string;
    formatPrompt?: string;
    emotionPrompt?: string;
    frameworkPrompt?: string;
    transcriptionPrompt?: string;
    visualDescriptionPrompt?: string;
    analysisFields: {
      type: Array<{ name: string; description: string }>;
      angle: Array<{ name: string; description: string }>;
      format: Array<{ name: string; description: string }>;
      emotion: Array<{ name: string; description: string }>;
      framework: Array<{ name: string; description: string }>;
    };
    allowNewAnalysisValues: {
      type: boolean;
      angle: boolean;
      format: boolean;
      emotion: boolean;
      framework: boolean;
    };
    systemInstructions?: string;
    masterPromptTemplate?: string;
    responseSchema?: {
      type: string;
      properties: Record<string, {
        type: string;
        format?: string;
        description: string;
        example: string | number;
      }>;
      required: string[];
    };
    // Strategist fields
    benchmarkRoas?: number;
    benchmarkHookRate?: number;
    benchmarkHoldRate?: number;
    benchmarkSpend?: number;
    strategistSystemInstructions?: string;
    strategistPromptTemplate?: string;
    strategistResponseSchema?: Record<string, unknown>;
  }>({
    contentVariables: [],
    awarenessLevels: [],
    discoveredContentVariables: [],
    discoveredAwarenessLevels: [],
    returnMultiple: false,
    selectionGuidance: "When multiple variables are present, prioritize the most prominent or impactful element in the ad.",
    allowNewContentVariables: true,
    allowNewAwarenessLevels: true,
    mainAnalysisPrompt: undefined,
    contentVariablesPrompt: undefined,
    awarenessLevelsPrompt: undefined,
    typePrompt: undefined,
    adDurationPrompt: "For videos, provide the exact duration in seconds. For images, return 'N/A'.",
    productIntroPrompt: "For videos, identify when the product is first shown or mentioned in seconds. For images, return 'N/A'.",
    creatorsUsedPrompt: "Count the number of distinct people visible in the ad. Include speakers, presenters, and featured individuals. Do not count background people or crowds.",
    sitInProblemSecondsPrompt: "For videos, identify the total duration in seconds that the ad spends agitating or discussing the problem before introducing the solution. For images, return 0.",
    sitInProblemPrompt: "Calculate as (sitInProblemSeconds / adDuration * 100) and format as a percentage string with % symbol",
    anglePrompt: undefined,
    formatPrompt: undefined,
    emotionPrompt: undefined,
    frameworkPrompt: undefined,
    transcriptionPrompt: "For videos: provide a timecoded transcript with timestamps in [MM:SS] format. For images: any visible text/captions only.",
    visualDescriptionPrompt: "For videos: detailed description of visual elements. For images: comprehensive description including hex color codes.",
    analysisFields: {
      type: [
        { name: "High Production Video", description: "Professional, high-quality video production with studio lighting, multiple camera angles, or polished editing" },
        { name: "Low Production Video (UGC)", description: "User-generated content style with casual, authentic, smartphone-quality production" },
        { name: "Static Image", description: "Single image creative without motion or animation" },
        { name: "Carousel", description: "Multiple images or cards that users can swipe through" },
        { name: "GIF", description: "Animated image with looping motion" }
      ],
      angle: [
        { name: "Weight Management", description: "Focus on weight loss, fat burning, or body composition changes" },
        { name: "Time/Convenience", description: "Emphasis on saving time, easy preparation, or convenience" },
        { name: "Energy/Focus", description: "Highlighting increased energy levels, mental clarity, or focus" },
        { name: "Digestive Health", description: "Focus on gut health, bloating reduction, or digestive comfort" },
        { name: "Immunity Support", description: "Emphasizing immune system support and overall health" }
      ],
      format: [
        { name: "Testimonial", description: "Customer sharing their personal experience or results" },
        { name: "Podcast Clip", description: "Excerpt from a podcast or interview-style content" },
        { name: "Authority Figure", description: "Expert, doctor, or authority figure explaining benefits" },
        { name: "3 Reasons Why", description: "Structured list format explaining multiple benefits" },
        { name: "Unboxing", description: "Product reveal or unboxing experience" }
      ],
      emotion: [
        { name: "Hopefulness", description: "Inspiring optimism and positive expectations for the future" },
        { name: "Excitement", description: "Creating enthusiasm and anticipation" },
        { name: "Curiosity", description: "Sparking interest and desire to learn more" },
        { name: "Urgency", description: "Creating time pressure or fear of missing out" },
        { name: "Fear", description: "Highlighting problems or negative consequences" },
        { name: "Trust", description: "Building credibility and reliability" }
      ],
      framework: [
        { name: "PAS", description: "Problem-Agitate-Solution structure" },
        { name: "AIDA", description: "Attention-Interest-Desire-Action framework" },
        { name: "FAB", description: "Features-Advantages-Benefits approach" },
        { name: "Star Story Solution", description: "Hero's journey narrative structure" },
        { name: "Before After Bridge", description: "Current state to desired state transformation" }
      ]
    },
    allowNewAnalysisValues: {
      type: true,
      angle: true,
      format: true,
      emotion: true,
      framework: true
    },
    systemInstructions: 'You are a top creative strategist at a multi-million dollar per year ecommerce brand. You spend all day analyzing video and image advertisements, categorizing them, labeling them, and identifying trends to help brands produce more concepts and more winners. You have an exceptional eye for detail and can quickly identify what makes an ad successful. Your analysis is data-driven, precise, and actionable.',
    responseSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'The category of the video production.', example: 'High Production Video' },
        adDuration: { type: 'number', format: 'float', description: 'The total duration of the ad in seconds.', example: 32.5 },
        productIntro: { type: 'number', format: 'float', description: 'The timestamp in seconds when the product is introduced.', example: 3.1 },
        sitInProblemSeconds: { type: 'number', format: 'float', description: 'The total duration in seconds that the ad spends on problem agitation.', example: 8.5 },
        sitInProblem: { type: 'string', description: 'The percentage of the ad duration that focuses on the problem.', example: '25.0%' },
        creatorsUsed: { type: 'integer', description: 'The number of creators featured in the ad.', example: 1 },
        angle: { type: 'string', description: 'The primary marketing angle or theme of the ad.', example: 'Weight Management' },
        format: { type: 'string', description: 'The format of the ad.', example: 'Testimonial' },
        emotion: { type: 'string', description: 'The dominant emotion conveyed in the ad.', example: 'Hopefulness' },
        framework: { type: 'string', description: 'The marketing or storytelling framework used.', example: 'PAS' },
        awarenessLevel: { type: 'string', description: 'The target audience\'s level of awareness.', example: 'Problem Aware' },
        contentVariables: { type: 'string', description: 'Specific elements or variables included in the content.', example: 'Product Demo' },
        transcription: { type: 'string', description: 'The full transcription of the ad\'s audio.', example: '[00:01] Have you ever felt...' },
        visualDescription: { type: 'string', description: 'A description of the visual elements in the ad.', example: 'A woman is sitting at her desk, looking tired. The color palette is muted with blue and grey tones. Primary hex code: #B0C4DE.' }
      },
      required: ['type', 'adDuration', 'productIntro', 'sitInProblemSeconds', 'sitInProblem', 'creatorsUsed', 
                'angle', 'format', 'emotion', 'framework', 'awarenessLevel', 
                'contentVariables', 'transcription', 'visualDescription']
    },
    benchmarkRoas: 2.0,
    benchmarkHookRate: 3.0,
    benchmarkHoldRate: 50.0,
    benchmarkSpend: 100.0,
    strategistSystemInstructions: undefined,
    strategistPromptTemplate: undefined,
    strategistResponseSchema: undefined
  });
  const [isLoadingInstructions, setIsLoadingInstructions] = useState(false);
  const [isRunningStrategist, setIsRunningStrategist] = useState(false);
  const [strategistOpinion, setStrategistOpinion] = useState<{
    summary: string;
    topPerformers: Array<{
      adId: string;
      adName: string;
      spend: number;
      roas: number;
      keySuccessFactors: string[];
    }>;
    worstPerformers: Array<{
      adId: string;
      adName: string;
      spend: number;
      roas: number;
      failureReasons: string[];
    }>;
    creativePatterns: {
      winningElements: string[];
      losingElements: string[];
      optimalSitInProblemRange: string;
      bestPerformingHooks: string[];
    };
    recommendations: Array<{
      priority: 'high' | 'medium' | 'low';
      recommendation: string;
      expectedImpact: string;
    }>;
    analyzedAt: string;
    totalAdsAnalyzed: number;
  } | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

  const ads: AdData[] = auditData?.ads || [];
  const hasAds = ads.length > 0;
  const needsAnalysis = ads.some(ad => !ad.angle);
  const analyzedCount = ads.filter(ad => ad.angle).length;

  useEffect(() => {
    if (!initialData) {
      loadAuditData();
    }
    loadAiInstructions();
  }, [onesheetId]);

  const loadAuditData = async () => {
    try {
      const { data, error } = await supabase
        .from('onesheet')
        .select('ad_account_audit, ai_strategist_opinion')
        .eq('id', onesheetId)
        .single();
      
      if (error) throw error;
      
      if (data?.ad_account_audit) {
        setAuditData(data.ad_account_audit);
      }
      
      if (data?.ai_strategist_opinion) {
        setStrategistOpinion(data.ai_strategist_opinion);
      }
    } catch (error) {
      console.error('Error loading audit data:', error);
      toast({
        title: "Error",
        description: "Failed to load audit data",
        variant: "destructive"
      });
    }
  };

  const loadAiInstructions = async () => {
    setIsLoadingInstructions(true);
    try {
      const response = await fetch(`/api/onesheet/ai-instructions?onesheet_id=${onesheetId}`);
      if (!response.ok) throw new Error('Failed to load AI instructions');
      
      const result = await response.json();
      const instructions = result.data;
      
      setAiInstructions(prev => ({
        ...prev,
        contentVariables: instructions.content_variables || [],
        awarenessLevels: instructions.awareness_levels || [],
        discoveredContentVariables: instructions.discovered_content_variables || [],
        discoveredAwarenessLevels: instructions.discovered_awareness_levels || [],
        returnMultiple: instructions.content_variables_return_multiple || false,
        selectionGuidance: instructions.content_variables_selection_guidance || "When multiple variables are present, prioritize the most prominent or impactful element in the ad.",
        allowNewContentVariables: instructions.content_variables_allow_new !== false,
        allowNewAwarenessLevels: instructions.awareness_levels_allow_new !== false,
        mainAnalysisPrompt: instructions.main_analysis_prompt || undefined,
        contentVariablesPrompt: instructions.content_variables_prompt || undefined,
        awarenessLevelsPrompt: instructions.awareness_levels_prompt || undefined,
        typePrompt: instructions.type_prompt || undefined,
        adDurationPrompt: instructions.ad_duration_prompt || "For videos, provide the exact duration in seconds. For images, return 'N/A'.",
        productIntroPrompt: instructions.product_intro_prompt || "For videos, identify when the product is first shown or mentioned in seconds. For images, return 'N/A'.",
        creatorsUsedPrompt: instructions.creators_used_prompt || "Count the number of distinct people visible in the ad. Include speakers, presenters, and featured individuals. Do not count background people or crowds.",
        sitInProblemSecondsPrompt: instructions.sit_in_problem_seconds_prompt || "For videos, identify the total duration in seconds that the ad spends agitating or discussing the problem before introducing the solution. For images, return 0.",
        sitInProblemPrompt: instructions.sit_in_problem_prompt || "Calculate as (sitInProblemSeconds / adDuration * 100) and format as a percentage string with % symbol",
        anglePrompt: instructions.angle_prompt || undefined,
        formatPrompt: instructions.format_prompt || undefined,
        emotionPrompt: instructions.emotion_prompt || undefined,
        frameworkPrompt: instructions.framework_prompt || undefined,
        transcriptionPrompt: instructions.transcription_prompt || "For videos: provide a timecoded transcript with timestamps in [MM:SS] format. For images: any visible text/captions only.",
        visualDescriptionPrompt: instructions.visual_description_prompt || "For videos: detailed description of visual elements. For images: comprehensive description including hex color codes.",
        analysisFields: {
          type: instructions.analysis_fields?.type || prev.analysisFields.type,
          angle: instructions.analysis_fields?.angle || prev.analysisFields.angle,
          format: instructions.analysis_fields?.format || prev.analysisFields.format,
          emotion: instructions.analysis_fields?.emotion || prev.analysisFields.emotion,
          framework: instructions.analysis_fields?.framework || prev.analysisFields.framework
        },
        allowNewAnalysisValues: {
          type: instructions.allow_new_analysis_values?.type !== false,
          angle: instructions.allow_new_analysis_values?.angle !== false,
          format: instructions.allow_new_analysis_values?.format !== false,
          emotion: instructions.allow_new_analysis_values?.emotion !== false,
          framework: instructions.allow_new_analysis_values?.framework !== false
        },
        systemInstructions: instructions.system_instructions || 'You are a top creative strategist at a multi-million dollar per year ecommerce brand. You spend all day analyzing video and image advertisements, categorizing them, labeling them, and identifying trends to help brands produce more concepts and more winners. You have an exceptional eye for detail and can quickly identify what makes an ad successful. Your analysis is data-driven, precise, and actionable.',
        masterPromptTemplate: instructions.master_prompt_template || 'Loading master prompt template...',
        responseSchema: instructions.response_schema || {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'The category of the video production.', example: 'High Production Video' },
            adDuration: { type: 'number', format: 'float', description: 'The total duration of the ad in seconds.', example: 32.5 },
            productIntro: { type: 'number', format: 'float', description: 'The timestamp in seconds when the product is introduced.', example: 3.1 },
            sitInProblemSeconds: { type: 'number', format: 'float', description: 'The total duration in seconds that the ad spends on problem agitation.', example: 8.5 },
            sitInProblem: { type: 'string', description: 'The percentage of the ad duration that focuses on the problem.', example: '25.0%' },
            creatorsUsed: { type: 'integer', description: 'The number of creators featured in the ad.', example: 1 },
            angle: { type: 'string', description: 'The primary marketing angle or theme of the ad.', example: 'Weight Management' },
            format: { type: 'string', description: 'The format of the ad.', example: 'Testimonial' },
            emotion: { type: 'string', description: 'The dominant emotion conveyed in the ad.', example: 'Hopefulness' },
            framework: { type: 'string', description: 'The marketing or storytelling framework used.', example: 'PAS' },
            awarenessLevel: { type: 'string', description: 'The target audience\'s level of awareness.', example: 'Problem Aware' },
            contentVariables: { type: 'string', description: 'Specific elements or variables included in the content.', example: 'Product Demo' },
            transcription: { type: 'string', description: 'The full transcription of the ad\'s audio.', example: '[00:01] Have you ever felt...' },
            visualDescription: { type: 'string', description: 'A description of the visual elements in the ad.', example: 'A woman is sitting at her desk, looking tired. The color palette is muted with blue and grey tones. Primary hex code: #B0C4DE.' }
          },
          required: ['type', 'adDuration', 'productIntro', 'sitInProblemSeconds', 'sitInProblem', 'creatorsUsed', 
                    'angle', 'format', 'emotion', 'framework', 'awarenessLevel', 
                    'contentVariables', 'transcription', 'visualDescription']
        },
        // Load strategist fields
        benchmarkRoas: instructions.benchmark_roas || 2.0,
        benchmarkHookRate: instructions.benchmark_hook_rate || 3.0,
        benchmarkHoldRate: instructions.benchmark_hold_rate || 50.0,
        benchmarkSpend: instructions.benchmark_spend || 100.0,
        strategistSystemInstructions: instructions.strategist_system_instructions || undefined,
        strategistPromptTemplate: instructions.strategist_prompt_template || undefined,
        strategistResponseSchema: instructions.strategist_response_schema || undefined
      }));
    } catch (error) {
      console.error('Error loading AI instructions:', error);
      toast({
        title: "Error",
        description: "Failed to load AI instructions",
        variant: "destructive"
      });
    } finally {
      setIsLoadingInstructions(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    
    // Faster progress simulation tied to actual fetching process
    const progressTimer = setInterval(() => {
      setImportProgress(prev => {
        // Quick initial progress for tier setup
        if (prev < 5) return Math.min(prev + 2, 5); // Setup: 0-5%
        // Fast progress for first tier ($20k+)
        if (prev < 15) return Math.min(prev + 1.5, 15); // Tier 1: 5-15%
        // Medium progress for second tier ($10k+)
        if (prev < 35) return Math.min(prev + 2, 35); // Tier 2: 15-35%
        // Medium progress for third tier ($5k+)
        if (prev < 55) return Math.min(prev + 2, 55); // Tier 3: 35-55%
        // Fast progress for fourth tier ($1k+)
        if (prev < 70) return Math.min(prev + 1.5, 70); // Tier 4: 55-70%
        // Medium progress for final tier and asset processing
        if (prev < 90) return Math.min(prev + 0.8, 90); // Final tier + assets: 70-90%
        // Stay at 90% until completion
        return prev;
      });
    }, 500); // Faster interval for quicker progress

    try {
      const response = await fetch('/api/onesheet/ad-audit/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          onesheet_id: onesheetId,
          date_range: dateRange,
          max_ads: maxAds
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import ads');
      }

      const result = await response.json();
      
      // Complete progress
      clearInterval(progressTimer);
      setImportProgress(100);
      
      // Brief delay to show 100% before hiding
      setTimeout(() => {
        setImportProgress(0);
      }, 1500);
      
      toast({
        title: "Success",
        description: `Successfully imported ${result.data.adsImported} ads`
      });
      
      // Refresh the data
      await loadAuditData();
    } catch (error) {
      clearInterval(progressTimer);
      setImportProgress(0);
      console.error('Error importing ads:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to import ads',
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/onesheet/ad-audit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          onesheet_id: onesheetId,
          ad_ids: selectedAds.size > 0 ? Array.from(selectedAds) : undefined
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze ads');
      }

      const result = await response.json();
      
      console.log('Analyze response:', result); // Debug logging
      
      toast({
        title: "Success",
        description: `Successfully analyzed ${result.data?.adsAnalyzed || 0} ads`
      });
      
      // Refresh the data
      await loadAuditData();
    } catch (error) {
      console.error('Error analyzing ads:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to analyze ads',
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all ad data? AI instructions will be preserved.')) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch('/api/onesheet/ad-audit/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onesheet_id: onesheetId }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear data');
      }

      toast({
        title: "Success",
        description: "Ad data cleared successfully. AI instructions preserved."
      });
      
      // Reload the audit data (AI instructions are preserved on the server)
      await loadAuditData();
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to clear data',
        variant: "destructive"
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleUploadAsset = async (file: File, adId: string) => {
    if (!file || !adId) return;

    setUploadingAd(adId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('onesheetId', onesheetId);
      formData.append('adId', adId);
      formData.append('brandId', brandId);

      const response = await fetch('/api/onesheet/ad-audit/upload-asset', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      
      toast({
        title: "Asset uploaded successfully",
        description: `New ${result.data.assetType} uploaded and ready for AI analysis`,
      });

      // Refresh the data
      await loadAuditData();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload asset",
        variant: "destructive",
      });
    } finally {
      setUploadingAd(null);
      setShowUploadDialog(null);
    }
  };

  const handleExport = () => {
    if (!ads.length) return;

    const headers = [
      'Ad Name',
      'Landing Page',
      'Spend',
      'CPA',
      'ROAS',
      'Website Purchase Revenue',
      'Hook Rate',
      'Hold Rate',
      'Type',
      'Ad Duration',
      'Product Intro',
      'Sit in Problem (s)',
      'Sit in Problem %',
      'Creators Used',
      'Angle',
      'Format',
      'Emotion',
      'Framework',
      'Transcription',
      'Visual Description'
    ];

    const rows = ads.map(ad => [
      ad.name,
      ad.landingPage,
      `$${ad.spend}`,
      `$${ad.cpa}`,
      ad.roas,
      `$${ad.purchaseRevenue || '0.00'}`,
      `${ad.hookRate}%`,
      `${ad.holdRate}%`,
      ad.type || '',
      ad.adDuration ? `${ad.adDuration}s` : '',
      ad.productIntro ? `${ad.productIntro}s` : '',
      ad.sitInProblemSeconds !== undefined && ad.sitInProblemSeconds !== null ? `${ad.sitInProblemSeconds}s` : '',
      ad.sitInProblem || '',
      ad.creatorsUsed || '',
      ad.angle || '',
      ad.format || '',
      ad.emotion || '',
      ad.framework || '',
      ad.transcription || '',
      ad.visualDescription || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `&quot;${cell}&quot;`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ad-audit-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleAdSelection = (adId: string) => {
    const newSelection = new Set(selectedAds);
    if (newSelection.has(adId)) {
      newSelection.delete(adId);
    } else {
      newSelection.add(adId);
    }
    setSelectedAds(newSelection);
  };

  const selectAll = () => {
    if (selectedAds.size === ads.length) {
      setSelectedAds(new Set());
    } else {
      setSelectedAds(new Set(ads.map(ad => ad.id)));
    }
  };

  const handleRunStrategist = async () => {
    if (!ads.length || !analyzedCount) {
      toast({
        title: "No analyzed ads",
        description: "Please analyze your ads first before running the AI strategist",
        variant: "destructive"
      });
      return;
    }

    setIsRunningStrategist(true);
    try {
      const response = await fetch('/api/onesheet/ad-audit/strategist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          onesheet_id: onesheetId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run strategist analysis');
      }

      const result = await response.json();
      
      setStrategistOpinion(result.data);
      
      toast({
        title: "Strategist Analysis Complete",
        description: `Analyzed ${result.data.totalAdsAnalyzed} ads and identified ${result.data.topPerformers.length} top performers`
      });
      
      // Refresh the data to get the saved strategist opinion
      await loadAuditData();
    } catch (error) {
      console.error('Error running strategist:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to run strategist analysis',
        variant: "destructive"
      });
    } finally {
      setIsRunningStrategist(false);
    }
  };

  // Calculate demographic data with null safety
  const demographicData = {
    age: auditData?.demographicBreakdown?.age || {},
    gender: auditData?.demographicBreakdown?.gender || {},
    placement: auditData?.demographicBreakdown?.placement || {}
  };

  if (isImporting || isAnalyzing || isClearing) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">
            {isImporting ? 'Importing ads...' : isAnalyzing ? 'Analyzing ads...' : 'Clearing data...'}
          </p>
          {isImporting && importProgress > 0 && (
            <div className="w-64 mx-auto">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>
                  {importProgress < 5 ? 'Setting up...' :
                   importProgress < 15 ? 'Fetching tier 1 ($20k+)' :
                   importProgress < 35 ? 'Fetching tier 2 ($10k+)' :
                   importProgress < 55 ? 'Fetching tier 3 ($5k+)' :
                   importProgress < 70 ? 'Fetching tier 4 ($1k+)' :
                   importProgress < 90 ? 'Processing assets...' :
                   'Finalizing...'}
                </span>
                <span>{Math.round(importProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-full">
                  <BarChart3 className="h-5 w-5" />
                </div>
                Ad Account Audit
              </CardTitle>
              <CardDescription className="text-emerald-100">
                Import and analyze your ad performance data
                {hasAds && needsAnalysis && (
                  <span className="text-amber-200 ml-2 font-semibold">
                    ({analyzedCount}/{ads.length} ads analyzed)
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!hasAds ? (
                <>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40 bg-white text-gray-900 border border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last_7d">Last 7 days</SelectItem>
                      <SelectItem value="last_14d">Last 14 days</SelectItem>
                      <SelectItem value="last_30d">Last 30 days</SelectItem>
                      <SelectItem value="last_90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="max-ads" className="text-xs text-emerald-200">Max Ads</Label>
                    <Input
                      id="max-ads"
                      type="number"
                      min={10}
                      max={1000}
                      value={maxAds}
                      onChange={(e) => setMaxAds(Math.min(Math.max(parseInt(e.target.value) || 100, 10), 1000))}
                      className="w-20 h-8 text-sm bg-white text-gray-900"
                      placeholder="100"
                    />
                  </div>
                  <Button onClick={handleImport} disabled={isImporting} className="bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200">
                    <RefreshCw className={`mr-2 h-4 w-4 ${isImporting ? 'animate-spin' : ''}`} />
                    Import Ads
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing} 
                    variant={needsAnalysis ? "default" : "outline"}
                    className={`${needsAnalysis ? "animate-pulse bg-white text-emerald-700 hover:bg-emerald-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 bg-white"}`}
                  >
                    <Sparkles className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    {isAnalyzing ? 'Analyzing...' : needsAnalysis ? 'Analyze with AI' : 'Re-analyze'}
                    {selectedAds.size > 0 && ` (${selectedAds.size})`}
                  </Button>
                  {analyzedCount > 0 && (
                    <Button 
                      onClick={handleRunStrategist} 
                      disabled={isRunningStrategist} 
                      variant="outline"
                      className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 bg-white"
                    >
                      <Brain className={`mr-2 h-4 w-4 ${isRunningStrategist ? 'animate-spin' : ''}`} />
                      {isRunningStrategist ? 'Analyzing...' : 'AI Strategist'}
                      {strategistOpinion && ' ✓'}
                    </Button>
                  )}
                  <Button onClick={handleExport} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 bg-white">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  {hasAds && (
                    <Button 
                      onClick={handleClear} 
                      disabled={isClearing} 
                      className="!bg-red-500 hover:!bg-red-600 disabled:!bg-red-400 disabled:hover:!bg-red-400 !text-white !border-red-500 hover:!border-red-600 disabled:!border-red-400"
                      style={{
                        backgroundColor: isClearing ? '#f87171' : '#ef4444',
                        borderColor: isClearing ? '#f87171' : '#ef4444',
                        color: 'white'
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isClearing ? 'Clearing...' : 'Clear Data'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Info Banner for AI Analysis */}
      {hasAds && needsAnalysis && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-800">
                Click &quot;Analyze with AI&quot; to extract creative attributes like Type, Duration, Angle, Format, Emotion, Framework, Transcript/Text, and Visual Description (with hex colors for images) from your ads.
                {selectedAds.size > 0 && ` You have ${selectedAds.size} ads selected for analysis.`}
                <br />
                <span className="text-xs text-amber-700 mt-1 inline-block">
                  Red flags (🔺) on assets indicate they failed to download to Supabase and are using Meta fallback URLs.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Assets Help Banner */}
      {hasAds && ads.some(ad => ad.assetLoadFailed) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="text-sm text-red-800">
                <p className="font-semibold mb-1">Asset Upload Required</p>
                <p>
                  Rows highlighted in red have assets that failed to download. Click the blue upload button (📤) on these rows to manually upload the video or image files for better AI analysis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content with Tabs */}
      {hasAds && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="data" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Data Table
            </TabsTrigger>
            <TabsTrigger value="visualizations" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Visualizations
            </TabsTrigger>
            <TabsTrigger value="ai-instructions" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              AI Instructions
            </TabsTrigger>
            <TabsTrigger value="strategist" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Strategist
              {strategistOpinion && <span className="ml-1 text-xs">✓</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedAds.size === ads.length}
                        onChange={selectAll}
                        className="rounded"
                        aria-label="Select all ads"
                      />
                    </th>
                    <th className="p-2 text-left">Asset</th>
                    <th className="p-2 text-left bg-red-50 min-w-[100px]">Video ID (Debug)</th>
                    <th className="p-2 text-left min-w-[200px]">Ad Name</th>
                    <th className="p-2 text-left min-w-[200px]">Landing Page</th>
                    <th className="p-2 text-right">Spend</th>
                    <th className="p-2 text-right">CPA</th>
                    <th className="p-2 text-right">ROAS</th>
                    <th className="p-2 text-right">Website Purchase Revenue</th>
                    <th className="p-2 text-right">Hook Rate</th>
                    <th className="p-2 text-right">Hold Rate</th>
                    <th className="p-2 text-left bg-blue-50">Type</th>
                    <th className="p-2 text-right bg-blue-50">Duration</th>
                    <th className="p-2 text-right bg-blue-50">Product Intro</th>
                    <th className="p-2 text-right bg-blue-50">Sit in Problem (s)</th>
                    <th className="p-2 text-right bg-blue-50">Sit in Problem %</th>
                    <th className="p-2 text-right bg-blue-50">Creators</th>
                    <th className="p-2 text-left bg-green-50">Angle</th>
                    <th className="p-2 text-left bg-green-50">Awareness Level</th>
                    <th className="p-2 text-left bg-green-50">Content Variables</th>
                    <th className="p-2 text-left bg-green-50">Format</th>
                    <th className="p-2 text-left bg-green-50">Emotion</th>
                    <th className="p-2 text-left bg-green-50">Framework</th>
                    <th className="p-2 text-left bg-purple-50 min-w-[300px]">Transcript/Text</th>
                    <th className="p-2 text-left bg-orange-50 min-w-[350px]">Visual Description</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad, index) => (
                    <tr key={ad.id} className={`border-b hover:bg-muted/30 ${ad.assetLoadFailed ? 'bg-red-50 hover:bg-red-100' : (index % 2 === 0 ? 'bg-white' : 'bg-muted/10')}`}>
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedAds.has(ad.id)}
                          onChange={() => toggleAdSelection(ad.id)}
                          className="rounded"
                          aria-label={`Select ${ad.name}`}
                        />
                      </td>
                      <td className="p-2">
                        <div className="relative">
                          <div 
                            className="relative w-16 h-12 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center group cursor-pointer"
                            onClick={() => {
                            if (ad.videoId && (ad.thumbnailUrl || ad.imageUrl)) {
                              // Open video in modal
                              setSelectedVideo({
                                videoId: ad.videoId,
                                thumbnailUrl: ad.assetUrl || ad.thumbnailUrl || ad.imageUrl || '', // Use assetUrl (Supabase stored) first
                                adName: ad.name
                              });
                            } else if (ad.thumbnailUrl || ad.imageUrl) {
                              // Open image in modal
                              setSelectedImage({
                                imageUrl: ad.assetUrl || ad.imageUrl || ad.thumbnailUrl || '', // Use assetUrl (Supabase stored) first
                                adName: ad.name
                              });
                            }
                          }}
                        >
                          {ad.thumbnailUrl || ad.imageUrl ? (
                            <>
                              <img
                                src={ad.thumbnailUrl || ad.imageUrl || ''}
                                alt={`Preview of ${ad.name}`}
                                className="w-full h-full object-cover transition-opacity group-hover:opacity-80"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (nextElement) {
                                    nextElement.style.display = 'flex';
                                  }
                                }}
                              />
                              <div className="hidden w-full h-full items-center justify-center">
                                {ad.assetType === 'video' ? (
                                  <Video className="h-6 w-6 text-blue-500" />
                                ) : (
                                  <Image className="h-6 w-6 text-green-500" />
                                )}
                              </div>
                              {/* Play overlay for videos */}
                              {ad.videoId && (
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                                  <div className="bg-white bg-opacity-90 rounded-full p-1.5 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                                    <Play className="h-3 w-3 text-blue-600 fill-current" />
                                  </div>
                                </div>
                              )}
                              {/* Image overlay for images */}
                              {!ad.videoId && (ad.thumbnailUrl || ad.imageUrl) && (
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                                  <div className="bg-white bg-opacity-90 rounded-full p-1.5 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                                    <Image className="h-3 w-3 text-green-600" />
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {ad.assetType === 'video' ? (
                                <Video className="h-6 w-6 text-blue-500" />
                              ) : ad.assetType === 'image' ? (
                                <Image className="h-6 w-6 text-green-500" />
                              ) : (
                                <div className="h-6 w-6 rounded bg-gray-300" />
                              )}
                            </div>
                          )}
                          </div>
                          {/* Red flag for failed asset loads and upload button */}
                          {ad.assetLoadFailed && (
                            <>
                              <div 
                                className="absolute -top-2 -right-2 z-10"
                                title="Asset failed to load from Supabase, using Meta fallback"
                              >
                                <AlertTriangle className="h-5 w-5 text-red-500 bg-white rounded-full border-2 border-red-500 p-0.5" />
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowUploadDialog({ adId: ad.id, adName: ad.name });
                                }}
                                className="absolute -bottom-2 -right-2 z-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 transition-transform hover:scale-110"
                                title="Upload replacement asset"
                                disabled={uploadingAd === ad.id}
                              >
                                {uploadingAd === ad.id ? (
                                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-2 bg-red-50 font-mono text-xs">
                        {ad.videoId ? (
                          <span className="text-blue-600" title={ad.videoId}>
                            {ad.videoId.substring(0, 12)}...
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-2 font-medium">{ad.name}</td>
                      <td className="p-2">
                        <a href={ad.landingPage} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-[200px]">
                          {ad.landingPage}
                        </a>
                      </td>
                      <td className="p-2 text-right">${ad.spend}</td>
                      <td className="p-2 text-right">${ad.cpa}</td>
                      <td className="p-2 text-right">{ad.roas}</td>
                      <td className="p-2 text-right">${ad.purchaseRevenue || '0.00'}</td>
                      <td className="p-2 text-right">{ad.hookRate === 'N/A' ? 'N/A' : `${ad.hookRate}%`}</td>
                      <td className="p-2 text-right">{ad.holdRate === 'N/A' ? 'N/A' : `${ad.holdRate}%`}</td>
                      <td className={`p-2 ${!ad.type ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.type || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 text-right ${!ad.adDuration || ad.adDuration === 'N/A' ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.adDuration === 'N/A' ? 'N/A' : ad.adDuration ? `${ad.adDuration}s` : '-'}
                      </td>
                      <td className={`p-2 text-right ${!ad.productIntro || ad.productIntro === 'N/A' ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.productIntro === 'N/A' ? 'N/A' : ad.productIntro ? `${ad.productIntro}s` : '-'}
                      </td>
                      <td className={`p-2 text-right ${!ad.sitInProblemSeconds ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.sitInProblemSeconds !== undefined && ad.sitInProblemSeconds !== null ? `${ad.sitInProblemSeconds}s` : '-'}
                      </td>
                      <td className={`p-2 text-right ${!ad.sitInProblem ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.sitInProblem || '-'}
                      </td>
                      <td className={`p-2 text-right ${!ad.creatorsUsed ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.creatorsUsed || '-'}
                      </td>
                      <td className={`p-2 ${!ad.angle ? 'text-gray-400 bg-green-50' : 'bg-green-50'}`}>
                        {ad.angle || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 ${!ad.awarenessLevel ? 'text-gray-400 bg-green-50' : 'bg-green-50'}`}>
                        {ad.awarenessLevel || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 ${!ad.contentVariables ? 'text-gray-400 bg-green-50' : 'bg-green-50'} max-w-[200px]`}>
                        {ad.contentVariables ? (
                          <div 
                            className="max-h-20 overflow-y-auto text-wrap break-words text-xs leading-tight scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                            style={{ wordBreak: 'break-word', hyphens: 'auto' }}
                          >
                            {ad.contentVariables}
                          </div>
                        ) : (
                          <span className="italic">Needs AI</span>
                        )}
                      </td>
                      <td className={`p-2 ${!ad.format ? 'text-gray-400 bg-green-50' : 'bg-green-50'}`}>
                        {ad.format || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 ${!ad.emotion ? 'text-gray-400 bg-green-50' : 'bg-green-50'}`}>
                        {ad.emotion || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 ${!ad.framework ? 'text-gray-400 bg-green-50' : 'bg-green-50'}`}>
                        {ad.framework || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 bg-purple-50 max-w-[300px] ${!ad.transcription ? 'text-gray-400' : ''}`}>
                        {ad.transcription ? (
                          <div 
                            className="max-h-20 overflow-y-auto text-wrap break-words text-xs leading-tight scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                            style={{ wordBreak: 'break-word', hyphens: 'auto' }}
                          >
                            {ad.transcription}
                          </div>
                        ) : (
                          <span className="italic">Needs AI</span>
                        )}
                      </td>
                      <td className={`p-2 bg-orange-50 max-w-[350px] ${!ad.visualDescription ? 'text-gray-400' : ''}`}>
                        {ad.visualDescription ? (
                          <div 
                            className="max-h-20 overflow-y-auto text-wrap break-words text-xs leading-tight scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                            style={{ wordBreak: 'break-word', hyphens: 'auto' }}
                          >
                            {ad.visualDescription}
                          </div>
                        ) : (
                          <span className="italic">Needs AI</span>
                        )}
                      </td>
                      <td className="p-2">
                        <a
                          href={`https://business.facebook.com/adsmanager/manage/ads?act=${brandId}&selected_ad_ids=${ad.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="visualizations">
            {(demographicData?.age && Object.keys(demographicData.age).length > 0) || 
             (demographicData?.gender && Object.keys(demographicData.gender).length > 0) || 
             (demographicData?.placement && Object.keys(demographicData.placement).length > 0) ? (
              <div className="space-y-8">
                {/* Header */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Demographics Data</h2>
                  <p className="text-gray-600">Audience insights from your ad performance</p>
                </div>

                {/* Demographics Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Age Distribution */}
                  {demographicData?.age && Object.keys(demographicData.age).length > 0 && (
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                      <CardHeader className="text-center">
                        <CardTitle className="flex items-center justify-center gap-2 text-blue-800">
                          <Users className="h-5 w-5" />
                          Demographics Data: AGE
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={Object.entries(demographicData.age).map(([age, value]) => ({
                                name: age,
                                value: value as number
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(1)}%`}
                              outerRadius={80}
                              fill="#3b82f6"
                              dataKey="value"
                            >
                              {Object.entries(demographicData.age).map((_, index) => (
                                <Cell key={`age-${index}`} fill={[
                                  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#d8b4fe'
                                ][index % 6]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Gender Distribution */}
                  {demographicData?.gender && Object.keys(demographicData.gender).length > 0 && (
                    <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
                      <CardHeader className="text-center">
                        <CardTitle className="flex items-center justify-center gap-2 text-pink-800">
                          <Users className="h-5 w-5" />
                          Demographics Data: GENDER
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={Object.entries(demographicData.gender).map(([gender, value]) => ({
                                name: gender,
                                value: value as number
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(1)}%`}
                              outerRadius={80}
                              fill="#ec4899"
                              dataKey="value"
                            >
                              {Object.entries(demographicData.gender).map((_, index) => (
                                <Cell key={`gender-${index}`} fill={[
                                  '#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8'
                                ][index % 4]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Placement Distribution */}
                  {demographicData?.placement && Object.keys(demographicData.placement).length > 0 && (
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                      <CardHeader className="text-center">
                        <CardTitle className="flex items-center justify-center gap-2 text-green-800">
                          <MapPin className="h-5 w-5" />
                          Demographics Data: PLACEMENT
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={Object.entries(demographicData.placement).map(([placement, value]) => ({
                                name: placement.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                value: value as number
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(1)}%`}
                              outerRadius={80}
                              fill="#10b981"
                              dataKey="value"
                            >
                              {Object.entries(demographicData.placement).map((_, index) => (
                                <Cell key={`placement-${index}`} fill={[
                                  '#10b981', '#34d399', '#6ee7b7', '#9deccd', '#c6f6d5'
                                ][index % 5]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <PieChartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">No demographic data available</p>
                  <p className="text-sm text-gray-500">Import ads with demographic breakdowns to see visualizations here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="ai-instructions">
            <div className="space-y-6">
              {/* Header with Save Button */}
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Analysis Instructions</h2>
                  <p className="text-gray-600">Customize how AI analyzes your ad content</p>
                </div>
                <Button 
                  onClick={async () => {
                    setIsLoadingInstructions(true);
                    try {
                      const response = await fetch('/api/onesheet/ai-instructions', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          onesheet_id: onesheetId,
                          content_variables: aiInstructions.contentVariables,
                          awareness_levels: aiInstructions.awarenessLevels,
                          content_variables_return_multiple: aiInstructions.returnMultiple,
                          content_variables_selection_guidance: aiInstructions.selectionGuidance,
                          content_variables_allow_new: aiInstructions.allowNewContentVariables,
                          awareness_levels_allow_new: aiInstructions.allowNewAwarenessLevels,
                          main_analysis_prompt: aiInstructions.mainAnalysisPrompt,
                          content_variables_prompt: aiInstructions.contentVariablesPrompt,
                          awareness_levels_prompt: aiInstructions.awarenessLevelsPrompt,
                          type_prompt: aiInstructions.typePrompt,
                          ad_duration_prompt: aiInstructions.adDurationPrompt,
                          product_intro_prompt: aiInstructions.productIntroPrompt,
                          creators_used_prompt: aiInstructions.creatorsUsedPrompt,
                          sit_in_problem_seconds_prompt: aiInstructions.sitInProblemSecondsPrompt,
                          sit_in_problem_prompt: aiInstructions.sitInProblemPrompt,
                          angle_prompt: aiInstructions.anglePrompt,
                          format_prompt: aiInstructions.formatPrompt,
                          emotion_prompt: aiInstructions.emotionPrompt,
                          framework_prompt: aiInstructions.frameworkPrompt,
                          transcription_prompt: aiInstructions.transcriptionPrompt,
                          visual_description_prompt: aiInstructions.visualDescriptionPrompt,
                          analysis_fields: aiInstructions.analysisFields,
                          allow_new_analysis_values: aiInstructions.allowNewAnalysisValues,
                          system_instructions: aiInstructions.systemInstructions,
                          response_schema: aiInstructions.responseSchema
                        })
                      });

                      if (!response.ok) throw new Error('Failed to save instructions');

                      toast({
                        title: "Instructions Saved",
                        description: "AI analysis instructions have been updated and will be used for future analyses."
                      });
                    } catch (error) {
                      console.error('Error saving AI instructions:', error);
                      toast({
                        title: "Error",
                        description: "Failed to save AI instructions",
                        variant: "destructive"
                      });
                    } finally {
                      setIsLoadingInstructions(false);
                    }
                  }} 
                  disabled={isLoadingInstructions}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                >
                  <Settings className="h-4 w-4" />
                  {isLoadingInstructions ? 'Saving...' : 'Save Instructions'}
                </Button>
              </div>

              {/* Content Variables Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5" />
                    Content Variables
                  </CardTitle>
                  <CardDescription>
                    Define the types of content variables the AI should look for in ads. The AI can identify multiple variables or be restricted to one based on your settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                                    {/* Settings Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Return Multiple Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Return Multiple Values</Label>
                        <p className="text-xs text-gray-600">Allow AI to return multiple content variables per ad</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="returnMultiple"
                          checked={aiInstructions.returnMultiple}
                          onChange={(e) => setAiInstructions(prev => ({ ...prev, returnMultiple: e.target.checked }))}
                          className="rounded"
                          aria-label="Enable returning multiple content variables"
                        />
                        <Label htmlFor="returnMultiple" className="text-sm">Enabled</Label>
                      </div>
                    </div>

                    {/* Allow New Variables Toggle */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Allow New Variables</Label>
                        <p className="text-xs text-gray-600">Let AI create new variables not in your predefined list</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="allowNewVariables"
                          checked={aiInstructions.allowNewContentVariables}
                          onChange={(e) => setAiInstructions(prev => ({ ...prev, allowNewContentVariables: e.target.checked }))}
                          className="rounded"
                          aria-label="Allow AI to create new content variables"
                        />
                        <Label htmlFor="allowNewVariables" className="text-sm">Enabled</Label>
                      </div>
                    </div>
                  </div>

                  {/* Selection Guidance */}
                  {!aiInstructions.returnMultiple && (
                    <div className="space-y-2">
                      <Label htmlFor="selectionGuidance" className="text-sm font-medium">Selection Guidance</Label>
                      <textarea
                        id="selectionGuidance"
                        value={aiInstructions.selectionGuidance}
                        onChange={(e) => setAiInstructions(prev => ({ ...prev, selectionGuidance: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-md text-sm"
                        rows={3}
                        placeholder="Provide guidance on how AI should select a single content variable when multiple are present..."
                      />
                    </div>
                  )}

                  {/* Content Variables List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Content Variable Definitions</Label>
                      <Button
                        size="sm"
                        onClick={() => {
                          setAiInstructions(prev => ({
                            ...prev,
                            contentVariables: [...prev.contentVariables, { name: "", description: "" }]
                          }));
                        }}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add Variable
                      </Button>
                    </div>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {aiInstructions.contentVariables.map((variable, index) => (
                        <div key={index} className="flex gap-2 p-3 border border-gray-200 rounded-md">
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="Variable name (e.g., Podcast)"
                              value={variable.name}
                              onChange={(e) => {
                                const newVariables = [...aiInstructions.contentVariables];
                                newVariables[index].name = e.target.value;
                                setAiInstructions(prev => ({ ...prev, contentVariables: newVariables }));
                              }}
                              className="text-sm"
                            />
                            <Input
                              placeholder="Description (e.g., Usually in a podcast studio...)"
                              value={variable.description}
                              onChange={(e) => {
                                const newVariables = [...aiInstructions.contentVariables];
                                newVariables[index].description = e.target.value;
                                setAiInstructions(prev => ({ ...prev, contentVariables: newVariables }));
                              }}
                              className="text-sm"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newVariables = aiInstructions.contentVariables.filter((_, i) => i !== index);
                              setAiInstructions(prev => ({ ...prev, contentVariables: newVariables }));
                            }}
                            className="shrink-0"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Awareness Levels Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Awareness Levels
                  </CardTitle>
                  <CardDescription>
                    Define the customer awareness levels the AI should identify based on ad targeting and messaging.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Allow New Awareness Levels Toggle */}
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <Label className="text-sm font-medium">Allow New Awareness Levels</Label>
                      <p className="text-xs text-gray-600">Let AI identify awareness levels beyond your predefined list</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="allowNewAwareness"
                        checked={aiInstructions.allowNewAwarenessLevels}
                        onChange={(e) => setAiInstructions(prev => ({ ...prev, allowNewAwarenessLevels: e.target.checked }))}
                        className="rounded"
                        aria-label="Allow AI to create new awareness levels"
                      />
                      <Label htmlFor="allowNewAwareness" className="text-sm">Enabled</Label>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Awareness Level Definitions</Label>
                      <Button
                        size="sm"
                        onClick={() => {
                          setAiInstructions(prev => ({
                            ...prev,
                            awarenessLevels: [...prev.awarenessLevels, { name: "", description: "" }]
                          }));
                        }}
                        className="flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add Level
                      </Button>
                    </div>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {aiInstructions.awarenessLevels.map((level, index) => (
                        <div key={index} className="flex gap-2 p-3 border border-gray-200 rounded-md">
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="Awareness level (e.g., Problem Aware)"
                              value={level.name}
                              onChange={(e) => {
                                const newLevels = [...aiInstructions.awarenessLevels];
                                newLevels[index].name = e.target.value;
                                setAiInstructions(prev => ({ ...prev, awarenessLevels: newLevels }));
                              }}
                              className="text-sm"
                            />
                            <Input
                              placeholder="Description (e.g., Knows they have a problem...)"
                              value={level.description}
                              onChange={(e) => {
                                const newLevels = [...aiInstructions.awarenessLevels];
                                newLevels[index].description = e.target.value;
                                setAiInstructions(prev => ({ ...prev, awarenessLevels: newLevels }));
                              }}
                              className="text-sm"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const newLevels = aiInstructions.awarenessLevels.filter((_, i) => i !== index);
                              setAiInstructions(prev => ({ ...prev, awarenessLevels: newLevels }));
                            }}
                            className="shrink-0"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analysis Field Definitions */}
              {['type', 'angle', 'format', 'emotion', 'framework'].map(fieldName => (
                <Card key={fieldName}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} Definitions
                      <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
                        Protected - JSON structure preserved
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Define the {fieldName} categories that AI should identify in ads. The AI can identify values from your list or create new ones based on your settings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Allow New Values Toggle */}
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Allow New {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} Values</Label>
                        <p className="text-xs text-gray-600">Let AI create new {fieldName} values not in your predefined list</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`allowNew${fieldName}`}
                          checked={aiInstructions.allowNewAnalysisValues[fieldName as keyof typeof aiInstructions.allowNewAnalysisValues]}
                          onChange={(e) => setAiInstructions(prev => ({ 
                            ...prev, 
                            allowNewAnalysisValues: {
                              ...prev.allowNewAnalysisValues,
                              [fieldName]: e.target.checked
                            }
                          }))}
                          className="rounded"
                          aria-label={`Allow AI to create new ${fieldName} values`}
                        />
                        <Label htmlFor={`allowNew${fieldName}`} className="text-sm">Enabled</Label>
                      </div>
                    </div>

                    {/* Field Definitions List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} Definitions</Label>
                        <Button
                          size="sm"
                          onClick={() => {
                            setAiInstructions(prev => ({
                              ...prev,
                              analysisFields: {
                                ...prev.analysisFields,
                                [fieldName]: [...prev.analysisFields[fieldName as keyof typeof prev.analysisFields], { name: "", description: "" }]
                              }
                            }));
                          }}
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-4 w-4" />
                          Add {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
                        </Button>
                      </div>
                      
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {aiInstructions.analysisFields[fieldName as keyof typeof aiInstructions.analysisFields].map((item, index) => (
                          <div key={index} className="flex gap-2 p-3 border border-gray-200 rounded-md">
                            <div className="flex-1 space-y-2">
                              <Input
                                placeholder={`${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} name (e.g., ${fieldName === 'type' ? 'High Production Video' : fieldName === 'angle' ? 'Weight Management' : fieldName === 'format' ? 'Testimonial' : fieldName === 'emotion' ? 'Hopefulness' : 'PAS'})`}
                                value={item.name}
                                onChange={(e) => {
                                  const newItems = [...aiInstructions.analysisFields[fieldName as keyof typeof aiInstructions.analysisFields]];
                                  newItems[index].name = e.target.value;
                                  setAiInstructions(prev => ({ 
                                    ...prev, 
                                    analysisFields: {
                                      ...prev.analysisFields,
                                      [fieldName]: newItems
                                    }
                                  }));
                                }}
                                className="text-sm"
                              />
                              <Input
                                placeholder="Description (e.g., Professional, high-quality video production...)"
                                value={item.description}
                                onChange={(e) => {
                                  const newItems = [...aiInstructions.analysisFields[fieldName as keyof typeof aiInstructions.analysisFields]];
                                  newItems[index].description = e.target.value;
                                  setAiInstructions(prev => ({ 
                                    ...prev, 
                                    analysisFields: {
                                      ...prev.analysisFields,
                                      [fieldName]: newItems
                                    }
                                  }));
                                }}
                                className="text-sm"
                              />
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newItems = aiInstructions.analysisFields[fieldName as keyof typeof aiInstructions.analysisFields].filter((_, i) => i !== index);
                                setAiInstructions(prev => ({ 
                                  ...prev, 
                                  analysisFields: {
                                    ...prev.analysisFields,
                                    [fieldName]: newItems
                                  }
                                }));
                              }}
                              className="shrink-0"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Measurement Instructions - Protected */}
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <Shield className="h-5 w-5" />
                    Measurement Instructions
                    <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
                      Protected - Default values applied
                    </span>
                  </CardTitle>
                  <CardDescription className="text-amber-700">
                    These measurement instructions are currently protected with optimized defaults. Custom editing may be enabled in future updates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Protected Measurement Instructions */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-amber-800">Ad Duration Instructions</Label>
                        <div className="bg-white p-3 rounded-md border border-amber-200 text-sm font-mono text-gray-700 min-h-[96px] flex items-center">
                          {aiInstructions.adDurationPrompt}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-amber-800">Product Introduction Timing</Label>
                        <div className="bg-white p-3 rounded-md border border-amber-200 text-sm font-mono text-gray-700 min-h-[96px] flex items-center">
                          {aiInstructions.productIntroPrompt}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-amber-800">Creators/People Count</Label>
                        <div className="bg-white p-3 rounded-md border border-amber-200 text-sm font-mono text-gray-700 min-h-[96px] flex items-center">
                          {aiInstructions.creatorsUsedPrompt}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-amber-800">Sit in Problem Duration</Label>
                        <div className="bg-white p-3 rounded-md border border-amber-200 text-sm font-mono text-gray-700 min-h-[96px] flex items-center">
                          {aiInstructions.sitInProblemSecondsPrompt}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-amber-800">Sit in Problem Percentage</Label>
                        <div className="bg-white p-3 rounded-md border border-amber-200 text-sm font-mono text-gray-700 min-h-[96px] flex items-center">
                          {aiInstructions.sitInProblemPrompt}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700">
                    These instructions ensure consistent and accurate measurement across all ad analyses.
                  </p>
                </CardContent>
              </Card>

              {/* Content Analysis Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Content Analysis Instructions
                  </CardTitle>
                  <CardDescription>
                    Customize how AI analyzes transcription and visual elements of your ads.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="transcriptionPrompt" className="text-sm font-medium">
                        Transcription Instructions
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Auto-fallback enabled</span>
                      </Label>
                      <textarea
                        id="transcriptionPrompt"
                        placeholder="Default: Provide a complete word-for-word transcription of any spoken content in the video, including background voices and key phrases. If no audio content is present, return 'No audio content'."
                        value={aiInstructions.transcriptionPrompt || ''}
                        onChange={(e) => setAiInstructions(prev => ({ ...prev, transcriptionPrompt: e.target.value }))}
                        className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <p className="text-xs text-gray-600">
                        If left empty, will use default transcription instructions automatically.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="visualDescriptionPrompt" className="text-sm font-medium">
                        Visual Description Instructions
                        <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Auto-fallback enabled</span>
                      </Label>
                      <textarea
                        id="visualDescriptionPrompt"
                        placeholder="Default: Describe visual elements including colors (provide hex codes for dominant colors), people, settings, text overlays, and key visual components. Be specific about layout, composition, and visual hierarchy."
                        value={aiInstructions.visualDescriptionPrompt || ''}
                        onChange={(e) => setAiInstructions(prev => ({ ...prev, visualDescriptionPrompt: e.target.value }))}
                        className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <p className="text-xs text-gray-600">
                        If left empty, will use default visual analysis instructions automatically.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Instructions Section */}
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <Bot className="h-5 w-5" />
                    System Instructions (Protected)
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    This defines the AI&apos;s role and expertise level for analyzing ads
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {aiInstructions.systemInstructions || 
                       'You are a top creative strategist at a multi-million dollar per year ecommerce brand. You spend all day analyzing video and image advertisements, categorizing them, labeling them, and identifying trends to help brands produce more concepts and more winners. You have an exceptional eye for detail and can quickly identify what makes an ad successful. Your analysis is data-driven, precise, and actionable.'}
                    </p>
                  </div>
                  <p className="text-sm text-blue-600 mt-2">
                    <Info className="h-4 w-4 inline mr-1" />
                    This system instruction is protected and cannot be edited directly. It ensures consistent, high-quality analysis.
                  </p>
                </CardContent>
              </Card>



              {/* Actual Prompt Preview */}
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <Sparkles className="h-5 w-5" />
                    Master Prompt Template Preview
                  </CardTitle>
                  <CardDescription className="text-purple-700">
                    This is the exact prompt template that will be sent to Gemini for ad analysis (with variables substituted during analysis)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white p-4 rounded-md border border-purple-200 font-mono text-xs overflow-x-auto">
                    <div className="whitespace-pre-wrap text-gray-800">
                      {aiInstructions.masterPromptTemplate || 'Loading master prompt template...'}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-purple-700">
                    <Settings className="h-4 w-4" />
                    <span>Model: gemini-2.5-flash-lite-preview-06-17</span>
                    <span className="text-purple-500">•</span>
                    <span>Structured Output: Enabled</span>
                    <span className="text-purple-500">•</span>
                    <span>Template Variables: Dynamically Substituted</span>
                  </div>
                  <div className="mt-2 p-3 bg-purple-100 rounded-md">
                    <p className="text-xs text-purple-800">
                      <Info className="h-4 w-4 inline mr-1" />
                      Variables like <code>{`{{ad.name}}`}</code>, <code>{`{{typeOptions}}`}</code>, and <code>{`{{contentVariablesInstruction}}`}</code> are automatically replaced with actual values during analysis based on your current settings.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Response Schema Preview */}
              <Card className="border-indigo-200 bg-indigo-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-800">
                    <Code className="h-5 w-5" />
                    Response Schema (Structured Output)
                  </CardTitle>
                  <CardDescription className="text-indigo-700">
                    This JSON schema enforces the exact structure of Gemini&apos;s response
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white p-4 rounded-md border border-indigo-200 font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(aiInstructions.responseSchema || {
                      type: "object",
                      properties: {
                        type: { type: "string", description: "Ad category", example: "High Production Video" },
                        adDuration: { type: "number", format: "float", description: "Duration in seconds", example: 32.5 },
                        productIntro: { type: "number", format: "float", description: "Product intro timestamp", example: 3.1 },
                        sitInProblemSeconds: { type: "number", format: "float", description: "Problem agitation duration", example: 8.5 },
                        sitInProblem: { type: "string", description: "Problem focus percentage", example: "25.0%" },
                        creatorsUsed: { type: "integer", description: "Number of people", example: 1 },
                        angle: { type: "string", description: "Marketing angle", example: "Weight Management" },
                        format: { type: "string", description: "Creative format", example: "Testimonial" },
                        emotion: { type: "string", description: "Primary emotion", example: "Hopefulness" },
                        framework: { type: "string", description: "Marketing framework", example: "PAS" },
                        awarenessLevel: { type: "string", description: "Awareness level", example: "Problem Aware" },
                        contentVariables: { type: "string", description: "Content elements", example: "Product Demo" },
                        transcription: { type: "string", description: "Audio/text content", example: "[00:01] Have..." },
                        visualDescription: { type: "string", description: "Visual elements", example: "Woman at desk..." }
                      },
                      required: ["type", "adDuration", "productIntro", "sitInProblemSeconds", "sitInProblem", "creatorsUsed", 
                                "angle", "format", "emotion", "framework", "awarenessLevel", 
                                "contentVariables", "transcription", "visualDescription"]
                    }, null, 2)}</pre>
                  </div>
                  <p className="text-xs text-indigo-700 mt-2">
                    <Info className="h-4 w-4 inline mr-1" />
                    This schema guarantees consistent JSON output by defining exact field types and requirements.
                  </p>
                </CardContent>
              </Card>

              {/* Save Instructions */}
              <div className="flex justify-end">
                <Button 
                  onClick={async () => {
                    setIsLoadingInstructions(true);
                    try {
                      const response = await fetch('/api/onesheet/ai-instructions', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          onesheet_id: onesheetId,
                          content_variables: aiInstructions.contentVariables,
                          awareness_levels: aiInstructions.awarenessLevels,
                          content_variables_return_multiple: aiInstructions.returnMultiple,
                          content_variables_selection_guidance: aiInstructions.selectionGuidance,
                          content_variables_allow_new: aiInstructions.allowNewContentVariables,
                          awareness_levels_allow_new: aiInstructions.allowNewAwarenessLevels,
                          main_analysis_prompt: aiInstructions.mainAnalysisPrompt,
                          content_variables_prompt: aiInstructions.contentVariablesPrompt,
                          awareness_levels_prompt: aiInstructions.awarenessLevelsPrompt,
                          type_prompt: aiInstructions.typePrompt,
                          ad_duration_prompt: aiInstructions.adDurationPrompt,
                          product_intro_prompt: aiInstructions.productIntroPrompt,
                          creators_used_prompt: aiInstructions.creatorsUsedPrompt,
                          sit_in_problem_seconds_prompt: aiInstructions.sitInProblemSecondsPrompt,
                          sit_in_problem_prompt: aiInstructions.sitInProblemPrompt,
                          angle_prompt: aiInstructions.anglePrompt,
                          format_prompt: aiInstructions.formatPrompt,
                          emotion_prompt: aiInstructions.emotionPrompt,
                          framework_prompt: aiInstructions.frameworkPrompt,
                          transcription_prompt: aiInstructions.transcriptionPrompt,
                          visual_description_prompt: aiInstructions.visualDescriptionPrompt,
                          analysis_fields: aiInstructions.analysisFields,
                          allow_new_analysis_values: aiInstructions.allowNewAnalysisValues,
                          system_instructions: aiInstructions.systemInstructions,
                          response_schema: aiInstructions.responseSchema
                        })
                      });

                      if (!response.ok) throw new Error('Failed to save instructions');

                      toast({
                        title: "Instructions Saved",
                        description: "AI analysis instructions have been updated and will be used for future analyses."
                      });
                    } catch (error) {
                      console.error('Error saving AI instructions:', error);
                      toast({
                        title: "Error",
                        description: "Failed to save AI instructions",
                        variant: "destructive"
                      });
                    } finally {
                      setIsLoadingInstructions(false);
                    }
                  }} 
                  disabled={isLoadingInstructions}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  {isLoadingInstructions ? 'Saving...' : 'Save Instructions'}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="strategist">
            <div className="space-y-6">
              {/* Strategist Settings */}
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-800">
                    <Brain className="h-5 w-5" />
                    AI Strategist Settings
                  </CardTitle>
                  <CardDescription className="text-purple-700">
                    Configure benchmarks and analysis parameters for the AI strategist
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="benchmarkRoas" className="text-sm font-medium">
                        Target ROAS
                      </Label>
                      <Input
                        id="benchmarkRoas"
                        type="number"
                        step="0.1"
                        value={aiInstructions.benchmarkRoas}
                        onChange={(e) => setAiInstructions(prev => ({ ...prev, benchmarkRoas: parseFloat(e.target.value) || 2.0 }))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-600">Good performance threshold</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="benchmarkHookRate" className="text-sm font-medium">
                        Target Hook Rate (%)
                      </Label>
                      <Input
                        id="benchmarkHookRate"
                        type="number"
                        step="0.1"
                        value={aiInstructions.benchmarkHookRate}
                        onChange={(e) => setAiInstructions(prev => ({ ...prev, benchmarkHookRate: parseFloat(e.target.value) || 3.0 }))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-600">Good hook performance</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="benchmarkHoldRate" className="text-sm font-medium">
                        Target Hold Rate (%)
                      </Label>
                      <Input
                        id="benchmarkHoldRate"
                        type="number"
                        step="1"
                        value={aiInstructions.benchmarkHoldRate}
                        onChange={(e) => setAiInstructions(prev => ({ ...prev, benchmarkHoldRate: parseFloat(e.target.value) || 50.0 }))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-600">Good retention rate</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="benchmarkSpend" className="text-sm font-medium">
                        Min Spend ($)
                      </Label>
                      <Input
                        id="benchmarkSpend"
                        type="number"
                        step="10"
                        value={aiInstructions.benchmarkSpend}
                        onChange={(e) => setAiInstructions(prev => ({ ...prev, benchmarkSpend: parseFloat(e.target.value) || 100.0 }))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-600">Minimum spend for significance</p>
                    </div>
                  </div>

                  {/* Save Benchmarks Button */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/onesheet/ai-instructions', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              onesheet_id: onesheetId,
                              benchmark_roas: aiInstructions.benchmarkRoas,
                              benchmark_hook_rate: aiInstructions.benchmarkHookRate,
                              benchmark_hold_rate: aiInstructions.benchmarkHoldRate,
                              benchmark_spend: aiInstructions.benchmarkSpend
                            })
                          });

                          if (!response.ok) throw new Error('Failed to save benchmarks');

                          toast({
                            title: "Benchmarks Saved",
                            description: "AI strategist benchmarks have been updated."
                          });
                        } catch (error) {
                          console.error('Error saving benchmarks:', error);
                          toast({
                            title: "Error",
                            description: "Failed to save benchmarks",
                            variant: "destructive"
                          });
                        }
                      }}
                      variant="outline"
                      className="border-purple-200 text-purple-700 hover:bg-purple-100"
                    >
                      Save Benchmarks
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Strategist Analysis Results */}
              {strategistOpinion ? (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Strategic Analysis Summary
                      </CardTitle>
                      <CardDescription>
                        Analyzed {strategistOpinion.totalAdsAnalyzed} ads on {new Date(strategistOpinion.analyzedAt).toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 leading-relaxed">{strategistOpinion.summary}</p>
                    </CardContent>
                  </Card>

                  {/* Top and Worst Performers */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Performers */}
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-green-800">Top Performers</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {strategistOpinion.topPerformers.map((ad, index) => (
                          <div key={index} className="bg-white p-4 rounded-lg border border-green-200">
                            <h4 className="font-semibold text-sm mb-2">{ad.adName}</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                              <div>
                                <span className="text-gray-600">Spend:</span> <span className="font-medium">${ad.spend.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">ROAS:</span> <span className="font-medium text-green-600">{ad.roas.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-700">Key Success Factors:</p>
                              <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                                {ad.keySuccessFactors.map((factor, i) => (
                                  <li key={i}>{factor}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Worst Performers */}
                    <Card className="border-red-200 bg-red-50">
                      <CardHeader>
                        <CardTitle className="text-red-800">Underperformers</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {strategistOpinion.worstPerformers.map((ad, index) => (
                          <div key={index} className="bg-white p-4 rounded-lg border border-red-200">
                            <h4 className="font-semibold text-sm mb-2">{ad.adName}</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                              <div>
                                <span className="text-gray-600">Spend:</span> <span className="font-medium">${ad.spend.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">ROAS:</span> <span className="font-medium text-red-600">{ad.roas.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-700">Failure Reasons:</p>
                              <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                                {ad.failureReasons.map((reason, i) => (
                                  <li key={i}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Creative Patterns */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Creative Patterns Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-green-700 mb-2">Winning Elements</h4>
                          <ul className="space-y-1">
                            {strategistOpinion.creativePatterns.winningElements.map((element, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-green-500 mt-0.5">✓</span>
                                <span className="text-sm">{element}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-red-700 mb-2">Elements to Avoid</h4>
                          <ul className="space-y-1">
                            {strategistOpinion.creativePatterns.losingElements.map((element, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-red-500 mt-0.5">✗</span>
                                <span className="text-sm">{element}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm">
                          <strong className="text-blue-800">Optimal Sit-in-Problem Range:</strong> {strategistOpinion.creativePatterns.optimalSitInProblemRange}
                        </p>
                        <p className="text-sm mt-2">
                          <strong className="text-blue-800">Best Performing Hooks:</strong> {strategistOpinion.creativePatterns.bestPerformingHooks.join(', ')}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Strategic Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {strategistOpinion.recommendations.map((rec, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${
                          rec.priority === 'high' ? 'border-red-200 bg-red-50' :
                          rec.priority === 'medium' ? 'border-amber-200 bg-amber-50' :
                          'border-gray-200 bg-gray-50'
                        }`}>
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-sm">{rec.recommendation}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              rec.priority === 'high' ? 'bg-red-200 text-red-800' :
                              rec.priority === 'medium' ? 'bg-amber-200 text-amber-800' :
                              'bg-gray-200 text-gray-800'
                            }`}>
                              {rec.priority.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            <strong>Expected Impact:</strong> {rec.expectedImpact}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                /* Empty State */
                <Card>
                  <CardContent className="py-12 text-center">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Strategic Analysis Yet</h3>
                    <p className="text-gray-600 mb-6">
                      {analyzedCount === 0 
                        ? "Please analyze your ads first before running the AI strategist"
                        : "Click the 'AI Strategist' button in the header to generate strategic insights"}
                    </p>
                    {analyzedCount > 0 && (
                      <Button onClick={handleRunStrategist} disabled={isRunningStrategist}>
                        <Brain className={`mr-2 h-4 w-4 ${isRunningStrategist ? 'animate-spin' : ''}`} />
                        {isRunningStrategist ? 'Analyzing...' : 'Run AI Strategist'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Strategist System Instructions (Protected) */}
              <Card className="border-indigo-200 bg-indigo-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-800">
                    <Bot className="h-5 w-5" />
                    Strategist System Instructions (Protected)
                  </CardTitle>
                  <CardDescription className="text-indigo-700">
                    Advanced AI instructions for strategic analysis (Model: gemini-2.5-pro)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-white p-4 rounded-lg border border-indigo-200">
                    <p className="text-gray-700 whitespace-pre-wrap text-sm">
                      {aiInstructions.strategistSystemInstructions || 
                       `You are a world-class performance marketing strategist with deep expertise in Facebook/Meta advertising. You analyze ad performance data to identify patterns, insights, and actionable recommendations that can dramatically improve campaign performance.

Your analysis should:
1. Identify clear patterns between high and low performing ads
2. Consider both creative elements AND performance metrics
3. Weight spend as the most important factor (high spend = Meta's algorithm found success)
4. Balance spend with ROAS to identify truly scalable winners
5. Provide specific, actionable recommendations
6. Focus on insights that can be applied to future ad creation

Use the provided benchmarks to categorize performance, but also consider relative performance within the dataset.`}
                    </p>
                  </div>
                  <p className="text-sm text-indigo-600 mt-2">
                    <Info className="h-4 w-4 inline mr-1" />
                    Uses structured output with gemini-2.5-pro for comprehensive analysis
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!hasAds && !isImporting && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No ad data imported yet. Select a date range and click &quot;Import Ads&quot; to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setSelectedVideo(null)}>
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] w-full mx-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold truncate">{selectedVideo.adName}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVideo(null)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
              {/* Check if we have a local video URL stored in Supabase */}
              {selectedVideo.thumbnailUrl && (selectedVideo.thumbnailUrl.includes('supabase') || selectedVideo.thumbnailUrl.includes('.mp4')) ? (
                // Local video stored in Supabase or direct video URL - use HTML5 video player
                <video
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                  onError={() => {
                    console.error('Video playback failed, falling back to Facebook iframe');
                    // Could add fallback logic here
                  }}
                >
                  <source src={selectedVideo.thumbnailUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                // External video - use Facebook iframe fallback
                <iframe
                  src={`https://www.facebook.com/plugins/video.php?height=480&href=https%3A%2F%2Fwww.facebook.com%2Fvideo.php%3Fv%3D${selectedVideo.videoId}&show_text=false&width=854&t=0`}
                  width="100%"
                  height="100%"
                  style={{ border: 'none', overflow: 'hidden' }}
                  scrolling="no"
                  frameBorder="0"
                  allowFullScreen={true}
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Click outside the video or press the X button to close
            </p>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] w-full mx-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold truncate">{selectedImage.adName}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[75vh] bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
              <img
                src={selectedImage.imageUrl}
                alt={`Full size preview of ${selectedImage.adName}`}
                className="max-w-full max-h-full object-contain"
                onError={(event) => {
                  console.error('Image failed to load:', selectedImage.imageUrl);
                  (event.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NSA4NUwxMTUgMTE1TTE4NSA4NUwxMTUgMTE1TDE4NSAxMTVNODUgMTE1TDExNSA4NU04NSA4NUwxMTUgMTE1IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjwvdGV4dD4KPC9zdmc+';
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Click outside the image or press the X button to close
            </p>
          </div>
        </div>
      )}

      {/* Upload Asset Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Replacement Asset</h3>
              <button
                onClick={() => setShowUploadDialog(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Upload a new asset for: <strong>{showUploadDialog.adName}</strong>
              </p>
              <p className="text-xs text-gray-500">
                Supported formats: JPEG, PNG, WebP, GIF, MP4, MOV, AVI, WebM (Max: 50MB)
              </p>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadAsset(file, showUploadDialog.adId);
                    }
                  }}
                  className="hidden"
                  id="asset-upload"
                />
                <label htmlFor="asset-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadDialog(null)}
                  disabled={uploadingAd === showUploadDialog.adId}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 