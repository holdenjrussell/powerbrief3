import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Fetch email sequences for the brand
    const { data: sequences, error: sequencesError } = await supabase
      .from('ugc_email_sequences' as any)
      .select(`
        *,
        steps:ugc_email_sequence_steps(*)
      `)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (sequencesError) {
      console.error('Error fetching sequences:', sequencesError);
      return NextResponse.json({ error: 'Failed to fetch sequences' }, { status: 500 });
    }

    return NextResponse.json({ sequences: sequences || [] });

  } catch (error) {
    console.error('Sequences API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSSRClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      name, 
      description, 
      brandId, 
      triggerEvent, 
      triggerConditions, 
      steps 
    } = await request.json();

    if (!name || !brandId || !triggerEvent) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, brandId, triggerEvent' 
      }, { status: 400 });
    }

    // Create the sequence
    const { data: sequence, error: sequenceError } = await supabase
      .from('ugc_email_sequences' as any)
      .insert({
        name,
        description,
        brand_id: brandId,
        trigger_event: triggerEvent,
        trigger_conditions: triggerConditions,
        created_by: user.id
      })
      .select('id')
      .single();

    if (sequenceError || !sequence) {
      console.error('Error creating sequence:', sequenceError);
      return NextResponse.json({ error: 'Failed to create sequence' }, { status: 500 });
    }

    // Create sequence steps if provided
    if (steps && Array.isArray(steps) && steps.length > 0) {
      const stepsData = steps.map((step: any, index: number) => ({
        sequence_id: sequence.id,
        step_order: index + 1,
        name: step.name,
        delay_days: step.delayDays || 0,
        delay_hours: step.delayHours || 0,
        email_template_id: step.emailTemplateId || null,
        custom_subject: step.customSubject || null,
        custom_html_content: step.customHtmlContent || null,
        custom_text_content: step.customTextContent || null,
        status_change_action: step.statusChangeAction || null,
        conditions: step.conditions || null
      }));

      const { error: stepsError } = await supabase
        .from('ugc_email_sequence_steps' as any)
        .insert(stepsData);

      if (stepsError) {
        console.error('Error creating sequence steps:', stepsError);
        // Cleanup: delete the sequence since steps failed
        await supabase
          .from('ugc_email_sequences' as any)
          .delete()
          .eq('id', sequence.id);
        
        return NextResponse.json({ error: 'Failed to create sequence steps' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      sequenceId: sequence.id
    });

  } catch (error) {
    console.error('Create sequence error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 