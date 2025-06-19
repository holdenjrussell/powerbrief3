// OneSheet Creative Strategy Template Types

export interface ResearchChecklist {
  myKnowledge: boolean;
  chatgptPerplexity: boolean;
  customerReviews: boolean;
  socialListening: boolean;
  adComments: boolean;
  forumsSources: boolean;
  articles: boolean;
  organicResearch: boolean;
  tiktok: boolean;
  youtubeShorts: boolean;
}

export interface Angle {
  id: string;
  title: string;
  description: string;
  priority: number;
  aiGenerated?: boolean;
  supportingEvidence?: {
    reviews: string[];
    information: string[];
    statistics: string[];
  };
}

// Enhanced audience insights structure based on video
export interface AudienceInsight {
  id: string;
  category: 'benefits' | 'painPoints' | 'features' | 'objections' | 'failedSolutions' | 'other';
  title: string;
  supportingEvidence: {
    reviews: Array<{
      text: string;
      source: string;
      url?: string;
    }>;
    information: Array<{
      text: string;
      source: string;
      url?: string;
    }>;
    statistics: Array<{
      text: string;
      source: string;
      url?: string;
    }>;
  };
}

// Social listening data structure
export interface SocialListeningData {
  reddit: Array<{
    postTitle: string;
    url: string;
    keyInsights: string[];
    extractedLanguage: string[];
    relevantQuotes: string[];
    addedDate: string;
  }>;
  quora: Array<{
    question: string;
    url: string;
    keyInsights: string[];
    extractedLanguage: string[];
    relevantQuotes: string[];
    addedDate: string;
  }>;
  adComments: Array<{
    platform: string;
    adUrl?: string;
    comments: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
    keyInsights: string[];
    addedDate: string;
  }>;
}

// Organic research data structure
export interface OrganicResearchData {
  tiktok: Array<{
    videoUrl: string;
    description: string;
    views: number;
    hook: string;
    keyTakeaways: string[];
    relevantToAngles: string[];
    addedDate: string;
  }>;
  youtubeShorts: Array<{
    videoUrl: string;
    title: string;
    views: number;
    hook: string;
    keyTakeaways: string[];
    relevantToAngles: string[];
    addedDate: string;
  }>;
}

export interface Persona {
  id: string;
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
  awarenessLevel: 'unaware' | 'problemAware' | 'solutionAware' | 'productAware' | 'mostAware';
  customerLanguage: string[]; // How they actually talk about problems/solutions
}

export interface CompetitorAnalysis {
  id: string;
  name: string;
  website?: string;
  similarities: string[];
  differences: string[];
  opportunities: string[]; // Customer dissatisfaction points
  customerComplaints: Array<{
    complaint: string;
    source: string;
    url?: string;
  }>;
  adLibraryAnalysis: {
    creators: string[]; // Type of creators they use
    formats: string[]; // Ad formats they favor
    strategies: string[]; // Overall strategy observations
  };
  priceComparison: 'higher' | 'lower' | 'similar';
  qualityComparison: string;
  positioningOpportunity: string; // How to position against them
  
  // New fields for enhanced competitor analysis
  landingPagesUsed: Array<{
    url: string;
    description: string;
    keyElements: string[];
  }>;
  adLinks: Array<{
    platform: string;
    url: string;
    dateFound: string;
    performance?: string;
  }>;
  isHigherQuality: string; // Why/how is your product better quality
  whyBetterChoice: string; // What makes your product the best choice
  formatStrategies: string[]; // How they approach formats
  creatorStrategies: string[]; // How they approach creators/talent
  learningsOverTime: Array<{
    date: string;
    learning: string;
    source: string;
  }>;
}

// Enhanced ad account audit structure
export interface AdAccountData {
  deliveryByAge: Record<string, number>;
  deliveryByGender: Record<string, number>;
  deliveryByPlacement: Record<string, number>;
  topPerformingAngles: Array<{
    angle: string;
    spend: number;
    cpa: number;
    holdRate: number;
  }>;
  topPerformingFormats: Array<{
    format: string;
    spend: number;
    cpa: number;
    holdRate: number;
  }>;
  avgCPA: number;
  bestHoldRate: number;
  emotionAnalysis?: Array<{
    emotion: string;
    avgPerformance: number;
    spend: number;
  }>;
  frameworkAnalysis?: Array<{
    framework: string;
    avgPerformance: number;
    spend: number;
  }>;
}

export interface AdPerformanceData {
  id: string;
  adLink: string;
  landingPage: string;
  spend: number;
  cpa: number;
  hookRate: number;
  holdRate: number;
  angle: string;
  format: string;
  emotion: string;
  framework: string;
  dateRange: string;
}

