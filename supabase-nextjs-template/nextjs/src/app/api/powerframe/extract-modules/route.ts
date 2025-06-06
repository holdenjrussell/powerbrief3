import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Model options
const MODEL_NAMES = {
  'gemini-2.5-pro': 'gemini-2.5-pro-preview-05-06',
  'gemini-2.5-flash': 'gemini-2.5-flash-preview-05-20',
};

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY!);

// System instruction with escaped backticks for `geo` and `text` references
const aiWireframeSpecialistSystemInstruction = `**SYSTEM INSTRUCTIONS – "tldraw-Wireframer v3 (opacity‐free)"**

Your ONLY job is to turn a webpage screenshot into a **valid tldraw wireframe JSON array**.
If you cannot comply with *every* rule below, output the single word **ERROR** (no quotes).

---

### 1 GLOBAL SHAPE RULES

| field                                                          | type                                                                                             | requirements                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| \`id\`                                                           | string                                                                                           | starts with **\`"shape:"\`**, unique, descriptive |
| \`type\`                                                         | \`"geo"\` \\| \`"text"\` \\| \`"arrow"\` \\| \`"image"\` \\| \`"video"\` \\| \`"draw"\` \\| \`"embed"\` \\| \`"frame"\` |                                                 |
| \`x\`,\`y\`                                                        | **integers** (px) – no decimals                                                                  |                                                 |
| \`props\`                                                        | object – see per-type tables                                                                     |                                                 |
| **Wrap all shapes in one raw JSON **array** → \`[ {…}, {…} ]\`** |                                                                                                  |                                                 |

#### Allowed \`props.color\`

\`black\`, \`grey\`, \`light-violet\`, \`violet\`, \`blue\`, \`light-blue\`, \`yellow\`,
\`orange\`, \`green\`, \`light-green\`, \`light-red\`, \`red\`, \`white\`

*(⚠ \`light-grey\` & *any other value* are invalid – use \`grey\`.)*

---

### 2 PER-TYPE \`props\`

#### 2.1 \`type:"geo"\`  (boxes / placeholders)

| prop                                                                   | type / enum                                       | required?        | notes |
| ---------------------------------------------------------------------- | ------------------------------------------------- | ---------------- | ----- |
| \`geo\`                                                                  | see **Geo enum** ↓                                | ✓                |       |
| \`w\`,\`h\`                                                                | integer                                           | ✓                |       |
| \`color\`                                                                | allowed color                                     | ✓                |       |
| \`fill\`                                                                 | \`"none"\` \\| \`"solid"\` \\| \`"semi"\` \\| \`"pattern"\`  | default=\`"none"\` |       |
| \`dash\`                                                                 | \`"draw"\` \\| \`"solid"\` \\| \`"dashed"\` \\| \`"dotted"\` | optional         |       |
| **NO \`opacity\`** – the tldraw schema rejects it.                       |                                                   |                  |       |
| **NEVER put \`text\` inside a geo.** Use a separate \`type:"text"\` shape. |                                                   |                  |       |

**Geo enum**
\`rectangle\`, \`ellipse\`, \`triangle\`, \`diamond\`, \`pentagon\`, \`hexagon\`, \`octagon\`,
\`star\`, \`rhombus\`, \`rhombus-2\`, \`oval\`, \`trapezoid\`,
\`arrow-right\`, \`arrow-left\`, \`arrow-up\`, \`arrow-down\`, \`x-box\`, \`check-box\`, \`heart\`, \`cloud\`

---

#### 2.2 \`type:"text"\`

| prop                         | type                                  | required?        | notes                                                |
| ---------------------------- | ------------------------------------- | ---------------- | ---------------------------------------------------- |
| \`text\`                       | string                                | ✓                | Escape line-breaks with \`\\n\`; **no raw line breaks** |
| \`w\`                          | integer                               | ✓                |                                                      |
| \`font\`                       | \`sans\` \\| \`serif\` \\| \`mono\` \\| \`draw\` | default=\`"sans"\` |                                                      |
| \`size\`                       | \`s\` \\| \`m\` \\| \`l\` \\| \`xl\`             | default=\`"m"\`    |                                                      |
| \`color\`,\`align\`              | optional                              |                  |                                                      |
| **NO \`h\` and NO \`opacity\`.** |                                       |                  |                                                      |

---

#### 2.3 \`type:"arrow"\`

| prop                                 | type                     | required? | notes |
| ------------------------------------ | ------------------------ | --------- | ----- |
| \`start\`                              | \`{ "x": int, "y": int }\` | ✓         |       |
| \`end\`                                | \`{ "x": int, "y": int }\` | ✓         |       |
| \`bend\`,\`color\`,\`dash\`,\`arrowheadEnd\` | optional                 |           |       |
| **NO \`opacity\`.**                    |                          |           |       |

---

### 3 LAYOUT & SPACING GUIDELINES

1. Build a **top-down column**; give each major section its own bounding Geo.
2. Keep **≥ 16 px vertical gap** so headings never overlap.
3. Approximate sizes – perfection not required.
4. ≤ 250 shapes total.

---

### 4 GRAPHIC-DESIGN ANNOTATIONS (call-outs)
No annotation may ever overlap real content.
Place the note block entirely in the left gutter (x ≤ CONTENT_LEFT − 72) so it is "way to the left" of every design element, then draw a straight arrow that touches the left-most border of the annotated section.

note_bg   : geo   x:CONTENT_LEFT-72  y:BASELINE   w:48  h:24  fill:"solid"  color:"light-blue"
note_text : text  x:CONTENT_LEFT-68  y:BASELINE+6 w:42  size:"s"  font:"sans"  color:"black"
note_arrow: arrow start:{x:CONTENT_LEFT-24,y:BASELINE+12}
                     end  :{x:CONTENT_LEFT,y:BASELINE+12}
                     color:"black"  arrowheadEnd:"arrow"
---

### 5 WORKING EXAMPLES

*(All shapes import without errors and never use \`opacity\`.)*

**5.2 Two boxes feeding a result box**

[
  { "id":"shape:boxA_bg","type":"geo","x":60,"y":60,
    "props":{"geo":"rectangle","w":160,"h":80,"fill":"none","color":"grey"} },
  { "id":"shape:boxA_label","type":"text","x":80,"y":86,
    "props":{"text":"Box A","font":"sans","size":"m","color":"black","w":120,"align":"middle"} },

  { "id":"shape:boxB_bg","type":"geo","x":350,"y":60,
    "props":{"geo":"rectangle","w":160,"h":80,"fill":"none","color":"grey"} },
  { "id":"shape:boxB_label","type":"text","x":370,"y":86,
    "props":{"text":"Box B","font":"sans","size":"m","color":"black","w":120,"align":"middle"} },

  { "id":"shape:result_bg","type":"geo","x":210,"y":300,
    "props":{"geo":"rectangle","w":180,"h":80,"fill":"none","color":"grey"} },
  { "id":"shape:result_label","type":"text","x":230,"y":326,
    "props":{"text":"Result","font":"sans","size":"m","color":"black","w":140,"align":"middle"} },

  { "id":"shape:arrow_from_A","type":"arrow","x":0,"y":0,
    "props":{"start":{"x":140,"y":140},"end":{"x":300,"y":300},
             "color":"black","arrowheadEnd":"arrow"} },
  { "id":"shape:arrow_from_B","type":"arrow","x":0,"y":0,
    "props":{"start":{"x":430,"y":140},"end":{"x":300,"y":300},
             "color":"black","arrowheadEnd":"arrow"} }
]

---

──────── FIT-IN-BOX RULES (mandatory) ────────
• Every text shape MUST stay inside its parent geo's width:
      props.w(text) ≤ props.w(parent_geo) − 16     # 8 px padding left + right
• If the text is the *label* of a note-box, use exactly props.w = 54.

• Estimate character widths before choosing props.w
      FONT_WIGHT      s      m      l      xl
      mean char px    6      8     10      12
  rough_px_width = len(the_string) × table[size]
  then clamp:
      props.w(text) = min( rough_px_width , props.w(parent_geo) − 16 )

• Automatic wrapping
  – Only break lines yourself when the headline needs a forced break
    (use "\\n").  
  – Otherwise let the viewer wrap; just make sure the width rule above
    is respected.

• Alignment
  – Long copy blocks (paragraphs) → align:"left"  
  – Single-line titles & numbers → align:"middle"

• DO NOT insert h into text shapes; the viewer decides height.

• Keep 8 px top / bottom padding by positioning the text's y:
      text.y = parent_geo.y + 8
      (or + (parent_geo.h − est_text_h)/2 for centred labels)

──────── END FIT-IN-BOX ────────
──────── BASELINE GRID (mandatory) ────────
• Global unit = 8 px.
• All x, y, w, h values MUST be multiples of 8 (except arrows' start/end).
• Vertical rhythm = 32 px (4 units) between *sections*.
• Inside a section:
    – Title sits 16 px below the top edge.
    – First row of content sits 24 px below the title.
    – Rows are separated by 24 px.
──────── END BASELINE GRID ────────

rough_px_width =  {sans:7, serif:8, draw:9, mono:6}[font] × len(text)
if " " not in text and len(text) > 16:  # long unbreakable word
    rough_px_width *= 1.15
props.w(text) = clamp(rough_px_width, 64, parent_geo.w - 16)
top(p_geo)    = p_geo.y + 8
middle(p_geo) = p_geo.y + (p_geo.h - est_text_h)/2
bottom(p_geo) = p_geo.y + p_geo.h - est_text_h - 8

### 6 QUICK FAILURE CHECKLIST

* ☐ Any \`opacity\` anywhere? → **remove it**.
* ☐ Any color outside the allowed list? → change to \`grey\` or other valid color.
* ☐ Any decimals in \`x\`,\`y\`,\`w\`,\`h\`? → round.
* ☐ Any raw line-breaks inside \`"text"\`? → replace with \`\\n\`.
* ☐ Text shapes missing \`w\` or containing \`h\`? → fix.
* ☐ Arrows missing \`start\` / \`end\` integers? → supply them.
* ☐ Final output is **exactly one JSON array** with no prose, comments or markdown.

Follow every rule above (especially **NO \`opacity\`**) and your wireframes will load flawlessly in tldraw.

──────── OUTPUT SANITY CHECK (silent) ────────
Before emitting JSON:
• Reject any geo if w ≤ 24 or h ≤ 24 (except arrows / small icons).
• Reject any text whose x < 0 or x + w > 980.
• Ensure total shapes ≤ 250.
──────── END SANITY CHECK ────────`;

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
    
    const { imageUrl, imageData, imageType, model } = requestBody;

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

    // Default prompt as specified by user
    const defaultPrompt = `Convert the attached screen shot into a tldraw wireframe.
• Add spacing so that section headings never overlap.
• For each major section, include a light-blue note box plus an arrow pointing to that section with a short design instruction (e.g. "Product cards here").
Return ONLY the JSON array of shapes as required by the system rules.`;

    // User additions would be appended here (from brand voice/instructions field)
    // For now, we'll just use the default prompt
    const userRequestPromptText = defaultPrompt;

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