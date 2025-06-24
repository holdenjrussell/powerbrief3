import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const onesheetId = searchParams.get('onesheet_id');

    if (!onesheetId) {
      return NextResponse.json(
        { error: 'onesheet_id is required' },
        { status: 400 }
      );
    }

    // Get AI instructions for the onesheet
    const { data: instructions, error } = await supabase
      .from('onesheet_ai_instructions')
      .select('*')
      .eq('onesheet_id', onesheetId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching AI instructions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch AI instructions' },
        { status: 500 }
      );
    }

    // If no instructions exist, create default ones
    if (!instructions) {
      const { data: onesheet } = await supabase
        .from('onesheet')
        .select('brand_id')
        .eq('id', onesheetId)
        .single();

      if (!onesheet) {
        return NextResponse.json(
          { error: 'OneSheet not found' },
          { status: 404 }
        );
      }

      const defaultInstructions = {
        onesheet_id: onesheetId,
        brand_id: onesheet.brand_id,
        content_variables: [
          { name: "Podcast", description: "Usually in a podcast studio. May or may not have multiple speakers - has big mics, etc." },
          { name: "Man on the Street", description: "Features a person interviewing someone on the street" },
          { name: "Testimonial", description: "Customer or user sharing their experience with the product" },
          { name: "Product Demo", description: "Showing the product in use or demonstrating features" },
          { name: "Seductive Visuals", description: "Visually appealing or attractive imagery designed to capture attention" },
          { name: "Product Shots", description: "Clean, professional shots of the product itself" },
          { name: "Scientific Research", description: "References to studies, data, or scientific backing" },
          { name: "AI Voiceover", description: "Computer-generated voice narration" }
        ],
        awareness_levels: [
          { name: "Unaware", description: "Audience doesn't know they have a problem" },
          { name: "Problem Aware", description: "Knows they have a problem but not aware of solutions" },
          { name: "Solution Aware", description: "Knows solutions exist but not aware of your specific product" },
          { name: "Product Aware", description: "Knows your product but hasn't decided to purchase" },
          { name: "Most Aware", description: "Ready to buy, just needs the right offer" }
        ],
        content_variables_return_multiple: false,
        content_variables_allow_new: true,
        awareness_levels_allow_new: true,
        content_variables_selection_guidance: "When multiple variables are present, prioritize the most prominent or impactful element in the ad.",
        ad_duration_prompt: "For videos, provide the exact duration in seconds. For images, return 'N/A'.",
        product_intro_prompt: "For videos, identify when the product is first shown or mentioned in seconds. For images, return 'N/A'.",
        creators_used_prompt: "Count the number of distinct people visible in the ad. Include speakers, presenters, and featured individuals. Do not count background people or crowds.",
        sit_in_problem_prompt: "This is calculated as (productIntro / adDuration * 100)",
        type_prompt: "Identify the ad type from: High Production Video, Low Production Video (UGC), Static Image, Carousel, GIF",
        angle_prompt: "Define the primary message or strategic focus of the ad",
        format_prompt: "Describe the creative execution style",
        emotion_prompt: "Identify the primary emotion the ad aims to evoke",
        framework_prompt: "Identify the underlying marketing framework used",
        transcription_prompt: "For videos: provide a timecoded transcript with timestamps in [MM:SS] format. For images: any visible text/captions only.",
        visual_description_prompt: "For videos: detailed description of visual elements. For images: comprehensive description including hex color codes.",
        system_instructions: "You are a top creative strategist at a multi-million dollar per year ecommerce brand. You spend all day analyzing video and image advertisements, categorizing them, labeling them, and identifying trends to help brands produce more concepts and more winners. You have an exceptional eye for detail and can quickly identify what makes an ad successful. Your analysis is data-driven, precise, and actionable.",
        response_schema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'The category of the video production.',
              example: 'High Production Video'
            },
            adDuration: {
              type: 'number',
              format: 'float',
              description: 'The total duration of the ad in seconds.',
              example: 32.5
            },
            productIntro: {
              type: 'number',
              format: 'float',
              description: 'The timestamp in seconds when the product is introduced.',
              example: 3.1
            },
            sitInProblem: {
              type: 'string',
              description: 'The percentage of the ad duration that focuses on the problem.',
              example: '9.5%'
            },
            creatorsUsed: {
              type: 'integer',
              description: 'The number of creators featured in the ad.',
              example: 1
            },
            angle: {
              type: 'string',
              description: 'The primary marketing angle or theme of the ad.',
              example: 'Weight Management'
            },
            format: {
              type: 'string',
              description: 'The format of the ad.',
              example: 'Testimonial'
            },
            emotion: {
              type: 'string',
              description: 'The dominant emotion conveyed in the ad.',
              example: 'Hopefulness'
            },
            framework: {
              type: 'string',
              description: 'The marketing or storytelling framework used.',
              example: 'PAS'
            },
            awarenessLevel: {
              type: 'string',
              description: 'The target audience\'s level of awareness.',
              example: 'Problem Aware'
            },
            contentVariables: {
              type: 'string',
              description: 'Specific elements or variables included in the content.',
              example: 'Product Demo'
            },
            transcription: {
              type: 'string',
              description: 'The full transcription of the ad\'s audio.',
              example: '[00:01] Have you ever felt...'
            },
            visualDescription: {
              type: 'string',
              description: 'A description of the visual elements in the ad.',
              example: 'A woman is sitting at her desk, looking tired. The color palette is muted with blue and grey tones. Primary hex code: #B0C4DE.'
            }
          },
          required: ['type', 'adDuration', 'productIntro', 'sitInProblem', 'creatorsUsed', 
                    'angle', 'format', 'emotion', 'framework', 'awarenessLevel', 
                    'contentVariables', 'transcription', 'visualDescription']
        },
        analysis_fields: {
          type: [
            { name: "High Production Video", description: "Professional, high-quality video production" },
            { name: "Low Production Video (UGC)", description: "User-generated content style" },
            { name: "Static Image", description: "Single image creative" },
            { name: "Carousel", description: "Multiple images or cards" },
            { name: "GIF", description: "Animated image" }
          ],
          angle: [
            { name: "Weight Management", description: "Focus on weight loss or body composition" },
            { name: "Time/Convenience", description: "Emphasis on saving time" },
            { name: "Energy/Focus", description: "Highlighting increased energy" },
            { name: "Digestive Health", description: "Focus on gut health" },
            { name: "Immunity Support", description: "Emphasizing immune support" }
          ],
          format: [
            { name: "Testimonial", description: "Customer sharing experience" },
            { name: "Podcast Clip", description: "Excerpt from podcast" },
            { name: "Authority Figure", description: "Expert explaining benefits" },
            { name: "3 Reasons Why", description: "Structured list format" },
            { name: "Unboxing", description: "Product reveal" }
          ],
          emotion: [
            { name: "Hopefulness", description: "Inspiring optimism" },
            { name: "Excitement", description: "Creating enthusiasm" },
            { name: "Curiosity", description: "Sparking interest" },
            { name: "Urgency", description: "Time pressure" },
            { name: "Trust", description: "Building credibility" }
          ],
          framework: [
            { name: "PAS", description: "Problem-Agitate-Solution" },
            { name: "AIDA", description: "Attention-Interest-Desire-Action" },
            { name: "FAB", description: "Features-Advantages-Benefits" },
            { name: "Star Story Solution", description: "Hero's journey" },
            { name: "Before After Bridge", description: "Transformation narrative" }
          ]
        },
        allow_new_analysis_values: {
          type: true,
          angle: true,
          format: true,
          emotion: true,
          framework: true
        }
      };

      const { data: newInstructions, error: createError } = await supabase
        .from('onesheet_ai_instructions')
        .insert(defaultInstructions)
        .select()
        .single();

      if (createError) {
        console.error('Error creating default AI instructions:', createError);
        return NextResponse.json(
          { error: 'Failed to create default AI instructions' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: newInstructions });
    }

    return NextResponse.json({ data: instructions });
  } catch (error) {
    console.error('Error in AI instructions GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { onesheet_id, ...updates } = body;

    if (!onesheet_id) {
      return NextResponse.json(
        { error: 'onesheet_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('onesheet_ai_instructions')
      .update(updates)
      .eq('onesheet_id', onesheet_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating AI instructions:', error);
      return NextResponse.json(
        { error: 'Failed to update AI instructions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in AI instructions PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { onesheet_id, discovered_variable, discovered_level } = body;

    if (!onesheet_id) {
      return NextResponse.json(
        { error: 'onesheet_id is required' },
        { status: 400 }
      );
    }

    // Get current instructions
    const { data: instructions, error: fetchError } = await supabase
      .from('onesheet_ai_instructions')
      .select('*')
      .eq('onesheet_id', onesheet_id)
      .single();

    if (fetchError) {
      console.error('Error fetching AI instructions:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch AI instructions' },
        { status: 500 }
      );
    }

    const updates: {
      discovered_content_variables?: Array<{ name: string; description: string }>;
      discovered_awareness_levels?: Array<{ name: string; description: string }>;
    } = {};

    // Add discovered content variable
    if (discovered_variable) {
      const currentVariables = instructions.discovered_content_variables || [];
      const exists = currentVariables.some((v: { name: string }) => v.name === discovered_variable.name);
      
      if (!exists) {
        updates.discovered_content_variables = [...currentVariables, discovered_variable];
      }
    }

    // Add discovered awareness level
    if (discovered_level) {
      const currentLevels = instructions.discovered_awareness_levels || [];
      const exists = currentLevels.some((l: { name: string }) => l.name === discovered_level.name);
      
      if (!exists) {
        updates.discovered_awareness_levels = [...currentLevels, discovered_level];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ data: instructions });
    }

    const { data, error } = await supabase
      .from('onesheet_ai_instructions')
      .update(updates)
      .eq('onesheet_id', onesheet_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating discovered variables:', error);
      return NextResponse.json(
        { error: 'Failed to update discovered variables' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in AI instructions POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 