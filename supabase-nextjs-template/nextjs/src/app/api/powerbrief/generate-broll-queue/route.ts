import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';

// Create a Supabase client with the service role key for admin access
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BRollQueueItem {
  conceptId: string;
  visuals: string[];
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
}

interface GeneratedVideo {
  visual_description: string;
  gemini_prompt: string;
  video_urls: string[];
  storage_paths: string[];
}

// In-memory queue for VEO generation requests
let brollQueue: BRollQueueItem[] = [];
let isProcessing = false;

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Error classification helper
interface VeoError {
  isRetryable: boolean;
  retryAfter?: number;
  errorType: 'RATE_LIMIT' | 'QUOTA_EXCEEDED' | 'NETWORK' | 'VALIDATION' | 'UNKNOWN';
  message: string;
}

const classifyVeoError = (error: unknown): VeoError => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Check for 429 rate limiting
  if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
    return {
      isRetryable: true,
      retryAfter: 60000, // 1 minute
      errorType: 'RATE_LIMIT',
      message: 'VEO API rate limit exceeded. Will retry after delay.'
    };
  }
  
  // Check for quota exceeded
  if (errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
    return {
      isRetryable: false,
      errorType: 'QUOTA_EXCEEDED',
      message: 'VEO API quota exceeded. Please check your billing and usage limits.'
    };
  }
  
  // Network or timeout errors
  if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('ECONNRESET')) {
    return {
      isRetryable: true,
      retryAfter: 30000, // 30 seconds
      errorType: 'NETWORK',
      message: 'Network error occurred. Will retry after delay.'
    };
  }
  
  // Validation errors (bad prompts, etc.)
  if (errorMessage.includes('Invalid') || errorMessage.includes('validation')) {
    return {
      isRetryable: false,
      errorType: 'VALIDATION',
      message: 'Invalid request parameters. Please check your input.'
    };
  }
  
  return {
    isRetryable: true,
    retryAfter: 30000,
    errorType: 'UNKNOWN',
    message: `Unknown error: ${errorMessage}`
  };
};

// Exponential backoff retry helper
const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      const veoError = classifyVeoError(error);
      
      console.log(`[QUEUE RETRY] Attempt ${attempt + 1}/${maxRetries + 1} failed:`, veoError.message);
      
      // Don't retry if it's not a retryable error
      if (!veoError.isRetryable) {
        console.log(`[QUEUE RETRY] Error is not retryable, stopping attempts`);
        throw error;
      }
      
      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const delayMs = veoError.retryAfter || (baseDelay * Math.pow(2, attempt));
        console.log(`[QUEUE RETRY] Waiting ${delayMs}ms before next attempt...`);
        await delay(delayMs);
      }
    }
  }
  
  throw lastError;
};

