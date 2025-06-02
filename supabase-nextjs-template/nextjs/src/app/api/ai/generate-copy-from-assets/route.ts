import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

const MODEL_NAME = 'gemini-2.5-pro-preview-05-06';

// Hard-coded system instructions as specified
const SYSTEM_INSTRUCTIONS = `
IMPORTANT: YOUR SOLE AND ONLY OUTPUT MUST BE A VALID JSON OBJECT AS DEFINED IN SECTION IV, UNLESS THE USER'S PROMPT EXPLICITLY REQUESTS A DIFFERENT FORMAT OR ADDITIONAL INFORMATION. DO NOT PROVIDE ANY INTRODUCTORY TEXT, EXPLANATIONS, APOLOGIES, GREETINGS, OR ANY OTHER CONTENT OUTSIDE OF THE SPECIFIED JSON STRUCTURE.

I. ROLE AND GOAL (Internal Guiding Principles):

You are a top-performing Creative Strategist and Copywriter.

Your primary goal is to develop innovative and effective creative strategies and compelling copy. The copy MUST be primarily tailored to the content, messaging, and style of any uploaded video or image asset. Brand identity (as defined in PowerBrief brand settings) should be used to supplement this, provide context, ensure brand voice alignment, and inform aspects not evident in the asset itself. Your analysis directly informs the content of the JSON output.

You will analyze provided information, including any uploaded assets (videos/images) as the primary source, and brand details (target audience, goals from PowerBrief) as secondary context, to generate creative concepts and copy for the JSON output.

II. BRAND INFORMATION (To be populated by PowerBrief Integration - for informing JSON content as a secondary/supplementary source):

[populate from powerbrief]

III. CORE RESPONSIBILITIES & TASKS (Guiding the generation of JSON content):

Asset Integration & Analysis (Primary Driver for Copy - Internal Thought Process):

Critically analyze any uploaded video or image. Identify its core message, key visual elements, depicted actions, explicit or implicit narrative, tone, and style. This is the primary basis for the copy.

Develop creative strategies and copy that directly reflect, complement, and enhance the provided visual asset.

Consider how the asset's specific content can be best leveraged for attention-grabbing and persuasive copy.

Creative Strategy Development (Internal Thought Process - influences JSON output, supplements asset analysis):

Based on the asset analysis, and supplemented by brand info (target audience, campaign goals from PowerBrief), develop overarching creative concepts.

Propose innovative ideas for ad campaigns, content themes, and messaging angles that stem from the visual asset.

Copywriting (Specifically for Meta Ads - Facebook/Instagram - for JSON output):

The copy you generate (Headline, Body Copy, Description) MUST be directly inspired by and tailored to the content and message of the uploaded video or image.

Use brand information from PowerBrief to ensure the copy aligns with the overall brand voice, incorporates relevant USPs if not obvious in the asset, and targets the correct audience, but the asset's content is paramount.

You MUST generate the following three components for each ad concept and output them in the specified JSON format (see Section IV):

Headline:

Craft a compelling and attention-grabbing headline that reflects the core message or a key moment/element of the video/image. Tastefully incorporate emojis where appropriate to enhance appeal, including potentially at the beginning.

Length: Aim for 27-40 characters to minimize the risk of truncation across Meta placements. Shorter within this range is often more impactful.

Primary Text (Body Copy):

Develop engaging and persuasive body copy that elaborates on the video/image's content or narrative and provides key messaging derived from it. Tastefully incorporate emojis to add visual interest, break up text, convey emotion, or serve as bullet points. Emojis can be used at the beginning of sentences or paragraphs.

Place the most critical information and hook (inspired by the asset) within the first 125 characters.

While longer text is possible, prioritize conciseness and impact.

Description (Link Description - if applicable for the ad format):

Write a brief, informative description that supports the asset-driven headline and primary text. Tastefully incorporate emojis if space allows and it adds value, including potentially at the beginning.

Length: Aim for 25-30 characters to avoid truncation.

Tailor copy to resonate with the defined target audience (from PowerBrief, as it relates to the asset).

Highlight the brand's USP and value proposition as demonstrated or implied by the video/image, supplemented by PowerBrief if needed.

Incorporate strong calls to action (CTAs) that are relevant to the content of the asset.

Ensure all copy aligns with the brand's voice and tone (from PowerBrief).

Adhere to specific emoji guidance in Section VII.

Best Practice Adherence (Apply to generated JSON copy):

Brevity & Clarity: Keep copy concise and easy to understand.

Hook Attention Early: Use a snappy first line, reflecting the video's hook.

Focus on Benefits: Highlight value as shown or implied in the asset.

Strong CTA: Use clear, action-oriented language.

Visual-Copy Cohesion: ABSOLUTELY CRITICAL. The copy MUST feel like a natural extension of the uploaded video/image.

Mobile-First Optimization.

Quality: Emphasize high-quality copy.

Personalization (where possible within JSON fields, informed by asset and target audience).

Storytelling (drawing from the narrative of the asset for JSON fields).

IV. OUTPUT FORMAT & STYLE:

YOUR RESPONSE MUST ALWAYS AND ONLY BE A VALID JSON OBJECT.

ABSOLUTELY NO TEXT, EXPLANATIONS, GREETINGS, APOLOGIES, OR ANY OTHER CONTENT SHOULD PRECEDE OR FOLLOW THE JSON OBJECT.

The JSON object should contain ONLY the following three keys:

"Headline": [String containing the generated headline]

"Body Copy": [String containing the generated primary text/body copy]

"Description": [String containing the generated link description]

Strict Example Output (emoji use and placement will vary based on brand and asset):

{
  "Headline": "✨ Capture Moments Like This!",
  "Body Copy": "🚀 Relive the adventure shown in our latest video. \n✅ Easy to use. \n💡 Unforgettable results.",
  "Description": "➡️ See the magic."
}

V. INTERACTION GUIDELINES (Internal Processing Logic):

Direct to JSON: Your primary directive is to populate the JSON structure based on the user's request, prioritizing the uploaded asset and supplementing with provided brand information.

Prioritize User Prompts for Deviations: If the user's prompt explicitly asks for output other than the standard JSON (e.g., "explain your reasoning" or "give me this in a paragraph"), then, and only then, deviate from the JSON-only output for that specific response. Otherwise, always revert to JSON.

Iterative Refinement (Applies if user asks for changes to JSON content): Be prepared to modify the content of the "Headline", "Body Copy", or "Description" fields within the JSON structure based on user feedback.

VI. ETHICAL CONSIDERATIONS (Apply to generated JSON copy):

Ensure all generated content within the JSON fields is original and avoids plagiarism.

Do not generate misleading or false advertising within the JSON fields.

Be mindful of ethical implications when using AI-generated content.

Be cautious with emoji meanings, ensuring they are not offensive or misinterpreted across cultures or demographics.

VII. EMOJI USAGE GUIDELINES (Apply to generated JSON copy):

Tasteful and Strategic Use: Emojis should always be used tastefully to enhance the message, not clutter it. Their use should be strategic, adding value such as visual appeal, emotional resonance, or improved readability.

Align with Brand Voice & Tone: Emojis must match the brand's personality. A playful brand can use more expressive emojis, while a formal brand should use them sparingly and stick to more neutral options. If specific brand emoji guidelines are provided in PowerBrief, adhere to them.

Relevance is Key: Choose emojis that are directly related to the message (especially the asset's content) and enhance its meaning. Avoid random or irrelevant emojis.

Audience Appropriateness: Consider the target audience.

Moderation and Purpose: Use emojis purposefully. Avoid emoji overload.

Enhance, Don't Replace, Text: Emojis should complement the copy.

Placement:

Emojis can be effectively used at the beginning of Headlines, Body Copy, or Descriptions to grab attention or set a tone.

They can also be placed at the end of sentences or phrases.

Emoji Bullets: When creating lists within the Body Copy, emojis can be used as visually appealing bullet points (e.g., ✅, ➡️, ✨, 💡).

Cultural Sensitivity & Hidden Meanings: Be aware of potential misinterpretations.

Accessibility: Remember that screen readers will read out emoji descriptions.

Consistency: Maintain a consistent style of emoji use.

Platform Considerations (Meta): Emojis can increase engagement.

A/B Test Usage (Internal Consideration): Consider that users may A/B test ad copy.

Check Display Across Devices (User Advisory): User should preview on different devices.
`;

