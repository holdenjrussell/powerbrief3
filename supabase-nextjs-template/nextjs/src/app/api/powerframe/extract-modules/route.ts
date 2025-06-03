import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Product } from '@/lib/types/powerbrief';

// Model options
const MODEL_NAMES = {
  'gemini-2.5-pro': 'gemini-2.5-pro-preview-05-06',
  'gemini-2.5-flash': 'gemini-2.5-flash-preview-05-20'
};

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, brandContext, pageType, products, model } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Check API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERROR: No API key found in environment variables. Check .env.local for GOOGLE_API_KEY or GEMINI_API_KEY');
      return NextResponse.json({ 
        error: 'API key not configured in environment variables (GOOGLE_API_KEY or GEMINI_API_KEY)' 
      }, { status: 500 });
    }

    // Select model based on user choice
    const selectedModel = model && MODEL_NAMES[model as keyof typeof MODEL_NAMES] 
      ? MODEL_NAMES[model as keyof typeof MODEL_NAMES] 
      : MODEL_NAMES['gemini-2.5-pro']; // Default to Pro

    console.log('Using model:', selectedModel);

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    // Determine MIME type from response headers or URL
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Get the model with same configuration as PowerBrief
    const aiModel = genAI.getGenerativeModel({
      model: selectedModel,
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        maxOutputTokens: 64000,
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

    // Parse brand context if it's a string
    const contextData = typeof brandContext === 'string' ? JSON.parse(brandContext) : brandContext;

    const systemPrompt = `You are a wireframe extraction expert. Analyze the provided website screenshot and convert it into a structured wireframe format.

Your task is to identify the STRUCTURE and LAYOUT from the competitor snapshot, but generate ALL CONTENT specifically for the brand provided below.

CRITICAL: 
- The competitor snapshot is ONLY for understanding layout and structure
- DO NOT copy any text, product names, or content from the competitor
- ALL content must be created specifically for the brand and products provided
- Use the brand's voice, tone, and messaging in all generated content

Brand Context (USE THIS FOR ALL CONTENT GENERATION):
${contextData ? `
- Brand Name: ${contextData.brandName}
- Brand Voice: ${contextData.brandConfig?.voice || 'Not specified'}
- Brand Tone: ${contextData.brandConfig?.tone || 'Not specified'}
- Target Audience: ${contextData.brandConfig?.targetAudience || 'Not specified'}
- USP: ${contextData.brandConfig?.usp || 'Not specified'}
- Brand Values: ${contextData.brandConfig?.values || 'Not specified'}
` : 'No brand context provided'}

Page Type: ${pageType || 'General'}

${products?.main ? `
Products to Feature (USE THESE SPECIFIC PRODUCTS):
Main Product:
- Name: ${products.main.name}
- Description: ${products.main.description || 'No description'}
- Price: ${products.main.price ? `$${products.main.price}` : 'Price not specified'}
- Category: ${products.main.category || 'No category'}

${products.related?.length > 0 ? `
Additional Products:
${products.related.map((p: Product, index: number) => `
Product ${index + 2}:
- Name: ${p.name}
- Description: ${p.description || 'No description'}
- Price: ${p.price ? `$${p.price}` : 'Price not specified'}
- Category: ${p.category || 'No category'}`).join('\n')}
` : ''}
` : 'No specific products selected - create content based on the brand\'s general offerings'}

Guidelines:
1. STRUCTURE ONLY: Use the competitor snapshot to understand layout, sections, and element positioning
2. BRAND CONTENT: Generate all text, headlines, CTAs specifically for ${contextData?.brandName || 'the brand'}
3. For images, use type "container" with descriptions relevant to the brand's products/services
4. Determine the layout structure (rows and columns) based on the competitor
5. Estimate sizes: width in columns (1-12), height in pixels (minimum 50px, typical ranges: 100-200px for small elements, 200-400px for medium, 400-600px for large sections)
6. Use HTML formatting for text when needed (headings, lists, links, etc.)
7. Name each module descriptively based on its purpose for THIS brand
8. For PDP pages with products specified, use the EXACT product names and details provided
9. Write in the brand's voice and tone, targeting their specific audience

CRITICAL RULES FOR EXTRACTION:
- MENU ITEMS: Extract each navigation menu item as a SEPARATE module. Do NOT group all menu items into one module.
- PRODUCT CARDS: When you see product cards, stack the elements vertically in the SAME column:
  * Product image should be at the top
  * Product name below the image
  * Product price below the name
  * All elements should have the SAME column position but different row positions
- SECTION GROUPING: Elements that visually belong to the same section should have the SAME row index.
- SECTION NAMES: Provide descriptive section names (e.g., "Header", "Hero", "Features", "Testimonials", "Footer")
- MODULE NAMES: Give each module a specific, descriptive name that indicates its purpose
- BRAND FOCUS: Every piece of content should be written for ${contextData?.brandName || 'the brand'}, not copied from competitor
- STACKING LOGIC: 
  * If elements are stacked vertically in the same column area, they should have the same column position
  * Use different row indices for elements that are stacked vertically
  * Use different column positions for elements that are side by side

CONTENT GENERATION RULES:
- Headlines: Create compelling headlines that highlight the brand's USP and values
- Body text: Write in the brand's voice, addressing their target audience's needs
- CTAs: Use action-oriented language that aligns with the brand's tone
- Product descriptions: Use the exact product names and details provided, enhanced with brand messaging
- Navigation: Create menu items relevant to the brand's offerings

IMPORTANT: Your response MUST be valid JSON and nothing else. Output JSON format:
{
  "modules": [
    {
      "type": "text|video|button|container|header|footer",
      "name": "Descriptive name for this specific module",
      "sectionName": "Name of the section this module belongs to",
      "content": {
        "text": "For text/button/header/footer modules (can include HTML) - MUST BE BRAND SPECIFIC",
        "placeholder": "For container modules - describe what brand-specific image/content goes here"
      },
      "position": {
        "row": 0,
        "column": 0,
        "width": 1-12,
        "height": 80-400
      },
      "alignment": "left|center|right"
    }
  ],
  "rows": [
    {
      "id": "row-1",
      "name": "Section name (e.g., Header, Hero, Features)",
      "modules": ["array of module indices that belong to this row"]
    }
  ]
}

EXAMPLE - Product Cards Layout:
If you see 3 product cards side by side, each with image, name, and price stacked:
- Card 1 Image: {"position": {"row": 0, "column": 0, "width": 4, "height": 200}}
- Card 1 Name: {"position": {"row": 1, "column": 0, "width": 4, "height": 60}}
- Card 1 Price: {"position": {"row": 2, "column": 0, "width": 4, "height": 40}}
- Card 2 Image: {"position": {"row": 0, "column": 4, "width": 4, "height": 200}}
- Card 2 Name: {"position": {"row": 1, "column": 4, "width": 4, "height": 60}}
- Card 2 Price: {"position": {"row": 2, "column": 4, "width": 4, "height": 40}}
- Card 3 Image: {"position": {"row": 0, "column": 8, "width": 4, "height": 200}}
- Card 3 Name: {"position": {"row": 1, "column": 8, "width": 4, "height": 60}}
- Card 3 Price: {"position": {"row": 2, "column": 8, "width": 4, "height": 40}}

Remember: The competitor site is ONLY for layout reference. All content must be original and specific to ${contextData?.brandName || 'the brand'}.`;

    console.log('Starting Gemini API request with model:', selectedModel);

    const result = await aiModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType: contentType,
                data: base64Image
              }
            }
          ]
        }
      ]
    });

    const response = await result.response;
    const responseText = response.text();
    
    console.log('Received response from Gemini API');
    
    // Validate response
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
    
    // Extract JSON from the response
    let extractedData;
    try {
      // Try to find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      console.error('Failed to parse JSON:', responseText);
      console.log('Raw response text:', responseText);
      return NextResponse.json({ 
        error: 'Failed to parse extracted data',
        rawResponse: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
      }, { status: 500 });
    }

    return NextResponse.json({ extractedModules: extractedData });
  } catch (error) {
    console.error('Error extracting modules:', error);
    return NextResponse.json({ 
      error: 'Failed to extract modules',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 