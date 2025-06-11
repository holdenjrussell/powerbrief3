import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');
    const creatorEmail = searchParams.get('creatorEmail');

    if (!creatorId && !creatorEmail) {
      return NextResponse.json({ error: 'creatorId or creatorEmail is required' }, { status: 400 });
    }

    const supabase = await createServerAdminClient();

    // Get creator details
    let query = supabase
      .from('ugc_creators')
      .select('id, name, email, contract_status, updated_at, created_at');

    if (creatorId) {
      query = query.eq('id', creatorId);
    } else if (creatorEmail) {
      query = query.eq('email', creatorEmail);
    }

    const { data: creator, error: creatorError } = await query.single();

    if (creatorError) {
      return NextResponse.json({ error: 'Creator not found', details: creatorError }, { status: 404 });
    }

    // Get related contracts if any
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id, title, status, creator_id, created_at, completed_at')
      .eq('creator_id', creator.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      creator: {
        id: creator.id,
        name: creator.name,
        email: creator.email,
        contract_status: creator.contract_status,
        created_at: creator.created_at,
        updated_at: creator.updated_at
      },
      related_contracts: contracts || [],
      debug_info: {
        has_contracts: (contracts?.length || 0) > 0,
        completed_contracts: contracts?.filter(c => c.status === 'completed').length || 0,
        total_contracts: contracts?.length || 0
      }
    });

  } catch (error) {
    console.error('Check creator status API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { creatorId, contractStatus } = await request.json();

    if (!creatorId || !contractStatus) {
      return NextResponse.json({ error: 'creatorId and contractStatus are required' }, { status: 400 });
    }

    const validStatuses = ['not signed', 'contract sent', 'contract signed'];
    if (!validStatuses.includes(contractStatus)) {
      return NextResponse.json({ 
        error: 'Invalid contract status', 
        validStatuses 
      }, { status: 400 });
    }

    const supabase = await createServerAdminClient();

    // Update the creator's contract status
    const { data: updatedCreator, error: updateError } = await supabase
      .from('ugc_creators')
      .update({ 
        contract_status: contractStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', creatorId)
      .select('id, name, email, contract_status, updated_at')
      .single();

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update creator status', 
        details: updateError 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Creator contract status updated successfully',
      creator: updatedCreator
    });

  } catch (error) {
    console.error('Update creator status API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 