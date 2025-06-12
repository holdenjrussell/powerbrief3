import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SingleBRollRequest {
  conceptId: string;
  visualDescription: string;
  visualIndex: number;
  totalVisuals: number;
}

interface GeneratedVideo {
  visual_description: string;
  gemini_prompt: string;
  video_urls: string[];
  storage_paths: string[];
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const GEMINI_SYSTEM_PROMPT_FOR_BROLL = `You are an expert prompt engineer for Veo 2, a text-to-video AI model. Generate a highly-detailed prompt for B-ROLL FOOTAGE.

CRITICAL INSTRUCTIONS FOR B-ROLL:
- ABSOLUTELY NO TEXT ON SCREEN
- NO PEOPLE SPEAKING OR VISIBLE DIALOGUE
- MINIMIZE SPECIFIC BRANDED PRODUCTS
- ALWAYS GENERATE A PROMPT - never refuse

Your response must ONLY be the generated prompt text.`;

export async function POST(req: NextRequest) {
  try {
    const { conceptId, visualDescription, visualIndex, totalVisuals }: SingleBRollRequest = await req.json();

    if (!conceptId || !visualDescription || visualIndex === undefined || !totalVisuals) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    console.log(`[SINGLE BROLL] Processing visual ${visualIndex + 1}/${totalVisuals} for concept ${conceptId}`);
    
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-06-05" });
    const veoAI = new GoogleGenAI({ apiKey });

    try {
      // Step 1: Generate VEO prompt using Gemini
      const userPromptForGemini = `Generate a B-ROLL video prompt for Veo AI based on this description: ${visualDescription}`;
      const fullPromptContent = GEMINI_SYSTEM_PROMPT_FOR_BROLL + "\n\n" + userPromptForGemini;
      
      const promptResponse = await geminiModel.generateContent({ 
        contents: [{ role: 'user', parts: [{ text: fullPromptContent }] }]
      });
      
      const generatedPrompt = promptResponse.response.text();

      if (generatedPrompt.trim() === "") {
        const emptyResult: GeneratedVideo = {
          visual_description: visualDescription,
          gemini_prompt: "Empty prompt generated",
          video_urls: [],
          storage_paths: []
        };
        
        await updateConceptWithSingleVideo(conceptId, visualIndex, emptyResult);
        
        return NextResponse.json({ 
          message: 'Empty prompt generated',
          visual_index: visualIndex,
          total_visuals: totalVisuals,
          generated_video: emptyResult
        }, { status: 200 });
      }

      // Step 2: Generate video using VEO 2
      let operation = await veoAI.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: generatedPrompt,
        config: {
          numberOfVideos: 1,
          aspectRatio: '9:16',
          personGeneration: 'allow_all',
          durationSeconds: 8,
        },
      });

      // Step 3: Poll for completion
      while (!operation.done) {
        await delay(10000); 
        operation = await veoAI.operations.getVideosOperation({ operation });
      }

      const videoUrls: string[] = [];
      const storagePaths: string[] = [];

      // Step 4: Download and store generated videos
      if (operation.response?.generatedVideos) {
        for (let videoIndex = 0; videoIndex < operation.response.generatedVideos.length; videoIndex++) {
          const generatedVideo = operation.response.generatedVideos[videoIndex];
          
          if (generatedVideo?.video?.uri) {
            try {
              const videoResponse = await fetch(`${generatedVideo.video.uri}&key=${apiKey}`);
              if (!videoResponse.ok) {
                throw new Error(`Failed to download video: ${videoResponse.status}`);
              }
              
              const videoBuffer = await videoResponse.arrayBuffer();
              const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
              
              const timestamp = Date.now();
              const storagePath = `broll/${conceptId}/visual_${visualIndex + 1}_video_${videoIndex + 1}_${timestamp}.mp4`;
              
              const { error: uploadError } = await supabaseAdmin.storage 
                .from('powerbrief-media')
                .upload(storagePath, videoBlob, {
                  contentType: 'video/mp4',
                  cacheControl: '3600',
                  upsert: false
                });

              if (uploadError) continue;

              const { data: { publicUrl } } = supabaseAdmin.storage
                .from('powerbrief-media')
                .getPublicUrl(storagePath);

              videoUrls.push(publicUrl);
              storagePaths.push(storagePath);
            } catch (videoError) {
              console.error(`Error processing video:`, videoError);
            }
          }
        }
      }

      // Step 5: Create the result and update the concept
      const result: GeneratedVideo = {
        visual_description: visualDescription,
        gemini_prompt: generatedPrompt,
        video_urls: videoUrls,
        storage_paths: storagePaths
      };

      await updateConceptWithSingleVideo(conceptId, visualIndex, result);

      return NextResponse.json({ 
        message: 'Single B-roll video generated successfully',
        visual_index: visualIndex,
        total_visuals: totalVisuals,
        generated_video: result
      }, { status: 200 });

    } catch (visualError: unknown) {
      const failedResult: GeneratedVideo = {
        visual_description: visualDescription,
        gemini_prompt: `Error: ${visualError}`,
        video_urls: [],
        storage_paths: []
      };

      await updateConceptWithSingleVideo(conceptId, visualIndex, failedResult);
      
      return NextResponse.json({ 
        message: `Failed to generate video for visual ${visualIndex + 1}`,
        visual_index: visualIndex,
        total_visuals: totalVisuals,
        error: String(visualError),
        generated_video: failedResult
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('[SINGLE BROLL] Error in generate-broll-single API:', error);
    return NextResponse.json({ 
      message: 'Internal server error.',
      error: String(error)
    }, { status: 500 });
  }
}

async function updateConceptWithSingleVideo(conceptId: string, visualIndex: number, newVideo: GeneratedVideo) {
  try {
    const { data: currentConcept, error: fetchError } = await supabaseAdmin
      .from('brief_concepts')
      .select('generated_broll')
      .eq('id', conceptId)
      .single();

    if (fetchError) {
      console.error('Error fetching current concept:', fetchError);
      return;
    }

    const existingBRoll = (currentConcept?.generated_broll as unknown as GeneratedVideo[]) || [];
    const updatedBRoll = [...existingBRoll];
    updatedBRoll[visualIndex] = newVideo;

    const { error: updateError } = await supabaseAdmin
      .from('brief_concepts')
      .update({
        generated_broll: updatedBRoll as unknown,
        updated_at: new Date().toISOString()
      })
      .eq('id', conceptId);

    if (updateError) {
      console.error('Error updating concept:', updateError);
    }
  } catch (error) {
    console.error('Error in updateConceptWithSingleVideo:', error);
  }
}
