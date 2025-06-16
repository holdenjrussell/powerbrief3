import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/types/supabase';

// Create a Supabase client with the service role key for admin access
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { conceptId, targetBatchId } = await request.json();

    // Validate required fields
    if (!conceptId || !targetBatchId) {
      return NextResponse.json(
        { error: 'Missing required fields: conceptId and targetBatchId' },
        { status: 400 }
      );
    }

    // Verify target batch exists
    const { data: targetBatch, error: batchError } = await supabaseAdmin
      .from('brief_batches')
      .select('id, name')
      .eq('id', targetBatchId)
      .single();

    if (batchError || !targetBatch) {
      console.error('Target batch not found:', batchError);
      return NextResponse.json(
        { error: 'Target batch not found' },
        { status: 404 }
      );
    }

    // Move the concept to the target batch
    const { data: updatedConcept, error: moveError } = await supabaseAdmin
      .from('brief_concepts')
      .update({
        brief_batch_id: targetBatchId,
        updated_at: new Date().toISOString()
      })
      .eq('id', conceptId)
      .select()
      .single();

    if (moveError) {
      console.error('Error moving concept to batch:', moveError);
      return NextResponse.json(
        { error: 'Failed to move concept to batch' },
        { status: 500 }
      );
    }

    console.log('✅ Concept moved successfully:', conceptId, 'to batch:', targetBatchId);

    return NextResponse.json({
      success: true,
      concept: updatedConcept
    });

  } catch (error) {
    console.error('Error moving concept to batch:', error);
    return NextResponse.json(
      { error: 'Failed to move concept to batch' },
      { status: 500 }
    );
  }
} 