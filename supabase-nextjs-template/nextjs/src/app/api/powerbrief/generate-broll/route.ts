import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';
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

export async function POST(req: NextRequest) {
  try {
    const { conceptId, visuals }: BRollRequest = await req.json();

    if (!conceptId || !visuals || !Array.isArray(visuals)) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // Check API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERROR: No API key found in environment variables. Check .env.local for GOOGLE_API_KEY or GEMINI_API_KEY');
      return NextResponse.json({ 
        error: 'API key not configured in environment variables (GOOGLE_API_KEY or GEMINI_API_KEY)' 
      }, { status: 500 });
    }

    // Initialize the Google AI client
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    const generatedBRoll: GeneratedVideo[] = [];

    // Process each visual description
    for (let i = 0; i < visuals.length; i++) {
      const visual = visuals[i];
      if (!visual || visual.trim() === '') continue;

      try {
        console.log(`Processing visual ${i + 1}/${visuals.length}: ${visual.substring(0, 100)}...`);

        // Step 1: Generate Veo 2 prompt using Gemini
        const promptConfig = {
          responseMimeType: 'text/plain',
          systemInstruction: [
            {
              text: `ONLY RETURN THE ACTUAL PROMPT. Return 1 prompt. Do not tell the ai video generator to include text. Create a highly detailed, cinematic prompt for Google Veo AI to generate B-roll video content. Focus on visual elements, camera movements, lighting, and atmosphere. Be specific about cinematography techniques.`,
            }
          ],
        };

        const promptContents = [
          {
            role: 'user',
            parts: [
              {
                text: `generate a prompt for veo ai to generate a video. This is what I'd like: ${visual}`,
              },
            ],
          }
        ];

        const promptResponse = await ai.models.generateContent({
          model: 'gemini-2.5-pro-preview-06-05',
          config: promptConfig,
          contents: promptContents,
        });

        const generatedPrompt = promptResponse.text;
        console.log(`Generated prompt for visual ${i + 1}: ${generatedPrompt}`);

        // Step 2: Generate videos using Veo 2
        let operation = await ai.models.generateVideos({
          model: 'veo-2.0-generate-001',
          prompt: generatedPrompt,
          config: {
            numberOfVideos: 2,
            aspectRatio: '9:16', // Vertical format as requested
            personGeneration: 'dont_allow',
            durationSeconds: 8,
          },
        });

        // Poll for completion
        while (!operation.done) {
          console.log(`Video generation ${operation.name} for visual ${i + 1} has not completed yet. Checking again in 10 seconds...`);
          await new Promise((resolve) => setTimeout(resolve, 10000));
          operation = await ai.operations.getVideosOperation({
            operation: operation,
          });
        }

        console.log(`Generated ${operation.response?.generatedVideos?.length ?? 0} video(s) for visual ${i + 1}.`);

        const videoUrls: string[] = [];
        const storagePaths: string[] = [];

        // Download and store each generated video
        if (operation.response?.generatedVideos) {
          for (let videoIndex = 0; videoIndex < operation.response.generatedVideos.length; videoIndex++) {
            const generatedVideo = operation.response.generatedVideos[videoIndex];
            
            if (generatedVideo?.video?.uri) {
              try {
                console.log(`Downloading video ${videoIndex + 1} for visual ${i + 1}: ${generatedVideo.video.uri}`);
                
                // Download the video from Google's URI
                const videoResponse = await fetch(`${generatedVideo.video.uri}&key=${apiKey}`);
                if (!videoResponse.ok) {
                  throw new Error(`Failed to download video: ${videoResponse.status} ${videoResponse.statusText}`);
                }
                
                const videoBuffer = await videoResponse.arrayBuffer();
                const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });
                
                // Generate storage path
                const timestamp = Date.now();
                const storagePath = `broll/${conceptId}/visual_${i + 1}_video_${videoIndex + 1}_${timestamp}.mp4`;
                
                // Upload to Supabase Storage
                const { error } = await supabaseAdmin.storage
                  .from('powerbrief-media')
                  .upload(storagePath, videoBlob, {
                    contentType: 'video/mp4',
                    cacheControl: '3600',
                    upsert: false
                  });

                if (error) {
                  console.error(`Error uploading video ${videoIndex + 1} for visual ${i + 1}:`, error);
                  continue;
                }

                // Get public URL
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

      } catch (visualError) {
        console.error(`Error processing visual ${i + 1}:`, visualError);
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
      message: 'B-roll generation completed successfully',
      generated_videos: generatedBRoll.length,
      total_visuals_processed: visuals.length,
      broll_data: generatedBRoll
    }, { status: 200 });

  } catch (error) {
    console.error('Error in generate-broll API:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
} 