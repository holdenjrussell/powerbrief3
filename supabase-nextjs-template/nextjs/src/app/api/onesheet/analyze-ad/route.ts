import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(`[OneSheet Analyze ${requestId}] Starting ad analysis request`);
  
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log(`[OneSheet Analyze ${requestId}] Authentication failed:`, authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[OneSheet Analyze ${requestId}] Authenticated user: ${user.id}`);

    const body = await request.json();
    const { adId, onesheetId, transcript } = body;

    console.log(`[OneSheet Analyze ${requestId}] Request body:`, {
      adId,
      onesheetId,
      transcriptLength: transcript?.length || 0,
      userId: user.id
    });

    if (!adId || !onesheetId || !transcript) {
      console.log(`[OneSheet Analyze ${requestId}] Missing required parameters`);
      return NextResponse.json({ error: 'Ad ID, OneSheet ID, and transcript are required' }, { status: 400 });
    }

    // Get the model with specific configuration for consistent JSON output
    console.log(`[OneSheet Analyze ${requestId}] Initializing Gemini model`);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-preview-05-20',
      generationConfig: {
        temperature: 0.0,
        topP: 0.0,
        responseMimeType: 'application/json'
      }
    });

    // Master tagging prompt
    const prompt = `
Analyze the following ad transcript. Based on the content, classify the ad across these categories and provide enhanced transcript analysis.
Return your answer ONLY in a valid JSON format.

Here are the possible values for each category:

"Type": ["High Production", "Low Production", "Static", "GIF", "Carousel"]
"Angle": ["Health Boost", "Time/Convenience", "Energy/Focus", "Immunity Support", "Digestive Health", "Weight Management", "General Wellness", "Value/Price", "Quality", "Social Proof"]
"Format": ["Testimonial", "Podcast", "Authority Figure", "3 Reasons Why", "UGC Review", "Problem/Solution", "Demonstration", "Comparison", "Story", "Educational"]
"Emotion": ["Happiness", "Excitement", "Hopefulness", "Curiosity", "Urgency", "Fear", "Anxiety", "Trust", "Confidence", "Empowerment"]
"Framework": ["PAS (Problem, Agitate, Solve)", "AIDA (Attention, Interest, Desire, Action)", "Features, Advantages, Benefits (FAB)", "Star, Story, Solution", "Before/After", "QUEST (Qualify, Understand, Educate, Stimulate, Transition)"]
"Product Intro (s)": [Provide an integer representing the timestamp in seconds when the product is first mentioned or shown clearly. If unknown, use 0]
"Creators Used": [Provide the number of distinct speakers/creators in the video as an integer. If unknown, use 1]
"Enhanced Transcript": [If the provided transcript lacks timestamps, create a timecoded version with [MM:SS] format based on speech patterns and content flow. If timestamps already exist, preserve them. This helps with sit-in-problem analysis.]

Here is the ad transcript:
"${transcript}"

IMPORTANT: For the "Enhanced Transcript" field, if the transcript doesn't have timestamps, estimate them based on typical speech patterns (150-200 words per minute) and add [MM:SS] timestamps throughout. This will enable better "sit in problem" percentage calculations.

Example response format:
{
  "type": "Low Production",
  "angle": "Health Boost",
  "format": "Testimonial",
  "emotion": "Trust",
  "framework": "PAS (Problem, Agitate, Solve)",
  "productIntro": 5,
  "creatorsUsed": 2,
  "enhancedTranscript": "[00:00] Are you tired of feeling sluggish? [00:05] I was too until I found this amazing supplement..."
}
`;

    console.log(`[OneSheet Analyze ${requestId}] Sending prompt to Gemini (transcript length: ${transcript.length} chars)`);
    const startTime = Date.now();
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();
    
    const aiProcessingTime = Date.now() - startTime;
    console.log(`[OneSheet Analyze ${requestId}] Gemini response received in ${aiProcessingTime}ms:`, {
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 100) + '...'
    });

    let aiAnalysis;
    try {
      aiAnalysis = JSON.parse(responseText);
      console.log(`[OneSheet Analyze ${requestId}] AI analysis parsed successfully:`, {
        type: aiAnalysis.type,
        angle: aiAnalysis.angle,
        format: aiAnalysis.format,
        emotion: aiAnalysis.emotion,
        framework: aiAnalysis.framework,
        productIntro: aiAnalysis.productIntro,
        creatorsUsed: aiAnalysis.creatorsUsed
      });
    } catch (parseError) {
      console.error(`[OneSheet Analyze ${requestId}] Failed to parse AI response:`, {
        error: parseError,
        responseText: responseText.substring(0, 500)
      });
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Update the ad performance data in OneSheet
    console.log(`[OneSheet Analyze ${requestId}] Fetching OneSheet data`);
    const { data: onesheet } = await supabase
      .from('onesheet')
      .select('ad_performance_data')
      .eq('id', onesheetId)
      .single();

    if (!onesheet) {
      console.log(`[OneSheet Analyze ${requestId}] OneSheet not found: ${onesheetId}`);
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const adPerformanceData = onesheet.ad_performance_data || [];
    const adIndex = adPerformanceData.findIndex((ad: any) => ad.id === adId);

    console.log(`[OneSheet Analyze ${requestId}] OneSheet data:`, {
      totalAds: adPerformanceData.length,
      adIndex,
      adFound: adIndex !== -1
    });

    if (adIndex === -1) {
      console.log(`[OneSheet Analyze ${requestId}] Ad not found in performance data: ${adId}`);
      return NextResponse.json({ error: 'Ad not found in performance data' }, { status: 404 });
    }

    // Update the ad with AI analysis
    const originalAd = adPerformanceData[adIndex];
    adPerformanceData[adIndex] = {
      ...originalAd,
      angle: aiAnalysis.angle,
      format: aiAnalysis.format,
      emotion: aiAnalysis.emotion,
      framework: aiAnalysis.framework,
      type: aiAnalysis.type,
      productIntro: aiAnalysis.productIntro,
      creatorsUsed: aiAnalysis.creatorsUsed,
      analyzedAt: new Date().toISOString()
    };

    console.log(`[OneSheet Analyze ${requestId}] Updating ad data:`, {
      adId,
      originalAnalyzed: !!originalAd.analyzedAt,
      newAnalysis: {
        angle: aiAnalysis.angle,
        format: aiAnalysis.format,
        emotion: aiAnalysis.emotion,
        framework: aiAnalysis.framework
      }
    });

    // Save updated data
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({ ad_performance_data: adPerformanceData })
      .eq('id', onesheetId);

    if (updateError) {
      console.error(`[OneSheet Analyze ${requestId}] Failed to update OneSheet:`, updateError);
      throw new Error(`Failed to update OneSheet: ${updateError.message}`);
    }

    console.log(`[OneSheet Analyze ${requestId}] OneSheet updated successfully`);

    // Update aggregated insights
    console.log(`[OneSheet Analyze ${requestId}] Updating aggregated insights`);
    await updateAggregatedInsights(onesheetId, adPerformanceData, requestId);

    console.log(`[OneSheet Analyze ${requestId}] Analysis completed successfully`);

    return NextResponse.json({
      success: true,
      analysis: aiAnalysis
    });

  } catch (error) {
    console.error(`[OneSheet Analyze ${requestId}] Error analyzing ad:`, error);
    return NextResponse.json(
      { error: 'Failed to analyze ad' },
      { status: 500 }
    );
  }
}

// Helper function to update aggregated insights
async function updateAggregatedInsights(onesheetId: string, adPerformanceData: any[], requestId: string) {
  console.log(`[OneSheet Analyze ${requestId}] Starting aggregated insights update`);
  
  const supabase = await createClient();
  
  // Calculate top performing angles
  const anglePerformance = adPerformanceData.reduce((acc: any, ad: any) => {
    if (!ad.angle) return acc;
    
    if (!acc[ad.angle]) {
      acc[ad.angle] = { spend: 0, totalCPA: 0, count: 0, totalHoldRate: 0 };
    }
    
    acc[ad.angle].spend += ad.spend || 0;
    acc[ad.angle].totalCPA += ad.cpa || 0;
    acc[ad.angle].count += 1;
    acc[ad.angle].totalHoldRate += ad.holdRate || 0;
    
    return acc;
  }, {});

  const topPerformingAngles = Object.entries(anglePerformance)
    .map(([angle, data]: [string, any]) => ({
      angle,
      spend: data.spend,
      cpa: data.totalCPA / data.count,
      holdRate: data.totalHoldRate / data.count
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  console.log(`[OneSheet Analyze ${requestId}] Top performing angles calculated:`, {
    angleCount: Object.keys(anglePerformance).length,
    topAngles: topPerformingAngles.map(a => a.angle)
  });

  // Calculate top performing formats
  const formatPerformance = adPerformanceData.reduce((acc: any, ad: any) => {
    if (!ad.format) return acc;
    
    if (!acc[ad.format]) {
      acc[ad.format] = { spend: 0, totalCPA: 0, count: 0, totalHoldRate: 0 };
    }
    
    acc[ad.format].spend += ad.spend || 0;
    acc[ad.format].totalCPA += ad.cpa || 0;
    acc[ad.format].count += 1;
    acc[ad.format].totalHoldRate += ad.holdRate || 0;
    
    return acc;
  }, {});

  const topPerformingFormats = Object.entries(formatPerformance)
    .map(([format, data]: [string, any]) => ({
      format,
      spend: data.spend,
      cpa: data.totalCPA / data.count,
      holdRate: data.totalHoldRate / data.count
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5);

  console.log(`[OneSheet Analyze ${requestId}] Top performing formats calculated:`, {
    formatCount: Object.keys(formatPerformance).length,
    topFormats: topPerformingFormats.map(f => f.format)
  });

  // Update ad account data
  const { data: onesheet } = await supabase
    .from('onesheet')
    .select('ad_account_data')
    .eq('id', onesheetId)
    .single();

  if (onesheet) {
    const avgCPA = adPerformanceData.reduce((sum, ad) => sum + (ad.cpa || 0), 0) / adPerformanceData.length;
    const bestHoldRate = Math.max(...adPerformanceData.map(ad => ad.holdRate || 0));
    
    const updatedAccountData = {
      ...onesheet.ad_account_data,
      topPerformingAngles,
      topPerformingFormats,
      avgCPA,
      bestHoldRate
    };

    console.log(`[OneSheet Analyze ${requestId}] Updating ad account data:`, {
      avgCPA: avgCPA.toFixed(2),
      bestHoldRate: bestHoldRate.toFixed(2),
      topAnglesCount: topPerformingAngles.length,
      topFormatsCount: topPerformingFormats.length
    });

    const { error: updateError } = await supabase
      .from('onesheet')
      .update({ ad_account_data: updatedAccountData })
      .eq('id', onesheetId);

    if (updateError) {
      console.error(`[OneSheet Analyze ${requestId}] Failed to update ad account data:`, updateError);
    } else {
      console.log(`[OneSheet Analyze ${requestId}] Ad account data updated successfully`);
    }
  } else {
    console.log(`[OneSheet Analyze ${requestId}] OneSheet not found for aggregated insights update`);
  }
} 