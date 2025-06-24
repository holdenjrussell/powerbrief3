import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { OneSheetAIInstructions } from '@/lib/types/onesheet';
import { setAnalyzeProgress, clearAnalyzeProgress } from '@/lib/utils/analyzeProgress';

// Rate limiting configuration
const RATE_LIMIT = {
  maxRetries: 3,
  initialDelay: 2000, // 2 seconds
  maxDelay: 60000, // 60 seconds
  backoffMultiplier: 2
};

// Helper function to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  retries: number = RATE_LIMIT.maxRetries,
  delay: number = RATE_LIMIT.initialDelay
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    if (retries === 0) throw error;
    
    // Check if it's a rate limit error (503 or 429)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRateLimitError = 
      errorMessage.includes('503') || 
      errorMessage.includes('429') ||
      errorMessage.includes('overloaded') ||
      errorMessage.includes('rate limit');
    
    if (!isRateLimitError) throw error;
    
    console.log(`[Analyze] Rate limit hit, retrying in ${delay}ms... (${retries} retries left)`);
    await sleep(delay);
    
    return retryWithBackoff(
      fn, 
      retries - 1, 
      Math.min(delay * RATE_LIMIT.backoffMultiplier, RATE_LIMIT.maxDelay)
    );
  }
}

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

// Helper function to build master prompt from AI instructions
function buildMasterPrompt(aiInstructions: OneSheetAIInstructions, ad: Record<string, unknown>) {
  // Extract all field definitions and prompts
  const {
    type_prompt,
    ad_duration_prompt,
    product_intro_prompt,
    sit_in_problem_seconds_prompt,
    sit_in_problem_prompt,
    creators_used_prompt,
    angle_prompt,
    format_prompt,
    emotion_prompt,
    framework_prompt,
    awareness_levels_prompt,
    content_variables_prompt,
    transcription_prompt,
    visual_description_prompt,
    analysis_fields,
    allow_new_analysis_values,
    content_variables,
    awareness_levels,
    content_variables_return_multiple,
    awareness_levels_allow_new,
    content_variables_allow_new,
    master_prompt_template
  } = aiInstructions;

  // Build options for each field type with proper "allow new" handling
  const buildFieldOptions = (fieldArray: Array<{ name: string; description?: string }>, allowNew: boolean, fieldName: string) => {
    const options = fieldArray.map((item: { name: string }) => item.name).join(', ');
    if (allowNew) {
      return `${options}. If none of these fit well, create a new ${fieldName} that better describes what you observe`;
    }
    return options;
  };

  // Build all the variables for template substitution
  const templateVariables: Record<string, string> = {
    // Ad context
    'ad.name': String(ad.name || ''),
    'ad.creativeTitle': String(ad.creativeTitle || 'N/A'),
    'ad.creativeBody': String(ad.creativeBody || 'N/A'),
    'ad.assetType': String(ad.assetType || ''),
    
    // Media analysis instruction
    'mediaAnalysisInstruction': ad.assetType === 'video' 
      ? 'Watch the entire video carefully from start to finish' 
      : 'Examine all visual elements in the image thoroughly',
    
    // Prompts from database
    'type_prompt': type_prompt || '',
    'ad_duration_prompt': ad_duration_prompt || '',
    'product_intro_prompt': product_intro_prompt || '',
    'sit_in_problem_seconds_prompt': sit_in_problem_seconds_prompt || '',
    'sit_in_problem_prompt': sit_in_problem_prompt || '',
    'creators_used_prompt': creators_used_prompt || '',
    'angle_prompt': angle_prompt || '',
    'format_prompt': format_prompt || '',
    'emotion_prompt': emotion_prompt || '',
    'framework_prompt': framework_prompt || '',
    'awareness_levels_prompt': awareness_levels_prompt || '',
    'content_variables_prompt': content_variables_prompt || '',
    'transcription_prompt': transcription_prompt || '',
    'visual_description_prompt': visual_description_prompt || '',
    
    // Options with "allow new" handling
    'typeOptions': buildFieldOptions(
      analysis_fields?.type || [], 
      allow_new_analysis_values?.type !== false, 
      'type'
    ),
    'angleOptions': buildFieldOptions(
      analysis_fields?.angle || [],
      allow_new_analysis_values?.angle !== false,
      'angle'
    ),
    'formatOptions': buildFieldOptions(
      analysis_fields?.format || [],
      allow_new_analysis_values?.format !== false,
      'format'
    ),
    'emotionOptions': buildFieldOptions(
      analysis_fields?.emotion || [],
      allow_new_analysis_values?.emotion !== false,
      'emotion'
    ),
    'frameworkOptions': buildFieldOptions(
      analysis_fields?.framework || [],
      allow_new_analysis_values?.framework !== false,
      'framework'
    ),
    'awarenessOptions': buildFieldOptions(
      awareness_levels || [],
      awareness_levels_allow_new !== false,
      'awareness level'
    ),
    'contentVariablesOptions': buildFieldOptions(
      content_variables || [],
      content_variables_allow_new !== false,
      'content variable'
    ),
    
    // Content variables instructions
    'contentVariablesInstruction': content_variables_return_multiple 
      ? 'Select ALL content variables that apply, separated by commas'
      : 'Select the single most prominent content variable',
    
    'contentVariablesOutputFormat': content_variables_return_multiple 
      ? 'comma-separated string of all applicable variables' 
      : 'single most prominent variable'
  };

  // If no master prompt template is provided, return empty string (forcing use of database value)
  if (!master_prompt_template) {
    console.error('[Analyze] No master prompt template found in AI instructions');
    return '';
  }

  // Replace all placeholders in the template
  let masterPrompt = master_prompt_template;
  Object.entries(templateVariables).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    masterPrompt = masterPrompt.replace(placeholder, value);
  });

  return masterPrompt;
}

