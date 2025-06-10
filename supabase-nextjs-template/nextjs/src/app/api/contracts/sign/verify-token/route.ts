import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { Buffer } from 'buffer'; // Needed for Base64 conversion

interface VerifyTokenRequest {
  contractId: string;
  token: string;
}

// Define structure for fields - this should align with how fields are stored
interface SigningFieldData {
  id: string;
  type: string;
  page: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  placeholder?: string;
  // Add any other relevant properties like value (if prefilled), options (for dropdowns), etc.
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as VerifyTokenRequest;
    const { contractId, token } = body;

    if (!contractId || !token) {
      return NextResponse.json({ error: 'Contract ID and token are required' }, { status: 400 });
    }

    const supabase = await createServerAdminClient();

    // 1. Verify the token
    console.log('[verify-token] Looking for token:', { contractId, token: token.substring(0, 10) + '...' });
    
    // First, let's check if there are multiple tokens
    const { data: allTokens, error: checkError } = await supabase
      .from('contract_signing_tokens')
      .select('id, recipient_id, expires_at, used_at')
      .eq('contract_id', contractId)
      .eq('token', token);
    
    console.log('[verify-token] Found tokens:', allTokens?.length || 0);
    
    if (checkError) {
      console.error('Token check error:', checkError.message);
      return NextResponse.json({ error: 'Error checking signing link.' }, { status: 500 });
    }
    
    if (!allTokens || allTokens.length === 0) {
      console.error('No tokens found for contract:', contractId);
      return NextResponse.json({ error: 'Invalid or expired signing link (token not found).' }, { status: 401 });
    }
    
    if (allTokens.length > 1) {
      console.warn('[verify-token] Multiple tokens found, using the first one');
    }
    
    const tokenData = allTokens[0];

    if (tokenData.used_at) {
      return NextResponse.json({ error: 'This signing link has already been used.' }, { status: 403 });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This signing link has expired.' }, { status: 403 });
    }

    const recipientId = tokenData.recipient_id;

    // 2. Fetch contract details (document data and name)
    // Assuming document_data is stored as bytea which Supabase client might return as a string or handle differently.
    // We need to ensure it's properly fetched and then base64 encoded for JSON transport.
    const { data: contractDetails, error: contractError } = await supabase
      .from('contracts') // Make sure this is your actual contracts table name
      .select('document_name, document_data') // document_data is of type 'bytea'
      .eq('id', contractId)
      .single();

    if (contractError || !contractDetails || !contractDetails.document_data) {
      console.error('Contract fetch error or document_data missing:', contractError?.message);
      return NextResponse.json({ error: 'Could not retrieve contract document.' }, { status: 404 });
    }

    // Log raw data from Supabase
    console.log('[verify-token] Raw contractDetails.document_data type:', typeof contractDetails.document_data);
    if (typeof contractDetails.document_data === 'string') {
      console.log('[verify-token] Raw contractDetails.document_data (string, first 100 chars):', (contractDetails.document_data as string).substring(0, 100));
    } else if (contractDetails.document_data && typeof (contractDetails.document_data as { data?: unknown[] }).data === 'object' && Array.isArray((contractDetails.document_data as { data: unknown[] }).data) ) {
      console.log('[verify-token] Raw contractDetails.document_data (object with data array, first 10 elements):', (contractDetails.document_data as { data: unknown[] }).data.slice(0,10));
    } else {
      console.log('[verify-token] Raw contractDetails.document_data (other type or structure):', contractDetails.document_data);
    }

    // Handle document_data from Supabase
    let documentDataBuffer: Buffer;
    const rawDocumentData = contractDetails.document_data as unknown;
    
    console.log('[verify-token] Initial rawDocumentData type:', typeof rawDocumentData);
    if (typeof rawDocumentData === 'string') {
      console.log('[verify-token] rawDocumentData (string, first 200 chars for inspection):', rawDocumentData.substring(0, 200));
    }

