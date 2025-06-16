import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export async function POST(request: NextRequest) {
  try {
    const { brandId, creatorId, status, conversationData } = await request.json();

    if (!brandId || !creatorId || !status) {
      return NextResponse.json({ 
        error: 'brandId, creatorId, and status are required' 
      }, { status: 400 });
    }

    const supabase = await createServerAdminClient();

    // Update creator status
    const { data: updatedCreator, error: updateError } = await supabase
      .from('ugc_creators')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
        // Store conversation metadata if provided
        custom_fields: conversationData ? {
          ai_conversation_active: true,
          last_ai_interaction: new Date().toISOString(),
          conversation_metadata: conversationData
        } : undefined
      })
      .eq('id', creatorId)
      .eq('brand_id', brandId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating creator status from n8n:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update creator status',
        details: updateError 
      }, { status: 500 });
    }

    console.log(`✅ Updated creator ${creatorId} status to "${status}" via n8n callback`);

    return NextResponse.json({
      success: true,
      message: `Creator status updated to ${status}`,
      creator: updatedCreator
    });

  } catch (error) {
    console.error('N8n status update API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 