interface GenerateCopyRequest {
  brandId: string;
  assetIds: string[];
  customPrompt?: string;
}

interface AssetWithDraft {
  id: string;
  name: string;
  supabase_url: string;
  type: 'image' | 'video';
  ad_draft_id: string;
  ad_draft: {
    id: string;
    ad_name: string;
  };
}

interface GeneratedCopy {
  Headline: string;
  "Body Copy": string;
  Description: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateCopyRequest = await req.json();
    const { brandId, assetIds, customPrompt } = body;

    if (!brandId || !assetIds || assetIds.length === 0) {
      return NextResponse.json({ 
        error: 'Brand ID and asset IDs are required' 
      }, { status: 400 });
    }

    // Check API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'AI service not configured' 
      }, { status: 500 });
    }

    // Get Supabase client
    const supabase = await createSSRClient();

    // Fetch brand information with more comprehensive data
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('name, brand_info_data, target_audience_data, competition_data')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ 
        error: 'Brand not found' 
      }, { status: 404 });
    }

    // Fetch assets with their associated ad drafts
    const { data: assets, error: assetsError } = await supabase
      .from('ad_draft_assets')
      .select(`
        id,
        name,
        supabase_url,
        type,
        ad_draft_id,
        ad_draft:ad_drafts(id, ad_name)
      `)
      .in('id', assetIds);

    if (assetsError || !assets) {
      return NextResponse.json({ 
        error: 'Failed to fetch assets' 
      }, { status: 500 });
    }

    // Helper function to check if asset name indicates preferred aspect ratio
    const isPreferredAspectRatio = (assetName: string): boolean => {
      const name = assetName.toLowerCase();
      return name.includes('4x5') || 
             name.includes('4:5') || 
             name.includes('9x16') || 
             name.includes('9:16') ||
             name.includes('_4x5') ||
             name.includes('_9x16') ||
             name.includes('-4x5') ||
             name.includes('-9x16');
    };

    // Filter and select preferred assets
    // If there are multiple asset sizes under an asset, just use the 4x5 or 9x16 version
    const processedAssets: AssetWithDraft[] = [];
    const assetGroups = new Map<string, AssetWithDraft[]>();
    
    // Group assets by base name (removing aspect ratio suffixes)
    for (const asset of assets as AssetWithDraft[]) {
      const baseName = asset.name
        .replace(/[-_](4x5|4:5|9x16|9:16)/, '')
        .replace(/\.[^/.]+$/, ''); // Remove extension
      
      if (!assetGroups.has(baseName)) {
        assetGroups.set(baseName, []);
      }
      assetGroups.get(baseName)!.push(asset);
    }

    // Select one asset per group, preferring 4x5 or 9x16
    for (const [, assetGroup] of assetGroups) {
      if (assetGroup.length === 1) {
        processedAssets.push(assetGroup[0]);
      } else {
        // Find preferred aspect ratio first
        const preferredAsset = assetGroup.find(asset => isPreferredAspectRatio(asset.name));
        if (preferredAsset) {
          processedAssets.push(preferredAsset);
        } else {
          // If no preferred aspect ratio found, take the first one
          processedAssets.push(assetGroup[0]);
        }
      }
    }

    console.log(`Processing ${processedAssets.length} selected assets out of ${assets.length} total assets`);

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey });

    const results = [];

    // Process each selected asset individually to avoid timeouts
    for (const asset of processedAssets) {
      try {
        console.log(`Generating copy for asset: ${asset.name}`);

        // Properly populate brand context for system instructions
        const brandInfo = `
Brand Name: ${brand.name}

Brand Information:
${brand.brand_info_data || 'Not specified'}

Target Audience:
${brand.target_audience_data || 'Not specified'}

Competition Analysis:
${brand.competition_data || 'Not specified'}
        `.trim();

        // Replace the [populate from powerbrief] section in system instructions
        const populatedSystemInstructions = SYSTEM_INSTRUCTIONS.replace(
          '[populate from powerbrief]',
          brandInfo
        );

        // Prepare the request content with custom prompt support
        let prompt = `${populatedSystemInstructions}\n\nPlease analyze this ${asset.type} asset and generate compelling Meta ad copy that directly reflects its content and message. Return only the JSON response as specified.`;
        
        // Add custom prompt if provided
        if (customPrompt && customPrompt.trim()) {
          prompt = `${populatedSystemInstructions}\n\nCUSTOM INSTRUCTIONS: ${customPrompt.toUpperCase()}\n\nPlease analyze this ${asset.type} asset and generate compelling Meta ad copy that directly reflects its content and message, taking into account the custom instructions above. Return only the JSON response as specified.`;
        }

        // Process asset based on type
        let assetPart: object;
        
        if (asset.type === 'image') {
          // For images, continue using inline data
          const assetResponse = await fetch(asset.supabase_url);
          if (!assetResponse.ok) {
            throw new Error(`Failed to fetch asset: ${assetResponse.statusText}`);
          }
          const assetBuffer = await assetResponse.arrayBuffer();
          
          assetPart = {
            inlineData: {
              mimeType: 'image/jpeg',
              data: Buffer.from(assetBuffer).toString('base64')
            }
          };
        } else if (asset.type === 'video') {
          // For videos, use File API to avoid payload size limits
          let tempFilePath: string | null = null;
          let uploadedFile: { name?: string; uri?: string; mimeType?: string; state?: string } | null = null;
          
          try {
            // Fetch the video
            const assetResponse = await fetch(asset.supabase_url);
            if (!assetResponse.ok) {
              throw new Error(`Failed to fetch asset: ${assetResponse.statusText}`);
            }
            const assetBuffer = await assetResponse.arrayBuffer();
            
            // Write to temporary file
            const safeAssetName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const tempFileName = `temp_video_${Date.now()}_${safeAssetName}`;
            tempFilePath = path.join(os.tmpdir(), tempFileName);
            await fs.writeFile(tempFilePath, Buffer.from(assetBuffer));

            console.log(`Uploading video file: ${asset.name} from ${tempFilePath}`);
            
            // Upload to Google File API
            uploadedFile = await ai.files.upload({
              file: tempFilePath,
              config: { mimeType: 'video/mp4' },
            });
            
            console.log(`Uploaded file ${asset.name}, initial state: ${uploadedFile.state}`);

            if (!uploadedFile.name) {
              throw new Error(`Failed to obtain file name for uploaded video: ${asset.name}`);
            }

            // Wait for file to become ACTIVE
            let attempts = 0;
            const maxAttempts = 30; // Wait up to 5 minutes (30 * 10 seconds)
            
            while (uploadedFile.state !== 'ACTIVE' && attempts < maxAttempts) {
              if (uploadedFile.state === 'FAILED') {
                throw new Error(`File processing failed for video: ${asset.name}`);
              }
              
              console.log(`File ${asset.name} is in state: ${uploadedFile.state}. Waiting for ACTIVE state... (attempt ${attempts + 1}/${maxAttempts})`);
              
              // Wait 10 seconds before checking again
              await new Promise(resolve => setTimeout(resolve, 10000));
              
              // Check file status
              const fileStatus = await ai.files.get({ name: uploadedFile.name });
              uploadedFile = fileStatus;
              attempts++;
            }
            
            if (uploadedFile.state !== 'ACTIVE') {
              throw new Error(`File ${asset.name} did not become ACTIVE after ${maxAttempts} attempts. Final state: ${uploadedFile.state}`);
            }

            if (!uploadedFile.uri) {
              throw new Error(`Failed to obtain URI for uploaded video: ${asset.name}`);
            }

            console.log(`File ${asset.name} is now ACTIVE. URI: ${uploadedFile.uri}`);

            // Create file reference part
            assetPart = createPartFromUri(uploadedFile.uri, uploadedFile.mimeType || 'video/mp4');
            
          } catch (uploadError: unknown) {
            const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
            console.error(`Error uploading video ${asset.name}:`, uploadError);
            
            // Clean up uploaded file if it exists
            if (uploadedFile && uploadedFile.name) {
              try {
                await ai.files.delete({ name: uploadedFile.name });
                console.log(`Cleaned up uploaded file: ${uploadedFile.name}`);
              } catch (deleteError) {
                console.error(`Failed to delete uploaded file:`, deleteError);
              }
            }
            throw new Error(`Processing video ${asset.name} failed: ${errorMessage}`);
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
        } else {
          throw new Error(`Unsupported asset type: ${asset.type}`);
        }

        // Generate content using new SDK
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: createUserContent([
            prompt,
            assetPart
          ]),
        });

        const responseText = response.text;
        
        // Parse the JSON response
        let generatedCopy: GeneratedCopy;
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
          generatedCopy = JSON.parse(jsonStr);
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          throw new Error('Failed to parse AI response');
        }

        results.push({
          assetId: asset.id,
          assetName: asset.name,
          adDraftId: asset.ad_draft_id,
          adDraftName: asset.ad_draft.ad_name,
          generatedCopy,
          success: true
        });

        // Add a small delay between requests to avoid rate limiting
        if (processedAssets.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Error generating copy for asset ${asset.name}:`, error);
        results.push({
          assetId: asset.id,
          assetName: asset.name,
          adDraftId: asset.ad_draft_id,
          adDraftName: asset.ad_draft.ad_name,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} assets`,
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('Generate copy API error:', error);
    return NextResponse.json(
      { 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 