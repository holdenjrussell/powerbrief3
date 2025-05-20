import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
// Use the correct model name as shown in the endpoint
const MODEL_NAME = 'gemini-2.5-flash-preview-04-17';
// Helper to get more specific mime types
const getProperMimeType = (mediaType, fileUrl) => {
    if (!mediaType) {
        // Try to infer from URL extension
        if (fileUrl.endsWith('.mp4'))
            return 'video/mp4';
        if (fileUrl.endsWith('.mov'))
            return 'video/quicktime';
        if (fileUrl.endsWith('.avi'))
            return 'video/x-msvideo';
        if (fileUrl.endsWith('.webm'))
            return 'video/webm';
        if (fileUrl.endsWith('.jpg') || fileUrl.endsWith('.jpeg'))
            return 'image/jpeg';
        if (fileUrl.endsWith('.png'))
            return 'image/png';
        if (fileUrl.endsWith('.gif'))
            return 'image/gif';
        // Default fallbacks
        return 'video/mp4';
    }
    // If general type is provided, add specific format
    if (mediaType === 'video')
        return 'video/mp4';
    if (mediaType === 'image')
        return 'image/jpeg';
    // If specific mime type is already provided, use it
    if (mediaType.includes('/'))
        return mediaType;
    // Default fallback
    return 'application/octet-stream';
};
// Helper function to fetch media as binary data
async function fetchMediaFile(url) {
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
    }
    catch (error) {
        console.error('Error fetching media file:', error);
        throw error;
    }
}
export async function POST(request) {
    var _a;
    // Create Supabase client (properly handles Next.js 15 cookie API)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
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
            hasMedia: !!((_a = body.media) === null || _a === void 0 ? void 0 : _a.url)
        });
        // Initialize the API
        const genAI = new GoogleGenerativeAI(apiKey);
        // Get the model
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                temperature: 0.7,
                responseMimeType: "application/json",
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
            ],
        });
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
        // Define the system instruction 
        const systemPrompt = `You are an expert advertising strategist and copywriter specializing in direct response marketing. 
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
            const parts = [{ text: systemPrompt + "\n\n" + userPrompt }];
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
                }
                catch (mediaError) {
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
                // Transform the response to match expected structure
                const responseData = {
                    caption_hook_options: jsonResponse.caption_hook_options || "",
                    // Ensure proper naming for scenes
                    body_content_structured_scenes: jsonResponse.body_content_structured_scenes || [],
                    cta_script: jsonResponse.cta_script || "",
                    cta_text_overlay: jsonResponse.cta_text_overlay || ""
                };
                return NextResponse.json(responseData);
            }
            catch (parseError) {
                console.error('Failed to parse Gemini response as JSON:', parseError);
                console.log('Raw response text:', responseText);
                // Return a fallback response
                return NextResponse.json({
                    error: 'Failed to parse AI response as JSON',
                    rawResponse: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
                }, { status: 500 });
            }
        }
        catch (generationError) {
            console.error('Gemini API generation error:', generationError);
            return NextResponse.json({
                error: `Gemini API generation error: ${(generationError === null || generationError === void 0 ? void 0 : generationError.message) || 'Unknown error'}`
            }, { status: 500 });
        }
    }
    catch (error) {
        console.error('General error in generate-brief API route:', error);
        return NextResponse.json({
            error: `Failed to generate brief: ${(error === null || error === void 0 ? void 0 : error.message) || 'Unknown error'}`
        }, { status: 500 });
    }
}
