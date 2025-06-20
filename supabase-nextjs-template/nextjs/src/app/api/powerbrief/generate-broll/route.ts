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

interface BRollRequest {
  conceptId: string;
  visuals: string[];
}

interface GeneratedVideo {
  visual_description: string;
  gemini_prompt: string;
  video_urls: string[];
  storage_paths: string[];
}

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
      
      console.log(`[RETRY] Attempt ${attempt + 1}/${maxRetries + 1} failed:`, veoError.message);
      
      // Don't retry if it's not a retryable error
      if (!veoError.isRetryable) {
        console.log(`[RETRY] Error is not retryable, stopping attempts`);
        throw error;
      }
      
      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const delayMs = veoError.retryAfter || (baseDelay * Math.pow(2, attempt));
        console.log(`[RETRY] Waiting ${delayMs}ms before next attempt...`);
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

export async function POST(req: NextRequest) {
  try {
    const { conceptId, visuals }: BRollRequest = await req.json();

    if (!conceptId || !visuals || !Array.isArray(visuals)) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    console.log(`[INDIVIDUAL BROLL] Processing concept ${conceptId} with ${visuals.length} visuals (individual request)`);
    
    // Note: This is the individual B-roll generation endpoint
    // For batch processing, use /api/powerbrief/generate-broll-queue instead

    // Check API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERROR: No API key found in environment variables. Check .env.local for GOOGLE_API_KEY or GEMINI_API_KEY');
      return NextResponse.json({ 
        error: 'API key not configured in environment variables (GOOGLE_API_KEY or GEMINI_API_KEY)' 
      }, { status: 500 });
    }

    // Initialize the Google AI clients
    const genAI = new GoogleGenerativeAI(apiKey); // For Gemini
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-06-05" });
    
    const veoAI = new GoogleGenAI({ apiKey }); // For Veo using the correct SDK

    const generatedBRoll: GeneratedVideo[] = [];

    // Note: We now process ALL visuals and let Gemini adapt them for B-roll instead of filtering
    // The system instructions have been updated to handle challenging inputs creatively
    console.log(`Processing ${visuals.length} visuals - Gemini will adapt all inputs for B-roll generation`);

    // Process each visual description separately
    for (let i = 0; i < visuals.length; i++) {
      const visual = visuals[i];
      if (!visual || visual.trim() === '') continue;

      try {
        console.log(`Processing visual ${i + 1}/${visuals.length}: ${visual.substring(0, 100)}...`);

        // Rate limiting: Veo 2 allows up to 1 video per 30 seconds
        // Add delay between requests (except for the first one)
        // TODO: Veo 3 might have different rate limits
        if (i > 0) {
          const delayMs = 30000; // 30 seconds delay for 1 video per 30 seconds
          console.log(`Rate limiting: waiting ${delayMs}ms before next video generation...`);
          await delay(delayMs);
        }

        // Step 1: Generate Veo prompt using Gemini (fixed to match working pattern)
        // TODO: Update prompt for Veo 3 capabilities when available
        const userPromptForGemini = `Generate a B-ROLL video prompt for Veo AI based on this description: ${visual}`;
        
        // Include system instructions in the text content (working pattern)
        const fullPromptContent = GEMINI_SYSTEM_PROMPT_FOR_BROLL + "\n\n" + userPromptForGemini;
        
        const promptResponse = await geminiModel.generateContent({ 
          contents: [
            { 
              role: 'user', 
              parts: [{ text: fullPromptContent }] 
            }
          ]
        });
        
        const generatedPrompt = promptResponse.response.text();

        if (generatedPrompt.trim() === "") {
          console.log(`Visual ${i + 1} generated empty prompt. Skipping generation.`);
          generatedBRoll.push({
            visual_description: visual,
            gemini_prompt: "Empty prompt generated",
            video_urls: [],
            storage_paths: []
          });
          continue;
        }
        console.log(`Generated Veo prompt for visual ${i + 1}: ${generatedPrompt}`);

        // Step 2: Generate videos using Veo 2 with retry logic
        // TODO: Update to Veo 3 model when available: 'veo-3.0-generate-001' or similar
        let operation = await retryWithBackoff(async () => {
          console.log(`[VEO] Attempting video generation for visual ${i + 1}...`);
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

        // Poll for completion using correct method with retry logic
        // TODO: Veo 3 might have different operation handling
        while (!operation.done) {
          console.log(`Video generation ${operation.name} for visual ${i + 1} has not completed yet. Checking again in 10 seconds...`);
          await delay(10000); 
          
          operation = await retryWithBackoff(async () => {
            return await veoAI.operations.getVideosOperation({
              operation: operation,
            });
          }, 2, 2000); // 2 retries with 2 second base delay for polling
        }

        console.log(`Generated ${operation.response?.generatedVideos?.length ?? 0} video(s) for visual ${i + 1}.`);

        const videoUrls: string[] = [];
        const storagePaths: string[] = [];

        // Download and store each generated video (updated response structure)
        // TODO: Veo 3 might have different response structure for video URIs
        if (operation.response?.generatedVideos) {
          for (let videoIndex = 0; videoIndex < operation.response.generatedVideos.length; videoIndex++) {
            const generatedVideo = operation.response.generatedVideos[videoIndex];
            
            // Updated to use correct response structure: generatedVideo?.video?.uri
            if (generatedVideo?.video?.uri) {
              try {
                console.log(`Downloading video ${videoIndex + 1} for visual ${i + 1}: ${generatedVideo.video.uri}`);
                
                const videoResponse = await fetch(`${generatedVideo.video.uri}&key=${apiKey}`);
                if (!videoResponse.ok) {
                  throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`);
                }
                
                const videoBuffer = await videoResponse.arrayBuffer();
                const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
                
                const timestamp = Date.now();
                const storagePath = `broll/${conceptId}/visual_${i + 1}_video_${videoIndex + 1}_${timestamp}.mp4`;
                
                const { error: uploadError } = await supabaseAdmin.storage 
                  .from('powerbrief-media')
                  .upload(storagePath, videoBlob, {
                    contentType: 'video/mp4',
                    cacheControl: '3600',
                    upsert: false
                  });

                if (uploadError) { 
                  console.error(`Error uploading video ${videoIndex + 1} for visual ${i + 1}:`, uploadError);
                  continue;
                }

                const { data: { publicUrl } } = supabaseAdmin.storage
                  .from('powerbrief-media')
                  .getPublicUrl(storagePath);

                videoUrls.push(publicUrl);
                storagePaths.push(storagePath);
                
                console.log(`Video ${videoIndex + 1} for visual ${i + 1} uploaded successfully: ${publicUrl}`);
              } catch (videoError) {
                console.error(`Error processing video ${videoIndex + 1} for visual ${i + 1}:`, videoError);
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
        console.error(`Error processing visual ${i + 1}:`, veoError.message);
        console.error(`Error details:`, visualError);
        
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
      .eq('id', conceptId);

    if (updateError) {
      console.error('Error updating concept with B-roll data:', updateError);
      return NextResponse.json({ message: 'Failed to save B-roll data to concept.' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Veo 2 B-roll generation completed successfully',
      generated_videos: generatedBRoll.length,
      total_visuals_processed: visuals.length,
      broll_data: generatedBRoll
    }, { status: 200 });

  } catch (error: unknown) {
    const veoError = classifyVeoError(error);
    console.error('Error in generate-broll API:', veoError.message);
    console.error('Error details:', error);
    return NextResponse.json({ 
      message: 'Internal server error.',
      errorType: veoError.errorType,
      errorMessage: veoError.message,
      retryable: veoError.isRetryable
    }, { status: 500 });
  }
} 