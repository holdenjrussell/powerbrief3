import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateDefaultSystemInstructions } from '@/lib/services/ugcCreatorService';

// This endpoint returns the default system instructions for the UGC script generation
export async function GET() {
  // Create Supabase client for auth check
  const supabase = await createClient();

  // Ensure user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the system instructions from the service
    const systemInstructions = generateDefaultSystemInstructions();

    return NextResponse.json({ systemInstructions });
  } catch (error: unknown) {
    console.error('Error serving system instructions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: `Failed to get system instructions: ${errorMessage}`
    }, { status: 500 });
  }
} 