import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Product } from '@/lib/types/powerbrief';

// Model options
const MODEL_NAMES = {
  'gemini-2.5-pro': 'gemini-2.5-pro-preview-05-06',
  'gemini-2.5-flash': 'gemini-2.5-flash-preview-05-20',
};

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY!);

// System instruction with escaped backticks for `geo` and `text` references
const aiWireframeSpecialistSystemInstruction = `SYSTEM INSTRUCTIONS – "tldraw-Wireframer v3 (opacity free)"
Your one job: turn a webpage screenshot into a single valid tldraw wireframe JSON array. If any rule is broken, output ERROR (exactly that word).

1. GLOBAL SHAPE RULES
field	type	requirements
id	string	must start with "shape:", be unique, and descriptive
type	"geo" | "text" | "arrow" | "image" | "video" | "draw" | "embed" | "frame"	
x, y	integers (px)	no decimals
props	object	see per-type tables
Output	JSON array only, e.g. [ { … }, { … } ]	
Allowed props.color
black, grey, light-violet, violet, blue, light-blue, yellow, orange, green, light-green, light-red, red, white
CRITICAL: NEVER use "light-grey" - this color does not exist in tldraw. Use "grey" instead.
Do not place white text on any grey fill. If the background is grey, choose a darker text colour.

2. PER-TYPE props
2.1 type:"geo" (boxes / placeholders)
prop	type or enum	required	notes
geo	see enum below	✓	
w, h	integers	✓	
color	allowed colour	✓	
fill	"none" | "solid" | "semi" | "pattern"	default "none"	
dash	"draw" | "solid" | "dashed" | "dotted"	optional	
No opacity			
Never embed text – use a separate text shape.			
Geo enum: rectangle, ellipse, triangle, diamond, pentagon, hexagon, octagon, star, rhombus, rhombus-2, oval, trapezoid, arrow-right, arrow-left, arrow-up, arrow-down, x-box, check-box, heart, cloud

2.2 type:"text"
prop	type	required	notes
text	string	✓	use \\n for line breaks
w	integer	✓	pick a width that avoids overflow; no global max
font	sans | serif | mono | draw	default sans	
size	s | m | l | xl	default m	
color, align	optional		
No h and no opacity. The viewer determines height from content.			
If the text wraps onto multiple lines, enlarge the parent geo's h to keep 8 px padding above and below.

2.3 type:"arrow"
prop	type	required	notes
start, end	{ "x": int, "y": int }	✓	
bend, color, dash, arrowheadEnd	optional		
No opacity.			
3. LAYOUT & SPACING
1. Build one vertical column. Each major section sits inside its own bounding geo.
2. Keep at least 16 px vertical gap between sections so headings do not collide.
3. Perfect pixel accuracy is not needed; reasonable approximation is fine.
4. Limit total shapes to 250 or fewer.
5. The whiteboard is infinite width, so there is no x-coordinate limit.

4. GRAPHIC-DESIGN ANNOTATIONS (call-outs)
* An annotation must never overlap real content.
* Place the note box entirely in the left gutter, at least 72 px left of the leftmost design element.
* Draw a straight arrow whose tip touches the left border of the annotated section.
note_bg   : geo   x:CONTENT_LEFT-72  y:BASELINE  w:48  h:24  fill:"solid"  color:"light-blue"
note_text : text  x:CONTENT_LEFT-68  y:BASELINE+6  w:42  size:"s"  font:"sans"  color:"black"
note_arrow: arrow start:{x:CONTENT_LEFT-24,y:BASELINE+12}
                     end  :{x:CONTENT_LEFT,y:BASELINE+12}
                     color:"black"  arrowheadEnd:"arrow"

5. BASELINE GRID
* Global unit = 8 px.
* All x, y, w, h values must be multiples of 8 (arrows can ignore).
* Vertical rhythm = 32 px between sections.
* Inside a section:
    * Title sits 16 px below the top edge.
    * First row of content starts 24 px below the title.
    * Rows are separated by 24 px.

6. QUICK FAILURE CHECKLIST
* ☐ Any opacity? Remove it.
* ☐ Any colour not in the allowed list? Change it.
* ☐ Decimals in x,y,w,h? Round.
* ☐ Raw line breaks in "text"? Replace with \\n.
* ☐ White text on grey fill? Change colour.
* ☐ Text shapes missing w or containing h? Fix.
* ☐ Arrows missing integer start or end? Supply them.
* ☐ Output must be exactly one JSON array, with no extra prose or Markdown.
Follow every rule above, keep the output clean, and your wireframes will import into tldraw without complaints.


OUTPUT SANITY CHECK (silent)
Before you emit the JSON array, perform these self-checks:
* Geo size Reject any geo whose w ≤ 24 or h ≤ 24 (arrows and small icons exempt).
* Text placement Reject any text whose x < 0 or whose right edge would extend past its parent geo's right edge.
* Coordinates Ensure every x and y is a non-negative integer.
* Shape count Ensure the array contains ≤ 250 shapes.
* White-on-grey ban If a text shape has color:"white", its parent geo's fill must not be grey.
If any test fails, output the single word ERROR.`;

