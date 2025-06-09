import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export async function GET(
  request: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const { contractId } = params;

    if (!contractId || !token) {
      return NextResponse.json({ 
        error: 'Contract ID and token are required' 
      }, { status: 400 });
    }

    const supabase = await createServerAdminClient();

    // Get contract with share token verification
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .eq('share_token', token)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ 
        error: 'Contract not found or invalid token' 
      }, { status: 404 });
    }

    // Only allow download of completed contracts
    if (contract.status !== 'completed') {
      return NextResponse.json({ 
        error: 'Contract is not completed' 
      }, { status: 400 });
    }

    // Get the signed document or original document
    const documentData = contract.signed_document_data || contract.document_data;
    
    if (!documentData) {
      return NextResponse.json({ 
        error: 'Document not available' 
      }, { status: 404 });
    }

    // Convert Uint8Array to Buffer for response
    const buffer = Buffer.from(documentData);

    // Create response with PDF headers
    const response = new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${contract.document_name || 'contract.pdf'}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'private, no-cache',
      },
    });

    return response;

  } catch (error) {
    console.error('Error downloading contract:', error);
    return NextResponse.json({ 
      error: 'Failed to download contract' 
    }, { status: 500 });
  }
} 