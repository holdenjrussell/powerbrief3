import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import type { 
  CreativeBrainstormData,
  AudienceResearchData,
  CompetitorResearchData,
  AdAccountAuditData
} from '@/lib/types/onesheet';

interface ContextOptions {
  contextHub?: {
    websites?: boolean;
    reviews?: boolean;
    reddit?: boolean;
    articles?: boolean;
    socialContent?: boolean;
  };
  audienceResearch?: {
    angles?: boolean;
    benefits?: boolean;
    painPoints?: boolean;
    features?: boolean;
    objections?: boolean;
    failedSolutions?: boolean;
    other?: boolean;
    personas?: boolean;
  };
  competitorResearch?: {
    competitors?: boolean;
    strategicAnalysis?: boolean;
  };
  adAccountAudit?: {
    fullDataTable?: boolean;
    selectedAds?: boolean;
    selectedAdIds?: string[];
  };
  demographics?: {
    includeVisualizations?: boolean;
  };
  aiStrategist?: {
    analysisSummary?: boolean;
    strategicSummary?: boolean;
    recommendations?: boolean;
    creativePatterns?: boolean;
    losingElements?: boolean;
    bestPerformingHooks?: boolean;
    optimalSitInProblemRange?: boolean;
    topPerformingAds?: boolean;
    lowPerformingAds?: boolean;
  };
}

interface ContextData {
  product?: string;
  landingPage?: string;
  contextHub?: {
    websites?: unknown[];
    reviews?: unknown[];
    reddit?: unknown[];
    articles?: unknown[];
    socialContent?: unknown[];
  };
  audienceResearch?: Partial<AudienceResearchData>;
  competitorResearch?: Partial<CompetitorResearchData>;
  adAccountAudit?: {
    allAds?: unknown[];
    selectedAds?: unknown[];
  };
  demographics?: AdAccountAuditData['demographicBreakdown'];
  aiStrategist?: {
    analysisSummary?: unknown;
    strategicSummary?: unknown;
    recommendations?: unknown;
    creativePatterns?: unknown;
    losingElements?: unknown;
    bestPerformingHooks?: unknown;
    optimalSitInProblemRange?: unknown;
    topPerformingAds?: unknown;
    lowPerformingAds?: unknown;
  };
}

interface OneSheetRecord {
  id: string;
  user_id: string;
  product?: string;
  landing_page_url?: string;
  audience_research?: AudienceResearchData;
  competitor_research?: CompetitorResearchData;
  ad_account_audit?: AdAccountAuditData;
  ai_strategist_opinion?: unknown;
  creative_brainstorm?: CreativeBrainstormData;
  stages_completed?: Record<string, boolean>;
  [key: string]: unknown;
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { onesheetId, contextOptions } = await request.json();

    if (!onesheetId) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    // Fetch OneSheet data and AI instructions
    const [onesheetResult, aiInstructionsResult] = await Promise.all([
      supabase
        .from('onesheet')
        .select('*')
        .eq('id', onesheetId)
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('onesheet_ai_instructions')
        .select('*')
        .eq('onesheet_id', onesheetId)
        .single()
    ]);

    if (onesheetResult.error || !onesheetResult.data) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    if (aiInstructionsResult.error || !aiInstructionsResult.data) {
      return NextResponse.json({ error: 'AI instructions not found' }, { status: 404 });
    }

    const onesheet = onesheetResult.data;
    const aiInstructions = aiInstructionsResult.data;

    // Validate required fields based on model type
    const useClaudeModel = aiInstructions.creative_brainstorm_model?.includes('claude');
    
    if (useClaudeModel) {
      if (!aiInstructions.claude_system_instructions || !aiInstructions.claude_prompt_template) {
        return NextResponse.json({ 
          error: 'Claude system instructions and prompt template must be configured in settings' 
        }, { status: 400 });
      }
    } else {
      if (!aiInstructions.creative_brainstorm_system_instructions || 
          !aiInstructions.creative_brainstorm_prompt_template || 
          !aiInstructions.creative_brainstorm_response_schema) {
        return NextResponse.json({ 
          error: 'Gemini system instructions, prompt template, and response schema must be configured in settings' 
        }, { status: 400 });
      }
    }

