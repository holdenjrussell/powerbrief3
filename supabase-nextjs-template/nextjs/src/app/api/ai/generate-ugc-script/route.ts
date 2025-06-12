import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Use the same model as the main power brief system
const MODEL_NAME = 'gemini-2.5-pro-preview-06-05';

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

// Define UGC script generation request/response types
interface UgcScriptGenerationRequest {
  brandContext: {
    brand_info_data: Record<string, unknown>;
    target_audience_data: Record<string, unknown>;
    competition_data: Record<string, unknown>;
    ugc_company_description?: string;
    ugc_filming_instructions?: string;
    ugc_guide_description?: string;
  };
  customPrompt?: string;
  systemInstructions?: string;
  referenceVideo?: {
    url: string;
    type: string;
  };
  hookOptions: {
    type: string;
    count: number;
  };
  company_description?: string;
  guide_description?: string;
  filming_instructions?: string;
}

interface UgcScriptGenerationResponse {
  script_content: {
    scene_start: string;
    segments: Array<{
      segment: string;
      script: string;
      visuals: string;
    }>;
    scene_end: string;
  };
  hook_body?: string;
  cta?: string;
  b_roll_shot_list: string[];
  company_description?: string;
  guide_description?: string;
  filming_instructions?: string;
}

export async function POST(request: NextRequest) {
  // Create Supabase client
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: UgcScriptGenerationRequest = await request.json();

    // Check API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERROR: No API key found in environment variables. Check .env.local for GOOGLE_API_KEY or GEMINI_API_KEY');
      return NextResponse.json({ 
        error: 'API key not configured in environment variables (GOOGLE_API_KEY or GEMINI_API_KEY)' 
      }, { status: 500 });
    }

    // Log we're proceeding with generation
    console.log('Starting Gemini API request for UGC script with model:', MODEL_NAME);
    console.log('Request structure:', {
      hasCustomPrompt: !!body.customPrompt,
      hookType: body.hookOptions.type,
      hookCount: body.hookOptions.count,
      hasReferenceVideo: !!body.referenceVideo?.url
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
      // @ts-expect-error - thinkingConfig is supported by the API but not by the current type definitions
      thinkingConfig: {
        thinkingBudget: 15000, // Allocate 15k tokens for thinking
      },
    });

    // Prepare the prompt content
    const brandContextStr = JSON.stringify(body.brandContext, null, 2);
    
    // Enhance custom prompt importance
    let enhancedCustomPrompt = body.customPrompt || "";
    if (enhancedCustomPrompt) {
      // Make custom prompt stand out more by formatting it
      enhancedCustomPrompt = `IMPORTANT INSTRUCTION: ${enhancedCustomPrompt.toUpperCase()}`;
    }

    // Handle hook options
    const hookInstructions = `Create a script with ${body.hookOptions.count} different ${body.hookOptions.type || 'verbal'} hooks.`;
    
    // Define the system prompt for UGC script generation - use from request or fallback to default
    const systemPrompt = body.systemInstructions || `You are an expert UGC (User Generated Content) script creator that specializes in creating engaging scripts for social media videos.

Your task is to create a highly engaging UGC script for a creator. The script should be optimized for the brand's products and target audience.

IMPORTANT: Your response MUST be valid JSON with the following structure:
{
  "script_content": {
    "scene_start": "Description of how the scene starts",
    "segments": [
      {
        "segment": "Segment name/title",
        "script": "Dialogue or action description",
        "visuals": "Visual instructions for filming"
      }
    ],
    "scene_end": "Description of how the scene ends"
  },
  "hook_body": "The main body/message of the script that follows the hook",
  "cta": "Call to action for the end of the video",
  "b_roll_shot_list": [
    "Description of supplementary shot 1",
    "Description of supplementary shot 2",
    ...
  ],
  "company_description": "Description of the company, products, and brand (if not provided, generate this)",
  "guide_description": "Overview of what the creator will be filming and the goals of the content (if not provided, generate this)",
  "filming_instructions": "Detailed technical and performance guidance for filming (if not provided, generate this)"
}`;

    // Check if we have existing guide or filming instructions to enhance
    const existingGuideDescription = body.guide_description || body.brandContext.ugc_guide_description || '';
    const existingFilmingInstructions = body.filming_instructions || body.brandContext.ugc_filming_instructions || '';
    
    // Create prompt additions for enhancing existing content
    let enhancementPrompt = '';
    if (existingGuideDescription || existingFilmingInstructions) {
      enhancementPrompt = `
IMPORTANT - CONTENT ENHANCEMENT INSTRUCTIONS:
`;

      if (existingGuideDescription) {
        enhancementPrompt += `
Here is the existing guide description. Enhance it by adding more detail about target audience, emotional connection, and marketing strategy:
\`\`\`
${existingGuideDescription}
\`\`\`
`;
      }
      
      if (existingFilmingInstructions) {
        enhancementPrompt += `
Here are the existing filming instructions. Enhance them with specific guidance on performance, authenticity, location, lighting, and pacing:
\`\`\`
${existingFilmingInstructions}
\`\`\`
`;
      }
    }

    // Construct user prompt
    const userPrompt = `${enhancedCustomPrompt ? `${enhancedCustomPrompt}\n\n` : ''}
BRAND CONTEXT:
\`\`\`json
${brandContextStr}
\`\`\`

${hookInstructions}

${enhancementPrompt}

Create a compelling UGC script for a video that will effectively promote the brand's products. The script should have:
1. A strong and attention-grabbing hook
2. A clear product showcase section
3. Strong benefit statements
4. A compelling call-to-action
5. B-roll shot suggestions for supplementary footage
${!existingGuideDescription ? '6. A comprehensive guide description explaining what the creator will film' : ''}
${!existingFilmingInstructions ? '7. Detailed filming instructions with technical and performance guidance' : ''}

Ensure your response is ONLY valid JSON matching the exact structure in my instructions. Do not include any other text.`;

    let parts = [];
    
    // Include the reference video if provided
    if (body.referenceVideo?.url) {
      try {
        console.log(`Attempting to download reference video from: ${body.referenceVideo.url}`);
        
        // Fetch the video file
        const videoResponse = await fetch(body.referenceVideo.url);
        if (!videoResponse.ok) {
          throw new Error(`Failed to download video: ${videoResponse.statusText}`);
        }
        
        // Get the file as blob
        const videoBlob = await videoResponse.blob();
        const mimeType = getProperMimeType(body.referenceVideo.type, body.referenceVideo.url);
        
        console.log(`Downloaded video: ${videoBlob.size} bytes, mime type: ${mimeType}`);
        
        // Add the video to parts for multimodal generation
        parts = [
          { text: `${systemPrompt}\n\n${userPrompt}\n\nI'm including a reference video for you to analyze and use for inspiration.` },
          { inlineData: { 
              mimeType, 
              data: Buffer.from(await videoBlob.arrayBuffer()).toString('base64') 
          }},
          { text: "\n\nBased on the reference video and brand context, create a UGC script with the specified format." }
        ];
      } catch (videoError) {
        console.error('Error processing reference video:', videoError);
        // Fallback to text-only if video processing fails
        parts = [{ text: `${systemPrompt}\n\n${userPrompt}` }];
      }
    } else {
      parts = [{ text: `${systemPrompt}\n\n${userPrompt}` }];
    }
    
    // Generate the content
    console.log('Sending generation request to Gemini API...');
    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const responseText = result.response.text();
    
    // Try to parse the JSON response
    try {
      // Find and extract the JSON from the response (which might contain explanatory text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const jsonResponse = JSON.parse(jsonStr);
      
      // Get the existing values, if any
      const existingGuideDescription = body.guide_description || body.brandContext.ugc_guide_description || '';
      const existingFilmingInstructions = body.filming_instructions || body.brandContext.ugc_filming_instructions || '';
      
      // Generate enhanced versions of guide description and filming instructions
      let enhancedGuideDescription = jsonResponse.guide_description || '';
      let enhancedFilmingInstructions = jsonResponse.filming_instructions || '';
      
      // If AI didn't generate these fields but we have existing content, use that
      if (!enhancedGuideDescription && existingGuideDescription) {
        enhancedGuideDescription = existingGuideDescription;
      }
      
      if (!enhancedFilmingInstructions && existingFilmingInstructions) {
        enhancedFilmingInstructions = existingFilmingInstructions;
      }
      
      // Ensure proper format for the response
      const responseData: UgcScriptGenerationResponse = {
        script_content: jsonResponse.script_content || {
          scene_start: '',
          segments: [],
          scene_end: ''
        },
        hook_body: jsonResponse.hook_body || '',
        cta: jsonResponse.cta || '',
        b_roll_shot_list: jsonResponse.b_roll_shot_list || [],
        company_description: jsonResponse.company_description || body.company_description || body.brandContext.ugc_company_description || '',
        guide_description: enhancedGuideDescription,
        filming_instructions: enhancedFilmingInstructions
      };
      
      return NextResponse.json(responseData);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw response:', responseText);
      return NextResponse.json({
        error: 'Failed to parse AI response: Invalid format received'
      }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('General error in generate-ugc-script API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: `Failed to generate UGC script: ${errorMessage}`
    }, { status: 500 });
  }
} 