export async function POST(request: NextRequest) {
  try {
    // Add logging to debug request body issues
    console.log('Received POST request to /api/powerframe/extract-modules');
    console.log('Request headers:', request.headers.get('content-type'));
    
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (jsonError) {
      console.error('Failed to parse request body:', jsonError);
      console.error('Request body might be empty or malformed');
      return NextResponse.json({ 
        error: 'Invalid request body. Expected JSON.',
        details: jsonError instanceof Error ? jsonError.message : 'Unknown error'
      }, { status: 400 });
    }
    
    const { imageUrl, imageData, imageType, brandContext, pageType, products, model } = requestBody;

    if (!imageUrl && !imageData) {
      return NextResponse.json({ error: 'Image URL or image data is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERROR: No API key found for Gemini. Check .env.local for GOOGLE_API_KEY or GEMINI_API_KEY');
      return NextResponse.json({ 
        error: 'API key not configured for Gemini (GOOGLE_API_KEY or GEMINI_API_KEY)' 
      }, { status: 500 });
    }

    const selectedModelIdentifier = model && MODEL_NAMES[model as keyof typeof MODEL_NAMES] 
      ? MODEL_NAMES[model as keyof typeof MODEL_NAMES] 
      : MODEL_NAMES['gemini-2.5-pro'];

    console.log('Using model identifier for API call:', selectedModelIdentifier);

    let base64Image: string;
    let requestContentType: string;

    if (imageData) {
      base64Image = imageData;
      requestContentType = imageType || 'image/jpeg';
      console.log('Using uploaded image data with type:', requestContentType);
    } else if (imageUrl) {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();
      base64Image = Buffer.from(imageBuffer).toString('base64');
      requestContentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      console.log('Fetched image from URL with type:', requestContentType);
    } else {
      return NextResponse.json({ error: 'No image source provided.' }, { status: 400 });
    }
    
    const aiModel = genAI.getGenerativeModel({
      model: selectedModelIdentifier,
      systemInstruction: {
        role: "system",
        parts: [{ text: aiWireframeSpecialistSystemInstruction }]
      },
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        maxOutputTokens: 16384,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const contextData = typeof brandContext === 'string' ? JSON.parse(brandContext) : brandContext;

    // All parts are now single-quoted strings with internal backticks escaped as \\\`
    const userRequestPromptParts = [
      'You are an expert UI/UX Analyst and Wireframe Generator. Your task is to analyze the provided webpage screenshot and convert it into a simplified, structured JSON array of tldraw shape objects, suitable for creating a basic wireframe.',
      '\n\n**CRITICAL: GEO SHAPES DO NOT SUPPORT TEXT PROPERTIES**',
      '\n**DO NOT add text properties to geo shapes - this will cause validation errors!**',
      '\n**For text content, use separate \\`text\\` shapes or \\`note\\` shapes positioned appropriately.**',
      '\n\n**CRITICAL OUTPUT FORMAT:**',
      '\n**YOUR RESPONSE MUST BE A COMPLETE JSON ARRAY STARTING WITH [ AND ENDING WITH ]**',
      '\n**DO NOT RETURN INDIVIDUAL OBJECTS - WRAP ALL OBJECTS IN A SINGLE ARRAY**',
      '\n**NO MARKDOWN, NO EXPLANATIONS, NO TEXT - ONLY THE JSON ARRAY**',
      '\n\n**DEFAULT WIREFRAME INSTRUCTIONS:**',
      '\nConvert the attached screenshot into a tldraw wireframe.',
      '\n• Add spacing so that section headings never overlap.',
      '\n• For each major section, include a light-blue note box plus an arrow pointing to that section with a short design instruction (e.g. "Product cards here").',
      '\nReturn ONLY the JSON array of shapes as required by the system rules.',
      '\n\n**CRITICAL JSON SAFETY RULES:**',
      '\n- **ALL STRING VALUES must be properly escaped JSON strings**',
      '\n- **NO literal newlines in string values - use \\\\n instead**',
      '\n- **NO unescaped double quotes in string values - use \\\\" instead**',
      '\n- **Keep text content SHORT and SIMPLE (max 50 characters)**',
      '\n- **Use simple placeholder text like "Button" or "Header Text" instead of complex descriptions**',
      '\n\n**Wireframing Principles to Follow:**',
      '\n\n1.  **Simplify, Don\'t Replicate:** Focus on structure, layout, and key content placeholders. Do not try to replicate exact styling, complex gradients, or precise pixel perfection.',
      '\n2.  **Basic Shapes:**',
      '\n    *   **Containers/Sections:** Use \\`type: "geo"` with \\`props: { geo: "rectangle", fill: "none", dash: "draw", color: "grey" }`.',
      '\n    *   **Images/Media:** Use \\`type: "geo"` with \\`props: { geo: "rectangle", fill: "none", dash: "draw", color: "black" }`. Then, add two diagonal \\`type: "geo"` with \\`props: { geo: "line" }` inside to create an "X" placeholder.',
      '\n    *   **Text Content:** Use \\`type: "text"` shapes for all text content. Example: \\`{ type: "text", x: 100, y: 100, props: { text: "Header Text", font: "sans", size: "l", color: "black", align: "start" } }`.',
      '\n    *   **Buttons/CTAs:** Use \\`type: "geo"` with \\`props: { geo: "rectangle", fill: "solid", color: "grey" }` for the button background. Add a separate \\`type: "text"` shape on top for the button label.',
      '\n    *   **Input Fields:** Use \\`type: "geo"` with \\`props: { geo: "rectangle", fill: "none", dash: "draw", color: "black" }`.',
      '\n    *   **Icons:** Represent as very simple \\`type: "geo"` shapes (e.g., small \\`props: { geo: "rectangle" }` or \\`props: { geo: "ellipse" }`) or omit for wireframe simplicity unless they are critical navigation elements.',
      '\n3.  **Layout and Positioning (x, y, w, h):**',
      '\n    *   Estimate relative positions and sizes based on the screenshot. The overall canvas can be assumed to be around 1200px wide, and height as needed (e.g., 1000px to 3000px depending on page length).',
      '\n    *   Maintain logical grouping and spacing.',
      '\n    *   For text shapes, position them appropriately relative to their container shapes.',
      '\n4.  **Content Extraction:**',
      '\n    *   Extract key headings, button labels, and short descriptive texts.',
      '\n    *   For long paragraphs, use placeholder text (e.g., "Lorem ipsum...") or a very short summary.',
      '\n5.  **Color Palette (for wireframes) - CRITICAL: USE ONLY THESE VALID COLORS:**',
      '\n    *   \\`props.color\\`: Use ONLY these exact values: \\`\'black\'\\`, \\`\'grey\'\\`, \\`\'white\'\\`, \\`\'blue\'\\`, \\`\'red\'\\`, \\`\'green\'\\`, \\`\'orange\'\\`, \\`\'yellow\'\\`.',
      '\n    *   **NEVER USE:** \\`\'light-grey\'\\`, \\`\'dark-grey\'\\`, or any other color variations not listed above.',
      '\n    *   \\`props.fill\\`: Use \\`\'none\'\\` for outlines, \\`\'solid\'\\` for filled elements (like button backgrounds or placeholder bars).',
      '\n    *   \\`props.dash\\`: Use \\`\'draw\'\\` for solid lines.',
      '\n6.  **Font Properties for Text Shapes:**',
      '\n    *   \\`props.font\\`: Use \\`\'sans\'\\`, \\`\'serif\'\\`, or \\`\'mono\'\\`. \\`\'sans\'\\` is a good default.',
      '\n    *   \\`props.size\\`: Use \\`\'s\'\\`, \\`\'m\'\\`, \\`\'l\'\\`, \\`\'xl\'\\` appropriately for text hierarchy.',
      '\n    *   \\`props.align\\`: Use \\`\'start\'\\`, \\`\'middle\'\\`, or \\`\'end\'\\`.',
      // Dynamic parts remain as template literals for interpolation, but their internal strings are simple.
      `\n\nBrand Context (USE THIS FOR ALL CONTENT GENERATION):\n${contextData ? `\
- Brand Name: ${contextData.brandName}
- Brand Voice: ${contextData.brandConfig?.voice || 'Not specified'}
- Brand Tone: ${contextData.brandConfig?.tone || 'Not specified'}
- Target Audience: ${contextData.brandConfig?.targetAudience || 'Not specified'}
- USP: ${contextData.brandConfig?.usp || 'Not specified'}
- Brand Values: ${contextData.brandConfig?.values || 'Not specified'}
` : 'No brand context provided'}`,
      `\n\nPage Type: ${pageType || 'General'}`,
      products?.main 
        ? `\n\nProducts to Feature (USE THESE SPECIFIC PRODUCTS):\nMain Product:\n- Name: ${products.main.name}\n- Description: ${products.main.description || 'No description'}\n- Price: ${products.main.price ? `$${products.main.price}` : 'Price not specified'}\n- Category: ${products.main.category || 'No category'}\n${products.related?.length > 0 ? `Additional Products:\n${products.related.map((p: Product, index: number) => `- Product ${index + 2}:\n  - Name: ${p.name}\n  - Description: ${p.description || 'No description'}\n  - Price: ${p.price ? `$${p.price}` : 'Price not specified'}\n  - Category: ${p.category || 'No category'}`).join('\n')}` : ''}`
        : '\n\nNo specific products selected - create content based on the brand\'s general offerings.',
      '\n\n**Output Format (Strictly Adhere):**',
      '\n**REMEMBER: Your entire response must be a JSON array starting with [ and ending with ]**',
      '\nEach element should be an object in a JSON array, following this tldraw structure:',
      '\n\\`\\`\\`json',
      // The JSON example string itself is a template literal here, but it only contains double quotes, no backticks.
      `
[
  {
    "id": "string (globally unique, e.g., shape:container_123)",
    "type": "geo",
    "x": number,
    "y": number,
    "props": {
      "geo": "string ('rectangle', 'ellipse', 'line', etc.)",
      "w": number,
      "h": number,
      "color": "string ('black', 'grey', 'white', 'blue', 'red', 'green', 'orange', 'yellow')",
      "fill": "string ('none', 'solid', 'semi')",
      "dash": "string ('draw', 'dashed', 'dotted')",
      "size": "string ('s', 'm', 'l', 'xl')"
    }
  },
  {
    "id": "string (globally unique, e.g., shape:text_123)",
    "type": "text",
    "x": number,
    "y": number,
    "props": {
      "text": "string (the actual text content)",
      "font": "string ('sans', 'serif', 'mono')",
      "size": "string ('s', 'm', 'l', 'xl')",
      "color": "string ('black', 'grey', etc.)",
      "align": "string ('start', 'middle', 'end')"
    }
  }
]`,
      '\n\\`\\`\\`',
      '\n\n**Image Analysis Steps for You (Gemini):**',
      '\n\n1.  **Overall Structure:** Identify major sections (e.g., top announcement bar, header/navigation, hero section, product grids, testimonial sections, content blocks, footer).',
      '\n2.  **Element Identification:** Within each section, identify individual visual elements: images, logos, text headings, paragraphs, buttons, input fields, lists, icons, dividers.',
      '\n3.  **Mapping to tldraw Shapes:** Convert each identified element into the appropriate tldraw shape object based on the "Wireframing Principles" and "Output Format" above.',
      '\n4.  **Coordinate System:** Use (0,0) as the top-left of the webpage. Estimate all x, y, w, h values.',
      '\n5.  **Uniqueness:** Ensure every id field is unique (e.g., append a counter or descriptive suffix).',
      '\n\nNow, analyze the provided webpage screenshot and generate the tldraw JSON array.',
      `\n\nRemember: The competitor site is ONLY for layout reference. All content must be original and specific to ${contextData?.brandName || 'the brand'}.`,
      '\n\n**FINAL REMINDER: Your response must be ONLY a complete JSON array starting with [ and ending with ]. No markdown blocks, no explanations, just the raw JSON array.**'
    ];
    const userRequestPromptText = userRequestPromptParts.join('');

    console.log('Starting Gemini API request with model identifier:', selectedModelIdentifier);

    const result = await aiModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: userRequestPromptText },
            {
              inlineData: {
                mimeType: requestContentType,
                data: base64Image
              }
            }
          ]
        }
      ]
    });

    console.log('Gemini API call completed, getting response...');
    const response = result.response;
    
    if (!response) {
      console.error('No response object from Gemini');
      return NextResponse.json({ 
        error: 'No response from Gemini API' 
      }, { status: 500 });
    }
    
    console.log('Getting text from response...');
    const responseText = await response.text();
    
    console.log('Response text length:', responseText.length);
    console.log('Received response from Gemini API. Attempting to parse as JSON.');
    console.log("===== RAW GEMINI RESPONSE START =====");
    console.log(responseText);
    console.log("===== RAW GEMINI RESPONSE END =====");
    
    // Improved JSON extraction function
    function extractJsonArrayFromString(text: string): string | null {
      // Try to find JSON array within markdown code blocks first
      const markdownMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (markdownMatch && markdownMatch[1]) {
        console.log('Found JSON in markdown code block');
        return markdownMatch[1].trim();
      }

      // Try to find JSON array within plain code blocks
      const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch && codeMatch[1]) {
        const candidate = codeMatch[1].trim();
        if (candidate.startsWith('[') && candidate.endsWith(']')) {
          console.log('Found JSON array in plain code block');
          return candidate;
        }
      }

      // Fallback: find the first '[' and the last ']' for array
      let startIndex = text.indexOf('[');
      let endIndex = text.lastIndexOf(']');

      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const potentialJson = text.substring(startIndex, endIndex + 1);
        // Basic sanity check - should contain objects
        if (potentialJson.includes('"id":') && potentialJson.includes('"type":')) {
          console.log('Found JSON array using bracket extraction');
          return potentialJson;
        }
      }
      
      // Try to find a single object and wrap it in array
      startIndex = text.indexOf('{');
      endIndex = text.lastIndexOf('}');
      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        const potentialObject = text.substring(startIndex, endIndex + 1);
        if (potentialObject.includes('"id":') && potentialObject.includes('"type":')) {
          console.log('Found single JSON object, wrapping in array');
          return '[' + potentialObject + ']';
        }
      }

      console.log('No valid JSON structure found in extraction');
      return null;
    }
    
    let extractedShapes: unknown;
    try {
      extractedShapes = JSON.parse(responseText);
      if (!Array.isArray(extractedShapes)) {
        console.error('Parsed JSON is not an array as expected:', extractedShapes);
        if (typeof extractedShapes === 'object' && extractedShapes !== null) {
          const potentialShapesObject = extractedShapes as Record<string, unknown>;
          const arrayKey = Object.keys(potentialShapesObject).find(key => Array.isArray(potentialShapesObject[key]));
          if (arrayKey && Array.isArray(potentialShapesObject[arrayKey])) {
            console.warn('Found array under key ' + arrayKey + '. Using this array.');
            extractedShapes = potentialShapesObject[arrayKey];
          } else {
            throw new Error('Parsed JSON is not an array and no array found in its properties.');
          }
        } else {
          throw new Error('Parsed JSON is not an array.');
    }
      }
    } catch (parseError) {
      console.warn('Direct JSON.parse(responseText) failed. Attempting to extract JSON from potentially wrapped response...', parseError);
      
      const extractedJsonString = extractJsonArrayFromString(responseText);
      if (extractedJsonString) {
        console.log("===== EXTRACTED JSON STRING START =====");
        console.log(extractedJsonString);
        console.log("===== EXTRACTED JSON STRING END =====");
        
        try {
          const tempData: unknown = JSON.parse(extractedJsonString);
          if (Array.isArray(tempData)) {
            extractedShapes = tempData;
            console.log('Successfully parsed extracted JSON as array');
          } else if (typeof tempData === 'object' && tempData !== null) {
            const potentialTempObject = tempData as Record<string, unknown>;
            const arrayKey = Object.keys(potentialTempObject).find(key => Array.isArray(potentialTempObject[key]));
            if (arrayKey && Array.isArray(potentialTempObject[arrayKey])) {
              console.warn('Extracted JSON object, using array under key ' + arrayKey + '.');
              extractedShapes = potentialTempObject[arrayKey];
            } else {
              // If it's a single object, wrap it in an array
              console.warn('Single object found, wrapping in array');
              extractedShapes = [tempData];
    }
          } else {
            throw new Error('Extracted JSON is neither an array nor an object containing one.');
          }
        } catch (finalParseError) {
          console.error('Failed to parse the extracted JSON snippet:', finalParseError);
          console.log('Attempting manual JSON repair...');
          
          // Try to manually fix common JSON issues
          let repairedJson = extractedJsonString;
          
          // Fix unterminated strings by finding unmatched quotes
          try {
            // Simple repair attempt - this is basic and may not catch all cases
            const lines = repairedJson.split('\n');
            const repairedLines = lines.map(line => {
              // If line contains an odd number of quotes, try to close it
              const quoteCount = (line.match(/"/g) || []).length;
              if (quoteCount % 2 !== 0) {
                // Find if this looks like a text property that might be unterminated
                if (line.includes('"text":') || line.includes('"font":')) {
                  return line + '"';
                }
              }
              return line;
            });
            repairedJson = repairedLines.join('\n');
            
            console.log("===== REPAIRED JSON ATTEMPT START =====");
            console.log(repairedJson);
            console.log("===== REPAIRED JSON ATTEMPT END =====");
            
            const repairedData: unknown = JSON.parse(repairedJson);
            if (Array.isArray(repairedData)) {
              extractedShapes = repairedData;
              console.log('Successfully parsed repaired JSON');
            } else {
              throw new Error('Repaired JSON is not an array');
            }
          } catch (repairError) {
            console.error('JSON repair attempt failed:', repairError);
            return NextResponse.json({ 
              error: 'Failed to parse JSON from AI response after attempting extraction and repair.',
              details: (finalParseError as Error).message,
              rawResponseSample: responseText.substring(0, 1000),
              extractedSample: extractedJsonString ? extractedJsonString.substring(0, 1000) : 'No extraction possible'
            }, { status: 500 });
          }
        }
      } else {
        console.error('No JSON structure found in response text.');
        return NextResponse.json({ 
          error: 'No valid JSON structure found in AI response.',
          rawResponseSample: responseText.substring(0, 1000) 
        }, { status: 500 });
      }
    }

    if (!extractedShapes || !Array.isArray(extractedShapes)) {
      console.error("Final extracted data is not a valid array:", extractedShapes);
      return NextResponse.json({ 
        error: "AI response did not result in a valid array of shapes.",
        rawResponseSample: responseText.substring(0, 500)
      }, { status: 500 });
    }

    return NextResponse.json({ extractedModules: extractedShapes });

  } catch (error) {
    console.error('Error in POST /api/powerframe/extract-modules:', error);
    return NextResponse.json({ 
      error: 'Failed to extract modules due to an unexpected error.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 