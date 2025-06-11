import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contractId');

    if (!contractId) {
      return NextResponse.json({ error: 'contractId is required' }, { status: 400 });
    }

    const supabase = await createServerAdminClient();

    // Get contract details
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single();

    if (contractError) {
      return NextResponse.json({ error: 'Contract not found', details: contractError }, { status: 404 });
    }

    // Get recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('contract_recipients')
      .select('*')
      .eq('contract_id', contractId);

    // Get creator details if linked
    let creator = null;
    if (contract.creator_id) {
      const { data: creatorData, error: creatorError } = await supabase
        .from('ugc_creators')
        .select('id, name, email, contract_status')
        .eq('id', contract.creator_id)
        .single();

      if (!creatorError) {
        creator = creatorData;
      }
    }

    return NextResponse.json({
      contract: {
        id: contract.id,
        title: contract.title,
        status: contract.status,
        creator_id: contract.creator_id,
        created_at: contract.created_at,
        completed_at: contract.completed_at
      },
      recipients: recipients?.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        status: r.status,
        signed_at: r.signed_at
      })),
      linked_creator: creator,
      debug_info: {
        has_creator_link: !!contract.creator_id,
        all_recipients_signed: recipients?.every(r => r.status === 'signed') || false,
        contract_completed: contract.status === 'completed'
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 