export interface KeyLearnings {
  ageInsights: string;
  genderInsights: string;
  placementInsights: string;
  creativeInsights: string;
  implications: string;
  dataQuality: 'high' | 'medium' | 'low'; // How much data we have to work with
}

export interface Concept {
  id: string;
  title: string;
  description: string;
  angle: string;
  format: string;
  emotion: string;
  framework: string;
  priority: number;
  inspiration: {
    source: string; // Where the idea came from
    sourceUrl?: string;
    relatedResearch: string[]; // References to audience insights
  };
  productionNotes: string;
  estimatedBudget?: number;
}

export interface Hook {
  id: string;
  text: string;
  angle: string;
  persona: string;
  format: string;
  priority: number;
  inspiration: {
    source: string;
    sourceUrl?: string;
    customerLanguage?: boolean; // If it uses actual customer language
  };
  testVariations: string[]; // Alternative versions to test
}

export interface Visual {
  id: string;
  description: string;
  type: 'comparison' | 'testimonial' | 'demonstration' | 'lifestyle' | 'ugc' | 'static' | 'other';
  angle: string;
  priority: number;
  inspiration: {
    source: string;
    sourceUrl?: string;
    organicReference?: boolean; // If inspired by organic content
  };
  productionNotes: string;
}

// AI Prompt Templates from the video
export interface AIPromptTemplates {
  // Audience Research Prompts
  adAngles: string; // "Analyze the whole website and customer reviews. Give me different ad angles to sell this product on a Facebook ad."
  benefitsPainPoints: string; // "Give me some benefits/pain points of people who use [PRODUCT]"
  audienceResearch: string; // "Using the reviews below, give me details on each of the following for my product..."
  statisticsResearch: string; // "Give me some shocking statistics about pain point X or benefit Y"
  
  // Social Listening Prompts
  redditAnalysis: string; // "Analyze this Reddit post and identify keywords and phrases people use when talking about [PRODUCT]"
  forumAnalysis: string; // Generic forum analysis prompt
  
  // Competitor Research Prompts
  competitorGapAnalysis: string; // Analyze similarities and differences between competitors
  competitorReviewAnalysis: string; // Analyze competitor reviews for dissatisfaction
  
  // Creative Generation Prompts
  conceptGeneration: string;
  hookGeneration: string;
  visualGeneration: string;
}

export interface AIResearchData {
  perplexityResults: Record<string, unknown>;
  audienceAnalysis: Record<string, unknown>;
  socialListeningData: Record<string, unknown>;
  lastUpdated: string;
}

export interface AICompetitorData {
  competitorWebsites: Record<string, unknown>;
  competitorReviews: Record<string, unknown>;
  gapAnalysis: Record<string, unknown>;
  lastUpdated: string;
}

export interface AIAnalysisResults {
  generatedAngles: Angle[];
  generatedPersonas: Persona[];
  generatedConcepts: Concept[];
  generatedHooks: Hook[];
  generatedVisuals: Visual[];
  lastUpdated: string;
}

// New synthesis structure for living document
export interface SynthesisItem {
  id: string;
  text: string;
  source: 'research' | 'competitor' | 'social' | 'organic' | 'ads' | 'ai' | 'manual';
  sourceDetails?: string;
  dateAdded: string;
  relevance: number; // 1-5 score
  evidence?: Array<{
    type: 'review' | 'statistic' | 'information';
    text: string;
    url?: string;
  }>;
}

export interface SynthesisData {
  angles: SynthesisItem[];
  benefits: SynthesisItem[];
  painPoints: SynthesisItem[];
  features: SynthesisItem[];
  objections: SynthesisItem[];
  failedSolutions: SynthesisItem[];
  other: SynthesisItem[];
}

export interface OneSheet {
  id: string;
  brand_id: string;
  user_id: string;
  
  // Basic Information
  product?: string;
  landing_page_url?: string;
  customer_reviews_url?: string;
  prompt_cheatsheet_url?: string;
  
  // Section One: Audience Research
  research_checklist: ResearchChecklist;
  angles: Angle[];
  audience_insights: AudienceInsight[]; // Changed from Record to Array
  personas: Persona[];
  social_listening_data: SocialListeningData;
  organic_research_data: OrganicResearchData;
  
  // Section Two: Competitor Research
  competitor_analysis: CompetitorAnalysis[];
  competitive_notes?: string;
  
  // Section Three: Ad Account Audit
  ad_account_data: AdAccountData;
  ad_performance_data: AdPerformanceData[]; // Individual ad data
  key_learnings: KeyLearnings;
  
  // Section Four: Creative Brainstorm
  concepts: Concept[];
  hooks: Hook[];
  visuals: Visual[];
  brainstorm_notes?: string;
  
