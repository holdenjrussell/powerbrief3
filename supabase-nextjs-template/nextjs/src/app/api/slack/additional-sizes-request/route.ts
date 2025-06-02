import { NextRequest, NextResponse } from 'next/server';
import { sendAdditionalSizesRequestNotification } from '@/lib/utils/slackNotifications';
import { shareBriefConcept } from '@/lib/services/powerbriefService';

interface AdditionalSizesRequest {
  conceptId: string;
  conceptTitle: string;
  batchName: string;
  brandId: string;
  videoEditor?: string;
  additionalSizesNotes: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AdditionalSizesRequest = await request.json();
    const { conceptId, conceptTitle, batchName, brandId, videoEditor, additionalSizesNotes } = body;

    if (!conceptId || !conceptTitle || !batchName || !brandId || !additionalSizesNotes) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create URLs for the notification
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const reviewDashboardUrl = `${baseUrl}/app/reviews`;

    // Create a public share link for the concept
    let publicShareUrl = `${baseUrl}/app/reviews`; // Fallback
    try {
      const shareSettings = {
        is_editable: true, // Allow editing for additional uploads
        expires_at: null // No expiration
      };
      
      const shareResult = await shareBriefConcept(conceptId, 'link', shareSettings);
      publicShareUrl = shareResult.share_url;
    } catch (shareError) {
      console.error('Failed to create share link for additional sizes request:', shareError);
      // Continue with fallback URL if share creation fails
    }

    // Send Slack notification
    await sendAdditionalSizesRequestNotification({
      brandId,
      conceptId,
      conceptTitle,
      batchName,
      videoEditor,
      additionalSizesNotes,
      publicShareUrl,
      reviewDashboardUrl
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in additional sizes request notification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 