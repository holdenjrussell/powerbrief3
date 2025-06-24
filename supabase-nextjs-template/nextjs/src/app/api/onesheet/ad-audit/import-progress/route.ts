import { NextRequest, NextResponse } from 'next/server';
import { getImportProgress } from '@/lib/utils/importProgress';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestId = searchParams.get('requestId');
  
  if (!requestId) {
    return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
  }
  
  const progress = getImportProgress(requestId);
  
  if (!progress) {
    return NextResponse.json({ error: 'Progress not found' }, { status: 404 });
  }
  
  return NextResponse.json(progress);
} 