  // AI Features Data
  ai_prompt_templates: AIPromptTemplates;
  ai_research_data: AIResearchData;
  ai_competitor_data: AICompetitorData;
  ai_analysis_results: AIAnalysisResults;
  
  // Living Document Synthesis
  synthesis_data: SynthesisData;
  last_synthesis_update?: string;
  
  // NEW: Revamp fields
  manual_entries?: ManualEntries;
  creative_outputs?: CreativeOutputs;
  context_loaded?: ContextLoaded;
  workflow_stage?: WorkflowStage;
  last_context_update?: string;
  
  // NEW: Stages tracking
  current_stage?: CurrentStage;
  stages_completed?: StagesCompleted;
  audience_research?: AudienceResearchData;
  competitor_research?: CompetitorResearchData;
  ad_account_audit?: AdAccountAuditData;
  creative_brainstorm?: CreativeBrainstormData;
  
  // Customization
  custom_sections?: Array<{
    id: string;
    title: string;
    content: string;
    position: number;
  }>;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CreateOneSheetRequest {
  brand_id: string;
  product?: string;
  landing_page_url?: string;
  customer_reviews_url?: string;
  prompt_cheatsheet_url?: string;
}

export interface UpdateOneSheetRequest {
  id: string;
  product?: string;
  landing_page_url?: string;
  customer_reviews_url?: string;
  prompt_cheatsheet_url?: string;
  research_checklist?: Partial<ResearchChecklist>;
  angles?: Angle[];
  audience_insights?: AudienceInsight[];
  personas?: Persona[];
  competitor_analysis?: CompetitorAnalysis[];
  competitive_notes?: string;
  ad_account_data?: Partial<AdAccountData>;
  key_learnings?: Partial<KeyLearnings>;
  concepts?: Concept[];
  hooks?: Hook[];
  visuals?: Visual[];
  ai_research_data?: Partial<AIResearchData>;
  ai_competitor_data?: Partial<AICompetitorData>;
  ai_analysis_results?: Partial<AIAnalysisResults>;
}

// AI Prompt Templates
export interface AIPromptRequest {
  type: 'audience_research' | 'competitor_analysis' | 'gap_analysis' | 'concept_generation' | 'hook_generation' | 'persona_generation';
  input: string;
  context?: {
    brand_info?: Record<string, unknown>;
    existing_data?: Record<string, unknown>;
    website_url?: string;
    competitors?: string[];
  };
  model?: 'gemini-1.5-pro' | 'claude-3.5-sonnet';
}

export interface AIPromptResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  usage?: {
    model: string;
    tokens_used: number;
    cost_estimate?: number;
  };
}

