import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { ContractService } from '@/lib/services/contractService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { contractId } = await params;

    if (!contractId) {
      return NextResponse.json({ error: 'Contract ID is required' }, { status: 400 });
    }

    const contractService = ContractService.getInstance();
    await contractService.sendContract(contractId, user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Contract sent successfully' 
    });

  } catch (error) {
    console.error('Error sending contract:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to send contract' 
    }, { status: 500 });
  }
} 