    try {
      if (typeof rawDocumentData === 'string') {
        let jsonStringToParse: string | null = null;

        if (rawDocumentData.startsWith('\\x{') && rawDocumentData.endsWith('}')) {
          // Format: "\x{"0":37,...}" - remove \x prefix
          jsonStringToParse = rawDocumentData.substring(2);
          console.log('[verify-token] Detected format: \\x{...}, extracted JSON string (first 200 chars):', jsonStringToParse.substring(0,200));
        } else if (rawDocumentData.trim().startsWith('{') && rawDocumentData.trim().endsWith('}')) {
          // Format: "{"0":37,...}" - direct JSON string
          jsonStringToParse = rawDocumentData;
          console.log('[verify-token] Detected format: {...}, direct JSON string (first 200 chars):', jsonStringToParse.substring(0,200));
        } else if (rawDocumentData.startsWith('\\x')) {
            // New correct format: \x + hex string
            console.log('[verify-token] Detected new format: \\x prefixed hex string.');
            const hexContent = rawDocumentData.substring(2);
            
            // First, try to decode the hex string to get the actual content
            const decodedHex = Buffer.from(hexContent, 'hex');
            const decodedString = decodedHex.toString('utf-8');
            
            console.log('[verify-token] Decoded hex string (first 100 chars):', decodedString.substring(0, 100));
            
            // Check if the decoded hex is already a valid PDF
            if (decodedString.startsWith('%PDF-')) {
                console.log('[verify-token] Decoded hex is already a valid PDF. Using directly.');
                documentDataBuffer = decodedHex;
                console.log('[verify-token] PDF header check:', documentDataBuffer.slice(0, 5).toString('utf-8'));
            } else if (decodedString.match(/^[0-9a-fA-F]+$/)) {
                // Double hex-encoded data - decode the hex string again
                console.log('[verify-token] Detected double hex-encoded data. Decoding again...');
                try {
                    const doubleDecodedHex = Buffer.from(decodedString, 'hex');
                    const doubleDecodedString = doubleDecodedHex.toString('utf-8');
                    console.log('[verify-token] Double decoded string (first 50 chars):', doubleDecodedString.substring(0, 50));
                    
                    if (doubleDecodedString.startsWith('%PDF-')) {
                        console.log('[verify-token] Double decoded hex is a valid PDF. Using it.');
                        documentDataBuffer = doubleDecodedHex;
                        console.log('[verify-token] PDF header check:', documentDataBuffer.slice(0, 5).toString('utf-8'));
                    } else {
                        throw new Error('Double decoded data is not a valid PDF');
                    }
                } catch (e) {
                    console.error('[verify-token] Failed to double decode hex:', e);
                    throw new Error('Failed to decode double hex-encoded data');
                }
            } else if (decodedString.match(/^[A-Za-z0-9+/]+=*$/) && decodedString.length > 100) {
                // Only treat as Base64 if it's a long string of valid Base64 characters
                console.log('[verify-token] Detected Base64 data in hex encoding. Decoding Base64...');
                try {
                    documentDataBuffer = Buffer.from(decodedString, 'base64');
                    console.log('[verify-token] Successfully decoded Base64. PDF header check:', documentDataBuffer.slice(0, 5).toString('utf-8'));
                } catch (e) {
                    console.error('[verify-token] Failed to decode as Base64:', e);
                    throw new Error('Failed to decode Base64 data from hex');
                }
            } else if (decodedString.startsWith('{')) {
                console.log('[verify-token] Detected JSON encoding in hex. Checking format...');
                
                // Check if it's a Buffer JSON representation
                if (decodedString.includes('"type":"Buffer"') && decodedString.includes('"data":[')) {
                    console.log('[verify-token] Detected Buffer JSON format. Parsing...');
                    const bufferJson = JSON.parse(decodedString) as { type: string; data: number[] };
                    if (bufferJson.type === 'Buffer' && Array.isArray(bufferJson.data)) {
                        documentDataBuffer = Buffer.from(bufferJson.data);
                        console.log('[verify-token] Successfully decoded Buffer JSON. PDF header check:', documentDataBuffer.slice(0, 5).toString('utf-8'));
                    } else {
                        throw new Error('Invalid Buffer JSON format');
                    }
                } else if (decodedString.includes('"0":')) {
                    // Old format with numeric keys
                    console.log('[verify-token] Detected numeric key JSON format. Parsing...');
                    const parsedObject = JSON.parse(decodedString) as Record<string, number>;
                    const numericKeys = Object.keys(parsedObject).map(Number).sort((a, b) => a - b);
                    const byteArray = numericKeys.map(key => parsedObject[String(key)]);
                    documentDataBuffer = Buffer.from(Uint8Array.from(byteArray));
                    console.log('[verify-token] Successfully decoded numeric key JSON. PDF header check:', documentDataBuffer.slice(0, 5).toString('utf-8'));
                } else {
                    throw new Error('Unknown JSON format in hex data');
                }
            } else {
                // Direct hex decoding (raw binary data)
                console.log('[verify-token] Treating as direct binary data from hex.');
                documentDataBuffer = decodedHex;
                if (!(documentDataBuffer.length > 4 && documentDataBuffer.slice(0, 5).toString('utf-8') === '%PDF-')) {
                    console.warn('[verify-token] Direct hex decoding did NOT result in a valid PDF header.');
                }
            }
        } else {
          console.error('[verify-token] Unrecognized string format for document_data:', rawDocumentData.substring(0, 200));
          throw new Error('Unrecognized string format for document data.');
        }

        if (jsonStringToParse) { // If old format was detected and jsonStringToParse is set
            const parsedObject = JSON.parse(jsonStringToParse) as Record<string, number>;
            if (typeof parsedObject === 'object' && parsedObject !== null && Object.keys(parsedObject).every(k => !isNaN(parseInt(k)))) {
                const numericKeys = Object.keys(parsedObject).map(Number).sort((a, b) => a - b);
                const byteArray = numericKeys.map(key => parsedObject[String(key)]);
                // Log byteArray content for diagnosis
                console.log('[verify-token] Constructed byteArray (first 10 elements):', byteArray.slice(0, 10));
                console.log('[verify-token] Expected first few byte values (e.g., 37, 80, 68, 70 for %PDF):', byteArray[0], byteArray[1], byteArray[2], byteArray[3]);
                
                documentDataBuffer = Buffer.from(Uint8Array.from(byteArray));
                console.log('[verify-token] Successfully parsed JSON string (old format) into Buffer. Length:', documentDataBuffer.length);
            } else {
                throw new Error('Parsed JSON string, but it was not the expected byte map object.');
            }
        } 
        // If !jsonStringToParse and no error thrown, it means documentDataBuffer was set by the new format handler

      } else if (Buffer.isBuffer(rawDocumentData)) {
        console.log('[verify-token] rawDocumentData is already a Buffer.');
        documentDataBuffer = rawDocumentData;
      } else if (rawDocumentData instanceof Uint8Array) {
        console.log('[verify-token] rawDocumentData is already a Uint8Array.');
        documentDataBuffer = Buffer.from(rawDocumentData);
      } else {
        throw new Error('Unhandled type for rawDocumentData: ' + typeof rawDocumentData);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error processing document data';
      console.error('[verify-token] Error processing document_data:', errorMessage, 'Raw data was (type '+ typeof rawDocumentData +'):', typeof rawDocumentData === 'string' ? (rawDocumentData as string).substring(0,200) : rawDocumentData);
      return NextResponse.json({ error: 'Internal error: Failed to parse stored document data.' }, { status: 500 });
    }

    // Ensure documentDataBuffer is assigned
    if (!documentDataBuffer) {
        console.error('[verify-token] documentDataBuffer was not assigned after parsing attempts.');
        return NextResponse.json({ error: 'Internal error: Failed to process document data buffer.' }, { status: 500 });
    }

    if (documentDataBuffer.length === 0) {
        console.error('Processed document_data is empty after hex decoding.');
        return NextResponse.json({ error: 'Internal error: Document data is empty after processing.'}, { status: 500 });
    }

    // Log first few bytes of the buffer to check for PDF header
    const pdfHeaderCheck = documentDataBuffer.slice(0, 8).toString('utf-8'); // Check first 8 bytes
    const pdfHeaderHex = documentDataBuffer.slice(0, 8).toString('hex');
    console.log(`[verify-token] PDF Header Check (UTF-8): "${pdfHeaderCheck}", Hex: "${pdfHeaderHex}"`);
    if (!pdfHeaderCheck.startsWith('%PDF-')) {
        console.warn('[verify-token] WARNING: Document data buffer does not start with %PDF- header.');
    }

    const documentDataString = documentDataBuffer.toString('base64');

    // Log details about the document data being sent
    console.log(`[verify-token] Document: ${contractDetails.document_name}, Original Buffer length: ${documentDataBuffer.length}, Base64 String length: ${documentDataString.length}`);
    console.log(`[verify-token] Base64 String (first 100 chars): ${documentDataString.substring(0, 100)}...`);

    // 3. Fetch recipient details (assuming a contract_recipients table or similar)
    // The recipientId comes from the tokenData. We need name and email.
    // This query depends on your schema for storing recipient info linked to contracts.
    // Placeholder: Assuming recipients are stored in a way that can be queried by recipientId and contractId.
    // For simplicity, let's assume recipients are part of a JSONB field in the 'contracts' table or a separate 'contract_recipients' table.
    // This is a simplified mock. You need to fetch actual recipient data based on your schema.
    let recipientName = 'Signer';
    let recipientEmail = 'signer@example.com';

    // Example: If recipients are in a JSONB array in the contracts table:
    // const mainContract = await supabase.from('contracts').select('recipients').eq('id', contractId).single();
    // const actualRecipient = mainContract.data?.recipients.find(r => r.id === recipientId);
    // if (actualRecipient) { recipientName = actualRecipient.name; recipientEmail = actualRecipient.email; }
    
    // If you have a `contract_recipients` table:
    const { data: recipientData, error: recipientError } = await supabase
        .from('contract_recipients') // Assuming this table exists
        .select('name, email')
        .eq('id', recipientId) // Assuming recipient_id in tokens table is the PK of contract_recipients
        // .eq('contract_id', contractId) // Might also need this if recipient IDs are not globally unique
        .single();

    if (recipientError || !recipientData) {
        console.error('Recipient fetch error:', recipientError?.message);
        // Decide if this is critical. For now, use defaults or error out.
        return NextResponse.json({ error: 'Could not retrieve recipient details.' }, { status: 404 });
    }
    recipientName = recipientData.name;
    recipientEmail = recipientData.email;


    // 4. Fetch fields assigned to this recipient for this contract
    console.log('[verify-token] Fetching fields for contract:', contractId, 'recipient:', recipientId);
    
    const { data: fieldsFromDb, error: fieldsError } = await supabase
      .from('contract_fields') 
      .select('id, type, page, position_x, position_y, width, height, placeholder') // Use snake_case
      .eq('contract_id', contractId)
      .eq('recipient_id', recipientId);

    if (fieldsError) {
      console.error('Fields fetch error:', fieldsError.message);
      return NextResponse.json({ error: 'Could not retrieve contract fields.' }, { status: 500 });
    }

    console.log('[verify-token] Fields from DB:', fieldsFromDb);

    // Map database results (snake_case) to SigningFieldData (camelCase)
    const fieldsForSigner: SigningFieldData[] = (fieldsFromDb || []).map(field => ({
      id: field.id,
      type: field.type,
      page: field.page,
      positionX: field.position_x, // Map from snake_case
      positionY: field.position_y, // Map from snake_case
      width: field.width,
      height: field.height,
      placeholder: field.placeholder,
    }));

    console.log('[verify-token] Mapped fields for signer:', fieldsForSigner);

    // 5. Optionally, mark the token as accessed (but not yet used for submission)
    // This is if you want to track link views. For now, we mark as used upon submission.

    return NextResponse.json({
      success: true,
      data: {
        documentName: contractDetails.document_name,
        documentDataString, // Base64 encoded PDF data
        fieldsForSigner,
        recipientName: recipientName,
        recipientEmail: recipientEmail,
      },
    });

  } catch (error) {
    console.error('Error in /api/contracts/sign/verify-token:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ error: 'Server error during token verification.', details: message }, { status: 500 });
  }
} 