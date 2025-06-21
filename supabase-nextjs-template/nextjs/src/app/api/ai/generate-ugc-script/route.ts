import { GoogleGenAI, createUserContent, createPartFromUri, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

// Use the same model as PowerBrief with structured output support
const MODEL_NAME = 'gemini-2.5-flash';

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

// Helper function to upload files using Files API
async function uploadFilesUsingFilesAPI(fileUrls: string[], ai: GoogleGenAI): Promise<{ fileUri: string; mimeType: string }[]> {
  const uploadedFiles: { fileUri: string; mimeType: string }[] = [];
  
  for (const fileUrl of fileUrls) {
    let tempFilePath: string | null = null;
    let uploadedFile: { name?: string; uri?: string; mimeType?: string; state?: string } | null = null;
    
    try {
      // Fetch the file
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
      }
      const fileBuffer = await fileResponse.arrayBuffer();
      
      // Determine file type and create temp file
      const safeFileName = fileUrl.split('/').pop()?.replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
      const tempFileName = `temp_ugc_reference_${Date.now()}_${safeFileName}`;
      tempFilePath = path.join(os.tmpdir(), tempFileName);
      await fs.writeFile(tempFilePath, Buffer.from(fileBuffer));

      console.log(`Uploading UGC reference file from ${tempFilePath}`);
      
      // Determine MIME type
      const mimeType = getProperMimeType(undefined, fileUrl);
      
      // Upload to Google File API
      uploadedFile = await ai.files.upload({
        file: tempFilePath,
        config: { mimeType },
      });
      
      console.log(`Uploaded UGC reference file, initial state: ${uploadedFile.state}`);

      if (!uploadedFile.name) {
        throw new Error(`Failed to obtain file name for uploaded file`);
      }

      // Wait for file to become ACTIVE
      let attempts = 0;
      const maxAttempts = 30; // Wait up to 5 minutes (30 * 10 seconds)
      
      while (uploadedFile.state !== 'ACTIVE' && attempts < maxAttempts) {
        if (uploadedFile.state === 'FAILED') {
          throw new Error(`File processing failed`);
        }
        
        console.log(`File is in state: ${uploadedFile.state}. Waiting for ACTIVE state... (attempt ${attempts + 1}/${maxAttempts})`);
        
        // Wait 10 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check file status
        const fileStatus = await ai.files.get({ name: uploadedFile.name });
        uploadedFile = fileStatus;
        attempts++;
      }
      
      if (uploadedFile.state !== 'ACTIVE') {
        throw new Error(`File did not become ACTIVE after ${maxAttempts} attempts. Final state: ${uploadedFile.state}`);
      }

      if (!uploadedFile.uri) {
        throw new Error(`Failed to obtain URI for uploaded file`);
      }

      console.log(`File is now ACTIVE. URI: ${uploadedFile.uri}`);
      
      uploadedFiles.push({
        fileUri: uploadedFile.uri,
        mimeType: uploadedFile.mimeType || mimeType
      });
      
    } catch (uploadError: unknown) {
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
      console.error(`Error uploading UGC reference file:`, uploadError);
      
      // Clean up uploaded file if it exists
      if (uploadedFile && uploadedFile.name) {
        try {
          await ai.files.delete({ name: uploadedFile.name });
          console.log(`Cleaned up uploaded file: ${uploadedFile.name}`);
        } catch (deleteError) {
          console.error(`Failed to delete uploaded file:`, deleteError);
        }
      }
      throw new Error(`Processing UGC reference file failed: ${errorMessage}`);
    } finally {
      // Clean up temporary file
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
          console.log(`Deleted temporary file: ${tempFilePath}`);
        } catch (cleanupError) {
          console.error(`Error deleting temporary file:`, cleanupError);
        }
      }
    }
  }
  
  return uploadedFiles;
}

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

    // Initialize the new GoogleGenAI API
    const ai = new GoogleGenAI({ apiKey });

    // Prepare the prompt content
    const brandContextStr = JSON.stringify(body.brandContext, null, 2);
    
    // Enhance custom prompt importance
    let enhancedCustomPrompt = body.customPrompt || "";
    if (enhancedCustomPrompt) {
      enhancedCustomPrompt = `IMPORTANT INSTRUCTION: ${enhancedCustomPrompt.toUpperCase()}`;
    }

    // Handle hook options
    const hookInstructions = `Create a script with ${body.hookOptions.count} different ${body.hookOptions.type || 'verbal'} hooks.`;
    
    // Define the system prompt for UGC script generation - use from request or fallback to default
    const systemPrompt = body.systemInstructions || `You are an expert UGC (User Generated Content) script creator that specializes in creating engaging scripts for social media videos.

Your task is to create a highly engaging UGC script for a creator. The script should be optimized for the brand's products and target audience.

IMPORTANT: Your response MUST be valid JSON with the following structure and will be enforced by the response schema.`;

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

    // Define structured output schema for UGC scripts
    const responseSchema = {
      type: Type.OBJECT,
      description: "Schema for UGC script generation with detailed content structure.",
      required: ["script_content", "hook_body", "cta", "b_roll_shot_list", "company_description", "guide_description", "filming_instructions"],
      properties: {
        script_content: {
          type: Type.OBJECT,
          description: "Main script content with structured scenes.",
          required: ["scene_start", "segments", "scene_end"],
          properties: {
            scene_start: {
              type: Type.STRING,
              description: "Description of how the scene starts",
            },
            segments: {
              type: Type.ARRAY,
              description: "Array of script segments",
              items: {
                type: Type.OBJECT,
                required: ["segment", "script", "visuals"],
                properties: {
                  segment: {
                    type: Type.STRING,
                    description: "Segment name/title",
                  },
                  script: {
                    type: Type.STRING,
                    description: "Dialogue or action description",
                  },
                  visuals: {
                    type: Type.STRING,
                    description: "Visual instructions for filming",
                  },
                },
              },
            },
            scene_end: {
              type: Type.STRING,
              description: "Description of how the scene ends",
            },
          },
        },
        hook_body: {
          type: Type.STRING,
          description: "The main body/message of the script that follows the hook",
        },
        cta: {
          type: Type.STRING,
          description: "Call to action for the end of the video",
        },
        b_roll_shot_list: {
          type: Type.ARRAY,
          description: "List of supplementary shots for b-roll footage",
          items: {
            type: Type.STRING,
          },
        },
        company_description: {
          type: Type.STRING,
          description: "Description of the company, products, and brand",
        },
        guide_description: {
          type: Type.STRING,
          description: "Overview of what the creator will be filming and the goals of the content",
        },
        filming_instructions: {
          type: Type.STRING,
          description: "Detailed technical and performance guidance for filming",
        },
      },
    };

    // Create configuration with structured output
    const config = {
      responseMimeType: 'application/json',
      responseSchema,
      systemInstruction: [
        {
          text: systemPrompt,
        }
      ],
    };

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

