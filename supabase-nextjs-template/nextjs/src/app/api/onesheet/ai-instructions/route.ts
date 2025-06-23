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
        content_variables_selection_guidance: "When multiple variables are present, prioritize the most prominent or impactful element in the ad."
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

    let updates: any = {};

    // Add discovered content variable
    if (discovered_variable) {
      const currentVariables = instructions.discovered_content_variables || [];
      const exists = currentVariables.some((v: any) => v.name === discovered_variable.name);
      
      if (!exists) {
        updates.discovered_content_variables = [...currentVariables, discovered_variable];
      }
    }

    // Add discovered awareness level
    if (discovered_level) {
      const currentLevels = instructions.discovered_awareness_levels || [];
      const exists = currentLevels.some((l: any) => l.name === discovered_level.name);
      
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