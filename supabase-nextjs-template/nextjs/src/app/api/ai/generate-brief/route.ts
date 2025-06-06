import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from '@google/generative-ai';
import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { AiBriefingRequest, AiBriefingResponse } from '@/lib/types/powerbrief';
import { createClient } from '@/utils/supabase/server';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

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

// Helper function to upload files using Files API (for larger videos or multiple files)
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
      const tempFileName = `temp_inspiration_${Date.now()}_${safeFileName}`;
      tempFilePath = path.join(os.tmpdir(), tempFileName);
      await fs.writeFile(tempFilePath, Buffer.from(fileBuffer));

      console.log(`Uploading inspiration file from ${tempFilePath}`);
      
      // Determine MIME type
      const mimeType = getProperMimeType(undefined, fileUrl);
      
      // Upload to Google File API
      uploadedFile = await ai.files.upload({
        file: tempFilePath,
        config: { mimeType },
      });
      
      console.log(`Uploaded inspiration file, initial state: ${uploadedFile.state}`);

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
      console.error(`Error uploading inspiration file:`, uploadError);
      
      // Clean up uploaded file if it exists
      if (uploadedFile && uploadedFile.name) {
        try {
          await ai.files.delete({ name: uploadedFile.name });
          console.log(`Cleaned up uploaded file: ${uploadedFile.name}`);
        } catch (deleteError) {
          console.error(`Failed to delete uploaded file:`, deleteError);
        }
      }
      throw new Error(`Processing inspiration file failed: ${errorMessage}`);
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
      hasMedia: !!body.media?.url,
      hasInspirationFiles: !!(body.inspirationFiles && body.inspirationFiles.length > 0)
    });

    // Determine which client to use based on whether we have inspiration files
    const hasInspirationFiles = body.inspirationFiles && body.inspirationFiles.length > 0;
    
    if (hasInspirationFiles) {
      // Use GoogleGenAI (new SDK) for Files API support
      console.log('Using GoogleGenAI client for inspiration files');
      const ai = new GoogleGenAI({ apiKey });
      
      // Upload inspiration files using Files API
      const uploadedFiles = await uploadFilesUsingFilesAPI(body.inspirationFiles!, ai);
      
      // Prepare the prompt and content
      const brandContextStr = JSON.stringify(body.brandContext, null, 2);
      const currentDataStr = body.conceptCurrentData ? JSON.stringify(body.conceptCurrentData, null, 2) : 'No current data provided';
      const fieldsStr = body.desiredOutputFields.join(', ');
      
      // Handle product information if provided
      let productContext = '';
      if (body.brandContext.product_info) {
        const product = body.brandContext.product_info;
        productContext = `\n\nPRODUCT SPECIFIC CONTEXT:
This concept is specifically for the product: ${product.name} (${product.identifier})
${product.description ? `Product Description: ${product.description}` : ''}
${product.category ? `Category: ${product.category}` : ''}
${product.price && product.currency ? `Price: ${product.currency} ${product.price}` : ''}

IMPORTANT: Make sure all creative content specifically relates to and promotes this product. Reference the product name and its unique features in your generated content.`;
      }
      
      // Enhance custom prompt importance
      let enhancedCustomPrompt = body.conceptSpecificPrompt || "";
      if (enhancedCustomPrompt) {
        enhancedCustomPrompt = `IMPORTANT INSTRUCTION: ${enhancedCustomPrompt.toUpperCase()}`;
      }

      // Handle hook options if provided
      let hookInstructions = '';
      if (body.hookOptions) {
        const { type, count } = body.hookOptions;
        hookInstructions = `\nHOOK OPTIONS INSTRUCTIONS:
- Generate ${count} unique hook options
- Hook type: ${type}
- For text hooks: Use emojis and catchy phrases suitable for social media captions
- For verbal hooks: Create spoken phrases that would work well when read aloud in videos
- If hook type is 'text', only populate the text_hook_options field
- If hook type is 'verbal', only populate the spoken_hook_options field 
- If hook type is 'both', populate both fields with ${count} options each
`;
      }

      // Get system instructions
      let systemPrompt = '';
      
      // 🚀 NEW: Detect if this is an email request based on desired output fields OR concept markers
      const isEmailRequest = body.desiredOutputFields.includes('email_storyboard') || 
                             body.desiredOutputFields.includes('inbox_presence') || 
                             body.desiredOutputFields.includes('campaign_type') ||
                             // Also check for email-specific markers in the concept data
                             (body.conceptCurrentData?.description && body.conceptCurrentData.description.includes('EMAIL_BRIEF_CONCEPT')) ||
                             (body.conceptSpecificPrompt && body.conceptSpecificPrompt.includes('EMAIL_BRIEF_CONCEPT'));
      
      // Check if brand-specific system instructions are provided in the request
      if (body.brandContext.system_instructions_image && (body.media?.type === 'image' || isEmailRequest)) {
        systemPrompt = body.brandContext.system_instructions_image;
      } else if (body.brandContext.system_instructions_video && body.media?.type === 'video') {
        systemPrompt = body.brandContext.system_instructions_video;
      } else if (isEmailRequest) {
        // 🚀 NEW: Email-specific system prompt for email requests
        systemPrompt = `You are an expert email marketing strategist specializing in multimodal analysis and email campaign creation.

Given the brand context, email brief configuration, and visual inspiration files (if provided), generate comprehensive email marketing content optimized for engagement and conversion.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:
{
  "campaign_type": "promotional|welcome_series|nurture|cart_abandonment|re_engagement",
  "inbox_presence": {
    "subject_line_variations": [
      {
        "subject": "Compelling subject line",
        "preheader": "Preheader text that complements subject",
        "tone_rationale": "Why this approach works for the target audience"
      }
    ]
  },
  "email_storyboard": [
    {
      "section_type": "hero_image",
      "content": {
        "headline": "Main headline",
        "body_text": "Supporting text",
        "cta_text": "Button text"
      },
      "visual_direction": "Detailed visual and design notes"
    }
  ],
  "primary_cta": {
    "button_text": "Shop Now",
    "destination_url_placeholder": "Product landing page",
    "visual_recommendation": "Button styling and placement notes"
  },
  "design_notes": {
    "overall_aesthetic": "Overall design approach",
    "color_palette": "Recommended colors",
    "typography_style": "Font and text styling",
    "layout_approach": "Email structure and spacing",
    "mobile_optimization": "Mobile-specific recommendations"
  },
  "personalization_elements": ["Dynamic content suggestions", "Segmentation ideas"]
}

Generate 2-3 subject line variations, 4-6 email storyboard sections, and comprehensive design guidance.`;
      } else {
        // Fallback to default ad system prompt if no custom instructions are available
        systemPrompt = `You are an expert content strategist specializing in multimodal analysis and content creation.

Given the brand context, concept prompt, and visual inspiration files, analyze the uploaded inspiration images to inform your content generation. 

IMPORTANT: Your response MUST be valid JSON and nothing else.`;
      }

      // Construct user prompt with inspiration context
      const userPrompt = `${enhancedCustomPrompt ? `${enhancedCustomPrompt}\n\n` : ''}${hookInstructions}
BRAND CONTEXT:
\`\`\`json
${brandContextStr}
\`\`\`${productContext}

VISUAL INSPIRATION ANALYSIS:
I have provided ${uploadedFiles.length} inspiration file(s) for you to analyze. Please examine the visual style, color palette, typography, layout, mood, and aesthetic elements from these files to inform your content generation.

CURRENT CONTENT (for refinement):
\`\`\`json
${currentDataStr}
\`\`\`

Please generate content for these fields: ${fieldsStr}
Use the visual inspiration from the uploaded files to inform the style, tone, and approach of your generated content.
Ensure your response is ONLY valid JSON matching the structure in my instructions. Do not include any other text.`;

      // Create content parts including uploaded files
      const contentParts = [
        systemPrompt + "\n\n" + userPrompt,
        ...uploadedFiles.map(file => createPartFromUri(file.fileUri, file.mimeType))
      ];

      // Generate content using new SDK
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: createUserContent(contentParts),
      });

      const responseText = response.text;
      
      // Parse and return response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
        const jsonResponse = JSON.parse(jsonStr);
        
        // Transform the response to match expected structure based on media type
        let responseData: AiBriefingResponse;
        
        // 🚀 NEW: Check if this is an email request and handle email-specific response
        if (isEmailRequest) {
          // Handle email-specific response format - return the email data directly
          console.log('Detected email request in standard processing - returning email-specific response format');
          return NextResponse.json(jsonResponse);
        } else if (body.media?.type === 'image' && (jsonResponse.description !== undefined || jsonResponse.cta !== undefined)) {
          // Handle image-specific format (description and cta)
          console.log('Detected image-specific response format with description and/or cta');
          responseData = {
            text_hook_options: [],
            spoken_hook_options: [],
            body_content_structured_scenes: [],
            cta_script: jsonResponse.cta || "",
            cta_text_overlay: jsonResponse.cta || "",
            description: jsonResponse.description || ""
          };
        } else if (body.media?.type === 'image') {
          // Handle case where image was requested but response doesn't match expected format
          console.log('Image request but response format not recognized, attempting to extract description and cta');
          responseData = {
            text_hook_options: [],
            spoken_hook_options: [],
            body_content_structured_scenes: [],
            cta_script: jsonResponse.cta_script || jsonResponse.cta || "",
            cta_text_overlay: jsonResponse.cta_text_overlay || jsonResponse.cta || "",
            description: jsonResponse.description || ""
          };
        } else {
          // Handle regular ad format (video or default)
          const hookType = body.hookOptions?.type || 'both';
          
          // Ensure we have hook options in the expected format based on hook type
          let textHooks: string[] = [];
          let spokenHooks: string[] = [];
          
          // Handle different response formats for hooks
          if (typeof jsonResponse.text_hook_options === 'string') {
            textHooks = jsonResponse.text_hook_options.split('\n').filter((h: string) => h.trim());
          } else if (Array.isArray(jsonResponse.text_hook_options)) {
            textHooks = jsonResponse.text_hook_options;
          }
          
          if (typeof jsonResponse.spoken_hook_options === 'string') {
            spokenHooks = jsonResponse.spoken_hook_options.split('\n').filter((h: string) => h.trim());
          } else if (Array.isArray(jsonResponse.spoken_hook_options)) {
            spokenHooks = jsonResponse.spoken_hook_options;
          }
          
          // If we requested a specific hook type but got empty result, try to extract from the other field
          if (hookType === 'text' && textHooks.length === 0 && spokenHooks.length > 0) {
            console.log('Text hooks missing but verbal hooks present - trying to use verbal hooks');
            textHooks = spokenHooks;
          } else if (hookType === 'verbal' && spokenHooks.length === 0 && textHooks.length > 0) {
            console.log('Verbal hooks missing but text hooks present - trying to use text hooks');
            spokenHooks = textHooks;
          }
          
          responseData = {
            text_hook_options: textHooks,
            spoken_hook_options: spokenHooks,
            body_content_structured_scenes: jsonResponse.body_content_structured_scenes || [],
            cta_script: jsonResponse.cta_script || "",
            cta_text_overlay: jsonResponse.cta_text_overlay || ""
          };
        }
        
        return NextResponse.json(responseData);
      } catch (parseError) {
        console.error('Failed to parse Gemini response as JSON:', parseError);
        return NextResponse.json({ 
          error: 'Failed to parse AI response as JSON',
          rawResponse: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
        }, { status: 500 });
      }
    } else {
      // Use existing GoogleGenerativeAI client for backward compatibility
      console.log('Using GoogleGenerativeAI client for standard media processing');
      
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
      });

      // Prepare the prompt and content
      const brandContextStr = JSON.stringify(body.brandContext, null, 2);
      const currentDataStr = body.conceptCurrentData ? JSON.stringify(body.conceptCurrentData, null, 2) : 'No current data provided';
      const fieldsStr = body.desiredOutputFields.join(', ');
      
      // Handle product information if provided
      let productContext = '';
      if (body.brandContext.product_info) {
        const product = body.brandContext.product_info;
        productContext = `\n\nPRODUCT SPECIFIC CONTEXT:
This concept is specifically for the product: ${product.name} (${product.identifier})
${product.description ? `Product Description: ${product.description}` : ''}
${product.category ? `Category: ${product.category}` : ''}
${product.price && product.currency ? `Price: ${product.currency} ${product.price}` : ''}

IMPORTANT: Make sure all creative content specifically relates to and promotes this product. Reference the product name and its unique features in your generated content.`;
      }
      
      // Enhance custom prompt importance
      let enhancedCustomPrompt = body.conceptSpecificPrompt || "";
      if (enhancedCustomPrompt) {
        // Make custom prompt stand out more by formatting it
        enhancedCustomPrompt = `IMPORTANT INSTRUCTION: ${enhancedCustomPrompt.toUpperCase()}`;
      }

      // Handle hook options if provided
      let hookInstructions = '';
      if (body.hookOptions) {
        const { type, count } = body.hookOptions;
        hookInstructions = `\nHOOK OPTIONS INSTRUCTIONS:
- Generate ${count} unique hook options
- Hook type: ${type}
- For text hooks: Use emojis and catchy phrases suitable for social media captions
- For verbal hooks: Create spoken phrases that would work well when read aloud in videos
- If hook type is 'text', only populate the text_hook_options field
- If hook type is 'verbal', only populate the spoken_hook_options field 
- If hook type is 'both', populate both fields with ${count} options each
`;
      }

      // Get the appropriate system instructions based on media type
      let systemPrompt = '';
      
      // 🚀 NEW: Detect if this is an email request based on desired output fields OR concept markers
      const isEmailRequest = body.desiredOutputFields.includes('email_storyboard') || 
                             body.desiredOutputFields.includes('inbox_presence') || 
                             body.desiredOutputFields.includes('campaign_type') ||
                             // Also check for email-specific markers in the concept data
                             (body.conceptCurrentData?.description && body.conceptCurrentData.description.includes('EMAIL_BRIEF_CONCEPT')) ||
                             (body.conceptSpecificPrompt && body.conceptSpecificPrompt.includes('EMAIL_BRIEF_CONCEPT'));
      
      // Check if brand-specific system instructions are provided in the request
      if (body.brandContext.system_instructions_image && (body.media?.type === 'image' || isEmailRequest)) {
        systemPrompt = body.brandContext.system_instructions_image;
      } else if (body.brandContext.system_instructions_video && body.media?.type === 'video') {
        systemPrompt = body.brandContext.system_instructions_video;
      } else if (isEmailRequest) {
        // 🚀 NEW: Email-specific system prompt for email requests
        systemPrompt = `You are an expert email marketing strategist specializing in multimodal analysis and email campaign creation.

Given the brand context, email brief configuration, and visual inspiration files (if provided), generate comprehensive email marketing content optimized for engagement and conversion.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:
{
  "campaign_type": "promotional|welcome_series|nurture|cart_abandonment|re_engagement",
  "inbox_presence": {
    "subject_line_variations": [
      {
        "subject": "Compelling subject line",
        "preheader": "Preheader text that complements subject",
        "tone_rationale": "Why this approach works for the target audience"
      }
    ]
  },
  "email_storyboard": [
    {
      "section_type": "hero_image",
      "content": {
        "headline": "Main headline",
        "body_text": "Supporting text",
        "cta_text": "Button text"
      },
      "visual_direction": "Detailed visual and design notes"
    }
  ],
  "primary_cta": {
    "button_text": "Shop Now",
    "destination_url_placeholder": "Product landing page",
    "visual_recommendation": "Button styling and placement notes"
  },
  "design_notes": {
    "overall_aesthetic": "Overall design approach",
    "color_palette": "Recommended colors",
    "typography_style": "Font and text styling",
    "layout_approach": "Email structure and spacing",
    "mobile_optimization": "Mobile-specific recommendations"
  },
  "personalization_elements": ["Dynamic content suggestions", "Segmentation ideas"]
}

Generate 2-3 subject line variations, 4-6 email storyboard sections, and comprehensive design guidance.`;
      } else {
        // Fallback to default ad system prompt if no custom instructions are available
        systemPrompt = `You are an expert advertising strategist and copywriter specializing in direct response marketing. 
Given the brand context (positioning, target audience, competitors), concept prompt, and media (if provided), generate ad creative components that specifically relate to the media content. Always use the brand information provided in the brand context and never reference other brands.

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:
{
  "text_hook_options": "Generate text hooks here as simple text with each hook on a new line. Include emojis and catchy phrases suitable for social media captions. Do NOT use JSON formatting or escaped quotes - just plain text with line breaks between hooks.",
  "spoken_hook_options": "Generate spoken hook options here as simple text with each hook on a new line. These should be phrases designed to be spoken in videos, not written as captions. Do NOT use JSON formatting or escaped quotes - just plain text with line breaks between hooks.",
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
      const userPrompt = `${enhancedCustomPrompt ? `${enhancedCustomPrompt}\n\n` : ''}${hookInstructions}
BRAND CONTEXT:
\`\`\`json
${brandContextStr}
\`\`\`${productContext}

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
        
        // Validate that responseText is a string before calling .match()
        if (typeof responseText !== 'string') {
          console.error('Response text is not a string:', typeof responseText, responseText);
          return NextResponse.json({ 
            error: 'Invalid response format from AI service - expected string but got ' + typeof responseText
          }, { status: 500 });
        }
        
        if (!responseText || responseText.trim() === '') {
          console.error('Response text is empty or null');
          return NextResponse.json({ 
            error: 'Empty response from AI service'
          }, { status: 500 });
        }
        
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
          
          // 🚀 NEW: Check if this is an email request and handle email-specific response
          if (isEmailRequest) {
            // Handle email-specific response format - return the email data directly
            console.log('Detected email request in standard processing - returning email-specific response format');
            return NextResponse.json(jsonResponse);
          } else if (body.media?.type === 'image' && (jsonResponse.description !== undefined || jsonResponse.cta !== undefined)) {
            // Handle image-specific format (description and cta)
            console.log('Detected image-specific response format with description and/or cta');
            responseData = {
              text_hook_options: [],
              spoken_hook_options: [],
              body_content_structured_scenes: [],
              cta_script: jsonResponse.cta || "",
              cta_text_overlay: jsonResponse.cta || "",
              description: jsonResponse.description || ""
            };
          } else if (body.media?.type === 'image') {
            // Handle case where image was requested but response doesn't match expected format
            console.log('Image request but response format not recognized, attempting to extract description and cta');
            responseData = {
              text_hook_options: [],
              spoken_hook_options: [],
              body_content_structured_scenes: [],
              cta_script: jsonResponse.cta_script || jsonResponse.cta || "",
              cta_text_overlay: jsonResponse.cta_text_overlay || jsonResponse.cta || "",
              description: jsonResponse.description || ""
            };
          } else {
            // Handle regular ad format (video or default)
            const hookType = body.hookOptions?.type || 'both';
            
            // Ensure we have hook options in the expected format based on hook type
            let textHooks: string[] = [];
            let spokenHooks: string[] = [];
            
            // Handle different response formats for hooks
            if (typeof jsonResponse.text_hook_options === 'string') {
              textHooks = jsonResponse.text_hook_options.split('\n').filter((h: string) => h.trim());
            } else if (Array.isArray(jsonResponse.text_hook_options)) {
              textHooks = jsonResponse.text_hook_options;
            }
            
            if (typeof jsonResponse.spoken_hook_options === 'string') {
              spokenHooks = jsonResponse.spoken_hook_options.split('\n').filter((h: string) => h.trim());
            } else if (Array.isArray(jsonResponse.spoken_hook_options)) {
              spokenHooks = jsonResponse.spoken_hook_options;
            }
            
            // If we requested a specific hook type but got empty result, try to extract from the other field
            if (hookType === 'text' && textHooks.length === 0 && spokenHooks.length > 0) {
              console.log('Text hooks missing but verbal hooks present - trying to use verbal hooks');
              textHooks = spokenHooks;
            } else if (hookType === 'verbal' && spokenHooks.length === 0 && textHooks.length > 0) {
              console.log('Verbal hooks missing but text hooks present - trying to use text hooks');
              spokenHooks = textHooks;
            }
            
            responseData = {
              text_hook_options: textHooks,
              spoken_hook_options: spokenHooks,
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
              if (typeof responseText === 'string' && responseText.includes('"cta"')) {
                const manualMatch = responseText.match(/\{\s*"cta"\s*:\s*"([^"]*)"\s*\}/);
                if (manualMatch) {
                  console.log('Found potential manual match for cta format');
                  const cta = manualMatch[1];
                  
                  // Return transformed response
                  return NextResponse.json({
                    text_hook_options: [],
                    spoken_hook_options: [],
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
      } catch (generationError: unknown) {
        const errorMessage = generationError instanceof Error ? generationError.message : 'Unknown error';
        console.error('Gemini API generation error:', generationError);
        return NextResponse.json({ 
          error: `Gemini API generation error: ${errorMessage}`
        }, { status: 500 });
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('General error in generate-brief API route:', error);
    return NextResponse.json({ 
      error: `Failed to generate brief: ${errorMessage}`
    }, { status: 500 });
  }
} 