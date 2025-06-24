import { NextRequest, NextResponse } from 'next/server';
import { getAnalyzeProgress } from '@/lib/utils/analyzeProgress';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestId = searchParams.get('requestId');
  
  if (!requestId) {
    return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
  }
  
  const progress = getAnalyzeProgress(requestId);
  
  if (!progress) {
    // Return a valid progress object with 0% instead of 404
    // This is more graceful for polling clients
    return NextResponse.json({
      progress: 0,
      message: 'Waiting for analysis to start...',
      currentAd: 0,
      totalAds: 0
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
  
  return NextResponse.json(progress, {
    headers: {
      'Content-Type': 'application/json',
    }
  });
} 