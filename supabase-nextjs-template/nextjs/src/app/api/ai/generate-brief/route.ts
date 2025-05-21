import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { AiBriefingRequest, AiBriefingResponse } from '@/lib/types/powerbrief';
import { createClient } from '@/utils/supabase/server';

// Use the correct model name as shown in the endpoint
const MODEL_NAME = 'gemini-2.5-pro-preview-05-06';

// Helper to get more specific mime types
const getProperMimeType = (mediaType: string | undefined, fileUrl: string): string => {
  if (!mediaType) {
    // Try to infer from URL extension
    if (fileUrl.endsWith('.mp4')) return 'video/mp4';
    if (fileUrl.endsWith('.mov')) return 'video/quicktime';
    if (fileUrl.endsWith('.avi')) return 'video/x-msvideo';
    if (fileUrl.endsWith('.webm')) return 'video/webm';
    if (fileUrl.endsWith('.jpg') || fileUrl.endsWith('.jpeg')) return 'image/jpeg';
    if (fileUrl.endsWith('.png')) return 'image/png';
    if (fileUrl.endsWith('.gif')) return 'image/gif';
    // Default fallbacks
    return 'video/mp4';
  }
  
  // If general type is provided, add specific format
  if (mediaType === 'video') return 'video/mp4';
  if (mediaType === 'image') return 'image/jpeg';
  
  // If specific mime type is already provided, use it
  if (mediaType.includes('/')) return mediaType;
  
  // Default fallback
  return 'application/octet-stream';
};

// Helper function to fetch media as binary data
async function fetchMediaFile(url: string): Promise<{data: Uint8Array, mimeType: string}> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch media file: ${response.status} ${response.statusText}`);
    }
    
    // Get the actual content type from the response if available
    const contentType = response.headers.get('content-type') || '';
    
    // Convert the response to ArrayBuffer and then to Uint8Array
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    return {
      data: uint8Array,
      mimeType: contentType
    };
  } catch (error) {
    console.error('Error fetching media file:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  // Create Supabase client (properly handles Next.js 15 cookie API)
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: AiBriefingRequest = await request.json();

    // Check API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERROR: No API key found in environment variables. Check .env.local for GOOGLE_API_KEY or GEMINI_API_KEY');
      return NextResponse.json({ 
        error: 'API key not configured in environment variables (GOOGLE_API_KEY or GEMINI_API_KEY)' 
      }, { status: 500 });
    }

    // Log we're proceeding with generation
    console.log('Starting Gemini API request with model:', MODEL_NAME);
    console.log('Request structure:', {
      hasCustomPrompt: !!body.conceptSpecificPrompt,
      desiredOutputFields: body.desiredOutputFields,
      hasCurrentData: !!body.conceptCurrentData,
      hasMedia: !!body.media?.url
    });

    // Initialize the API
    const genAI = new GoogleGenerativeAI(apiKey);

    // Get the model
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        maxOutputTokens: 64000, // Maximum output token limit
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
      // Using type assertion to bypass TypeScript error
      // @ts-ignore - thinkingConfig is supported by the API but not by the current type definitions
      thinkingConfig: {
        thinkingBudget: 15000, // Allocate 15k tokens for thinking
      },
    } as any);

    // Prepare the prompt and content
    const brandContextStr = JSON.stringify(body.brandContext, null, 2);
    const currentDataStr = body.conceptCurrentData ? JSON.stringify(body.conceptCurrentData, null, 2) : 'No current data provided';
    const fieldsStr = body.desiredOutputFields.join(', ');
    
    // Enhance custom prompt importance
    let enhancedCustomPrompt = body.conceptSpecificPrompt || "";
    if (enhancedCustomPrompt) {
      // Make custom prompt stand out more by formatting it
      enhancedCustomPrompt = `IMPORTANT INSTRUCTION: ${enhancedCustomPrompt.toUpperCase()}`;
    }

    // Get the appropriate system instructions based on media type
    let systemPrompt = '';
    
    // Check if brand-specific system instructions are provided in the request
    if (body.brandContext.system_instructions_image && body.media?.type === 'image') {
      systemPrompt = body.brandContext.system_instructions_image;
    } else if (body.brandContext.system_instructions_video && body.media?.type === 'video') {
      systemPrompt = body.brandContext.system_instructions_video;
    } else {
      // Fallback to default system prompt if no custom instructions are available
      systemPrompt = `You are an expert advertising strategist and copywriter specializing in direct response marketing. 
Given the brand context (positioning, target audience, competitors), concept prompt, and media (if provided), generate ad creative components that specifically relate to the media content.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:
{
  "caption_hook_options": "A string with multiple options for caption hooks (with emojis)",
  "body_content_structured_scenes": [
    { 
      "scene_title": "Scene 1 (optional)", 
      "script": "Script content for this scene", 
      "visuals": "Visual description for this scene" 
    },
    // Add more scenes as needed
  ],
  "cta_script": "Call to action script",
  "cta_text_overlay": "Text overlay for the CTA"
}`;
    }

    // Construct user prompt
    const userPrompt = `${enhancedCustomPrompt ? `${enhancedCustomPrompt}\n\n` : ''}
