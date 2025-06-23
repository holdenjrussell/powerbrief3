import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

// Helper to get proper MIME type from URL
const getProperMimeType = (fileUrl: string): string => {
  const urlLower = fileUrl.toLowerCase();
  
  // Check for specific file extensions
  if (urlLower.includes('.mp4')) return 'video/mp4';
  if (urlLower.includes('.mov')) return 'video/quicktime';
  if (urlLower.includes('.avi')) return 'video/x-msvideo';
  if (urlLower.includes('.webm')) return 'video/webm';
  if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'image/jpeg';
  if (urlLower.includes('.png')) return 'image/png';
  if (urlLower.includes('.gif')) return 'image/gif';
  if (urlLower.includes('.webp')) return 'image/webp';
  
  // Default fallbacks based on common asset types
  if (urlLower.includes('video') || urlLower.includes('.mp4')) return 'video/mp4';
  return 'image/jpeg'; // Default to image since most ads are images
};

// Helper function to upload files to Gemini Files API
async function uploadAssetToGeminiFilesAPI(assetUrl: string, ai: GoogleGenAI): Promise<{ fileUri: string; mimeType: string } | null> {
  let tempFilePath: string | null = null;
  let uploadedFile: { name?: string; uri?: string; mimeType?: string; state?: string } | null = null;
  
  try {
    console.log(`[Analyze] Uploading asset to Files API: ${assetUrl}`);
    
    // Fetch the file from Supabase storage
    const fileResponse = await fetch(assetUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch asset: ${fileResponse.statusText}`);
    }
    const fileBuffer = await fileResponse.arrayBuffer();
    
    // Create temp file
    const safeFileName = assetUrl.split('/').pop()?.replace(/[^a-zA-Z0-9._-]/g, '_') || 'asset';
    const tempFileName = `temp_ad_asset_${Date.now()}_${safeFileName}`;
    tempFilePath = path.join(os.tmpdir(), tempFileName);
    await fs.writeFile(tempFilePath, Buffer.from(fileBuffer));

    // Determine MIME type
    const mimeType = getProperMimeType(assetUrl);
    
    // Upload to Google Files API
    uploadedFile = await ai.files.upload({
      file: tempFilePath,
      config: { mimeType },
    });
    
    console.log(`[Analyze] File uploaded, initial state: ${uploadedFile.state}`);

    if (!uploadedFile.name) {
      throw new Error('Failed to obtain file name for uploaded file');
    }

    // Wait for file to become ACTIVE
    let attempts = 0;
    const maxAttempts = 30;
    let fileStatus = uploadedFile;
    
    while (fileStatus.state !== 'ACTIVE' && attempts < maxAttempts) {
      if (fileStatus.state === 'FAILED') {
        throw new Error('File processing failed');
      }
      
      console.log(`[Analyze] File state: ${fileStatus.state}. Waiting for ACTIVE... (${attempts + 1}/${maxAttempts})`);
      
      // Wait 10 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Check file status
      fileStatus = await ai.files.get({ name: uploadedFile.name });
      attempts++;
    }
    
    if (fileStatus.state !== 'ACTIVE') {
      throw new Error(`File did not become ACTIVE after ${maxAttempts} attempts. Final state: ${fileStatus.state}`);
    }

    if (!fileStatus.uri) {
      throw new Error('Failed to obtain URI for uploaded file');
    }

    console.log(`[Analyze] File is now ACTIVE. URI: ${fileStatus.uri}`);
    
    return {
      fileUri: fileStatus.uri,
      mimeType: fileStatus.mimeType || mimeType
    };
    
  } catch (error) {
    console.error(`[Analyze] Error uploading asset to Files API:`, error);
    
    // Clean up uploaded file if it exists
    if (uploadedFile && uploadedFile.name) {
      try {
        await ai.files.delete({ name: uploadedFile.name });
        console.log(`[Analyze] Cleaned up uploaded file: ${uploadedFile.name}`);
      } catch (deleteError) {
        console.error(`[Analyze] Failed to delete uploaded file:`, deleteError);
      }
    }
    
    return null;
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log(`[Analyze] Deleted temporary file: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error(`[Analyze] Error deleting temporary file:`, cleanupError);
      }
    }
  }
}

