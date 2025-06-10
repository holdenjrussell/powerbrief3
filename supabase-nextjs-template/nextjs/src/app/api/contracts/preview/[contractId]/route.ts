import { NextRequest, NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { Buffer } from 'buffer';

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
    const rawDocumentData = contract.signed_document_data || contract.document_data;
    
    if (!rawDocumentData) {
      return NextResponse.json({ 
        error: 'Document not available' 
      }, { status: 404 });
    }

    // Handle document_data parsing (same logic as verify-token route)
    let documentDataBuffer: Buffer;

    try {
      console.log('[preview] Processing document data, type:', typeof rawDocumentData);
      console.log('[preview] Data starts with:', typeof rawDocumentData === 'string' ? rawDocumentData.substring(0, 50) : 'not string');
      
      if (typeof rawDocumentData === 'string') {
        if (rawDocumentData.startsWith('\\x')) {
          // Hex-encoded data
          console.log('[preview] Detected hex-encoded PDF data');
          const hexContent = rawDocumentData.substring(2);
          console.log('[preview] Hex content length:', hexContent.length);
          
          // First decode
          const decodedHex = Buffer.from(hexContent, 'hex');
          const decodedString = decodedHex.toString('latin1'); // Use latin1 for binary data
          console.log('[preview] Decoded string starts with:', decodedString.substring(0, 20));
          
          // Check if already valid PDF
          if (decodedString.startsWith('%PDF-')) {
            console.log('[preview] Decoded hex is already a valid PDF');
            documentDataBuffer = decodedHex;
          } else if (decodedString.match(/^[0-9a-fA-F]+$/)) {
            // Double hex-encoded
            console.log('[preview] Detected double hex-encoded data');
            const doubleDecodedHex = Buffer.from(decodedString, 'hex');
            const doubleDecodedString = doubleDecodedHex.toString('latin1');
            console.log('[preview] Double decoded string starts with:', doubleDecodedString.substring(0, 20));
            
            if (doubleDecodedString.startsWith('%PDF-')) {
              console.log('[preview] Double decoded hex is a valid PDF');
              documentDataBuffer = doubleDecodedHex;
            } else {
              console.error('[preview] Double decoded data is not a valid PDF, starts with:', doubleDecodedString.substring(0, 50));
              throw new Error('Double decoded data is not a valid PDF');
            }
          } else {
            // Try direct binary interpretation
            console.log('[preview] Trying direct binary interpretation');
            if (decodedHex.length > 4 && decodedHex.readUInt32BE(0) === 0x25504446) { // %PDF in hex
              console.log('[preview] Found PDF header in binary data');
              documentDataBuffer = decodedHex;
            } else {
              console.error('[preview] Unknown hex data format, first 50 chars of decoded:', decodedString.substring(0, 50));
              console.error('[preview] First 20 bytes as hex:', decodedHex.subarray(0, 20).toString('hex'));
              throw new Error('Unknown hex data format');
            }
          }
        } else if (rawDocumentData.startsWith('%PDF-')) {
          // Direct PDF string
          console.log('[preview] Direct PDF string detected');
          documentDataBuffer = Buffer.from(rawDocumentData, 'latin1');
        } else {
          console.error('[preview] Unrecognized string format, starts with:', rawDocumentData.substring(0, 50));
          throw new Error('Unrecognized string format for document data');
        }
      } else if (Buffer.isBuffer(rawDocumentData)) {
        console.log('[preview] Data is already a Buffer');
        documentDataBuffer = rawDocumentData;
      } else if (rawDocumentData && typeof rawDocumentData === 'object' && 'length' in rawDocumentData && 'buffer' in rawDocumentData) {
        console.log('[preview] Data is Uint8Array');
        documentDataBuffer = Buffer.from(rawDocumentData as Uint8Array);
      } else {
        console.error('[preview] Unhandled document data type:', typeof rawDocumentData);
        throw new Error('Unhandled document data type: ' + typeof rawDocumentData);
      }
      
      console.log('[preview] Final buffer length:', documentDataBuffer.length);
      console.log('[preview] Buffer starts with PDF header:', documentDataBuffer.toString('latin1', 0, 5) === '%PDF-');
    } catch (error) {
      console.error('[preview] Error processing document data:', error);
      return NextResponse.json({ 
        error: 'Failed to process document data' 
      }, { status: 500 });
    }

    const buffer = documentDataBuffer;

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