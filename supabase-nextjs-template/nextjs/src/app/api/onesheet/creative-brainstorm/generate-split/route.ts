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
import type { Tables, Json } from '@/lib/types/database.types';

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
    selectedIterationAdIds?: string[];
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
    iterationAds?: unknown[];
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

type PromptType = 'concepts' | 'iterations' | 'hooks' | 'visuals' | 'practices';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { onesheetId, contextOptions, promptType, model } = await request.json();

    if (!onesheetId) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    if (!promptType || !['concepts', 'iterations', 'hooks', 'visuals', 'practices'].includes(promptType)) {
      return NextResponse.json({ error: 'Valid prompt type is required' }, { status: 400 });
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

    // Use provided model or default from instructions
    const selectedModel = model || aiInstructions.creative_brainstorm_model || 'gemini-2.5-pro';
    const useClaudeModel = selectedModel.includes('claude');
    
    // Validate required fields based on model type
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

    // Generate using selected AI model with prompt-specific instructions
    let generatedData: Partial<CreativeBrainstormData>;

    if (useClaudeModel) {
      // Use Claude with section-specific prompts
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });

      const systemPrompt = getSectionSpecificSystemInstructions(aiInstructions, promptType, 'claude');
      const userPrompt = getSectionSpecificTemplate(aiInstructions, promptType, 'claude', context, contextOptions);

      const response = await anthropic.messages.create({
        model: selectedModel || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      // Claude returns text, so we need to parse the JSON
      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      generatedData = JSON.parse(responseText);
    } else {
      // Use Gemini with section-specific prompts
      const systemPrompt = getSectionSpecificSystemInstructions(aiInstructions, promptType, 'gemini');

      const model = genAI.getGenerativeModel({
        model: selectedModel || 'gemini-2.5-pro',
        systemInstruction: systemPrompt,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: getSectionSpecificSchema(aiInstructions, promptType) as any
        }
      });

      const prompt = getSectionSpecificTemplate(aiInstructions, promptType, 'gemini', context, contextOptions);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      generatedData = JSON.parse(response.text());
    }

    // Add IDs to generated items if missing
    generatedData = ensureIdsForType(generatedData, promptType);

    return NextResponse.json({
      success: true,
      data: generatedData,
      promptType
    });
  } catch (error) {
    console.error('Error generating creative brainstorm:', error);
    return NextResponse.json(
      { error: 'Failed to generate creative brainstorm' },
      { status: 500 }
    );
  }
}

function getSectionSpecificSystemInstructions(aiInstructions: Tables<'onesheet_ai_instructions'>, promptType: PromptType, modelType: string): string {
  let baseInstructions: string;
  
  if (modelType === 'claude') {
    switch (promptType) {
      case 'concepts':
        baseInstructions = aiInstructions.claude_concepts_system_instructions || aiInstructions.claude_system_instructions || '';
        break;
      case 'iterations':
        baseInstructions = aiInstructions.claude_iterations_system_instructions || aiInstructions.claude_system_instructions || '';
        break;
      case 'hooks':
        baseInstructions = aiInstructions.claude_hooks_system_instructions || aiInstructions.claude_system_instructions || '';
        break;
      case 'visuals':
        baseInstructions = aiInstructions.claude_visuals_system_instructions || aiInstructions.claude_system_instructions || '';
        break;
      case 'practices':
        baseInstructions = aiInstructions.claude_practices_system_instructions || aiInstructions.claude_system_instructions || '';
        break;
      default:
        baseInstructions = aiInstructions.claude_system_instructions || '';
    }
  } else {
    switch (promptType) {
      case 'concepts':
        baseInstructions = aiInstructions.creative_brainstorm_concepts_system_instructions || aiInstructions.creative_brainstorm_system_instructions || '';
        break;
      case 'iterations':
        baseInstructions = aiInstructions.creative_brainstorm_iterations_system_instructions || aiInstructions.creative_brainstorm_system_instructions || '';
        break;
      case 'hooks':
        baseInstructions = aiInstructions.creative_brainstorm_hooks_system_instructions || aiInstructions.creative_brainstorm_system_instructions || '';
        break;
      case 'visuals':
        baseInstructions = aiInstructions.creative_brainstorm_visuals_system_instructions || aiInstructions.creative_brainstorm_system_instructions || '';
        break;
      case 'practices':
        baseInstructions = aiInstructions.creative_brainstorm_practices_system_instructions || aiInstructions.creative_brainstorm_system_instructions || '';
        break;
      default:
        baseInstructions = aiInstructions.creative_brainstorm_system_instructions || '';
    }
  }

  const typeSpecificInstructions = {
    concepts: '\n\nFocus on generating net new creative concepts that are data-driven and innovative.',
    iterations: '\n\nFocus on analyzing the selected ads and suggesting specific improvements based on performance data.',
    hooks: '\n\nFocus on creating attention-grabbing hooks (both visual text overlays and audio/spoken hooks) that stop the scroll.',
    visuals: '\n\nFocus on describing visual treatments, scenes, and production elements that will bring concepts to life.',
    practices: '\n\nFocus on extracting actionable best practices, common pitfalls, and strategic recommendations from the data.'
  };

  return baseInstructions + typeSpecificInstructions[promptType];
}

