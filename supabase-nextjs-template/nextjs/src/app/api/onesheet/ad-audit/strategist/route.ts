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
    const { onesheet_id, iteration_count } = await request.json();
    
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

    // Get AI instructions including benchmarks and new settings
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
    
    const lowPerformerCriteria = instructions?.low_performer_criteria || {
      min_spend: 50,
      max_roas: 1.0,
      enabled: true
    };
    
    const iterationSettings = instructions?.iteration_settings || {
      default_count: 5,
      types: ['early', 'script', 'fine_tuning', 'late'],
      enabled_types: {
        early: true,
        script: true,
        fine_tuning: true,
        late: true
      }
    };

    const requestedIterations = iteration_count || iterationSettings.default_count;

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

    // Initialize Gemini with enhanced schema
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            summary: { type: SchemaType.STRING },
            executiveSummary: { type: SchemaType.STRING },
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
            lowPerformers: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  adId: { type: SchemaType.STRING },
                  adName: { type: SchemaType.STRING },
                  spend: { type: SchemaType.NUMBER },
                  roas: { type: SchemaType.NUMBER },
                  issues: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
                },
                required: ['adId', 'adName', 'spend', 'roas', 'issues']
              }
            },
            whatWorks: {
              type: SchemaType.OBJECT,
              properties: {
                hooks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                angles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                formats: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                emotions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                frameworks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                visualElements: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                contentVariables: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              },
              required: ['hooks', 'angles', 'formats', 'emotions', 'frameworks', 'visualElements', 'contentVariables']
            },
            whatDoesntWork: {
              type: SchemaType.OBJECT,
              properties: {
                hooks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                angles: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                formats: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                emotions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                frameworks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                visualElements: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                contentVariables: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              },
              required: ['hooks', 'angles', 'formats', 'emotions', 'frameworks', 'visualElements', 'contentVariables']
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
            },
            netNewConcepts: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  type: { type: SchemaType.STRING },
                  duration: { type: SchemaType.STRING },
                  productIntroSuggestion: { type: SchemaType.STRING },
                  sitInProblemSuggestion: { type: SchemaType.STRING },
                  creatorsNeeded: { type: SchemaType.NUMBER },
                  angle: { type: SchemaType.STRING },
                  awarenessLevel: { type: SchemaType.STRING },
                  contentVariables: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  format: { type: SchemaType.STRING },
                  emotion: { type: SchemaType.STRING },
                  framework: { type: SchemaType.STRING },
                  hookSuggestions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  visualNotes: { type: SchemaType.STRING }
                },
                required: ['title', 'description', 'type', 'duration', 'productIntroSuggestion', 
                          'sitInProblemSuggestion', 'creatorsNeeded', 'angle', 'awarenessLevel', 
                          'contentVariables', 'format', 'emotion', 'framework', 'hookSuggestions', 'visualNotes']
              }
            },
            iterationSuggestions: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  adId: { type: SchemaType.STRING },
                  adName: { type: SchemaType.STRING },
                  currentPerformance: {
                    type: SchemaType.OBJECT,
                    properties: {
                      spend: { type: SchemaType.NUMBER },
                      roas: { type: SchemaType.NUMBER },
                      hookRate: { type: SchemaType.NUMBER },
                      holdRate: { type: SchemaType.NUMBER }
                    },
                    required: ['spend', 'roas', 'hookRate', 'holdRate']
                  },
                  iterationType: { type: SchemaType.STRING },
                  suggestions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                  rationale: { type: SchemaType.STRING },
                  expectedImprovement: { type: SchemaType.STRING }
                },
                required: ['adId', 'adName', 'currentPerformance', 'iterationType', 'suggestions', 'rationale', 'expectedImprovement']
              }
            }
          },
          required: ['summary', 'executiveSummary', 'topPerformers', 'worstPerformers', 'lowPerformers', 
                    'whatWorks', 'whatDoesntWork', 'creativePatterns', 'recommendations', 
                    'netNewConcepts', 'iterationSuggestions']
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
7. Suggest net new concepts based on what's working
8. Provide iteration suggestions for existing ads

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
        .replace('{{lowPerformerMinSpend}}', lowPerformerCriteria.min_spend.toString())
        .replace('{{lowPerformerMaxRoas}}', lowPerformerCriteria.max_roas.toString())
        .replace('{{iterationCount}}', requestedIterations.toString())
        .replace('{{totalAds}}', adsData.length.toString())
      : 
      `Analyze the following ${adsData.length} Facebook ads and provide comprehensive strategic insights.

Benchmarks for good performance:
- ROAS: ${benchmarkRoas} or higher
- Hook Rate: ${benchmarkHookRate}% or higher
- Hold Rate: ${benchmarkHoldRate}% or higher
- Minimum Spend for Significance: $${benchmarkSpend}

Low Performer Criteria:
- Minimum Spend: $${lowPerformerCriteria.min_spend}
- Maximum ROAS: ${lowPerformerCriteria.max_roas}

Ads Data:
${JSON.stringify(adsData, null, 2)}

Provide a comprehensive analysis including:

1. EXECUTIVE SUMMARY: A concise 2-3 sentence overview for busy executives

2. TOP PERFORMERS: Identify 3-5 ads with best spend+ROAS combination

3. WORST PERFORMERS: Identify 3-5 ads with high spend but poor ROAS

4. LOW PERFORMERS: Identify ads meeting the low performer criteria (>${lowPerformerCriteria.min_spend} spend, <${lowPerformerCriteria.max_roas} ROAS)

5. WHAT WORKS: Specific elements that correlate with success
   - Hooks that grab attention
   - Angles that resonate
   - Formats that perform
   - Emotions that connect
   - Frameworks that convert
   - Visual elements that engage
   - Content variables that matter

6. WHAT DOESN'T WORK: Specific elements to avoid

7. CREATIVE PATTERNS: Deep analysis of winning vs losing elements

8. RECOMMENDATIONS: 5-7 specific, prioritized actions

9. NET NEW CONCEPTS: Suggest 3-5 completely new ad concepts based on learnings

10. ITERATION SUGGESTIONS: Provide ${requestedIterations} specific iteration suggestions for existing ads, categorized by type:
    - Early Iterations: New hooks (audio/visual) for low attention rates
    - Script Iterations: USP testing, length variations for hold rate improvement
    - Fine Tuning: Replicate winners with different creators
    - Late Iterations: New angles, formats, or transformations

Focus on actionable insights that can immediately improve performance.`;

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

    // Also save to the strategist analyses table for history
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
      console.error('Error saving to history:', historyError);
      // Don't fail the request, just log the error
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