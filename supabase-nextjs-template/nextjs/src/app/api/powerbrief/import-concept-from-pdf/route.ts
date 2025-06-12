import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Use the same model as the main power brief system
const MODEL_NAME = 'gemini-2.5-pro-preview-06-05';
const FALLBACK_MODEL = 'gemini-2.5-flash-preview-05-20';

// Helper to get proper mime type for PDFs
const getProperMimeType = (fileUrl: string): string => {
  if (fileUrl.endsWith('.pdf')) return 'application/pdf';
  return 'application/pdf'; // Default to PDF
};

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry API calls with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a 503 (service overloaded) or rate limit error
      if (lastError.message.includes('503') || 
          lastError.message.includes('overloaded') ||
          lastError.message.includes('rate') ||
          lastError.message.includes('quota')) {
        
        const delayTime = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`);
        await delay(delayTime);
        continue;
      }
      
      // If it's not a retryable error, throw immediately
      throw error;
    }
  }
  
  throw lastError;
};

export async function POST(request: NextRequest) {
  // Create Supabase client
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const brandId = formData.get('brandId') as string;
    const batchId = formData.get('batchId') as string;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No PDF files provided' }, { status: 400 });
    }

    if (!brandId || !batchId) {
      return NextResponse.json({ error: 'Brand ID and Batch ID are required' }, { status: 400 });
    }

    // Check API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERROR: No API key found in environment variables. Check .env.local for GOOGLE_API_KEY or GEMINI_API_KEY');
      return NextResponse.json({ 
        error: 'API key not configured in environment variables (GOOGLE_API_KEY or GEMINI_API_KEY)' 
      }, { status: 500 });
    }

    // Get brand data for context
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Initialize the API
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Helper to create model with safety settings
    const createModel = (modelName: string) => genAI.getGenerativeModel({ 
      model: modelName,
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
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });
    
    const model = createModel(MODEL_NAME);
    const fallbackModel = createModel(FALLBACK_MODEL);

    // System instructions for PDF concept extraction
    const systemPrompt = `You are an expert advertising strategist and copywriter specializing in direct response marketing.

Given the brand context and a PDF document, extract and reformat the content into a structured advertising concept format. DO NOT generate new content or modify the content in any way - just reformat and organize the existing content from the PDF.

Brand Name: ${brand.name}

IMPORTANT: Your response MUST be valid JSON and nothing else. Format:
{
  "text_hook_options": "Extract text hooks from the PDF here as simple text with each hook on a new line. Include any emojis and catchy phrases that are already in the document. Like existing tiktok video titles or ig reel titles. Do NOT use JSON formatting or escaped quotes - just plain text with line breaks between hooks.",
  "spoken_hook_options": "Extract verbal/spoken hooks from the PDF here as simple text with each hook on a new line. These are hooks meant to be spoken in videos, not written as captions. Do NOT use JSON formatting or escaped quotes - just plain text with line breaks between hooks.",
  "body_content_structured_scenes": [
    {
      "scene_title": "Scene 1 (optional)",
      "script": "Script content for this scene",
      "visuals": "Visual description for this scene"
    }
  ],
  "cta_script": "Call to action script",
  "cta_text_overlay": "Text overlay for the CTA"
}

CRITICAL INSTRUCTIONS:
- NEVER generate new content or modify the content in any way
- Only reformat and organize existing content from the PDF
- Extract hooks, scripts, and CTAs directly from the PDF content exactly as they appear
- Anything related to visuals or footage goes in the "visuals" field of scenes
- Anything related to editor instructions gets added to the "visuals" field
- If the PDF doesn't contain specific hooks or CTAs, leave those fields empty or extract similar content from the document
- Preserve the original wording and style from the PDF`;

    const userPrompt = `Here's the script that you're going to be using. No need for iterations or changes. Just spit the same script back and add it in the section below.

Please extract and reformat the content from this PDF into the requested JSON format. Do not generate new content - only organize what's already in the document.`;

    const results = [];

    // Process each PDF file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        console.log(`Processing PDF ${i + 1}/${files.length}: ${file.name}`);

        // Convert file to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = getProperMimeType(file.name);

        console.log(`PDF file size: ${file.size} bytes, mime type: ${mimeType}`);

        // Create parts for the request
        const parts = [
          { text: `${systemPrompt}\n\n${userPrompt}` },
          { 
            inlineData: { 
              mimeType, 
              data: base64Data 
            }
          }
        ];

        // Generate the content with retry logic and fallback
        console.log('Sending generation request to Gemini API...');
        
        let result;
        try {
          result = await retryWithBackoff(async () => {
            return await model.generateContent({ 
              contents: [{ role: "user", parts }] 
            });
          });
        } catch (_primaryError) {
          console.warn(`Primary model (${MODEL_NAME}) failed, trying fallback model (${FALLBACK_MODEL})...`);
          result = await retryWithBackoff(async () => {
            return await fallbackModel.generateContent({ 
              contents: [{ role: "user", parts }] 
            });
          });
        }

        const responseText = result.response.text();
        console.log(`Received response for ${file.name}`);

        // Parse the JSON response
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
          const conceptData = JSON.parse(jsonStr);

          results.push({
            fileName: file.name,
            success: true,
            conceptData: conceptData
          });

        } catch (parseError) {
          console.error(`Failed to parse response for ${file.name}:`, parseError);
          results.push({
            fileName: file.name,
            success: false,
            error: 'Failed to parse AI response as JSON',
            rawResponse: responseText.substring(0, 500)
          });
        }

      } catch (fileError) {
        console.error(`Error processing ${file.name}:`, fileError);
        
        // Check if it's a service overload error and provide helpful message
        let errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error processing file';
        
        if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
          errorMessage = 'Google AI service is currently overloaded. Please try again in a few minutes.';
        } else if (errorMessage.includes('quota') || errorMessage.includes('rate')) {
          errorMessage = 'API rate limit reached. Please wait a moment and try again.';
        }
        
        results.push({
          fileName: file.name,
          success: false,
          error: errorMessage
        });
      }
    }

    return NextResponse.json({ 
      results,
      totalFiles: files.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('General error in import-concept-from-pdf API route:', error);
    return NextResponse.json({ 
      error: `Failed to import concepts from PDF: ${errorMessage}`
    }, { status: 500 });
  }
}