import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface SequenceAction {
  type: 'create_sequence' | 'enroll_creator' | 'modify_sequence';
  priority: 'high' | 'medium' | 'low';
  description: string;
  reasoning: string;
  sequenceData?: {
    name: string;
    description: string;
    triggerEvent: string;
    triggerConditions?: Record<string, unknown>;
    steps: Array<{
      stepOrder: number;
      name: string;
      delayDays: number;
      delayHours: number;
      customSubject: string;
      customHtmlContent: string;
      customTextContent: string;
      statusChangeAction?: string;
      conditions?: Record<string, unknown>;
    }>;
  };
  enrollmentData?: {
    sequenceId: string;
    enrollmentTrigger: string;
    metadata?: Record<string, unknown>;
  };
  modificationData?: {
    sequenceId: string;
    updates: Record<string, unknown>;
  };
}

interface EnhancedAnalysisResult {
  analysis: string;
  recommendedActions: SequenceAction[];
  sequencesCreated?: number;
  enrollmentsCreated?: number;
}

// POST - Enhanced AI analysis with sequence management
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { brandId, creatorId, includeSequenceRecommendations = true } = await request.json();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure starter sequences exist for the brand
    await ensureStarterSequences(supabase, brandId, user.id);

    // Get creator data
    const { data: creator, error: creatorError } = await supabase
      .from('ugc_creators')
      .select('*')
      .eq('id', creatorId)
      .eq('brand_id', brandId)
      .single();

    if (creatorError || !creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Get available sequences for context
    const availableSequences = await getAvailableSequences(supabase, brandId);

    // Get recent communication history
    const { data: recentCommunications } = await supabase
      .from('ugc_creator_communication_log')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Enhanced analysis with sequence recommendations
    const analysisResult = await analyzeCreatorWithSequences(
      creator,
      availableSequences,
      recentCommunications || [],
      includeSequenceRecommendations
    );

    // Execute sequence actions automatically
    let sequencesCreated = 0;
    let enrollmentsCreated = 0;

    for (const action of analysisResult.recommendedActions) {
      const result = await executeSequenceAction(supabase, action, creatorId, brandId, user.id);
      if (result.success) {
        if (action.type === 'create_sequence') sequencesCreated++;
        if (action.type === 'enroll_creator') enrollmentsCreated++;
      }
    }

    return NextResponse.json({
      ...analysisResult,
      sequencesCreated,
      enrollmentsCreated,
      executionResults: analysisResult.recommendedActions.length
    });

  } catch (error) {
    console.error('Enhanced AI Coordinator Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function analyzeCreatorWithSequences(
  creator: Record<string, unknown>,
  availableSequences: Record<string, unknown>[],
  recentCommunications: Record<string, unknown>[],
  includeSequenceRecommendations: boolean
): Promise<EnhancedAnalysisResult> {
  
  // Analyze creator status and determine sequence actions
  const analysis = `Creator ${creator.name} is currently in ${creator.status} status. 
    Based on communication history and available sequences, recommendations have been generated.`;

  const recommendedActions: SequenceAction[] = [];

  // Logic for different creator statuses
  switch (creator.status) {
    case 'ADDED':
      // New creator - enroll in onboarding sequence
      const onboardingSequence = availableSequences.find((seq: Record<string, unknown>) => 
        seq.name === 'New Creator Onboarding'
      );
      
      if (onboardingSequence && includeSequenceRecommendations) {
        recommendedActions.push({
          type: 'enroll_creator',
          priority: 'high',
          description: 'Enroll in welcome sequence',
          reasoning: 'New creator needs onboarding and welcome communication',
          enrollmentData: {
            sequenceId: onboardingSequence.id as string,
            enrollmentTrigger: 'status_added',
            metadata: { auto_enrolled: true, trigger_status: 'ADDED' }
          }
        });
      }
      break;

    case 'SCHEDULE CALL':
      // Creator needs to schedule call - enroll in call scheduling sequence
      const callSequence = availableSequences.find((seq: Record<string, unknown>) => 
        seq.name === 'Call Scheduling Follow-up'
      );
      
      if (callSequence && includeSequenceRecommendations) {
        recommendedActions.push({
          type: 'enroll_creator',
          priority: 'high',
          description: 'Enroll in call scheduling follow-up',
          reasoning: 'Creator needs assistance scheduling discovery call',
          enrollmentData: {
            sequenceId: callSequence.id as string,
            enrollmentTrigger: 'schedule_call_status',
            metadata: { auto_enrolled: true, trigger_status: 'SCHEDULE CALL' }
          }
        });
      }
      break;

    case 'SHIPPING PRODUCT':
      // Product being shipped - enroll in shipping updates
      const shippingSequence = availableSequences.find((seq: Record<string, unknown>) => 
        seq.name === 'Product Shipping Updates'
      );
      
      if (shippingSequence && includeSequenceRecommendations) {
        recommendedActions.push({
          type: 'enroll_creator',
          priority: 'medium',
          description: 'Enroll in shipping updates sequence',
          reasoning: 'Keep creator informed about product shipping and next steps',
          enrollmentData: {
            sequenceId: shippingSequence.id as string,
            enrollmentTrigger: 'shipping_status',
            metadata: { auto_enrolled: true, trigger_status: 'SHIPPING PRODUCT' }
          }
        });
      }
      break;

    default:
      // Check if creator has been inactive - consider follow-up sequence
      const lastCommunication = recentCommunications[0];
      const daysSinceLastContact = lastCommunication 
        ? Math.floor((Date.now() - new Date(lastCommunication.created_at as string).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      if (daysSinceLastContact > 3 && includeSequenceRecommendations) {
        const followUpSequence = availableSequences.find((seq: Record<string, unknown>) => 
          seq.name === 'No Response Follow-up'
        );
        
        if (followUpSequence) {
          recommendedActions.push({
            type: 'enroll_creator',
            priority: 'medium',
            description: 'Enroll in no response follow-up sequence',
            reasoning: `No communication for ${daysSinceLastContact} days - gentle follow-up needed`,
            enrollmentData: {
              sequenceId: followUpSequence.id as string,
              enrollmentTrigger: 'no_response',
              metadata: { 
                auto_enrolled: true, 
                days_since_contact: daysSinceLastContact,
                last_status: creator.status
              }
            }
          });
        }
      }
  }

  return {
    analysis,
    recommendedActions
  };
}

async function executeSequenceAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: SequenceAction,
  creatorId: string,
  brandId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (action.type) {
      case 'enroll_creator':
        if (!action.enrollmentData) {
          throw new Error('Enrollment data required for enroll_creator');
        }

        // Check if already enrolled
        const { data: existingEnrollment } = await supabase
          .from('ugc_creator_sequence_enrollments')
          .select('id')
          .eq('creator_id', creatorId)
          .eq('sequence_id', action.enrollmentData.sequenceId)
          .single();

        if (existingEnrollment) {
          return { success: false, error: 'Already enrolled in sequence' };
        }

        // Get first step timing
        const { data: firstStep } = await supabase
          .from('ugc_email_sequence_steps')
          .select('delay_days, delay_hours')
          .eq('sequence_id', action.enrollmentData.sequenceId)
          .eq('step_order', 1)
          .single();

        const nextSendAt = new Date();
        if (firstStep) {
          nextSendAt.setDate(nextSendAt.getDate() + (firstStep.delay_days || 0));
          nextSendAt.setHours(nextSendAt.getHours() + (firstStep.delay_hours || 0));
        }

        // Create enrollment
        await supabase
          .from('ugc_creator_sequence_enrollments')
          .insert({
            creator_id: creatorId,
            sequence_id: action.enrollmentData.sequenceId,
            brand_id: brandId,
            enrollment_trigger: action.enrollmentData.enrollmentTrigger,
            next_send_at: nextSendAt.toISOString(),
            metadata: action.enrollmentData.metadata
          });

        // Log the enrollment
        await supabase
          .from('ugc_creator_communication_log')
          .insert({
            creator_id: creatorId,
            brand_id: brandId,
            log_type: 'sequence_enrollment',
            source: 'ai_coordinator',
            subject: 'Enrolled in Email Sequence',
            content: action.description,
            metadata: {
              action_type: action.type,
              priority: action.priority,
              reasoning: action.reasoning,
              enrollment_data: action.enrollmentData
            },
            performed_by: userId
          });

        break;

      // Add other action types as needed
      default:
        return { success: false, error: `Unsupported action type: ${action.type}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error executing sequence action:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function ensureStarterSequences(
  supabase: Awaited<ReturnType<typeof createClient>>, 
  brandId: string, 
  userId: string
): Promise<void> {
  // Check if brand already has sequences
  const { data: existingSequences } = await supabase
    .from('ugc_email_sequences')
    .select('id')
    .eq('brand_id', brandId)
    .limit(1);

  if (!existingSequences || existingSequences.length === 0) {
    // Clone starter sequences for this brand
    await supabase
      .rpc('clone_starter_sequences_for_brand', {
        target_brand_id: brandId,
        user_id: userId
      });
  }
}

async function getAvailableSequences(
  supabase: Awaited<ReturnType<typeof createClient>>, 
  brandId: string
): Promise<Record<string, unknown>[]> {
  const { data: sequences } = await supabase
    .from('ugc_email_sequences')
    .select(`
      id,
      name,
      description,
      trigger_event,
      trigger_conditions,
      is_active
    `)
    .eq('brand_id', brandId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return sequences || [];
} 