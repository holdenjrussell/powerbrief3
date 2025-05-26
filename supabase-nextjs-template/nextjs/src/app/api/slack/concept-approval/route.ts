import { NextRequest, NextResponse } from 'next/server';
import { sendConceptApprovalNotification } from '@/lib/utils/slackNotifications';

interface ConceptApprovalRequest {
  conceptId: string;
  conceptTitle: string;
  batchName: string;
  brandId: string;
  videoEditor?: string;
  reviewerNotes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConceptApprovalRequest = await request.json();
    const { conceptId, conceptTitle, batchName, brandId, videoEditor, reviewerNotes } = body;

    if (!conceptId || !conceptTitle || !batchName || !brandId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create URLs for the notification
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const publicShareUrl = `${baseUrl}/app/reviews`; // Fallback to reviews page
    const uploadToolUrl = `${baseUrl}/app/ad-upload-tool`;

    // Send Slack notification
    await sendConceptApprovalNotification({
      brandId,
      conceptId,
      conceptTitle,
      batchName,
      videoEditor,
      reviewerNotes,
      publicShareUrl,
      uploadToolUrl
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in concept approval notification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 