    // Validate ad selection if required
    if (contextOptions?.adAccountAudit?.selectedAds && 
        (!contextOptions.adAccountAudit.selectedAdIds || contextOptions.adAccountAudit.selectedAdIds.length === 0)) {
      return NextResponse.json({ 
        error: 'Please select at least one ad to analyze' 
      }, { status: 400 });
    }

    // Build context based on selected options
    const context = await buildContext(onesheet, contextOptions, supabase);

    // Generate using selected AI model
    let generatedData: CreativeBrainstormData;

    if (useClaudeModel) {
      // Use Claude
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });

      const response = await anthropic.messages.create({
        model: aiInstructions.claude_model || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.7,
        system: aiInstructions.claude_system_instructions,
        messages: [
          {
            role: 'user',
            content: buildPrompt(
              aiInstructions.claude_prompt_template,
              context
            )
          }
        ]
      });

      // Claude returns text, so we need to parse the JSON
      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      generatedData = JSON.parse(responseText);
    } else {
      // Use Gemini
      const model = genAI.getGenerativeModel({
        model: aiInstructions.creative_brainstorm_model || 'gemini-2.5-flash-lite-preview-06-17',
        systemInstruction: aiInstructions.creative_brainstorm_system_instructions,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: aiInstructions.creative_brainstorm_response_schema
        }
      });

      const prompt = buildPrompt(
        aiInstructions.creative_brainstorm_prompt_template,
        context
      );

      const result = await model.generateContent(prompt);
      const response = await result.response;
      generatedData = JSON.parse(response.text());
    }

    // Add IDs to generated items if missing
    generatedData = ensureIds(generatedData);

    // Save the generated data
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        creative_brainstorm: generatedData,
        stages_completed: {
          ...onesheet.stages_completed,
          creative_brainstorm: true
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', onesheetId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to save creative brainstorm data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: generatedData
    });
  } catch (error) {
    console.error('Error generating creative brainstorm:', error);
    return NextResponse.json(
      { error: 'Failed to generate creative brainstorm' },
      { status: 500 }
    );
  }
}