// New types for OneSheet revamp
export interface ContextData {
  id: string;
  onesheet_id: string;
  source_type: 'brand_website' | 'brand_social' | 'competitor_website' | 'competitor_social' | 'competitor_ads' | 'reddit' | 'quora' | 'tiktok' | 'youtube' | 'reviews' | 'articles' | 'other';
  source_name?: string;
  source_url?: string;
  content_text?: string;
  extracted_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  brand_type?: 'our_brand' | 'competitor' | 'neutral';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ManualEntries {
  angles: Angle[];
  benefits: SynthesisItem[];
  painPoints: SynthesisItem[];
  features: SynthesisItem[];
  objections: SynthesisItem[];
  failedSolutions: SynthesisItem[];
  personas: Persona[];
  competitors: CompetitorAnalysis[];
  hooks: Hook[];
  visuals: Visual[];
}

export interface CreativeOutputs {
  imageConcepts: ImageConcept[];
  videoConcepts: VideoConcept[];
  hooksByAngle: Record<string, Hook[]>;
  visualsByAngle: Record<string, Visual[]>;
}

export interface ImageConcept {
  id: string;
  title: string;
  description: string;
  angle: string;
  visualStyle: string;
  midjourneyPrompt?: string;
  inspiration: {
    source: string;
    sourceUrl?: string;
  };
  priority: number;
  created_at: string;
}

export interface VideoConcept {
  id: string;
  title: string;
  description: string;
  angle: string;
  format: string; // 'ugc', 'testimonial', 'demonstration', etc.
  duration: string; // '15s', '30s', '60s'
  hook: string;
  script?: string;
  inspiration: {
    source: string;
    sourceUrl?: string;
  };
  priority: number;
  created_at: string;
}

export interface ContextLoaded {
  brandWebsite: boolean;
  brandSocial: boolean;
  competitorWebsite: boolean;
  competitorSocial: boolean;
  competitorAds: boolean;
  reviews: boolean;
  reddit: boolean;
  articles: boolean;
  organicContent: boolean;
}

export type WorkflowStage = 'context_loading' | 'audience_research' | 'competitor_analysis' | 'social_listening' | 'performance_audit' | 'synthesis' | 'creative_generation' | 'completed';

// New types for OneSheet Stages

// Stage 1: Audience Research Types
export interface AudienceResearchItem {
  id: string;
  content: string;
  evidence: Array<{
    type: 'review' | 'statistic' | 'information' | 'social';
    text: string;
    source: string;
    url?: string;
  }>;
  priority?: number;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AudiencePersona {
  id: string;
  name: string;
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
  awarenessLevel: 'unaware' | 'problemAware' | 'solutionAware' | 'productAware' | 'mostAware';
  quote?: string; // Representative quote from this persona
  priority?: number;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AudienceResearchData {
  angles: AudienceResearchItem[];
  benefits: AudienceResearchItem[];
  painPoints: AudienceResearchItem[];
  features: AudienceResearchItem[];
  objections: AudienceResearchItem[];
  failedSolutions: AudienceResearchItem[];
  other: AudienceResearchItem[];
  personas: AudiencePersona[];
}

// Stage 2: Enhanced Competitor Research Types
export interface CompetitorData {
  id: string;
  name: string;
  website?: string;
  similarities: string[];
  differences: string[];
  opportunities: {
    formats: string[];
    messaging: string[];
  };
  landingPages: Array<{
    url: string;
    description: string;
  }>;
  adLinks: Array<{
    platform: 'facebook' | 'instagram' | 'tiktok' | 'youtube';
    url: string;
    description?: string;
  }>;
  deepAnalysis?: {
    isHigherQuality: string;
    whyBetterChoice: string;
    formatStrategies: string[];
    creatorApproaches: string[];
    learningsOverTime: Array<{
      date: string;
      learning: string;
      source: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorResearchData {
  competitors: CompetitorData[];
  deepAnalysis: {
    qualityComparison: Record<string, string>;
    formatStrategies: Record<string, string[]>;
    creatorApproaches: Record<string, string[]>;
    learningsOverTime: Array<{
      date: string;
      learning: string;
      competitorId: string;
    }>;
  };
}

// Stage 3: Ad Account Audit Types
export interface AdData {
  id: string;
  url: string;
  adName?: string;
  landingPage: string;
  spend: number;
  cpa: number;
  hookRate: number;
  holdRate: number;
  type: 'highProductionVideo' | 'lowProductionVideo' | 'static' | 'gif' | 'carousel';
  duration?: number; // in seconds
  productIntro?: number; // when product is shown (seconds)
  creatorsUsed: number;
  angle: string;
  format: string;
  emotion: 'happiness' | 'excitement' | 'hopefulness' | 'curiosity' | 'urgency' | 'fear';
  framework: 'AIDA' | 'PAS' | 'QUEST' | 'other';
  transcription?: string;
  dateRange: string;
  createdAt: string;
}

export interface AdAccountAuditData {
  ads: AdData[];
  demographicBreakdown: {
    age: Record<string, number>;
    gender: Record<string, number>;
    placement: Record<string, number>;
  };
  performanceByAngle: Record<string, {
    spend: number;
    avgCPA: number;
    avgHoldRate: number;
    count: number;
  }>;
  performanceByFormat: Record<string, {
    spend: number;
    avgCPA: number;
    avgHoldRate: number;
    count: number;
  }>;
  performanceByEmotion: Record<string, {
    spend: number;
    avgCPA: number;
    avgHoldRate: number;
    count: number;
  }>;
  performanceByFramework: Record<string, {
    spend: number;
    avgCPA: number;
    avgHoldRate: number;
    count: number;
  }>;
}

// Stage 4: Creative Brainstorm Types
export interface CreativeConcept {
  id: string;
  title: string;
  description: string;
  angle: string;
  targetPersona?: string;
  priority: number;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeHook {
  id: string;
  text: string;
  angle: string;
  targetPersona?: string;
  variations?: string[];
  priority: number;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeVisual {
  id: string;
  description: string;
  angle: string;
  type: 'static' | 'video' | 'carousel' | 'gif';
  style?: string;
  priority: number;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreativeBrainstormData {
  concepts: CreativeConcept[];
  hooks: CreativeHook[];
  visuals: CreativeVisual[];
}

// Stage tracking
export interface StagesCompleted {
  context: boolean;
  audience_research: boolean;
  competitor_research: boolean;
  ad_audit: boolean;
  creative_brainstorm: boolean;
}

export type CurrentStage = 'context_loading' | 'audience_research' | 'competitor_research' | 'ad_audit' | 'creative_brainstorm' | 'completed'; 