// Helper function to safely parse Gemini JSON responses
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGeminiJSON(jsonText: string, adId: string): any {
  try {
    // First try direct parsing
    return JSON.parse(jsonText);
  } catch {
    console.warn(`[Analyze] Initial JSON parse failed for ad ${adId}, attempting cleanup...`);
    
    try {
      // Clean up common issues
      let cleanedText = jsonText
        .trim()
        .replace(/```json\s*/g, '') // Remove markdown code blocks
        .replace(/```\s*/g, '')
        .replace(/,\s*}/g, '}') // Remove trailing commas before closing braces
        .replace(/,\s*]/g, ']') // Remove trailing commas before closing brackets
        .replace(/\n\s*\n/g, '\n') // Remove double newlines
        .replace(/\r\n/g, '\n'); // Normalize line endings
      
      // Try to find and extract valid JSON if it's embedded in other text
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }
      
      const parsed = JSON.parse(cleanedText);
      console.log(`[Analyze] Successfully parsed JSON after cleanup for ad ${adId}`);
      return parsed;
    } catch (cleanupError) {
      console.error(`[Analyze] JSON cleanup also failed for ad ${adId}:`, cleanupError);
      console.error(`[Analyze] Original text (first 500 chars):`, jsonText.substring(0, 500));
      
      // Return a default analysis object
      return {
        type: 'Unknown',
        adDuration: 0,
        productIntro: 0,
        creatorsUsed: 0,
        angle: 'Unknown',
        format: 'Unknown',
        emotion: 'Unknown',
        framework: 'Unknown',
        transcription: 'Error parsing response',
        visualDescription: 'Error parsing response',
        parsingError: true
      };
    }
  }
}

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
      adsToAnalyze = adsToAnalyze.filter((ad: Record<string, unknown>) => ad_ids.includes(String(ad.id)));
    }

    // Filter to only ads that haven't been analyzed yet OR need re-analysis for new fields
    // If specific ads are selected, always re-analyze them. Otherwise, only analyze ads missing visualDescription
    if (ad_ids && ad_ids.length > 0) {
      // Re-analyze selected ads regardless of existing analysis
      console.log(`[Analyze] Re-analyzing ${adsToAnalyze.length} selected ads`);
    } else {
      // Only analyze ads that don't have the latest analysis (missing visualDescription)
      adsToAnalyze = adsToAnalyze.filter((ad: Record<string, unknown>) => !ad.visualDescription);
    }

    if (adsToAnalyze.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No ads need analysis' 
      });
    }

    console.log(`[Analyze] Analyzing ${adsToAnalyze.length} ads with Gemini Files API`);

    // Get Gemini API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Analyze] Missing Gemini API key');
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Process ads in batches
    const batchSize = 3; // Reduced batch size due to Files API operations
    const analyzedAds = [];

    for (let i = 0; i < adsToAnalyze.length; i += batchSize) {
      const batch = adsToAnalyze.slice(i, i + batchSize);
      
      // Process each ad in the batch
      const batchPromises = batch.map(async (ad: Record<string, unknown>) => {
        try {
          // Skip all failed assets completely - no analysis for failed assets
          if (ad.assetLoadFailed) {
            console.log(`[Analyze] Skipping ad ${ad.id} - asset load failed, no analysis performed`);
            return {
              ...ad,
              analysisMethod: 'skipped-failed-asset',
              message: 'Asset failed to load - analysis skipped. Please upload asset manually first.'
            };
          }
          
          // Skip if no asset URL (these should also be marked as failed, but double-check)
          if (!ad.assetUrl) {
            console.log(`[Analyze] Skipping ad ${ad.id} - no asset URL`);
            return {
              ...ad,
              analysisMethod: 'skipped-no-asset',
              message: 'No asset available - analysis skipped.'
            };
          }

          // Only analyze ads with valid Supabase assets
          if (!String(ad.assetUrl).includes('supabase')) {
            console.log(`[Analyze] Skipping ad ${ad.id} - asset not stored in Supabase`);
            return {
              ...ad,
              analysisMethod: 'skipped-external-asset',
              message: 'Asset not stored in Supabase - analysis skipped.'
            };
          }

          // Upload asset to Files API
          const uploadedAsset = await uploadAssetToGeminiFilesAPI(String(ad.assetUrl), ai);
          
          if (!uploadedAsset) {
            console.log(`[Analyze] Failed to upload asset for ad ${ad.id} to Gemini`);
            return {
              ...ad,
              analysisMethod: 'upload-failed',
              message: 'Failed to upload asset to AI service - please try again.'
            };
          }

          // Analyze with both visual content and text
          const analysisPrompt = `
          Analyze this Facebook ad creative comprehensively using both the visual content and text information:

          Ad Name: ${ad.name}
          Creative Title: ${ad.creativeTitle}
          Creative Body: ${ad.creativeBody}
          Asset Type: ${ad.assetType}

          Please analyze the visual content (image/video) along with the text and return in JSON format:
          {
            "type": "High Production Video|Low Production Video (UGC)|Static Image|Carousel|GIF",
            "adDuration": number (in seconds for videos, estimate based on content density for images),
            "productIntro": number (seconds when product first shown/mentioned in video, or estimated for images),
            "creatorsUsed": number (count actual people visible in the visual content),
            "angle": "Weight Management|Time/Convenience|Energy/Focus|Digestive Health|Immunity Support|General Wellness|Value/Price|Quality|Social Proof|etc",
            "format": "Testimonial|Podcast Clip|Authority Figure|3 Reasons Why|Unboxing|Problem/Solution|Demonstration|Comparison|Story|Educational|etc",
            "emotion": "Hopefulness|Excitement|Curiosity|Urgency|Fear|Trust|Confidence|Empowerment|etc",
            "framework": "PAS|AIDA|FAB|Star Story Solution|Before After Bridge|QUEST|etc",
            "transcription": "For videos: provide a timecoded transcript with timestamps in [MM:SS] format (e.g., [00:05] Hello there! [00:12] Check out this amazing product). Include exact spoken words/dialogue only. For images: any visible text/captions only (no descriptions)",
            "visualDescription": "For videos: detailed description of visual elements, scenes, people, products, setting. For images: comprehensive visual description including composition, people, products, setting, mood, AND primary/secondary/tertiary hex color codes (e.g. Primary: #FF5733, Secondary: #33FF57, Tertiary: #3357FF)"
          }

          Base your analysis on BOTH the visual content you can see AND the provided text information. Pay special attention to:
          - Visual elements, people, products shown
          - Text overlays or captions in the visual
          - Overall production quality and style
          - Emotional tone conveyed through visuals
          - How the visual and text work together
          - For videos: Provide accurate timestamps for when the product first appears or is mentioned to help calculate "sit in problem" percentage (productIntro / adDuration * 100)
          - For videos: Include timecoded transcript to enable precise analysis of when problems are discussed vs when solutions/products are introduced
          `;

          const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{
              role: 'user',
              parts: [
                { text: analysisPrompt },
                {
                  fileData: {
                    mimeType: uploadedAsset.mimeType,
                    fileUri: uploadedAsset.fileUri
                  }
                }
              ]
            }],
            config: { responseMimeType: 'application/json' }
          });

          const analysis = parseGeminiJSON(result.text, String(ad.id));

          // Calculate sit in problem percentage
          const sitInProblem = analysis.adDuration > 0 
            ? ((analysis.productIntro / analysis.adDuration) * 100).toFixed(1)
            : '0';

          console.log(`[Analyze] Successfully analyzed ad ${ad.id} with visual content`);

          return {
            ...ad,
            ...analysis,
            sitInProblem,
            analysisMethod: 'visual-and-text'
          };

        } catch (error) {
          console.error(`[Analyze] Error analyzing ad ${ad.id}:`, error);
          return ad; // Return unmodified if analysis fails
        }
      });

      const batchResults = await Promise.all(batchPromises);
      analyzedAds.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < adsToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay for Files API
      }
    }

    // Update the onesheet with analyzed ads
    const updatedAds = adAuditData.ads.map((ad: Record<string, unknown>) => {
      const analyzed = analyzedAds.find((a: Record<string, unknown>) => a.id === ad.id);
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
      console.error('[Analyze] Error updating onesheet:', updateError);
      return NextResponse.json({ error: 'Failed to save analysis' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        adsAnalyzed: analyzedAds.length,
        totalAds: updatedAds.length,
        analysisBreakdown: {
          visualAndText: analyzedAds.filter(ad => ad.analysisMethod === 'visual-and-text').length,
          textOnly: analyzedAds.filter(ad => ad.analysisMethod === 'text-only').length,
          textFallback: analyzedAds.filter(ad => ad.analysisMethod === 'text-fallback').length
        }
      }
    });

  } catch (error) {
    console.error('[Analyze] Error in ad analysis:', error);
    return NextResponse.json(
      { error: 'Failed to analyze ads' },
      { status: 500 }
    );
  }
} 