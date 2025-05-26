import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Use the same model as other AI features
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

// Define the request interface
interface PrefixAbbreviation {
  key: string;
  full_name: string;
  description: string;
}

interface NamingPrefix {
  id: string;
  prefix: string;
  meaning: string;
  type: 'dynamic' | 'abbreviation' | 'wildcard';
  abbreviations: PrefixAbbreviation[];
  order: number;
}

interface BulkRenameRequest {
  brandId: string;
  adDraftIds: string[];
  model?: string; // Optional model selection
  namingConventionSettings?: {
    prefixes?: NamingPrefix[];
    separator?: string;
    include_editor?: boolean;
    include_strategist?: boolean;
    include_launch_date?: boolean;
    date_format?: string;
    custom_prompt_template?: string;
  };
  launchDate?: string;
}

// Define the response interface
interface BulkRenameResponse {
  success: boolean;
  results: Array<{
    adDraftId: string;
    originalName: string;
    newName: string;
    success: boolean;
    error?: string;
  }>;
  error?: string;
}

export async function POST(request: NextRequest) {
  // Create Supabase client
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: BulkRenameRequest = await request.json();

    // Validate required fields
    if (!body.brandId || !body.adDraftIds || body.adDraftIds.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: brandId and adDraftIds' 
      }, { status: 400 });
    }

    // Check API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('ERROR: No API key found in environment variables. Check .env.local for GOOGLE_API_KEY or GEMINI_API_KEY');
      return NextResponse.json({ 
        error: 'API key not configured in environment variables (GOOGLE_API_KEY or GEMINI_API_KEY)' 
      }, { status: 500 });
    }

    // Fetch brand information and naming convention settings
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', body.brandId)
      .eq('user_id', session.user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ 
        error: 'Brand not found or access denied' 
      }, { status: 404 });
    }

    // Fetch ad drafts with their assets
    const { data: adDrafts, error: draftsError } = await supabase
      .from('ad_drafts')
      .select(`
        *,
        ad_draft_assets (*)
      `)
      .in('id', body.adDraftIds)
      .eq('user_id', session.user.id);

    if (draftsError || !adDrafts || adDrafts.length === 0) {
      return NextResponse.json({ 
        error: 'Ad drafts not found or access denied' 
      }, { status: 404 });
    }

    // Get naming convention settings (from request or brand defaults)
    const namingSettings = body.namingConventionSettings || brand.naming_convention_settings || {};

    // Initialize the Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: body.model || MODEL_NAME,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
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
        thinkingBudget: 5000,
      },
    });

    console.log('Starting bulk AI rename for', adDrafts.length, 'ad drafts');

    const results: BulkRenameResponse['results'] = [];
    let processedCount = 0;

    // Process each ad draft
    for (const adDraft of adDrafts) {
      try {
        processedCount++;
        console.log(`Processing ad draft ${processedCount}/${adDrafts.length}: ${adDraft.id} - ${adDraft.ad_name}`);

        // Prepare ad content context
        const adContentContext = {
          current_name: adDraft.ad_name,
          primary_text: adDraft.primary_text || '',
          headline: adDraft.headline || '',
          description: adDraft.description || ''
        };

        // Prepare naming convention context
        const namingConventionContext = {
          prefixes: namingSettings.prefixes || [],
          separator: namingSettings.separator || ')_',
          include_editor: namingSettings.include_editor !== false,
          include_strategist: namingSettings.include_strategist !== false,
          include_launch_date: namingSettings.include_launch_date !== false,
          date_format: namingSettings.date_format || 'MM-DD-YYYY',
        };

        // Prepare metadata context
        const metadataContext: Record<string, string> = {};
        if (namingConventionContext.include_launch_date && body.launchDate) {
          metadataContext.launch_date = body.launchDate;
        }
        if (namingConventionContext.include_editor && adDraft.video_editor) {
          metadataContext.editor = adDraft.video_editor;
        }
        if (namingConventionContext.include_strategist && adDraft.strategist) {
          metadataContext.strategist = adDraft.strategist;
        }

        // Create the system prompt
        const systemPrompt = `You are an AI assistant that generates professional ad names based on content and a structured naming convention.

NAMING CONVENTION STRUCTURE:
The final name should follow this exact order and format:
${namingConventionContext.prefixes
  .sort((a, b) => a.order - b.order)
  .map((prefix, index) => {
    if (prefix.type === 'dynamic') {
      return `${index + 1}. ${prefix.prefix}[${prefix.meaning}]${namingConventionContext.separator}`;
    } else if (prefix.type === 'abbreviation') {
      const abbreviationsList = prefix.abbreviations.map(a => `${a.key} (${a.full_name}: ${a.description})`).join(', ');
      return `${index + 1}. ${prefix.prefix}[SELECT FROM: ${abbreviationsList}]${namingConventionContext.separator}`;
    } else if (prefix.type === 'wildcard') {
      return `${index + 1}. ${prefix.prefix}[GENERATE 4-5 WORD DESCRIPTION]${namingConventionContext.separator}`;
    }
    return `${index + 1}. ${prefix.prefix}[VALUE]${namingConventionContext.separator}`;
  }).join('\n')}

DYNAMIC PREFIX RULES:
${namingConventionContext.prefixes
  .filter(p => p.type === 'dynamic')
  .map(prefix => {
    if (prefix.meaning === 'Launch Date') {
      return `- ${prefix.prefix}: Use launch date in format ${namingConventionContext.date_format} (${metadataContext.launch_date || 'TBD'})`;
    } else if (prefix.meaning === 'Strategist') {
      return `- ${prefix.prefix}: Use strategist name (${metadataContext.strategist || 'Unknown'})`;
    } else if (prefix.meaning === 'Editor') {
      return `- ${prefix.prefix}: Use editor name (${metadataContext.editor || 'Unknown'})`;
    } else {
      return `- ${prefix.prefix}: Extract ${prefix.meaning} from content`;
    }
  }).join('\n')}

ABBREVIATION PREFIX RULES:
${namingConventionContext.prefixes
  .filter(p => p.type === 'abbreviation')
  .map(prefix => {
    const abbreviationsList = prefix.abbreviations.map(a => `${a.key} (${a.full_name}: ${a.description})`).join(', ');
    return `- ${prefix.prefix}: Analyze content and select the most appropriate abbreviation from: ${abbreviationsList}`;
  }).join('\n')}

WILDCARD PREFIX RULES:
${namingConventionContext.prefixes
  .filter(p => p.type === 'wildcard')
  .map(prefix => {
    return `- ${prefix.prefix}: Generate a unique 4-5 word plain English description that captures the main concept, style, or messaging (e.g., "energetic workout motivation video", "calm skincare routine demo", "funny product comparison skit")`;
  }).join('\n')}

METADATA AVAILABLE:
${Object.entries(metadataContext).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

INSTRUCTIONS:
1. Analyze the content to understand the creative concept, style, and messaging
2. Generate the name by following the exact prefix order defined above
3. For dynamic prefixes, use the specified metadata or extract from content
4. For abbreviation prefixes, select the most appropriate abbreviation based on analysis
5. For wildcard prefixes, generate a unique 4-5 word plain English description that captures the essence
6. Use the separator "${namingConventionContext.separator}" between each prefix-value pair
7. Remove the final separator from the end of the name

${namingSettings.custom_prompt_template ? `CUSTOM INSTRUCTIONS: ${namingSettings.custom_prompt_template}` : ''}

IMPORTANT: Respond with ONLY the final ad name. Do not include any explanations, quotes, or additional text.`;

        const userPrompt = `Please generate a new ad name for this content:

Current Name: ${adContentContext.current_name}
Primary Text: ${adContentContext.primary_text}
Headline: ${adContentContext.headline}
Description: ${adContentContext.description}

Based on the content and the naming convention structure provided, generate a single, optimized ad name following the exact prefix order and format specified.`;

        const parts: Part[] = [{ text: systemPrompt + "\n\n" + userPrompt }];

        // If the ad has assets, include the first video/image for context
        if (adDraft.ad_draft_assets && adDraft.ad_draft_assets.length > 0) {
          const firstAsset = adDraft.ad_draft_assets[0];
          if (firstAsset.supabase_url && (firstAsset.type === 'video' || firstAsset.type === 'image')) {
            try {
              console.log(`Including asset for context: ${firstAsset.supabase_url}`);
              
              // Add timeout for asset fetching
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
              
              // Fetch the asset file
              const assetResponse = await fetch(firstAsset.supabase_url, {
                signal: controller.signal
              });
              clearTimeout(timeoutId);
              
              if (assetResponse.ok) {
                const assetBlob = await assetResponse.blob();
                
                // Check file size (limit to 10MB to prevent issues)
                if (assetBlob.size > 10 * 1024 * 1024) {
                  console.log(`Asset too large (${Math.round(assetBlob.size / 1024 / 1024)}MB), skipping asset inclusion`);
                } else {
                  const mimeType = getProperMimeType(firstAsset.type, firstAsset.supabase_url);
                  
                  console.log(`Adding asset to request: ${Math.round(assetBlob.size / 1024)}KB, mime type: ${mimeType}`);
                  
                  parts.push({
                    inlineData: {
                      data: Buffer.from(await assetBlob.arrayBuffer()).toString('base64'),
                      mimeType
                    }
                  });
                  
                  parts.push({ 
                    text: "\n\nI've included the primary asset for this ad to help you understand the content and generate an appropriate name." 
                  });
                }
              } else {
                console.log(`Failed to fetch asset: ${assetResponse.status} ${assetResponse.statusText}`);
              }
            } catch (assetError) {
              console.error('Error processing asset:', assetError);
              // Continue without the asset
            }
          }
        }

        // Generate the content with timeout
        console.log('Sending generation request to Gemini API...');
        const startTime = Date.now();
        
        const result = await model.generateContent({ contents: [{ role: "user", parts }] });
        
        const endTime = Date.now();
        console.log(`API call completed in ${endTime - startTime}ms`);

        // Process the response
        const responseText = result.response.text();
        console.log(`AI response for ${adDraft.ad_name}:`, responseText);

        // Extract the new name from the response
        let newName = responseText.trim();
        
        // Remove any quotes, JSON formatting, or extra text
        newName = newName.replace(/^["']|["']$/g, '').trim();
        newName = newName.replace(/^```.*?\n|```$/g, '').trim(); // Remove code blocks
        newName = newName.split('\n')[0].trim(); // Take only the first line
        
        if (!newName || newName.length === 0) {
          throw new Error('AI returned empty name');
        }

        // Validate the name isn't too long (reasonable limit)
        if (newName.length > 200) {
          console.log(`Generated name too long (${newName.length} chars), truncating...`);
          newName = newName.substring(0, 200).trim();
        }

        // Update the ad draft name in the database
        const { error: updateError } = await supabase
          .from('ad_drafts')
          .update({ ad_name: newName })
          .eq('id', adDraft.id);

        if (updateError) {
          throw updateError;
        }

        results.push({
          adDraftId: adDraft.id,
          originalName: adDraft.ad_name,
          newName: newName,
          success: true
        });

        console.log(`Successfully renamed ad ${adDraft.id}: "${adDraft.ad_name}" -> "${newName}"`);

        // Add a longer delay between requests to prevent rate limiting
        // Increase delay for larger batches
        const delay = adDrafts.length > 5 ? 1500 : 1000;
        console.log(`Waiting ${delay}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        console.error(`Error processing ad draft ${adDraft.id}:`, error);
        results.push({
          adDraftId: adDraft.id,
          originalName: adDraft.ad_name,
          newName: adDraft.ad_name, // Keep original name on error
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        // Continue processing other ads even if one fails
        console.log(`Continuing with remaining ${adDrafts.length - processedCount} ads...`);
      }
    }

    const response: BulkRenameResponse = {
      success: true,
      results,
    };

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    console.log(`Bulk rename completed. ${successCount}/${results.length} ads renamed successfully`);
    
    if (failureCount > 0) {
      console.log(`Failed ads:`, results.filter(r => !r.success).map(r => `${r.adDraftId}: ${r.error}`));
    }

    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('Error in bulk rename:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: `Failed to process bulk rename: ${errorMessage}`,
      success: false,
      results: []
    }, { status: 500 });
  }
} 