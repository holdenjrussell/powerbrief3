import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
const fileManager = new GoogleAIFileManager(process.env.GOOGLE_GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { onesheet_id, ad_ids } = await request.json();

    if (!onesheet_id) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get onesheet with ad audit data
    const { data: onesheet, error: onesheetError } = await supabase
      .from('onesheet')
      .select('*')
      .eq('id', onesheet_id)
      .single();

    if (onesheetError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const adAuditData = onesheet.ad_account_audit || { ads: [] };
    let adsToAnalyze = adAuditData.ads || [];

    // Filter to specific ads if provided
    if (ad_ids && ad_ids.length > 0) {
      adsToAnalyze = adsToAnalyze.filter((ad: any) => ad_ids.includes(ad.id));
    }

    // Filter to only ads that haven't been analyzed yet
    adsToAnalyze = adsToAnalyze.filter((ad: any) => !ad.angle);

    if (adsToAnalyze.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No ads need analysis' 
      });
    }

    console.log(`Analyzing ${adsToAnalyze.length} ads with Gemini`);

    // Process ads in batches
    const batchSize = 5;
    const analyzedAds = [];

    for (let i = 0; i < adsToAnalyze.length; i += batchSize) {
      const batch = adsToAnalyze.slice(i, i + batchSize);
      
      // Process each ad in the batch
      const batchPromises = batch.map(async (ad: any) => {
        try {
          // Skip if no video/image asset
          if (!ad.assetUrl || ad.assetType === 'unknown') {
            return ad;
          }

          // For video ads, we'll analyze the thumbnail and creative text
          // In a production environment, you'd download and upload the video to Gemini
          
          const analysisPrompt = `
          Analyze this Facebook ad creative and provide the following information:

          Ad Name: ${ad.name}
          Creative Title: ${ad.creativeTitle}
          Creative Body: ${ad.creativeBody}
          Asset Type: ${ad.assetType}

          Please analyze and return in JSON format:
          {
            "type": "High Production Video|Low Production Video (UGC)|Static Image|Carousel|GIF",
            "adDuration": number (in seconds, estimate if image),
            "productIntro": number (seconds when product first shown/mentioned),
            "creatorsUsed": number (visible people in the ad),
            "angle": "Weight Management|Time/Convenience|Energy/Focus|Digestive Health|Immunity Support|etc",
            "format": "Testimonial|Podcast Clip|Authority Figure|3 Reasons Why|Unboxing|etc",
            "emotion": "Hopefulness|Excitement|Curiosity|Urgency|Fear|Trust|etc",
            "framework": "PAS|AIDA|FAB|Star Story Solution|Before After Bridge|etc",
            "transcription": "Full transcription if video, or main text if image"
          }

          Base your analysis on the creative text and ad name patterns.
          `;

          const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-thinking-exp",
            generationConfig: {
              responseMimeType: "application/json"
            }
          });

          const result = await model.generateContent(analysisPrompt);
          const analysis = JSON.parse(result.response.text());

          // Calculate sit in problem percentage
          const sitInProblem = analysis.adDuration > 0 
            ? ((analysis.productIntro / analysis.adDuration) * 100).toFixed(1)
            : '0';

          return {
            ...ad,
            ...analysis,
            sitInProblem
          };
        } catch (error) {
          console.error(`Error analyzing ad ${ad.id}:`, error);
          return ad; // Return unmodified if analysis fails
        }
      });

      const batchResults = await Promise.all(batchPromises);
      analyzedAds.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < adsToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Update the onesheet with analyzed ads
    const updatedAds = adAuditData.ads.map((ad: any) => {
      const analyzed = analyzedAds.find((a: any) => a.id === ad.id);
      return analyzed || ad;
    });

    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        ad_account_audit: {
          ...adAuditData,
          ads: updatedAds,
          lastAnalyzed: new Date().toISOString()
        }
      })
      .eq('id', onesheet_id);

    if (updateError) {
      console.error('Error updating onesheet:', updateError);
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        adsAnalyzed: analyzedAds.length,
        totalAds: updatedAds.length
      }
    });

  } catch (error) {
    console.error('Error in ad analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze ads' },
      { status: 500 }
    );
  }
} 