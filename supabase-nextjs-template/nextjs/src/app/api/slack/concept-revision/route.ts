import { NextRequest, NextResponse } from 'next/server';
import { sendConceptRevisionNotification } from '@/lib/utils/slackNotifications';

interface ConceptRevisionRequest {
  conceptId: string;
  conceptTitle: string;
  batchName: string;
  brandId: string;
  videoEditor?: string;
  feedback: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConceptRevisionRequest = await request.json();
    const { conceptId, conceptTitle, batchName, brandId, videoEditor, feedback } = body;

    if (!conceptId || !conceptTitle || !batchName || !brandId || !feedback) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create URLs for the notification
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const publicShareUrl = `${baseUrl}/app/reviews`; // Fallback to reviews page
    const reviewDashboardUrl = `${baseUrl}/app/reviews`;

    // Send Slack notification
    await sendConceptRevisionNotification({
      brandId,
      conceptId,
      conceptTitle,
      batchName,
      videoEditor,
      feedback,
      publicShareUrl,
      reviewDashboardUrl
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in concept revision notification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 