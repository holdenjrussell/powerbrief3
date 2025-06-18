import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import type { AudienceResearchData, AudienceResearchItem, AudiencePersona } from '@/lib/types/onesheet';

// GET - Get audience research data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onesheet_id = searchParams.get('onesheet_id');

    if (!onesheet_id) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get OneSheet and verify access
    const { data: onesheet, error } = await supabase
      .from('onesheet')
      .select('audience_research')
      .eq('id', onesheet_id)
      .single();

    if (error || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: onesheet.audience_research || {
        angles: [],
        benefits: [],
        painPoints: [],
        features: [],
        objections: [],
        failedSolutions: [],
        other: [],
        personas: []
      }
    });

  } catch (error) {
    console.error('Error fetching audience research:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audience research' },
      { status: 500 }
    );
  }
}

// POST - Create new audience research item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { onesheet_id, section, item } = body;

    if (!onesheet_id || !section || !item) {
      return NextResponse.json({ 
        error: 'Missing required fields: onesheet_id, section, item' 
      }, { status: 400 });
    }

    const validSections = ['angles', 'benefits', 'painPoints', 'features', 'objections', 'failedSolutions', 'other', 'personas'];
    if (!validSections.includes(section)) {
      return NextResponse.json({ 
        error: `Invalid section. Must be one of: ${validSections.join(', ')}` 
      }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current audience research
    const { data: onesheet, error: fetchError } = await supabase
      .from('onesheet')
      .select('audience_research')
      .eq('id', onesheet_id)
      .single();

    if (fetchError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const currentResearch = onesheet.audience_research || {
      angles: [],
      benefits: [],
      painPoints: [],
      features: [],
      objections: [],
      failedSolutions: [],
      other: [],
      personas: []
    };

    // Create new item with metadata
    const timestamp = new Date().toISOString();
    const newItem = {
      id: uuidv4(),
      ...item,
      aiGenerated: false,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Add to appropriate section
    currentResearch[section].push(newItem);

    // Update OneSheet
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        audience_research: currentResearch,
        updated_at: timestamp
      })
      .eq('id', onesheet_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: newItem,
      message: `${section} item created successfully`
    });

  } catch (error) {
    console.error('Error creating audience research item:', error);
    return NextResponse.json(
      { error: 'Failed to create audience research item' },
      { status: 500 }
    );
  }
}

// PUT - Update existing audience research item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { onesheet_id, section, item_id, updates } = body;

    if (!onesheet_id || !section || !item_id || !updates) {
      return NextResponse.json({ 
        error: 'Missing required fields: onesheet_id, section, item_id, updates' 
      }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current audience research
    const { data: onesheet, error: fetchError } = await supabase
      .from('onesheet')
      .select('audience_research')
      .eq('id', onesheet_id)
      .single();

    if (fetchError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const currentResearch = onesheet.audience_research || {};
    
    // Find and update the item
    const sectionData = currentResearch[section];
    if (!Array.isArray(sectionData)) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }

    const itemIndex = sectionData.findIndex((item: any) => item.id === item_id);
    if (itemIndex === -1) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Update the item
    const timestamp = new Date().toISOString();
    currentResearch[section][itemIndex] = {
      ...currentResearch[section][itemIndex],
      ...updates,
      id: item_id, // Preserve ID
      updatedAt: timestamp
    };

    // Update OneSheet
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        audience_research: currentResearch,
        updated_at: timestamp
      })
      .eq('id', onesheet_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: currentResearch[section][itemIndex],
      message: 'Item updated successfully'
    });

  } catch (error) {
    console.error('Error updating audience research item:', error);
    return NextResponse.json(
      { error: 'Failed to update audience research item' },
      { status: 500 }
    );
  }
}

// DELETE - Delete audience research item
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onesheet_id = searchParams.get('onesheet_id');
    const section = searchParams.get('section');
    const item_id = searchParams.get('item_id');

    if (!onesheet_id || !section || !item_id) {
      return NextResponse.json({ 
        error: 'Missing required parameters: onesheet_id, section, item_id' 
      }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current audience research
    const { data: onesheet, error: fetchError } = await supabase
      .from('onesheet')
      .select('audience_research')
      .eq('id', onesheet_id)
      .single();

    if (fetchError || !onesheet) {
      return NextResponse.json({ error: 'OneSheet not found' }, { status: 404 });
    }

    const currentResearch = onesheet.audience_research || {};
    
    // Find and remove the item
    const sectionData = currentResearch[section];
    if (!Array.isArray(sectionData)) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }

    const filteredSection = sectionData.filter((item: any) => item.id !== item_id);
    
    if (filteredSection.length === sectionData.length) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    currentResearch[section] = filteredSection;

    // Update OneSheet
    const timestamp = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        audience_research: currentResearch,
        updated_at: timestamp
      })
      .eq('id', onesheet_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting audience research item:', error);
    return NextResponse.json(
      { error: 'Failed to delete audience research item' },
      { status: 500 }
    );
  }
} 