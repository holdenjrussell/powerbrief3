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
    return NextResponse.json({ error: 'Progress not found' }, { status: 404 });
  }
  
  return NextResponse.json(progress);
} 