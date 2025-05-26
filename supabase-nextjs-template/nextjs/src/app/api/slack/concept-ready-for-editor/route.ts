import { NextRequest, NextResponse } from 'next/server';
import { sendConceptReadyForEditorNotification } from '@/lib/utils/slackNotifications';

interface ConceptReadyForEditorRequest {
  conceptId: string;
  conceptTitle: string;
  batchName: string;
  brandId: string;
  assignedEditor?: string;
  assignedStrategist?: string;
  conceptShareUrl: string;
  batchShareUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConceptReadyForEditorRequest = await request.json();
    const { 
      conceptId, 
      conceptTitle, 
      batchName, 
      brandId, 
      assignedEditor, 
      assignedStrategist,
      conceptShareUrl,
      batchShareUrl
    } = body;

    if (!conceptId || !conceptTitle || !batchName || !brandId || !conceptShareUrl || !batchShareUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send Slack notification
    await sendConceptReadyForEditorNotification({
      brandId,
      conceptId,
      conceptTitle,
      batchName,
      assignedEditor,
      assignedStrategist,
      conceptShareUrl,
      batchShareUrl
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in concept ready for editor notification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 