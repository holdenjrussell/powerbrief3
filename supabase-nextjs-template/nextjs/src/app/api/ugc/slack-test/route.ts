import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendUGCTestNotification } from '@/lib/services/ugcSlackService';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client
    const supabase = await createClient();

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { brandId } = body;

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    // Send test notification
    const result = await sendUGCTestNotification(brandId);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Test notification sent successfully' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to send test notification' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in UGC Slack test endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'An error occurred while sending the test notification'
    }, { status: 500 });
  }
}