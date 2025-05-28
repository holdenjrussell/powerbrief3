import { NextRequest, NextResponse } from 'next/server';
import { sendBriefRevisionsNeededNotification } from '@/lib/utils/slackNotifications';

export async function POST(request: NextRequest) {
    try {
        const {
            conceptId,
            conceptTitle,
            batchName,
            brandId,
            assignedStrategist,
            assignedCreativeCoordinator,
            briefRevisionComments,
            conceptShareUrl,
            batchShareUrl
        } = await request.json();

        // Validate required fields
        if (!conceptId || !conceptTitle || !batchName || !brandId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Send Slack notification
        await sendBriefRevisionsNeededNotification({
            brandId,
            conceptId,
            conceptTitle,
            batchName,
            assignedStrategist,
            assignedCreativeCoordinator,
            briefRevisionComments,
            conceptShareUrl,
            batchShareUrl
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error sending brief revisions needed notification:', error);
        return NextResponse.json(
            { error: 'Failed to send notification' },
            { status: 500 }
        );
    }
} 