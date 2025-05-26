/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

interface AdBatch {
  id?: string;
  user_id?: string;
  brand_id: string;
  name: string;
  ad_account_id?: string | null;
  campaign_id?: string | null;
  ad_set_id?: string | null;
  fb_page_id?: string | null;
  ig_account_id?: string | null;
  pixel_id?: string | null;
  url_params?: string | null;
  destination_url?: string | null;
  call_to_action?: string | null;
  status?: string;
  primary_text?: string | null;
  headline?: string | null;
  description?: string | null;
  is_active?: boolean;
  last_accessed_at?: string;
  created_at?: string;
  updated_at?: string;
  // New Meta features
  site_links?: any;
  info_labels?: any;
  advantage_plus_creative?: any;
}

// GET - Fetch ad batches for a brand or user's active batch
export async function GET(req: NextRequest) {
  const supabase = await createSSRClient() as any;
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: 'User not authenticated.' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const brandId = url.searchParams.get('brandId');
    const active = url.searchParams.get('active');

    // If requesting active batch, return the user's most recent active batch
    if (active === 'true') {
      const { data: activeBatch, error: activeBatchError } = await supabase
        .from('ad_batches')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_accessed_at', { ascending: false })
        .limit(1);

      if (activeBatchError) {
        console.error('Error fetching active batch:', activeBatchError);
        return NextResponse.json({ message: 'Failed to fetch active batch.' }, { status: 500 });
      }

      return NextResponse.json(activeBatch || [], { status: 200 });
    }

    // If brandId is provided, get batches for that brand
    if (brandId) {
      const { data: batches, error: batchesError } = await supabase
        .from('ad_batches')
        .select('id, name, created_at, updated_at, last_accessed_at')
        .eq('brand_id', brandId)
        .eq('is_active', true)
        .order('last_accessed_at', { ascending: false });

      if (batchesError) {
        console.error('Error fetching ad batches:', batchesError);
        return NextResponse.json({ message: 'Failed to fetch ad batches.' }, { status: 500 });
      }

      return NextResponse.json({ 
        batches: batches || [],
        message: 'Ad batches fetched successfully'
      }, { status: 200 });
    }

    // If no brandId and not requesting active, get all user's batches
    const { data: allBatches, error: allBatchesError } = await supabase
      .from('ad_batches')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_accessed_at', { ascending: false });

    if (allBatchesError) {
      console.error('Error fetching all batches:', allBatchesError);
      return NextResponse.json({ message: 'Failed to fetch batches.' }, { status: 500 });
    }

    return NextResponse.json(allBatches || [], { status: 200 });

  } catch (error) {
    console.error('Error in ad-batches API:', error);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}

// POST - Create or update an ad batch
export async function POST(req: NextRequest) {
  const supabase = await createSSRClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ message: 'User not authenticated.' }, { status: 401 });
  }

  try {
    const batchData: AdBatch = await req.json();
    
    if (!batchData.brand_id) {
      return NextResponse.json({ message: 'Brand ID is required.' }, { status: 400 });
    }

    // Set default name if not provided
    if (!batchData.name) {
      batchData.name = `Ad Batch ${new Date().toLocaleDateString()}`;
    }

    // First, mark all other batches for this user as inactive
    await supabase
      .from('ad_batches' as any)
      .update({ is_active: false } as any)
      .eq('user_id', user.id);

    // Prepare the data for upsert
    const adBatchRow = {
      ...batchData,
      user_id: user.id,
      is_active: true,
      last_accessed_at: new Date().toISOString(),
    };

    let result;
    if (batchData.id) {
      // Update existing batch
      const { data: updatedBatch, error: updateError } = await supabase
        .from('ad_batches' as any)
        .update(adBatchRow as any)
        .eq('id', batchData.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      result = updatedBatch;
    } else {
      // Create new batch
      const { data: newBatch, error: insertError } = await supabase
        .from('ad_batches' as any)
        .insert(adBatchRow as any)
        .select()
        .single();

      if (insertError) throw insertError;
      result = newBatch;
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('[API AD_BATCHES POST] Catch Error:', errorMessage);
    return NextResponse.json({ message: 'Failed to save ad batch.', error: errorMessage }, { status: 500 });
  }
}

// DELETE - Delete an ad batch
export async function DELETE(req: NextRequest) {
  const supabase = await createSSRClient();
  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get('id');

  if (!batchId) {
    return NextResponse.json({ message: 'Batch ID is required.' }, { status: 400 });
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ message: 'User not authenticated.' }, { status: 401 });
  }

  try {
    const { error: deleteError } = await supabase
      .from('ad_batches' as any)
      .delete()
      .eq('id', batchId)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Ad batch deleted successfully.' }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    console.error('[API AD_BATCHES DELETE] Catch Error:', errorMessage);
    return NextResponse.json({ message: 'Failed to delete ad batch.', error: errorMessage }, { status: 500 });
  }
} 