async function buildContext(
  onesheet: OneSheetRecord,
  contextOptions: ContextOptions,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ContextData> {
  const context: ContextData = {
    product: onesheet.product || '',
    landingPage: onesheet.landing_page_url || ''
  };

  // Add Context Hub data
  if (contextOptions.contextHub) {
    const contextData: ContextData['contextHub'] = {};

    // Fetch context data
    const { data: contextRecords } = await supabase
      .from('context_data')
      .select('*')
      .eq('onesheet_id', onesheet.id)
      .eq('is_active', true);

    if (contextRecords) {
      if (contextOptions.contextHub.websites) {
        contextData.websites = contextRecords.filter((r: { source_type: string }) =>
          r.source_type === 'brand_website' || r.source_type === 'competitor_website'
        );
      }
      if (contextOptions.contextHub.reviews) {
        contextData.reviews = contextRecords.filter((r: { source_type: string }) => r.source_type === 'reviews');
      }
      if (contextOptions.contextHub.reddit) {
        contextData.reddit = contextRecords.filter((r: { source_type: string }) => r.source_type === 'reddit');
      }
      if (contextOptions.contextHub.articles) {
        contextData.articles = contextRecords.filter((r: { source_type: string }) => r.source_type === 'articles');
      }
      if (contextOptions.contextHub.socialContent) {
        contextData.socialContent = contextRecords.filter((r: { source_type: string }) => r.source_type === 'social_content');
      }
    }

    context.contextHub = contextData;
  }

  // Add Audience Research data
  if (contextOptions.audienceResearch && onesheet.audience_research) {
    const audienceData: Partial<AudienceResearchData> = {};
    const research = onesheet.audience_research;

    if (contextOptions.audienceResearch.angles) audienceData.angles = research.angles;
    if (contextOptions.audienceResearch.benefits) audienceData.benefits = research.benefits;
    if (contextOptions.audienceResearch.painPoints) audienceData.painPoints = research.painPoints;
    if (contextOptions.audienceResearch.features) audienceData.features = research.features;
    if (contextOptions.audienceResearch.objections) audienceData.objections = research.objections;
    if (contextOptions.audienceResearch.failedSolutions) audienceData.failedSolutions = research.failedSolutions;
    if (contextOptions.audienceResearch.other) audienceData.other = research.other;
    if (contextOptions.audienceResearch.personas) audienceData.personas = research.personas;

    context.audienceResearch = audienceData;
  }

  // Add Competitor Research data
  if (contextOptions.competitorResearch && onesheet.competitor_research) {
    const competitorData: Partial<CompetitorResearchData> = {};
    const research = onesheet.competitor_research;

    if (contextOptions.competitorResearch.competitors) {
      competitorData.competitors = research.competitors;
    }
    if (contextOptions.competitorResearch.strategicAnalysis) {
      competitorData.deepAnalysis = research.deepAnalysis;
    }

    context.competitorResearch = competitorData;
  }

  // Add Ad Account Audit data
  if (contextOptions.adAccountAudit && onesheet.ad_account_audit) {
    const adData: ContextData['adAccountAudit'] = {};
    const audit = onesheet.ad_account_audit;

    if (contextOptions.adAccountAudit.fullDataTable && !contextOptions.adAccountAudit.selectedAds) {
      adData.allAds = audit.ads;
    }
    if (contextOptions.adAccountAudit.selectedAds && contextOptions.adAccountAudit.selectedAdIds?.length) {
      adData.selectedAds = audit.ads.filter((ad: { id: string }) =>
        contextOptions.adAccountAudit?.selectedAdIds?.includes(ad.id)
      );
    }

    context.adAccountAudit = adData;
  }

  // Add Demographics data
  if (contextOptions.demographics?.includeVisualizations && onesheet.ad_account_audit) {
    const audit = onesheet.ad_account_audit;
    context.demographics = audit.demographicBreakdown;
  }

  // Add AI Strategist recommendations
  if (contextOptions.aiStrategist && onesheet.ai_strategist_opinion) {
    const strategistData: ContextData['aiStrategist'] = {};
    const opinion = onesheet.ai_strategist_opinion as Record<string, unknown>;

    if (contextOptions.aiStrategist.analysisSummary) {
      strategistData.analysisSummary = opinion.summary;
    }
    if (contextOptions.aiStrategist.strategicSummary) {
      strategistData.strategicSummary = opinion.executiveSummary;
    }
    if (contextOptions.aiStrategist.recommendations) {
      strategistData.recommendations = opinion.recommendations;
    }
    if (contextOptions.aiStrategist.creativePatterns) {
      strategistData.creativePatterns = opinion.creativePatterns;
    }
    if (contextOptions.aiStrategist.losingElements) {
      strategistData.losingElements = opinion.whatDoesntWork;
    }
    if (contextOptions.aiStrategist.bestPerformingHooks) {
      const patterns = opinion.creativePatterns as Record<string, unknown> | undefined;
      strategistData.bestPerformingHooks = patterns?.bestPerformingHooks;
    }
    if (contextOptions.aiStrategist.optimalSitInProblemRange) {
      const patterns = opinion.creativePatterns as Record<string, unknown> | undefined;
      strategistData.optimalSitInProblemRange = patterns?.optimalSitInProblemRange;
    }
    if (contextOptions.aiStrategist.topPerformingAds) {
      strategistData.topPerformingAds = opinion.topPerformers;
    }
    if (contextOptions.aiStrategist.lowPerformingAds) {
      strategistData.lowPerformingAds = opinion.lowPerformers;
    }

    context.aiStrategist = strategistData;
  }

  return context;
}

function buildPrompt(template: string, context: ContextData): string {
  return template.replace('{{contextData}}', JSON.stringify(context, null, 2));
}

function ensureIds(data: CreativeBrainstormData): CreativeBrainstormData {
  return {
    netNewConcepts: data.netNewConcepts?.map(concept => ({
      ...concept,
      id: concept.id || uuidv4()
    })) || [],
    iterations: data.iterations || [],
    hooks: {
      visual: data.hooks?.visual?.map(hook => ({
        ...hook,
        id: hook.id || uuidv4()
      })) || [],
      audio: data.hooks?.audio?.map(hook => ({
        ...hook,
        id: hook.id || uuidv4()
      })) || []
    },
    visuals: data.visuals?.map(visual => ({
      ...visual,
      id: visual.id || uuidv4()
    })) || [],
    creativeBestPractices: data.creativeBestPractices || {
      dos: [],
      donts: [],
      keyLearnings: [],
      recommendations: []
    }
  };
}


 