const GEMINI_SYSTEM_PROMPT_FOR_BROLL = `You are an expert prompt engineer for Veo 2, a text-to-video AI model. Your sole purpose is to take a user's simple text input and transform it into a single, highly-detailed, and technically specific prompt that leverages the full capabilities of Veo for B-ROLL FOOTAGE.

Your final output MUST ONLY be the generated prompt text. Do not include any conversational text, explanations, headings, or the word "Prompt:".

CRITICAL INSTRUCTIONS FOR B-ROLL:
- ABSOLUTELY NO TEXT ON SCREEN. No captions, no titles, no overlays.
- NO PEOPLE SPEAKING OR VISIBLE DIALOGUE. Actions are fine, but no direct communication.
- MINIMIZE SPECIFIC BRANDED PRODUCTS. When possible, make products generic or focus on abstract/environmental elements instead.
- The output should be suitable for B-roll, meaning it should be visually interesting and supplementary.
- ALWAYS GENERATE A PROMPT: Never output "UNSUITABLE_FOR_BROLL" - instead, creatively adapt any input into suitable B-roll footage.

ADAPTATION STRATEGIES:
- If the input mentions text/captions: Focus on the environment, objects, or actions without any text elements
- If the input mentions people talking: Show the person in action without dialogue, or focus on related environmental shots
- If the input mentions specific products: Make them generic equivalents or focus on the context/environment around the product
- If the input seems impossible for B-roll: Extract the mood, setting, or emotion and create an abstract or metaphorical visual representation

Your Process:
Deconstruct the Input: Identify the core Subject, Action, and Context from the user's request, then creatively adapt it for B-roll suitability.
Elaborate and Enhance: Creatively and logically expand upon the adapted idea by adding rich, descriptive details to every element. You must incorporate specific terminology from the following categories to build a cinematic B-ROLL scene:

Style: Specify a clear visual style. Examples: cinematic, documentary, naturalistic, abstract, time-lapse.
Shot Composition & Framing: Define how the scene is framed. Examples: wide shot, close-up, extreme close-up, medium shot, establishing shot.
Camera Position & Angle: Specify the camera's location. Examples: eye level, high angle, low-angle shot, top-down shot.
Camera Movement: Describe how the camera moves through the scene. Examples: static shot, slow pan, subtle zoom, tracking shot, aerial view, smooth motion.
Lens & Focus Effects: Dictate the focus and visual properties. Examples: shallow depth of field, deep focus, soft focus, macro lens, wide-angle lens.
Ambiance, Lighting & Color: Set the mood with light and color. Examples: warm golden hour light, cool blue tones, natural light, long shadows, moody lighting.
Subject & Context Details: Use vivid adjectives to describe the subject (adapted for B-roll) and the environment. (e.g., "dew-covered leaves," "a bustling city street from afar," "sunlight filtering through trees").

Creative Inference for B-Roll: You must ALWAYS creatively invent a compelling B-ROLL scenario from any input, no matter how challenging. Extract the essence, mood, or context and transform it into something visually compelling and suitable for B-roll footage.

Synthesize into One String: Combine all the chosen elements into a fluid, descriptive paragraph. The final output should read like a director's shot description for B-ROLL.

Example Transformations:
User Input: a woman drinking coffee in a cafe
Your Output: Close-up, slow-motion shot of steam rising from a generic coffee cup on a rustic wooden table, sunlight streaming through a cafe window creating long shadows. Shallow depth of field, warm inviting tones. Cinematic, natural light.

User Input: person explaining product features with text overlay
Your Output: Macro shot of hands gently interacting with sleek modern objects on a minimalist white surface, soft diffused lighting creating elegant shadows. Shallow depth of field, clean aesthetic, smooth camera movement revealing different angles of interaction.

Final Rule: Your response must ALWAYS be a prompt - never skip or refuse to generate. Be creative and adaptive.`;

