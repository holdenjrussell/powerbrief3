import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { batchId, allowNewConcepts } = await request.json();

    // Validate required fields
    if (!batchId || typeof allowNewConcepts !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: batchId and allowNewConcepts' },
        { status: 400 }
      );
    }

    // Create authenticated Supabase client
    const supabase = await createSSRClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Updating batch settings:', { batchId, allowNewConcepts, userId: user.id });

    // Update the batch with the new setting
    const updateData = {
      allow_new_concepts: allowNewConcepts,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('brief_batches')
      .update(updateData)
      .eq('id', batchId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating batch settings:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to update batch settings', 
          details: error.message,
          code: error.code 
        },
        { status: 500 }
      );
    }

    console.log('✅ Batch settings updated successfully:', data);

    return NextResponse.json({
      success: true,
      batch: data
    });

  } catch (error) {
    console.error('Error updating batch settings:', error);
    return NextResponse.json(
      { error: 'Failed to update batch settings' },
      { status: 500 }
    );
  }
} 