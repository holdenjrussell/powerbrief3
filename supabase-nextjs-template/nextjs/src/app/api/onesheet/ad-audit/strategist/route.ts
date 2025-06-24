import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

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

export async function POST(request: NextRequest) {
  try {
    const { onesheet_id } = await request.json();
    
    if (!onesheet_id) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get the onesheet data including all analyzed ads
    const { data: onesheet, error: onesheetError } = await supabase
      .from('onesheet')
      .select('ad_account_audit, brand_id')
      .eq('id', onesheet_id)
      .single();
      
    if (onesheetError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const ads = onesheet.ad_account_audit?.ads || [];
    const analyzedAds = ads.filter((ad: AdData) => ad.angle); // Only ads that have been analyzed
    
    if (analyzedAds.length === 0) {
      return NextResponse.json({ error: 'No analyzed ads found' }, { status: 400 });
    }

    // Get AI instructions including benchmarks
    const { data: instructions, error: instructionsError } = await supabase
      .from('onesheet_ai_instructions')
      .select('*')
      .eq('onesheet_id', onesheet_id)
      .single();

    if (instructionsError) {
      console.error('Error loading AI instructions:', instructionsError);
    }

    const benchmarkRoas = instructions?.benchmark_roas || 2.0;
    const benchmarkHookRate = instructions?.benchmark_hook_rate || 3.0;
    const benchmarkHoldRate = instructions?.benchmark_hold_rate || 50.0;
    const benchmarkSpend = instructions?.benchmark_spend || 100.0;

    // Prepare data for Gemini
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

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            summary: { type: SchemaType.STRING, description: 'Executive summary of the analysis' },
            topPerformers: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  adId: { type: SchemaType.STRING },
                  adName: { type: SchemaType.STRING },
                  spend: { type: SchemaType.NUMBER },
                  roas: { type: SchemaType.NUMBER },
                  keySuccessFactors: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                },
                required: ['adId', 'adName', 'spend', 'roas', 'keySuccessFactors']
              }
            },
            worstPerformers: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  adId: { type: SchemaType.STRING },
                  adName: { type: SchemaType.STRING },
                  spend: { type: SchemaType.NUMBER },
                  roas: { type: SchemaType.NUMBER },
                  failureReasons: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                },
                required: ['adId', 'adName', 'spend', 'roas', 'failureReasons']
              }
            },
            creativePatterns: {
              type: SchemaType.OBJECT,
              properties: {
                winningElements: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                losingElements: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                optimalSitInProblemRange: { type: SchemaType.STRING },
                bestPerformingHooks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              },
              required: ['winningElements', 'losingElements', 'optimalSitInProblemRange', 'bestPerformingHooks']
            },
            recommendations: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  priority: { type: SchemaType.STRING },
                  recommendation: { type: SchemaType.STRING },
                  expectedImpact: { type: SchemaType.STRING }
                },
                required: ['priority', 'recommendation', 'expectedImpact']
              }
            }
          },
          required: ['summary', 'topPerformers', 'worstPerformers', 'creativePatterns', 'recommendations']
        }
      },
      systemInstruction: instructions?.strategist_system_instructions || `You are a world-class performance marketing strategist with deep expertise in Facebook/Meta advertising. You analyze ad performance data to identify patterns, insights, and actionable recommendations that can dramatically improve campaign performance.

Your analysis should:
1. Identify clear patterns between high and low performing ads
2. Consider both creative elements AND performance metrics
3. Weight spend as the most important factor (high spend = Meta's algorithm found success)
4. Balance spend with ROAS to identify truly scalable winners
5. Provide specific, actionable recommendations
6. Focus on insights that can be applied to future ad creation

Use the provided benchmarks to categorize performance, but also consider relative performance within the dataset.

IMPORTANT: Your response MUST be valid JSON and nothing else.`
    });

    const prompt = instructions?.strategist_prompt_template ? 
      instructions.strategist_prompt_template
        .replace('{{adsData}}', JSON.stringify(adsData, null, 2))
        .replace('{{benchmarkRoas}}', benchmarkRoas.toString())
        .replace('{{benchmarkHookRate}}', benchmarkHookRate.toString())
        .replace('{{benchmarkHoldRate}}', benchmarkHoldRate.toString())
        .replace('{{benchmarkSpend}}', benchmarkSpend.toString())
        .replace('{{totalAds}}', adsData.length.toString())
      : 
      `Analyze the following ${adsData.length} Facebook ads and provide strategic insights.

Benchmarks for good performance:
- ROAS: ${benchmarkRoas} or higher
- Hook Rate: ${benchmarkHookRate}% or higher
- Hold Rate: ${benchmarkHoldRate}% or higher
- Minimum Spend for Significance: $${benchmarkSpend}

Ads Data:
${JSON.stringify(adsData, null, 2)}

Analyze these ads comprehensively:
1. Identify the top 3-5 performers based on spend and ROAS combination
2. Identify the worst 3-5 performers that had significant spend but poor ROAS
3. Find patterns in creative elements between winners and losers
4. Determine the optimal sit-in-problem percentage range
5. Identify the best performing hooks (first few seconds of transcription)
6. Provide 3-5 specific, actionable recommendations prioritized by impact

Focus on patterns that can be replicated in future ad creation.`;

    // Get the analysis from Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    const analysisText = response.text();
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch {
      console.error('Failed to parse Gemini response:', analysisText);
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Add metadata
    const strategistOpinion = {
      ...analysis,
      analyzedAt: new Date().toISOString(),
      totalAdsAnalyzed: adsData.length
    };

    // Save the strategist opinion to the database
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({ ai_strategist_opinion: strategistOpinion })
      .eq('id', onesheet_id);

    if (updateError) {
      console.error('Error saving strategist opinion:', updateError);
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      data: strategistOpinion
    });

  } catch (error) {
    console.error('Error in strategist analysis:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run strategist analysis' },
      { status: 500 }
    );
  }
} 