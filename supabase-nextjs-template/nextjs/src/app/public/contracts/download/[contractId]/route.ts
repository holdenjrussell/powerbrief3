import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { Buffer } from 'buffer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const { contractId } = await params;

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
    const rawDocumentData = contract.signed_document_data || contract.document_data;
    
    if (!rawDocumentData) {
      return NextResponse.json({ 
        error: 'Document not available' 
      }, { status: 404 });
    }

    // Handle document_data parsing (same logic as verify-token and preview routes)
    let documentDataBuffer: Buffer;

    try {
      if (typeof rawDocumentData === 'string') {
        if (rawDocumentData.startsWith('\\x')) {
          // Hex-encoded data
          console.log('[public-download] Detected hex-encoded PDF data');
          const hexContent = rawDocumentData.substring(2);
          
          // First decode
          const decodedHex = Buffer.from(hexContent, 'hex');
          const decodedString = decodedHex.toString('utf-8');
          
          // Check if already valid PDF
          if (decodedString.startsWith('%PDF-')) {
            console.log('[public-download] Decoded hex is already a valid PDF');
            documentDataBuffer = decodedHex;
          } else if (decodedString.match(/^[0-9a-fA-F]+$/)) {
            // Double hex-encoded
            console.log('[public-download] Detected double hex-encoded data');
            const doubleDecodedHex = Buffer.from(decodedString, 'hex');
            const doubleDecodedString = doubleDecodedHex.toString('utf-8');
            
            if (doubleDecodedString.startsWith('%PDF-')) {
              console.log('[public-download] Double decoded hex is a valid PDF');
              documentDataBuffer = doubleDecodedHex;
            } else {
              throw new Error('Double decoded data is not a valid PDF');
            }
          } else {
            throw new Error('Unknown hex data format');
          }
        } else {
          throw new Error('Unrecognized string format for document data');
        }
      } else if (Buffer.isBuffer(rawDocumentData)) {
        console.log('[public-download] Data is already a Buffer');
        documentDataBuffer = rawDocumentData;
      } else if (rawDocumentData && typeof rawDocumentData === 'object' && 'length' in rawDocumentData && 'buffer' in rawDocumentData) {
        console.log('[public-download] Data is Uint8Array');
        documentDataBuffer = Buffer.from(rawDocumentData as Uint8Array);
      } else {
        throw new Error('Unhandled document data type: ' + typeof rawDocumentData);
      }
    } catch (error) {
      console.error('[public-download] Error processing document data:', error);
      return NextResponse.json({ 
        error: 'Failed to process document data' 
      }, { status: 500 });
    }

    const buffer = documentDataBuffer;

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