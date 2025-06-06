import { NextResponse, NextRequest } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { ugcAiCoordinator } from '@/lib/services/ugcAiCoordinator';
import { createClient } from '@/utils/supabase/server';

// Add new sequence-related interfaces
interface SequenceAction {
  type: 'create_sequence' | 'enroll_creator' | 'modify_sequence';
  priority: 'high' | 'medium' | 'low';
  description: string;
  reasoning: string;
  sequenceData?: {
    name: string;
    description: string;
    triggerEvent: string;
    triggerConditions?: any;
    steps: Array<{
      stepOrder: number;
      name: string;
      delayDays: number;
      delayHours: number;
      customSubject: string;
      customHtmlContent: string;
      customTextContent: string;
      statusChangeAction?: string;
      conditions?: any;
    }>;
  };
  enrollmentData?: {
    sequenceId: string;
    enrollmentTrigger: string;
    metadata?: any;
  };
  modificationData?: {
    sequenceId: string;
    updates: any;
  };
}

// Add this to the existing AnalysisResult interface
interface AnalysisResult {
  analysis: string;
  recommendedActions: Array<RecommendedAction | SequenceAction>;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const brandId = url.searchParams.get('brandId');

    console.log('AI Coordinator API called with brandId:', brandId);

    if (!brandId) {
      console.log('No brandId provided');
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    const supabase = await createSSRClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('User authentication:', user ? 'authenticated' : 'not authenticated', user?.id);
    
    if (!user) {
      console.log('User not authenticated');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify user has access to this brand (let RLS policies handle access control)
    // This allows shared brand users to access the coordinator for brands they have access to
    console.log('Checking brand access for brandId:', brandId, 'userId:', user.id);
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();

    console.log('Brand query result:', { brand: !!brand, error: brandError });

    if (brandError || !brand) {
      console.log('Brand not found or access denied:', brandError);
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 404 });
    }

    // Get or create the AI coordinator
    console.log('Creating/getting AI coordinator for brand:', brandId);
    const coordinator = await ugcAiCoordinator.getOrCreateCoordinator(brandId, user.id);

