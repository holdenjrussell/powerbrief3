import { NextRequest, NextResponse } from 'next/server';
import { sendConceptRejectionNotification } from '@/lib/utils/slackNotifications';
import { shareBriefConcept, shareBriefBatch } from '@/lib/services/powerbriefService';

interface ConceptRejectionRequest {
  conceptId: string;
  conceptTitle: string;
  batchName: string;
  brandId: string;
  videoEditor?: string;
  strategist?: string;
  rejectionReason?: string;
  batchId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConceptRejectionRequest = await request.json();
    const { 
      conceptId, 
      conceptTitle, 
      batchName, 
      brandId, 
      videoEditor, 
      strategist, 
      rejectionReason,
      batchId
    } = body;

    if (!conceptId || !conceptTitle || !batchName || !brandId || !batchId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create share links for the concept and batch
    const conceptShareSettings = {
      is_editable: false, // View-only for rejected concepts
      expires_at: null
    };
    
    const batchShareSettings = {
      is_editable: true,
      expires_at: null
    };
    
    const [conceptShareResult, batchShareResult] = await Promise.all([
      shareBriefConcept(conceptId, 'link', conceptShareSettings),
      shareBriefBatch(batchId, 'link', batchShareSettings)
    ]);

    // Send Slack notification
    await sendConceptRejectionNotification({
      brandId,
      conceptId,
      conceptTitle,
      batchName,
      videoEditor,
      strategist,
      rejectionReason,
      conceptShareUrl: conceptShareResult.share_url,
      batchShareUrl: batchShareResult.share_url
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in concept rejection notification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 