export async function POST(request: Request) {
  const requestId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
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

    // Get AI instructions for the onesheet
    const { data: aiInstructions, error: aiInstructionsError } = await supabase
      .from('onesheet_ai_instructions')
      .select('*')
      .eq('onesheet_id', onesheet_id)
      .single();

    if (aiInstructionsError) {
      console.error('[Analyze] Error fetching AI instructions:', aiInstructionsError);
      return NextResponse.json({ error: 'Failed to fetch AI instructions' }, { status: 500 });
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
        message: 'No ads need analysis',
        requestId 
      });
    }

    console.log(`[Analyze] Analyzing ${adsToAnalyze.length} ads with Gemini Files API`);
    
    // Initialize progress
    setAnalyzeProgress(requestId, 0, adsToAnalyze.length, 'Starting analysis...');

    // Get Gemini API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Analyze] Missing Gemini API key');
      clearAnalyzeProgress(requestId);
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Process ads in batches with smaller batch size for rate limiting
    const batchSize = 2; // Reduced batch size to avoid rate limits
    const analyzedAds = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < adsToAnalyze.length; i += batchSize) {
      const batch = adsToAnalyze.slice(i, i + batchSize);
      
      // Update progress
      const currentProgress = Math.min(i, adsToAnalyze.length - 1);
      setAnalyzeProgress(
        requestId, 
        currentProgress, 
        adsToAnalyze.length, 
        `Analyzing ads ${currentProgress + 1}-${Math.min(i + batchSize, adsToAnalyze.length)} of ${adsToAnalyze.length}...`
      );
      
      // Add delay between batches to avoid rate limiting
      if (i > 0) {
        await sleep(2000); // 2 second delay between batches
      }
      
      // Process each ad in the batch
      const batchPromises = batch.map(async (ad: Record<string, unknown>, batchIndex: number) => {
        const adIndex = i + batchIndex;
        const adName = String(ad.name || `Ad ${ad.id}`);
        
        try {
          // Update progress for individual ad
          setAnalyzeProgress(
            requestId,
            adIndex,
            adsToAnalyze.length,
            `Analyzing ad ${adIndex + 1}/${adsToAnalyze.length}: ${adName.substring(0, 50)}...`
          );
          
          // Skip all failed assets completely - no analysis for failed assets
          if (ad.assetLoadFailed) {
            console.log(`[Analyze] Skipping ad ${ad.id} - asset load failed, no analysis performed`);
            errorCount++;
            return {
              ...ad,
              analysisMethod: 'skipped-failed-asset',
              message: 'Asset failed to load - analysis skipped. Please upload asset manually first.'
            };
          }
          
          // Skip if no asset URL (these should also be marked as failed, but double-check)
          if (!ad.assetUrl) {
            console.log(`[Analyze] Skipping ad ${ad.id} - no asset URL`);
            errorCount++;
            return {
              ...ad,
              analysisMethod: 'skipped-no-asset',
              message: 'No asset available - analysis skipped.'
            };
          }

          // Only analyze ads with valid Supabase assets
          if (!String(ad.assetUrl).includes('supabase')) {
            console.log(`[Analyze] Skipping ad ${ad.id} - asset not stored in Supabase`);
            errorCount++;
            return {
              ...ad,
              analysisMethod: 'skipped-external-asset',
              message: 'Asset not stored in Supabase - analysis skipped.'
            };
          }

          // Upload asset to Files API with retry
          const uploadedAsset = await retryWithBackoff(async () => {
            const result = await uploadAssetToGeminiFilesAPI(String(ad.assetUrl), ai);
            if (!result) throw new Error('Failed to upload asset');
            return result;
          });

          // Build master prompt
          const masterPrompt = buildMasterPrompt(aiInstructions, ad);

          // Use response schema from database for structured output
          const generationConfig = aiInstructions.response_schema ? {
            responseMimeType: 'application/json',
            responseSchema: aiInstructions.response_schema
          } : {
            responseMimeType: 'application/json'
          };

          // Use system instructions from database - no hardcoded fallback
          const systemInstruction = aiInstructions.system_instructions;

          // Generate content with retry for rate limiting
          const result = await retryWithBackoff(async () => {
            return await ai.models.generateContent({
              model: aiInstructions.analyze_model || 'gemini-2.5-flash-lite-preview-06-17',
              contents: [{
                role: 'user',
                parts: [
                  // Put media first for single-media prompts (multimodal best practice)
                  {
                    fileData: {
                      mimeType: uploadedAsset.mimeType,
                      fileUri: uploadedAsset.fileUri
                    }
                  },
                  { text: masterPrompt }
                ]
              }],
              config: {
                ...generationConfig,
                systemInstruction
              }
            });
          });

          const analysis = parseGeminiJSON(result.text, String(ad.id));

          // Calculate sit in problem percentage based on sitInProblemSeconds
          const sitInProblemPercent = analysis.adDuration > 0 && analysis.sitInProblemSeconds !== undefined
            ? parseFloat(((analysis.sitInProblemSeconds / analysis.adDuration) * 100).toFixed(1))
            : 0;
          const sitInProblem = analysis.sitInProblem || `${sitInProblemPercent}%`;

          // Store discovered values if they are new
          if (aiInstructions.content_variables_allow_new !== false && analysis.contentVariables) {
            const contentVars = Array.isArray(analysis.contentVariables) 
              ? analysis.contentVariables 
              : [analysis.contentVariables];
            
            for (const varName of contentVars) {
              const exists = aiInstructions.content_variables.some((v: { name: string }) => v.name === varName) ||
                           (aiInstructions.discovered_content_variables || []).some((v: { name: string }) => v.name === varName);
              
              if (!exists && varName && varName !== 'Unknown') {
                // Store discovered variable directly in the database
                const currentDiscovered = aiInstructions.discovered_content_variables || [];
                const updatedDiscovered = [...currentDiscovered, {
                  name: varName,
                  description: `Auto-discovered from ad: ${ad.name}`
                }];
                
                await supabase
                  .from('onesheet_ai_instructions')
                  .update({ discovered_content_variables: updatedDiscovered })
                  .eq('onesheet_id', onesheet_id);
              }
            }
          }

          if (aiInstructions.awareness_levels_allow_new !== false && analysis.awarenessLevel) {
            const exists = aiInstructions.awareness_levels.some((l: { name: string }) => l.name === analysis.awarenessLevel) ||
                          (aiInstructions.discovered_awareness_levels || []).some((l: { name: string }) => l.name === analysis.awarenessLevel);
            
            if (!exists && analysis.awarenessLevel && analysis.awarenessLevel !== 'Unknown') {
              // Store discovered awareness level directly in the database
              const currentDiscovered = aiInstructions.discovered_awareness_levels || [];
              const updatedDiscovered = [...currentDiscovered, {
                name: analysis.awarenessLevel,
                description: `Auto-discovered from ad: ${ad.name}`
              }];
              
              await supabase
                .from('onesheet_ai_instructions')
                .update({ discovered_awareness_levels: updatedDiscovered })
                .eq('onesheet_id', onesheet_id);
            }
          }

          console.log(`[Analyze] Successfully analyzed ad ${ad.id} with visual content`);
          successCount++;

          return {
            ...ad,
            ...analysis,
            sitInProblem,
            sitInProblemPercent,
            analysisMethod: 'visual-and-text'
          };

        } catch (error) {
          console.error(`[Analyze] Error analyzing ad ${ad.id}:`, error);
          errorCount++;
          return ad; // Return unmodified if analysis fails
        }
      });

      const batchResults = await Promise.all(batchPromises);
      analyzedAds.push(...batchResults);
    }

    // Clear progress
    clearAnalyzeProgress(requestId);

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
      requestId,
      data: {
        adsAnalyzed: successCount,
        adsFailed: errorCount,
        totalAds: updatedAds.length,
        analysisBreakdown: {
          visualAndText: analyzedAds.filter(ad => ad.analysisMethod === 'visual-and-text').length,
          skippedFailedAsset: analyzedAds.filter(ad => ad.analysisMethod === 'skipped-failed-asset').length,
          skippedNoAsset: analyzedAds.filter(ad => ad.analysisMethod === 'skipped-no-asset').length,
          skippedExternalAsset: analyzedAds.filter(ad => ad.analysisMethod === 'skipped-external-asset').length
        }
      }
    });

  } catch (error) {
    console.error('[Analyze] Error in ad analysis:', error);
    clearAnalyzeProgress(requestId);
    return NextResponse.json(
      { error: 'Failed to analyze ads' },
      { status: 500 }
    );
  }
} 