function getSectionSpecificTemplate(
  aiInstructions: Tables<'onesheet_ai_instructions'>, 
  promptType: PromptType, 
  modelType: string,
  context: ContextData,
  contextOptions: ContextOptions
): string {
  let baseTemplate: string;
  
  if (modelType === 'claude') {
    switch (promptType) {
      case 'concepts':
        baseTemplate = aiInstructions.claude_concepts_prompt_template || aiInstructions.claude_prompt_template || '';
        break;
      case 'iterations':
        baseTemplate = aiInstructions.claude_iterations_prompt_template || aiInstructions.claude_prompt_template || '';
        break;
      case 'hooks':
        baseTemplate = aiInstructions.claude_hooks_prompt_template || aiInstructions.claude_prompt_template || '';
        break;
      case 'visuals':
        baseTemplate = aiInstructions.claude_visuals_prompt_template || aiInstructions.claude_prompt_template || '';
        break;
      case 'practices':
        baseTemplate = aiInstructions.claude_practices_prompt_template || aiInstructions.claude_prompt_template || '';
        break;
      default:
        baseTemplate = aiInstructions.claude_prompt_template || '';
    }
  } else {
    switch (promptType) {
      case 'concepts':
        baseTemplate = aiInstructions.creative_brainstorm_concepts_prompt_template || aiInstructions.creative_brainstorm_prompt_template || '';
        break;
      case 'iterations':
        baseTemplate = aiInstructions.creative_brainstorm_iterations_prompt_template || aiInstructions.creative_brainstorm_prompt_template || '';
        break;
      case 'hooks':
        baseTemplate = aiInstructions.creative_brainstorm_hooks_prompt_template || aiInstructions.creative_brainstorm_prompt_template || '';
        break;
      case 'visuals':
        baseTemplate = aiInstructions.creative_brainstorm_visuals_prompt_template || aiInstructions.creative_brainstorm_prompt_template || '';
        break;
      case 'practices':
        baseTemplate = aiInstructions.creative_brainstorm_practices_prompt_template || aiInstructions.creative_brainstorm_prompt_template || '';
        break;
      default:
        baseTemplate = aiInstructions.creative_brainstorm_prompt_template || '';
    }
  }

  let specificInstructions = '';

  switch (promptType) {
    case 'concepts':
      specificInstructions = `Generate 5-10 net new creative concepts based on the provided context. Each concept should include all specified fields including duration, product intro time, sit in problem time, number of creators, content variables, type, and format.`;
      break;
    case 'iterations':
      const iterationAdIds = contextOptions.adAccountAudit?.selectedIterationAdIds || [];
      if (iterationAdIds.length > 0) {
        specificInstructions = `Analyze the following specific ads and suggest iterations: ${iterationAdIds.join(', ')}. For each ad, provide specific changes that could improve performance.`;
      } else {
        specificInstructions = `Select the top 5 ads from the provided data that would benefit most from iteration and suggest specific improvements for each.`;
      }
      break;
    case 'hooks':
      specificInstructions = `Generate 10-15 visual hooks (text overlays) and 10-15 audio hooks (spoken in first 3 seconds) that will capture attention and drive engagement.`;
      break;
    case 'visuals':
      specificInstructions = `Generate 8-12 detailed visual treatments that could be used for the concepts. Include type (video/static/carousel/gif), duration, scenes, key elements, and color schemes.`;
      break;
    case 'practices':
      specificInstructions = `Extract and synthesize best practices from the data. Include 5-8 dos, 5-8 don'ts, 5-8 key learnings, and 5-8 strategic recommendations.`;
      break;
  }

  const prompt = baseTemplate
    .replace('{{contextData}}', JSON.stringify(context, null, 2))
    .replace('{{specificInstructions}}', specificInstructions);

  return prompt;
}

