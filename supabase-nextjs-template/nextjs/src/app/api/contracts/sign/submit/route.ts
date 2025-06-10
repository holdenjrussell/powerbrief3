import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { ContractService } from '@/lib/services/contractService';

interface SubmitSigningRequest {
  contractId: string;
  token: string;
  fieldValues: Record<string, string>;
  ipAddress?: string;
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SubmitSigningRequest;
    const { contractId, token, fieldValues, userAgent } = body;

    if (!contractId || !token || !fieldValues) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const supabase = await createServerAdminClient();

    // 1. Verify the token is still valid and unused
    const { data: tokenData, error: tokenError } = await supabase
      .from('contract_signing_tokens')
      .select('recipient_id, expires_at, used_at')
      .eq('contract_id', contractId)
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token verification error:', tokenError?.message);
      return NextResponse.json({ error: 'Invalid signing token' }, { status: 401 });
    }

    if (tokenData.used_at) {
      return NextResponse.json({ error: 'This signing link has already been used' }, { status: 403 });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This signing link has expired' }, { status: 403 });
    }

    const recipientId = tokenData.recipient_id;

    // 2. Get IP address from request headers
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // 3. Store field values in the contract_fields table
    // Update each field with its corresponding value
    const fieldUpdatePromises = Object.entries(fieldValues).map(async ([fieldId, value]) => {
      const { error } = await supabase
        .from('contract_fields')
        .update({ value })
        .eq('id', fieldId)
        .eq('contract_id', contractId)
        .eq('recipient_id', recipientId);
      
      if (error) {
        console.error(`Error updating field ${fieldId}:`, error);
        throw new Error(`Failed to save field value: ${error.message}`);
      }
    });

    try {
      await Promise.all(fieldUpdatePromises);
    } catch (error) {
      console.error('Error updating field values:', error);
      return NextResponse.json({ error: 'Failed to save signature data' }, { status: 500 });
    }

    // 4. Update recipient status
    const { error: recipientUpdateError } = await supabase
      .from('contract_recipients')
      .update({ 
        signed_at: new Date().toISOString(),
        status: 'signed'
      })
      .eq('id', recipientId)
      .eq('contract_id', contractId);

    if (recipientUpdateError) {
      console.error('Error updating recipient:', recipientUpdateError);
      return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 });
    }

    // 5. Mark token as used
    const { error: tokenUpdateError } = await supabase
      .from('contract_signing_tokens')
      .update({ 
        used_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent || 'unknown'
      })
      .eq('contract_id', contractId)
      .eq('token', token);

    if (tokenUpdateError) {
      console.error('Error marking token as used:', tokenUpdateError);
    }

    // 6. Get field types from database and use ContractService for completion
    try {
      // Get field types from database
      const { data: contractFields, error: fieldsError } = await supabase
        .from('contract_fields')
        .select('id, type')
        .eq('contract_id', contractId)
        .eq('recipient_id', recipientId);

      if (fieldsError) {
        throw new Error(`Failed to get field types: ${fieldsError.message}`);
      }

      // Map field values with their correct types
      const signatures = Object.entries(fieldValues).map(([fieldId, value]) => {
        const field = contractFields?.find(f => f.id === fieldId);
        return {
          fieldId,
          value,
          type: field?.type || 'signature'
        };
      });

      const contractService = ContractService.getInstance();
      
      // This will handle PDF flattening, completion status, and email sending
      await contractService.submitSignature(
        contractId,
        recipientId,
        token,
        signatures,
        ipAddress,
        userAgent
      );
      
      console.log(`[Contract Submit] Contract completion handled by ContractService for ${contractId}`);
    } catch (contractServiceError) {
      console.error('Error with ContractService completion:', contractServiceError);
      
      // Fallback to manual completion if ContractService fails
      const { data: allRecipients, error: recipientsError } = await supabase
        .from('contract_recipients')
        .select('status')
        .eq('contract_id', contractId);

      if (!recipientsError && allRecipients) {
        const allSigned = allRecipients.every(r => r.status === 'signed');
        
        if (allSigned) {
          // Update contract status to completed
          const { error: contractUpdateError } = await supabase
            .from('contracts')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', contractId);

          if (contractUpdateError) {
            console.error('Error updating contract status:', contractUpdateError);
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Contract signed successfully' 
    });

  } catch (error) {
    console.error('Error in /api/contracts/sign/submit:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ 
      error: 'Failed to submit signature', 
      details: message 
    }, { status: 500 });
  }
} 