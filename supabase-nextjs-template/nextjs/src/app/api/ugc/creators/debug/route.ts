import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');
    const brandId = searchParams.get('brandId');

    const supabase = await createServerAdminClient();

    if (creatorId) {
      // Get specific creator
      const { data: creator, error: creatorError } = await supabase
        .from('ugc_creators')
        .select('*')
        .eq('id', creatorId)
        .single();

      if (creatorError) {
        return NextResponse.json({ error: 'Creator not found', details: creatorError }, { status: 404 });
      }

      // Get contracts linked to this creator
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          id,
          title,
          status,
          creator_id,
          created_at,
          completed_at,
          contract_recipients(id, name, email, status, signed_at)
        `)
        .eq('creator_id', creatorId);

      return NextResponse.json({
        creator: {
          id: creator.id,
          name: creator.name,
          email: creator.email,
          contract_status: creator.contract_status,
          updated_at: creator.updated_at,
          created_at: creator.created_at
        },
        linked_contracts: contracts || [],
        debug_info: {
          has_contracts: (contracts?.length || 0) > 0,
          contract_count: contracts?.length || 0
        }
      });

    } else if (brandId) {
      // Get all creators for a brand
      const { data: creators, error: creatorsError } = await supabase
        .from('ugc_creators')
        .select('id, name, email, contract_status, updated_at, created_at')
        .eq('brand_id', brandId)
        .order('updated_at', { ascending: false });

      if (creatorsError) {
        return NextResponse.json({ error: 'Failed to fetch creators', details: creatorsError }, { status: 500 });
      }

      return NextResponse.json({
        creators: creators || [],
        debug_info: {
          total_creators: creators?.length || 0,
          contract_statuses: creators?.reduce((acc: Record<string, number>, creator) => {
            const status = creator.contract_status || 'null';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {})
        }
      });

    } else {
      return NextResponse.json({ 
        error: 'Either creatorId or brandId parameter is required' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('UGC Creators Debug API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// POST endpoint to manually update a creator's contract status for testing
export async function POST(request: NextRequest) {
  try {
    const { creatorId, contractStatus } = await request.json();

    if (!creatorId || !contractStatus) {
      return NextResponse.json({ 
        error: 'creatorId and contractStatus are required' 
      }, { status: 400 });
    }

    const validStatuses = ['not signed', 'contract sent', 'contract signed'];
    if (!validStatuses.includes(contractStatus)) {
      return NextResponse.json({ 
        error: `Invalid contract status. Must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }

    const supabase = await createServerAdminClient();

    const { data, error } = await supabase
      .from('ugc_creators')
      .update({ 
        contract_status: contractStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', creatorId)
      .select('id, name, contract_status, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to update creator contract status', 
        details: error 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Creator contract status updated to '${contractStatus}'`,
      updated_creator: data
    });

  } catch (error) {
    console.error('UGC Creators Update API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 