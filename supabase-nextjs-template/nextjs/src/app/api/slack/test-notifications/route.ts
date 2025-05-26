import { NextRequest, NextResponse } from 'next/server';
import { 
  sendConceptSubmissionNotification, 
  sendConceptRevisionNotification, 
  sendConceptApprovalNotification,
  sendConceptReadyForEditorNotification
} from '@/lib/utils/slackNotifications';

export async function POST(request: NextRequest) {
  try {
    const { brandId, notificationType } = await request.json();

    if (!brandId || !notificationType) {
      return NextResponse.json(
        { error: 'Missing brandId or notificationType' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const testData = {
      brandId,
      conceptId: 'test-concept-123',
      conceptTitle: 'Test Product Demo Video',
      batchName: 'Test Summer Campaign',
      videoEditor: 'Test Creator',
      publicShareUrl: `${baseUrl}/app/reviews`,
      reviewDashboardUrl: `${baseUrl}/app/reviews`,
      uploadToolUrl: `${baseUrl}/app/ad-upload-tool`
    };

    switch (notificationType) {
      case 'submission':
        await sendConceptSubmissionNotification({
          ...testData,
          reviewLink: 'https://frame.io/test-link',
          hasUploadedAssets: false
        });
        break;

      case 'submission-assets':
        await sendConceptSubmissionNotification({
          ...testData,
          reviewLink: undefined,
          hasUploadedAssets: true
        });
        break;

      case 'revision':
        await sendConceptRevisionNotification({
          ...testData,
          feedback: 'Please adjust the lighting in the first scene and make the call-to-action more prominent. The overall concept is great, but these small changes will make it perfect for our campaign.'
        });
        break;

      case 'approval':
        await sendConceptApprovalNotification({
          ...testData,
          reviewerNotes: 'Excellent work! The lighting looks perfect now and the call-to-action is very compelling. Ready for Meta upload.'
        });
        break;

      case 'ready-for-editor':
        await sendConceptReadyForEditorNotification({
          brandId,
          conceptId: 'test-concept-123',
          conceptTitle: 'Test Product Demo Video',
          batchName: 'Test Summer Campaign',
          assignedEditor: 'John Doe',
          assignedStrategist: 'Jane Smith',
          conceptShareUrl: `${baseUrl}/public/concept/test-share-123/test-concept-123`,
          batchShareUrl: `${baseUrl}/public/batch/test-batch-456`
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid notification type. Use: submission, submission-assets, revision, approval, or ready-for-editor' },
          { status: 400 }
        );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Test ${notificationType} notification sent successfully` 
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
} 