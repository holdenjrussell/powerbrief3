import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function DELETE(
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
      return NextResponse.json({ 
        error: 'Contract ID is required' 
      }, { status: 400 });
    }

    // Verify user owns this contract
    const { data: existingContract, error: contractError } = await supabase
      .from('contracts')
      .select('id, brand_id, status')
      .eq('id', contractId)
      .eq('user_id', user.id)
      .single();

    if (contractError || !existingContract) {
      return NextResponse.json({ 
        error: 'Contract not found or access denied' 
      }, { status: 404 });
    }

    // Note: Allowing deletion of completed contracts for data management purposes

    // Delete contract recipients first (due to foreign key constraints)
    const { error: recipientsDeleteError } = await supabase
      .from('contract_recipients')
      .delete()
      .eq('contract_id', contractId);

    if (recipientsDeleteError) {
      console.error('Error deleting contract recipients:', recipientsDeleteError);
      // Continue with deletion since this might not be critical
    }

    // Delete the contract
    const { error: deleteError } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractId);

    if (deleteError) {
      throw new Error(`Failed to delete contract: ${deleteError.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Contract deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting contract:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete contract' 
    }, { status: 500 });
  }
}

export async function GET(
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
      return NextResponse.json({ 
        error: 'Contract ID is required' 
      }, { status: 400 });
    }

    // Get contract data
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        recipients:contract_recipients(*),
        template:contract_templates(title)
      `)
      .eq('id', contractId)
      .eq('user_id', user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ 
        error: 'Contract not found or access denied' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      contract: {
        ...contract,
        // Don't send large document data unless specifically requested
        document_data: undefined,
        signed_document_data: undefined,
      }
    });

  } catch (error) {
    console.error('Error fetching contract:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch contract' 
    }, { status: 500 });
  }
} 