    console.log('AI coordinator created/retrieved successfully');
    return NextResponse.json({
      coordinator,
      brand
    });

  } catch (error) {
    console.error('Error in AI coordinator API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { coordinatorId, settings } = await request.json();

    if (!coordinatorId || !settings) {
      return NextResponse.json({ error: 'Coordinator ID and settings are required' }, { status: 400 });
    }

    const supabase = await createSSRClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Update the coordinator settings
    const { data: updatedCoordinator, error } = await (supabase as any)
      .from('ugc_ai_coordinator')
      .update({
        settings,
        email_automation_enabled: settings.email_automation_enabled,
        slack_notifications_enabled: settings.slack_notifications_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', coordinatorId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update coordinator: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      coordinator: updatedCoordinator
    });

  } catch (error) {
    console.error('Error updating AI coordinator:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { brandId, creatorIds, action = 'analyze' } = await request.json();

    // ... existing authentication check ...

    if (action === 'analyze') {
      return await analyzeCreators(supabase, brandId, creatorIds, user.id);
    } else if (action === 'execute_sequence_action') {
      const { sequenceAction, creatorId } = await request.json();
      return await executeSequenceAction(supabase, sequenceAction, creatorId, brandId, user.id);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('AI Coordinator Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function analyzeCreators(supabase: any, brandId: string, creatorIds: string[], userId: string) {
  // ... existing code ...

  // Enhance the analysis prompt to include sequence recommendations
  const enhancedPrompt = `
You are an AI UGC (User Generated Content) Coordinator helping manage creator relationships and script pipeline. 

BRAND INFO:
${brandContext}

CREATOR CONTEXT:
${creatorContext}

Please analyze this creator's current status and situation, then provide:

1. A detailed analysis of their current position in the pipeline
2. Recommended actions with priorities
3. Email sequence recommendations when appropriate

For sequence recommendations, consider:
- Creating custom sequences for unique situations
- Enrolling creators in existing sequences (onboarding, follow-up, etc.)
- Modifying sequences based on creator response patterns

RESPONSE FORMAT:
Return a JSON object with:
{
  "analysis": "detailed analysis of creator situation",
  "recommendedActions": [
    {
      "type": "follow_up|status_change|create_sequence|enroll_creator|modify_sequence",
      "priority": "high|medium|low",
      "description": "what action to take",
      "reasoning": "why this action is recommended",
      // For sequence actions, include additional fields:
      "sequenceData": { /* for create_sequence */ },
      "enrollmentData": { /* for enroll_creator */ },
      "modificationData": { /* for modify_sequence */ }
    }
  ]
}

Focus on actionable next steps that will move the creator forward in the pipeline effectively.
Use email sequences to automate follow-ups and maintain consistent communication.
`;

  try {
    // ... existing API call logic with enhanced prompt ...
    
    // Parse the response and handle sequence actions
    const result = JSON.parse(cleanedResponse);
    
    // Execute any sequence actions automatically
    for (const action of result.recommendedActions) {
      if (['create_sequence', 'enroll_creator', 'modify_sequence'].includes(action.type)) {
        await executeSequenceAction(supabase, action, creator.id, brandId, userId);
      }
    }

    return result;
  } catch (error) {
    console.error('Error in AI analysis:', error);
    throw error;
  }
}

// New function to execute sequence actions
async function executeSequenceAction(
  supabase: any, 
  action: SequenceAction, 
  creatorId: string, 
  brandId: string, 
  userId: string
) {
  try {
    const sequencesApiUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/ugc/ai-coordinator/sequences`;
    
    switch (action.type) {
      case 'create_sequence':
        if (!action.sequenceData) throw new Error('Sequence data required for create_sequence');
        
        const createResponse = await fetch(sequencesApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create_sequence',
            ...action.sequenceData,
            brandId,
            isActive: true
          })
        });
        
        if (!createResponse.ok) {
          throw new Error(`Failed to create sequence: ${await createResponse.text()}`);
        }
        
        const { sequence } = await createResponse.json();
        
        // Auto-enroll the creator in the new sequence
        await fetch(sequencesApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'enroll_creator',
            creatorId,
            sequenceId: sequence.id,
            brandId,
            enrollmentTrigger: 'ai_coordinator_analysis',
            metadata: {
              analysis_reasoning: action.reasoning,
              created_by_ai: true
            }
          })
        });
        
        break;

      case 'enroll_creator':
        if (!action.enrollmentData) throw new Error('Enrollment data required for enroll_creator');
        
        await fetch(sequencesApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'enroll_creator',
            creatorId,
            brandId,
            ...action.enrollmentData
          })
        });
        
        break;

      case 'modify_sequence':
        if (!action.modificationData) throw new Error('Modification data required for modify_sequence');
        
        await fetch(sequencesApiUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.modificationData)
        });
        
        break;
    }

    // Log the sequence action
    await supabase
      .from('ugc_creator_communication_log')
      .insert({
        creator_id: creatorId,
        brand_id: brandId,
        log_type: 'ai_analysis',
        source: 'ai_coordinator',
        subject: `AI Sequence Action: ${action.type}`,
        content: action.description,
        metadata: {
          action_type: action.type,
          priority: action.priority,
          reasoning: action.reasoning,
          sequence_data: action.sequenceData,
          enrollment_data: action.enrollmentData,
          modification_data: action.modificationData
        },
        performed_by: userId
      });

    return { success: true, action: action.type };
  } catch (error) {
    console.error('Error executing sequence action:', error);
    return { success: false, error: error.message };
  }
}

// Enhanced function to get starter sequences for a brand
async function ensureStarterSequences(supabase: any, brandId: string, userId: string) {
  // Check if brand already has sequences
  const { data: existingSequences } = await supabase
    .from('ugc_email_sequences')
    .select('id')
    .eq('brand_id', brandId)
    .limit(1);

  if (!existingSequences || existingSequences.length === 0) {
    // Clone starter sequences for this brand
    const { data: cloneResult } = await supabase
      .rpc('clone_starter_sequences_for_brand', {
        target_brand_id: brandId,
        user_id: userId
      });

    return { sequencesCreated: cloneResult || 0 };
  }

  return { sequencesCreated: 0 };
}

// Function to get available sequences for AI decision making
async function getAvailableSequences(supabase: any, brandId: string) {
  const { data: sequences } = await supabase
    .from('ugc_email_sequences')
    .select(`
      id,
      name,
      description,
      trigger_event,
      trigger_conditions,
      is_active,
      ugc_email_sequence_steps (
        step_order,
        name,
        delay_days,
        delay_hours,
        custom_subject
      )
    `)
    .eq('brand_id', brandId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return sequences || [];
} 