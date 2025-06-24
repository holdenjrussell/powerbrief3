import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface AdData {
  id: string;
  name: string;
  spend: string;
  roas: string;
  cpa: string;
  purchaseRevenue?: string;
  hookRate: string;
  holdRate: string;
  type?: string;
  adDuration?: number | string;
  productIntro?: number | string;
  sitInProblemSeconds?: number;
  sitInProblem?: string;
  angle?: string;
  format?: string;
  emotion?: string;
  framework?: string;
  awarenessLevel?: string;
  contentVariables?: string;
  transcription?: string;
  visualDescription?: string;
}

// Helper function to build strategist prompt from template
function buildStrategistPrompt(template: string, variables: Record<string, string>) {
  let prompt = template;
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    prompt = prompt.replace(placeholder, value);
  });
  return prompt;
}

export async function POST(request: NextRequest) {
  console.log('[Strategist] Starting AI strategist analysis...');
  
  try {
    const { onesheet_id, iteration_count } = await request.json();
    console.log(`[Strategist] Request data: onesheet_id=${onesheet_id}, iteration_count=${iteration_count}`);
    
    if (!onesheet_id) {
      console.error('[Strategist] Missing onesheet_id in request');
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get the onesheet data including all analyzed ads
    console.log(`[Strategist] Fetching onesheet data for ID: ${onesheet_id}`);
    const { data: onesheet, error: onesheetError } = await supabase
      .from('onesheet')
      .select('ad_account_audit, brand_id')
      .eq('id', onesheet_id)
      .single();
      
    if (onesheetError || !onesheet) {
      console.error('[Strategist] OneSheet not found:', onesheetError);
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const ads = onesheet.ad_account_audit?.ads || [];
    const analyzedAds = ads.filter((ad: AdData) => ad.angle); // Only ads that have been analyzed
    console.log(`[Strategist] Found ${ads.length} total ads, ${analyzedAds.length} analyzed ads`);
    
    if (analyzedAds.length === 0) {
      console.error('[Strategist] No analyzed ads found');
      return NextResponse.json({ error: 'No analyzed ads found' }, { status: 400 });
    }

    // Get AI instructions including benchmarks and new settings
    console.log(`[Strategist] Fetching AI instructions for onesheet_id: ${onesheet_id}`);
    const { data: instructions, error: instructionsError } = await supabase
      .from('onesheet_ai_instructions')
      .select('*')
      .eq('onesheet_id', onesheet_id)
      .single();

    if (instructionsError || !instructions) {
      console.error('[Strategist] AI instructions not found:', instructionsError);
      return NextResponse.json({ error: 'AI instructions not found' }, { status: 404 });
    }

    console.log('[Strategist] AI instructions loaded successfully');

    // Check required fields
    if (!instructions.strategist_system_instructions) {
      console.error('[Strategist] Missing strategist system instructions');
      return NextResponse.json({ error: 'Strategist system instructions not configured' }, { status: 400 });
    }

    if (!instructions.strategist_prompt_template) {
      console.error('[Strategist] Missing strategist prompt template');
      return NextResponse.json({ error: 'Strategist prompt template not configured' }, { status: 400 });
    }

    if (!instructions.strategist_response_schema) {
      console.error('[Strategist] Missing strategist response schema');
      return NextResponse.json({ error: 'Strategist response schema not configured' }, { status: 400 });
    }

    console.log('[Strategist] All required fields validated successfully');

    const benchmarkRoas = instructions.benchmark_roas || 2.0;
    const benchmarkHookRate = instructions.benchmark_hook_rate || 3.0;
    const benchmarkHoldRate = instructions.benchmark_hold_rate || 50.0;
    const benchmarkSpend = instructions.benchmark_spend || 100.0;
    
    const lowPerformerCriteria = {
      min_spend: instructions.low_performer_criteria?.min_spend || 50,
      max_spend: instructions.low_performer_criteria?.max_spend || 500,
      max_roas: instructions.low_performer_criteria?.max_roas || 1.0,
      enabled: instructions.low_performer_criteria?.enabled !== false
    };
    
    const iterationSettings = {
      default_count: instructions.iteration_settings?.default_count || 5
    };

    const requestedIterations = iteration_count || iterationSettings.default_count;

    console.log(`[Strategist] Configuration loaded:`, {
      benchmarkRoas,
      benchmarkHookRate,
      benchmarkHoldRate,
      benchmarkSpend,
      lowPerformerCriteria,
      requestedIterations,
      model: instructions.strategist_model || 'gemini-2.5-pro'
    });

    // Prepare data for Gemini
    console.log(`[Strategist] Preparing data for ${analyzedAds.length} ads`);
    const adsData = analyzedAds.map((ad: AdData) => ({
      id: ad.id,
      name: ad.name,
      spend: parseFloat(ad.spend),
      roas: parseFloat(ad.roas),
      cpa: parseFloat(ad.cpa),
      purchaseRevenue: parseFloat(ad.purchaseRevenue || '0'),
      hookRate: ad.hookRate === 'N/A' ? null : parseFloat(ad.hookRate),
      holdRate: ad.holdRate === 'N/A' ? null : parseFloat(ad.holdRate),
      type: ad.type,
      adDuration: ad.adDuration,
      productIntro: ad.productIntro,
      sitInProblemSeconds: ad.sitInProblemSeconds,
      sitInProblem: ad.sitInProblem,
      angle: ad.angle,
      format: ad.format,
      emotion: ad.emotion,
      framework: ad.framework,
      awarenessLevel: ad.awarenessLevel,
      contentVariables: ad.contentVariables,
      transcription: ad.transcription?.substring(0, 500), // Limit transcription length
      visualDescription: ad.visualDescription?.substring(0, 500) // Limit description length
    }));

    // Build the prompt from template
    const promptVariables = {
      totalAds: adsData.length.toString(),
      benchmarkRoas: benchmarkRoas.toString(),
      benchmarkHookRate: benchmarkHookRate.toString(),
      benchmarkHoldRate: benchmarkHoldRate.toString(),
      benchmarkSpend: benchmarkSpend.toString(),
      lowPerformerMinSpend: (lowPerformerCriteria.min_spend || 50).toString(),
      lowPerformerMaxSpend: (lowPerformerCriteria.max_spend || 500).toString(),
      lowPerformerMaxRoas: (lowPerformerCriteria.max_roas || 1.0).toString(),
      iterationCount: requestedIterations.toString(),
      adsData: JSON.stringify(adsData, null, 2)
    };

    const prompt = buildStrategistPrompt(instructions.strategist_prompt_template, promptVariables);
    console.log(`[Strategist] Built prompt (${prompt.length} characters)`);

    // Initialize Gemini with configuration from database
    console.log('[Strategist] Initializing Gemini with database configuration...');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const modelName = instructions.strategist_model || 'gemini-2.5-pro';
    console.log(`[Strategist] Using model: ${modelName}`);
    
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: instructions.strategist_response_schema
      },
      systemInstruction: instructions.strategist_system_instructions
    });

    // Get the analysis from Gemini
    console.log('[Strategist] Sending request to Gemini...');
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const endTime = Date.now();
    console.log(`[Strategist] Gemini response received in ${endTime - startTime}ms`);
    const response = result.response;
    const analysisText = response.text();
    console.log(`[Strategist] Received response (${analysisText.length} characters)`);
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
      console.log('[Strategist] Successfully parsed JSON response');
      console.log(`[Strategist] Analysis contains: ${Object.keys(analysis).join(', ')}`);
    } catch (parseError) {
      console.error('[Strategist] Failed to parse Gemini response:', parseError);
      console.error('[Strategist] Raw response:', analysisText.substring(0, 500) + '...');
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Add metadata
    const strategistOpinion = {
      ...analysis,
      analyzedAt: new Date().toISOString(),
      totalAdsAnalyzed: adsData.length
    };
    console.log('[Strategist] Added metadata to analysis');

    // Save the strategist opinion to the database
    console.log('[Strategist] Saving analysis to onesheet table...');
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({ ai_strategist_opinion: strategistOpinion })
      .eq('id', onesheet_id);

    if (updateError) {
      console.error('[Strategist] Error saving strategist opinion:', updateError);
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
    }
    console.log('[Strategist] Successfully saved to onesheet table');

    // Also save to the strategist analyses table for history
    console.log('[Strategist] Saving to history table...');
    const { error: historyError } = await supabase
      .from('onesheet_strategist_analyses')
      .insert({
        onesheet_id: onesheet_id,
        brand_id: onesheet.brand_id,
        analysis_data: strategistOpinion,
        analysis_config: {
          benchmarks: {
            roas: benchmarkRoas,
            hook_rate: benchmarkHookRate,
            hold_rate: benchmarkHoldRate,
            spend: benchmarkSpend
          },
          low_performer_criteria: lowPerformerCriteria,
          iteration_count: requestedIterations
        }
      });

    if (historyError) {
      console.error('[Strategist] Error saving to history:', historyError);
      // Don't fail the request, just log the error
    } else {
      console.log('[Strategist] Successfully saved to history table');
    }

    console.log('[Strategist] Analysis completed successfully');
    return NextResponse.json({ 
      success: true,
      data: strategistOpinion
    });

  } catch (error) {
    console.error('[Strategist] Error in strategist analysis:', error);
    console.error('[Strategist] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run strategist analysis' },
      { status: 500 }
    );
  }
} 