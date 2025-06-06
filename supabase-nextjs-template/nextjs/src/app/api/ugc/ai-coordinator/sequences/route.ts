import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface SequenceStep {
  stepOrder: number;
  name: string;
  delayDays: number;
  delayHours: number;
  customSubject: string;
  customHtmlContent: string;
  customTextContent: string;
  statusChangeAction?: string;
  conditions?: any;
}

interface CreateSequenceRequest {
  name: string;
  description: string;
  brandId: string;
  triggerEvent: string;
  triggerConditions?: any;
  steps: SequenceStep[];
  isActive?: boolean;
}

interface EnrollCreatorRequest {
  creatorId: string;
  sequenceId: string;
  brandId: string;
  enrollmentTrigger: string;
  metadata?: any;
}

interface ModifySequenceRequest {
  sequenceId: string;
  updates: {
    name?: string;
    description?: string;
    triggerConditions?: any;
    isActive?: boolean;
    steps?: SequenceStep[];
  };
}

// POST - Create new sequence or enroll creator
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { action, ...data } = await request.json();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    switch (action) {
      case 'create_sequence':
        return await createSequence(supabase, data as CreateSequenceRequest, user.id);
      
      case 'enroll_creator':
        return await enrollCreator(supabase, data as EnrollCreatorRequest, user.id);
      
      case 'clone_starter_sequences':
        return await cloneStarterSequences(supabase, data.brandId, user.id);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI Sequences API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Modify existing sequence
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const data = await request.json() as ModifySequenceRequest;
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return await modifySequence(supabase, data, user.id);
  } catch (error) {
    console.error('AI Sequences Modify Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - List sequences for a brand
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const includeSteps = searchParams.get('includeSteps') === 'true';
    
    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let query = supabase
      .from('ugc_email_sequences')
      .select(includeSteps ? `
        *,
        ugc_email_sequence_steps (*)
      ` : '*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    const { data: sequences, error } = await query;

    if (error) {
      console.error('Error fetching sequences:', error);
      return NextResponse.json({ error: 'Failed to fetch sequences' }, { status: 500 });
    }

    return NextResponse.json({ sequences });
  } catch (error) {
    console.error('AI Sequences Get Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function createSequence(supabase: any, data: CreateSequenceRequest, userId: string) {
  // Create the sequence
  const { data: sequence, error: sequenceError } = await supabase
    .from('ugc_email_sequences')
    .insert({
      name: data.name,
      description: data.description,
      brand_id: data.brandId,
      trigger_event: data.triggerEvent,
      trigger_conditions: data.triggerConditions,
      is_active: data.isActive ?? false,
      created_by: userId
    })
    .select()
    .single();

  if (sequenceError) {
    console.error('Error creating sequence:', sequenceError);
    return NextResponse.json({ error: 'Failed to create sequence' }, { status: 500 });
  }

  // Create the steps
  const steps = data.steps.map(step => ({
    sequence_id: sequence.id,
    step_order: step.stepOrder,
    name: step.name,
    delay_days: step.delayDays,
    delay_hours: step.delayHours,
    custom_subject: step.customSubject,
    custom_html_content: step.customHtmlContent,
    custom_text_content: step.customTextContent,
    status_change_action: step.statusChangeAction,
    conditions: step.conditions
  }));

  const { error: stepsError } = await supabase
    .from('ugc_email_sequence_steps')
    .insert(steps);

  if (stepsError) {
    console.error('Error creating sequence steps:', stepsError);
    // Clean up the sequence if steps failed
    await supabase.from('ugc_email_sequences').delete().eq('id', sequence.id);
    return NextResponse.json({ error: 'Failed to create sequence steps' }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    sequence: { ...sequence, steps: data.steps }
  });
}

async function enrollCreator(supabase: any, data: EnrollCreatorRequest, userId: string) {
  // Check if creator is already enrolled in this sequence
  const { data: existingEnrollment } = await supabase
    .from('ugc_creator_sequence_enrollments')
    .select('*')
    .eq('creator_id', data.creatorId)
    .eq('sequence_id', data.sequenceId)
    .single();

  if (existingEnrollment) {
    return NextResponse.json({ 
      error: 'Creator is already enrolled in this sequence' 
    }, { status: 400 });
  }

  // Get the first step to calculate next_send_at
  const { data: firstStep } = await supabase
    .from('ugc_email_sequence_steps')
    .select('delay_days, delay_hours')
    .eq('sequence_id', data.sequenceId)
    .eq('step_order', 1)
    .single();

  let nextSendAt = new Date();
  if (firstStep) {
    nextSendAt.setDate(nextSendAt.getDate() + firstStep.delay_days);
    nextSendAt.setHours(nextSendAt.getHours() + firstStep.delay_hours);
  }

  // Create enrollment
  const { data: enrollment, error } = await supabase
    .from('ugc_creator_sequence_enrollments')
    .insert({
      creator_id: data.creatorId,
      sequence_id: data.sequenceId,
      brand_id: data.brandId,
      enrollment_trigger: data.enrollmentTrigger,
      next_send_at: nextSendAt.toISOString(),
      metadata: data.metadata
    })
    .select()
    .single();

  if (error) {
    console.error('Error enrolling creator:', error);
    return NextResponse.json({ error: 'Failed to enroll creator' }, { status: 500 });
  }

  // Log the enrollment
  await supabase
    .from('ugc_creator_communication_log')
    .insert({
      creator_id: data.creatorId,
      brand_id: data.brandId,
      log_type: 'sequence_enrollment',
      source: 'ai_coordinator',
      subject: 'Enrolled in Email Sequence',
      content: `Creator enrolled in sequence: ${data.sequenceId}`,
      metadata: {
        sequence_id: data.sequenceId,
        enrollment_trigger: data.enrollmentTrigger,
        enrollment_metadata: data.metadata
      },
      sequence_enrollment_id: enrollment.id,
      performed_by: userId
    });

  return NextResponse.json({ success: true, enrollment });
}

async function modifySequence(supabase: any, data: ModifySequenceRequest, userId: string) {
  const { sequenceId, updates } = data;

  // Update sequence metadata
  if (updates.name || updates.description || updates.triggerConditions !== undefined || updates.isActive !== undefined) {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description) updateData.description = updates.description;
    if (updates.triggerConditions !== undefined) updateData.trigger_conditions = updates.triggerConditions;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { error: sequenceError } = await supabase
      .from('ugc_email_sequences')
      .update(updateData)
      .eq('id', sequenceId);

    if (sequenceError) {
      console.error('Error updating sequence:', sequenceError);
      return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 });
    }
  }

  // Update steps if provided
  if (updates.steps) {
    // Delete existing steps
    await supabase
      .from('ugc_email_sequence_steps')
      .delete()
      .eq('sequence_id', sequenceId);

    // Insert new steps
    const steps = updates.steps.map(step => ({
      sequence_id: sequenceId,
      step_order: step.stepOrder,
      name: step.name,
      delay_days: step.delayDays,
      delay_hours: step.delayHours,
      custom_subject: step.customSubject,
      custom_html_content: step.customHtmlContent,
      custom_text_content: step.customTextContent,
      status_change_action: step.statusChangeAction,
      conditions: step.conditions
    }));

    const { error: stepsError } = await supabase
      .from('ugc_email_sequence_steps')
      .insert(steps);

    if (stepsError) {
      console.error('Error updating sequence steps:', stepsError);
      return NextResponse.json({ error: 'Failed to update sequence steps' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

async function cloneStarterSequences(supabase: any, brandId: string, userId: string) {
  // Call the database function to clone starter sequences
  const { data, error } = await supabase
    .rpc('clone_starter_sequences_for_brand', {
      target_brand_id: brandId,
      user_id: userId
    });

  if (error) {
    console.error('Error cloning starter sequences:', error);
    return NextResponse.json({ error: 'Failed to clone starter sequences' }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    sequencesCreated: data || 0
  });
} 