function getSectionSpecificSchema(aiInstructions: Tables<'onesheet_ai_instructions'>, promptType: PromptType): Record<string, unknown> {
  let baseSchema: Json;
  
  switch (promptType) {
    case 'concepts':
      baseSchema = aiInstructions.creative_brainstorm_concepts_response_schema || aiInstructions.creative_brainstorm_response_schema;
      break;
    case 'iterations':
      baseSchema = aiInstructions.creative_brainstorm_iterations_response_schema || aiInstructions.creative_brainstorm_response_schema;
      break;
    case 'hooks':
      baseSchema = aiInstructions.creative_brainstorm_hooks_response_schema || aiInstructions.creative_brainstorm_response_schema;
      break;
    case 'visuals':
      baseSchema = aiInstructions.creative_brainstorm_visuals_response_schema || aiInstructions.creative_brainstorm_response_schema;
      break;
    case 'practices':
      baseSchema = aiInstructions.creative_brainstorm_practices_response_schema || aiInstructions.creative_brainstorm_response_schema;
      break;
    default:
      baseSchema = aiInstructions.creative_brainstorm_response_schema;
  }

  const parsedSchema = typeof baseSchema === 'string' ? JSON.parse(baseSchema) : baseSchema;
  
  switch (promptType) {
    case 'concepts':
      return {
        type: 'object',
        properties: {
          netNewConcepts: (parsedSchema as Record<string, any>)?.properties?.netNewConcepts
        }
      };
    case 'iterations':
      return {
        type: 'object',
        properties: {
          iterations: (parsedSchema as Record<string, any>)?.properties?.iterations
        }
      };
    case 'hooks':
      return {
        type: 'object',
        properties: {
          hooks: (parsedSchema as Record<string, any>)?.properties?.hooks
        }
      };
    case 'visuals':
      return {
        type: 'object',
        properties: {
          visuals: (parsedSchema as Record<string, any>)?.properties?.visuals
        }
      };
    case 'practices':
      return {
        type: 'object',
        properties: {
          creativeBestPractices: (parsedSchema as Record<string, any>)?.properties?.creativeBestPractices
        }
      };
    default:
      return parsedSchema as Record<string, unknown>;
  }
}

function ensureIdsForType(data: Record<string, unknown>, promptType: PromptType): Record<string, unknown> {
  switch (promptType) {
    case 'concepts':
      return {
        netNewConcepts: (data.netNewConcepts as Array<Record<string, unknown>>)?.map((concept: Record<string, unknown>) => ({
          ...concept,
          id: concept.id || uuidv4()
        })) || []
      };
    case 'iterations':
      return {
        iterations: data.iterations || []
      };
    case 'hooks':
      return {
        hooks: {
          visual: ((data.hooks as Record<string, unknown>)?.visual as Array<Record<string, unknown>>)?.map((hook: Record<string, unknown>) => ({
            ...hook,
            id: hook.id || uuidv4()
          })) || [],
          audio: ((data.hooks as Record<string, unknown>)?.audio as Array<Record<string, unknown>>)?.map((hook: Record<string, unknown>) => ({
            ...hook,
            id: hook.id || uuidv4()
          })) || []
        }
      };
    case 'visuals':
      return {
        visuals: (data.visuals as Array<Record<string, unknown>>)?.map((visual: Record<string, unknown>) => ({
          ...visual,
          id: visual.id || uuidv4()
        })) || []
      };
    case 'practices':
      return {
        creativeBestPractices: data.creativeBestPractices || {
          dos: [],
          donts: [],
          keyLearnings: [],
          recommendations: []
        }
      };
    default:
      return data;
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
    // Add iteration-specific ads
    if (contextOptions.adAccountAudit.selectedIterationAdIds?.length) {
      adData.iterationAds = audit.ads.filter((ad: { id: string }) =>
        contextOptions.adAccountAudit?.selectedIterationAdIds?.includes(ad.id)
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