Generate content that is authentic, engaging, and optimized for social media platforms.`;

    // Handle reference video using Files API
    let finalUserPrompt = userPrompt;
    let videoFiles: { fileUri: string; mimeType: string }[] = [];
    
    if (body.referenceVideo?.url) {
      try {
        console.log(`Processing reference video: ${body.referenceVideo.url}`);
        const uploadedFiles = await uploadFilesUsingFilesAPI([body.referenceVideo.url], ai);
        videoFiles = uploadedFiles;
        finalUserPrompt = userPrompt + `\n\nI'm including a reference video for you to analyze and use for inspiration. Based on the reference video and brand context, create a UGC script with the specified format.`;
      } catch (videoError) {
        console.error('Error processing reference video:', videoError);
        // Continue without reference video if upload fails
        finalUserPrompt = userPrompt + `\n\nNote: Reference video could not be processed, proceeding with brand context only.`;
      }
    }

    // Create content parts including video files
    const contentParts = [
      finalUserPrompt,
      ...videoFiles.map(file => createPartFromUri(file.fileUri, file.mimeType))
    ];

    // ADD COMPREHENSIVE LOGGING
    console.log('\n--------------------------');
    console.log('System Instructions');
    console.log('--------------------------');
    console.log(systemPrompt);
    console.log('\n--------------------------');
    console.log('PROMPT');
    console.log('----------------------------');
    console.log(finalUserPrompt);
    console.log('\n');

    // Generate content using new SDK with structured output
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      config,
      contents: createUserContent(contentParts),
    });

    const responseText = response.text;
    
    // LOG THE RESPONSE
    console.log('\n--------------------------');
    console.log('RESPONSE');
    console.log('--------------------------');
    console.log(responseText);
    console.log('\n');
    
    // Parse and return response (with structured output, this should always be valid JSON)
    try {
      const jsonResponse = JSON.parse(responseText);
      
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