// Process a single B-roll generation request
async function processQueueItem(item: BRollQueueItem): Promise<void> {
  console.log(`[BROLL QUEUE] Processing concept ${item.conceptId} with ${item.visuals.length} visuals`);
  
  try {
    // Check API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    // Initialize the Google AI clients
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-06-05" });
    const veoAI = new GoogleGenAI({ apiKey });

    const generatedBRoll: GeneratedVideo[] = [];

    // Process each visual description separately with rate limiting
    for (let i = 0; i < item.visuals.length; i++) {
      const visual = item.visuals[i];
      if (!visual || visual.trim() === '') continue;

      try {
        console.log(`[BROLL QUEUE] Processing visual ${i + 1}/${item.visuals.length} for concept ${item.conceptId}`);

        // Rate limiting: VEO 2 allows up to 1 video per 30 seconds
        if (i > 0) {
          const delayMs = 35000; // 35 seconds delay to be safe
          console.log(`[BROLL QUEUE] Rate limiting: waiting ${delayMs}ms before next video generation...`);
          await delay(delayMs);
        }

        // Step 1: Generate VEO prompt using Gemini
        const userPromptForGemini = `Generate a B-ROLL video prompt for Veo AI based on this description: ${visual}`;
        const fullPromptContent = GEMINI_SYSTEM_PROMPT_FOR_BROLL + "\n\n" + userPromptForGemini;
        
        const promptResponse = await geminiModel.generateContent({ 
          contents: [{ role: 'user', parts: [{ text: fullPromptContent }] }]
        });
        
        const generatedPrompt = promptResponse.response.text();

        if (generatedPrompt.trim() === "") {
          console.log(`[BROLL QUEUE] Visual ${i + 1} generated empty prompt. Skipping generation.`);
          generatedBRoll.push({
            visual_description: visual,
            gemini_prompt: "Empty prompt generated",
            video_urls: [],
            storage_paths: []
          });
          continue;
        }

        console.log(`[BROLL QUEUE] Generated VEO prompt for visual ${i + 1}: ${generatedPrompt}`);

        // Step 2: Generate videos using VEO 2 with retry logic
        let operation = await retryWithBackoff(async () => {
          console.log(`[BROLL QUEUE] Attempting VEO generation for visual ${i + 1}...`);
          return await veoAI.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: generatedPrompt,
            config: {
              numberOfVideos: 1,
              aspectRatio: '9:16',
              personGeneration: 'allow_all',
              durationSeconds: 8,
            },
          });
        }, 3, 5000); // 3 retries with 5 second base delay

        // Poll for completion with retry logic
        while (!operation.done) {
          console.log(`[BROLL QUEUE] Video generation ${operation.name} for visual ${i + 1} has not completed yet. Checking again in 10 seconds...`);
          await delay(10000); 
          operation = await retryWithBackoff(async () => {
            return await veoAI.operations.getVideosOperation({ operation });
          }, 2, 2000); // 2 retries with 2 second base delay for polling
        }

        console.log(`[BROLL QUEUE] Generated ${operation.response?.generatedVideos?.length ?? 0} video(s) for visual ${i + 1}.`);

        const videoUrls: string[] = [];
        const storagePaths: string[] = [];

        // Download and store each generated video
        if (operation.response?.generatedVideos) {
          for (let videoIndex = 0; videoIndex < operation.response.generatedVideos.length; videoIndex++) {
            const generatedVideo = operation.response.generatedVideos[videoIndex];
            
            if (generatedVideo?.video?.uri) {
              try {
                console.log(`[BROLL QUEUE] Downloading video ${videoIndex + 1} for visual ${i + 1}: ${generatedVideo.video.uri}`);
                
                const videoResponse = await fetch(`${generatedVideo.video.uri}&key=${apiKey}`);
                if (!videoResponse.ok) {
                  throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`);
                }
                
                const videoBuffer = await videoResponse.arrayBuffer();
                const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
                
                const timestamp = Date.now();
                const storagePath = `broll/${item.conceptId}/visual_${i + 1}_video_${videoIndex + 1}_${timestamp}.mp4`;
                
                const { error: uploadError } = await supabaseAdmin.storage 
                  .from('powerbrief-media')
                  .upload(storagePath, videoBlob, {
                    contentType: 'video/mp4',
                    cacheControl: '3600',
                    upsert: false
                  });

                if (uploadError) { 
                  console.error(`[BROLL QUEUE] Error uploading video ${videoIndex + 1} for visual ${i + 1}:`, uploadError);
                  continue;
                }

                const { data: { publicUrl } } = supabaseAdmin.storage
                  .from('powerbrief-media')
                  .getPublicUrl(storagePath);

                videoUrls.push(publicUrl);
                storagePaths.push(storagePath);
                
                console.log(`[BROLL QUEUE] Video ${videoIndex + 1} for visual ${i + 1} uploaded successfully: ${publicUrl}`);
              } catch (videoError) {
                console.error(`[BROLL QUEUE] Error processing video ${videoIndex + 1} for visual ${i + 1}:`, videoError);
              }
            }
          }
        }

        // Add to results
        generatedBRoll.push({
          visual_description: visual,
          gemini_prompt: generatedPrompt,
          video_urls: videoUrls,
          storage_paths: storagePaths
        });

      } catch (visualError: unknown) {
        const veoError = classifyVeoError(visualError);
        console.error(`[BROLL QUEUE] Error processing visual ${i + 1}:`, veoError.message);
        console.error(`[BROLL QUEUE] Error details:`, visualError);
        
        // Add failed visual to results with error information
        generatedBRoll.push({
          visual_description: visual,
          gemini_prompt: `Error: ${veoError.message}`,
          video_urls: [],
          storage_paths: []
        });
        
        // Continue with next visual even if this one fails
      }
    }

    // Update the concept with B-roll data
    const { error: updateError } = await supabaseAdmin
      .from('brief_concepts')
      .update({
        generated_broll: generatedBRoll,
        updated_at: new Date().toISOString()
      })
      .eq('id', item.conceptId);

    if (updateError) {
      console.error(`[BROLL QUEUE] Error updating concept ${item.conceptId} with B-roll data:`, updateError);
      throw updateError;
    }

    // Mark as completed
    item.status = 'completed';
    console.log(`[BROLL QUEUE] Successfully completed B-roll generation for concept ${item.conceptId}`);

  } catch (error: unknown) {
    const veoError = classifyVeoError(error);
    console.error(`[BROLL QUEUE] Error processing concept ${item.conceptId}:`, veoError.message);
    console.error(`[BROLL QUEUE] Error details:`, error);
    
    item.status = 'failed';
    item.retryCount += 1;
    
    // Only retry if it's a retryable error and we haven't exceeded max retries
    if (veoError.isRetryable && item.retryCount < 3) {
      console.log(`[BROLL QUEUE] Retrying concept ${item.conceptId} (attempt ${item.retryCount + 1}) - ${veoError.errorType}`);
      item.status = 'pending';
      // Add back to end of queue for retry with additional delay for rate limit errors
      const retryDelay = veoError.errorType === 'RATE_LIMIT' ? 60000 : 10000; // 1 minute for rate limits, 10s for others
      setTimeout(() => {
        brollQueue.push({ ...item, timestamp: Date.now() });
      }, retryDelay);
    } else {
      console.log(`[BROLL QUEUE] Not retrying concept ${item.conceptId} - ${veoError.isRetryable ? 'max retries exceeded' : 'non-retryable error'}`);
    }
  }
}

// Process the queue
async function processQueue(): Promise<void> {
  if (isProcessing || brollQueue.length === 0) {
    return;
  }

  isProcessing = true;
  console.log(`[BROLL QUEUE] Starting queue processing. ${brollQueue.length} items in queue`);

  while (brollQueue.length > 0) {
    // Get the next item (FIFO)
    const item = brollQueue.find(i => i.status === 'pending');
    if (!item) {
      break; // No pending items
    }

    // Mark as processing
    item.status = 'processing';
    
    try {
      await processQueueItem(item);
    } catch (error) {
      console.error(`[BROLL QUEUE] Failed to process item:`, error);
    }

    // Remove completed or failed (max retries) items
    brollQueue = brollQueue.filter(i => 
      i.status !== 'completed' && 
      !(i.status === 'failed' && i.retryCount >= 3)
    );

    // Add delay between queue items to respect rate limits
    if (brollQueue.length > 0) {
      console.log(`[BROLL QUEUE] Waiting 10 seconds before next queue item...`);
      await delay(10000);
    }
  }

  isProcessing = false;
  console.log(`[BROLL QUEUE] Queue processing complete`);
}

export async function POST(req: NextRequest) {
  try {
    const { conceptIds } = await req.json();

    if (!conceptIds || !Array.isArray(conceptIds) || conceptIds.length === 0) {
      return NextResponse.json({ 
        message: 'conceptIds array is required' 
      }, { status: 400 });
    }

    console.log(`[BROLL QUEUE] Adding ${conceptIds.length} concepts to queue`);

    // Add all concepts to the queue
    for (const conceptId of conceptIds) {
      // Get concept data to extract visuals
      const { data: concept, error: fetchError } = await supabaseAdmin
        .from('brief_concepts')
        .select('body_content_structured')
        .eq('id', conceptId)
        .single();

      if (fetchError || !concept) {
        console.error(`[BROLL QUEUE] Error fetching concept ${conceptId}:`, fetchError);
        continue;
      }

      // Extract visual descriptions from scenes
      const scenes = concept.body_content_structured as unknown as Array<{ visuals?: string }>;
      const visuals = scenes
        ?.map((scene) => scene.visuals)
        ?.filter((visual): visual is string => typeof visual === 'string' && visual.trim() !== '') || [];

      if (visuals.length === 0) {
        console.log(`[BROLL QUEUE] No visuals found for concept ${conceptId}, skipping`);
        continue;
      }

      // Check if already in queue
      const existingItem = brollQueue.find(item => item.conceptId === conceptId);
      if (existingItem) {
        console.log(`[BROLL QUEUE] Concept ${conceptId} already in queue, skipping`);
        continue;
      }

      // Add to queue
      brollQueue.push({
        conceptId,
        visuals,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0
      });

      console.log(`[BROLL QUEUE] Added concept ${conceptId} to queue with ${visuals.length} visuals`);
    }

    // Start processing the queue
    processQueue().catch(error => {
      console.error('[BROLL QUEUE] Error in queue processing:', error);
    });

    return NextResponse.json({ 
      message: `Added ${conceptIds.length} concepts to B-roll generation queue`,
      queueLength: brollQueue.length,
      conceptsAdded: conceptIds.length
    }, { status: 200 });

  } catch (error: unknown) {
    const veoError = classifyVeoError(error);
    console.error('[BROLL QUEUE] Error in generate-broll-queue API:', veoError.message);
    console.error('[BROLL QUEUE] Error details:', error);
    return NextResponse.json({ 
      message: 'Internal server error.',
      errorType: veoError.errorType,
      errorMessage: veoError.message,
      retryable: veoError.isRetryable
    }, { status: 500 });
  }
}

// GET endpoint to check queue status
export async function GET() {
  try {
    const queueStatus = brollQueue.map(item => ({
      conceptId: item.conceptId,
      status: item.status,
      visualCount: item.visuals.length,
      retryCount: item.retryCount,
      timestamp: item.timestamp
    }));

    return NextResponse.json({
      queueLength: brollQueue.length,
      isProcessing,
      items: queueStatus
    });
  } catch (error: unknown) {
    console.error('[BROLL QUEUE] Error getting queue status:', error);
    return NextResponse.json({ 
      message: 'Internal server error.',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 