BRAND CONTEXT:
\`\`\`json
${brandContextStr}
\`\`\`

CURRENT CONTENT (for refinement):
\`\`\`json
${currentDataStr}
\`\`\`

Please generate content for these fields: ${fieldsStr}
If media is provided, make sure your content directly references and relates to what's shown in the media.
Ensure your response is ONLY valid JSON matching the structure in my instructions. Do not include any other text.`;

    // Make the request
    try {
      const parts: Part[] = [{ text: systemPrompt + "\n\n" + userPrompt }];
      
      // If media is provided, fetch and add it as binary data
      if (body.media && body.media.url) {
        console.log('Fetching media file from:', body.media.url);
        try {
          // Determine MIME type
          const expectedMimeType = getProperMimeType(body.media.type, body.media.url);
          
          // Fetch the media file
          const { data: mediaData, mimeType: detectedMimeType } = await fetchMediaFile(body.media.url);
          
          // Use detected MIME type if available, otherwise use expected type
          const finalMimeType = detectedMimeType || expectedMimeType;
          
          console.log(`Adding media to request with MIME type: ${finalMimeType}`);
          
          // Add media as inline data
          parts.push({
            inlineData: {
              data: Buffer.from(mediaData).toString('base64'),
              mimeType: finalMimeType
            }
          });
        } catch (mediaError) {
          console.error('Failed to fetch media:', mediaError);
          // If media fetching fails, add a text note about it
          parts.push({ 
            text: `NOTE: Tried to include media from ${body.media.url} but failed to fetch it.` 
          });
        }
      }

      // Use the chat method with the system prompt included
      const result = await model.generateContent({
        contents: [
          { 
            role: "user", 
            parts
          }
        ]
      });

      const responseText = result.response.text();
      console.log('Received response from Gemini API');
      
      // Try to parse the JSON response
      try {
        // Find and extract the JSON from the response (which might contain explanatory text)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
        const jsonResponse = JSON.parse(jsonStr);
        
        // Log for debugging
        console.log(`Debug prompt:\n/* Using ${body.media?.type === 'image' ? 'image' : 'video'} system instructions */\n\n${systemPrompt}\n\nMEDIA INFORMATION:\nType: ${body.media?.type || 'none'}\nURL: ${body.media?.url || 'none'}\n\nNOTE: In the actual API request, the media file is downloaded and sent as binary data directly to Gemini, \nallowing it to properly analyze images and videos. This is just a text representation for debugging purposes.\n\nCURRENT CONTENT (for refinement):\n\`\`\`json\n${currentDataStr}\n\`\`\`\n\nPlease generate content for these fields: ${fieldsStr}\nIf media is provided, make sure your content directly references and relates to what's shown in the media.\nEnsure your response is ONLY valid JSON matching the structure in my instructions. Do not include any other text.`);
        
        // Transform the response to match expected structure based on media type
        let responseData: AiBriefingResponse;
        
        if (body.media?.type === 'image' && jsonResponse.cta !== undefined) {
          // Handle image-specific format (description and cta)
          console.log('Detected image-specific response format with description and cta');
          responseData = {
            caption_hook_options: "",
            body_content_structured_scenes: [],
            cta_script: jsonResponse.cta || "",
            cta_text_overlay: jsonResponse.cta || "",
            description: jsonResponse.description || ""
          };
        } else {
          // Handle regular format (video or default)
          responseData = {
            caption_hook_options: jsonResponse.caption_hook_options || "",
            body_content_structured_scenes: jsonResponse.body_content_structured_scenes || [],
            cta_script: jsonResponse.cta_script || "",
            cta_text_overlay: jsonResponse.cta_text_overlay || ""
          };
        }
        
        return NextResponse.json(responseData);
      } catch (parseError) {
        console.error('Failed to parse Gemini response as JSON:', parseError);
        console.log('Raw response text:', responseText);
        
        // Log additional diagnostic information
        console.log('System instructions used:');
        console.log(systemPrompt);
        
        if (body.media?.type === 'image') {
          console.log('This was an IMAGE request. Expected format with cta field.');
          
          // Try to extract cta manually as a fallback
          try {
            if (responseText.includes('"cta"')) {
              const manualMatch = responseText.match(/\{\s*"cta"\s*:\s*"([^"]*)"\s*\}/);
              if (manualMatch) {
                console.log('Found potential manual match for cta format');
                const cta = manualMatch[1];
                
                // Return transformed response
                return NextResponse.json({
                  caption_hook_options: "",
                  body_content_structured_scenes: [],
                  cta_script: cta,
                  cta_text_overlay: cta
                });
              }
            }
          } catch (fallbackError) {
            console.error('Failed in fallback extraction attempt:', fallbackError);
          }
        }
        
        // Return a fallback response with more details
        return NextResponse.json({ 
          error: 'Failed to parse AI response as JSON',
          media_type: body.media?.type || 'none',
          rawResponse: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
        }, { status: 500 });
      }
    } catch (generationError: any) {
      console.error('Gemini API generation error:', generationError);
      return NextResponse.json({ 
        error: `Gemini API generation error: ${generationError?.message || 'Unknown error'}`
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('General error in generate-brief API route:', error);
    return NextResponse.json({ 
      error: `Failed to generate brief: ${error?.message || 'Unknown error'}`
    }, { status: 500 });
  }
} 