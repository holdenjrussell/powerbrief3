import { NextRequest, NextResponse } from 'next/server';
import { getUgcAiCoordinator } from '@/lib/services/ugcAiCoordinator';
import { createSSRClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { coordinatorId, action } = await request.json();

    if (!coordinatorId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const ugcAiCoordinator = getUgcAiCoordinator();
    const supabase = await createSSRClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate email preview without sending
    const emailContent = await ugcAiCoordinator.generateEmail(coordinatorId, {
      creator: action.creator,
      brand: action.brand,
      script: action.script,
      purpose: action.emailTemplate || 'Follow-up communication',
      tone: 'friendly',
      includeElements: action.includeElements || []
    });

    return NextResponse.json({
      success: true,
      preview: {
        subject: emailContent.subject,
        htmlContent: emailContent.htmlContent,
        textContent: emailContent.textContent,
        reasoning: emailContent.reasoning,
        recipient: {
          name: action.creator.name,
          email: action.creator.email
        }
      }
    });

  } catch (error) {
    console.error('Email preview error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate email preview' },
      { status: 500 }
    );
  }
} 