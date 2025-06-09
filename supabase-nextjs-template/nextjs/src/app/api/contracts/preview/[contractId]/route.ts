import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const supabase = await createSSRClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { contractId } = params;

    if (!contractId) {
      return NextResponse.json({ 
        error: 'Contract ID is required' 
      }, { status: 400 });
    }

    // Get contract data - verify user has access to this brand's contracts
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*, brand:brands!inner(id, name)')
      .eq('id', contractId)
      .eq('user_id', user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ 
        error: 'Contract not found or access denied' 
      }, { status: 404 });
    }

    // Get the document data
    const documentData = contract.signed_document_data || contract.document_data;
    
    if (!documentData) {
      return NextResponse.json({ 
        error: 'Document not available' 
      }, { status: 404 });
    }

    // Convert Uint8Array to Buffer for response
    const buffer = Buffer.from(documentData);

    // Create response with PDF headers for inline viewing
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${contract.document_name || 'contract.pdf'}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });

    return response;

  } catch (error) {
    console.error('Error previewing contract:', error);
    return NextResponse.json({ 
      error: 'Failed to preview contract' 
    }, { status: 500 });
  }
} 