import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { CreativeBrainstormData } from '@/lib/types/onesheet';

// GET: Fetch creative brainstorm data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const onesheetId = searchParams.get('onesheetId');

    if (!onesheetId) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    const { data: onesheet, error } = await supabase
      .from('onesheet')
      .select('creative_brainstorm')
      .eq('id', onesheetId)
      .eq('user_id', user.id)
      .single();

    if (error || !onesheet) {
      return NextResponse.json(
        { error: error?.message || 'OneSheet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: onesheet.creative_brainstorm || null,
    });

  } catch (error) {
    console.error('Error fetching creative brainstorm:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creative brainstorm' },
      { status: 500 }
    );
  }
}

// PUT: Update creative brainstorm data
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { onesheetId, data } = await request.json();

    if (!onesheetId) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    const creativeBrainstormData = data as CreativeBrainstormData;

    // Update the OneSheet with new creative brainstorm data
    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        creative_brainstorm: creativeBrainstormData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', onesheetId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: creativeBrainstormData,
    });

  } catch (error) {
    console.error('Error updating creative brainstorm:', error);
    return NextResponse.json(
      { error: 'Failed to update creative brainstorm' },
      { status: 500 }
    );
  }
}

// DELETE: Clear creative brainstorm data
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const onesheetId = searchParams.get('onesheetId');

    if (!onesheetId) {
      return NextResponse.json({ error: 'OneSheet ID is required' }, { status: 400 });
    }

    // First fetch the current stages_completed
    const { data: currentData, error: fetchError } = await supabase
      .from('onesheet')
      .select('stages_completed')
      .eq('id', onesheetId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    const updatedStagesCompleted = {
      ...(currentData?.stages_completed || {}),
      creative_brainstorm: false,
    };

    const { error: updateError } = await supabase
      .from('onesheet')
      .update({
        creative_brainstorm: null,
        stages_completed: updatedStagesCompleted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', onesheetId)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Creative brainstorm data cleared',
    });

  } catch (error) {
    console.error('Error clearing creative brainstorm:', error);
    return NextResponse.json(
      { error: 'Failed to clear creative brainstorm' },
      { status: 500 }
    );
  }
} 