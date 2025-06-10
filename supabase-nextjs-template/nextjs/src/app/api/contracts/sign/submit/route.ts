import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { ContractService } from '@/lib/services/contractService';
import sgMail from '@sendgrid/mail';

interface SubmitSigningRequest {
  contractId: string;
  token: string;
  fieldValues: Record<string, string>;
  ipAddress?: string;
  userAgent?: string;
}

// Fallback email function  
async function sendFallbackCompletionEmail(supabase: Awaited<ReturnType<typeof createServerAdminClient>>, contractId: string, recipientId: string) {
  try {
    console.log('[Contract Submit] Sending fallback completion email...');
    console.log('[Contract Submit] SendGrid API Key configured:', !!process.env.SENDGRID_API_KEY);
    
    if (!process.env.SENDGRID_API_KEY) {
      console.error('[Contract Submit] SendGrid API key not configured');
      return;
    }

    // Initialize SendGrid
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Get contract, recipient, and brand details
    const { data: contract, error: contractFetchError } = await supabase
      .from('contracts')
      .select(`
        title, 
        document_name, 
        share_token, 
        completed_at,
        brand:brands!inner(name, email_identifier)
      `)
      .eq('id', contractId)
      .single();

    const { data: recipient, error: recipientFetchError } = await supabase
      .from('contract_recipients')
      .select('name, email')
      .eq('id', recipientId)
      .single();

    console.log('[Contract Submit] Email data fetch results:', {
      contractFetched: !contractFetchError,
      recipientFetched: !recipientFetchError,
      brandName: contract?.brand?.name,
      recipientEmail: recipient?.email
    });

    if (contractFetchError || recipientFetchError || !contract || !recipient) {
      console.error('[Contract Submit] Failed to fetch data for email:', { contractFetchError, recipientFetchError });
      return;
    }

    const brand = contract.brand;
    const fromEmail = brand.email_identifier 
      ? `${brand.email_identifier}@mail.powerbrief.ai`
      : 'noreply@powerbrief.ai';

    const downloadUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/public/contracts/download/${contractId}?token=${contract.share_token}`;

    console.log('[Contract Submit] Sending email from:', fromEmail, 'to:', recipient.email);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>✅ Contract Completed</h2>
        <p>Hello ${recipient.name},</p>
        <p>Great news! The contract <strong>${contract.title}</strong> has been completed.</p>
        <p>All required signatures have been collected and the document is now legally binding.</p>
        <p><strong>Completed on:</strong> ${contract.completed_at ? new Date(contract.completed_at).toLocaleDateString() : new Date().toLocaleDateString()}</p>
        <p>You can download a copy of the completed contract using the secure link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${downloadUrl}" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Download Completed Contract
          </a>
        </div>
        <p>Thank you for your participation in this contract signing process.</p>
        <p>Best regards,<br>${brand.name}</p>
        <hr style="margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          This email was sent by ${brand.name} via PowerBrief Contract System.
        </p>
      </div>
    `;

    const text = `
Contract Completed

Hello ${recipient.name},

Great news! The contract "${contract.title}" has been completed.

All required signatures have been collected and the document is now legally binding.

Completed on: ${contract.completed_at ? new Date(contract.completed_at).toLocaleDateString() : new Date().toLocaleDateString()}

You can download a copy of the completed contract using this link:
${downloadUrl}

Thank you for your participation in this contract signing process.

Best regards,
${brand.name}

---
This email was sent by ${brand.name} via PowerBrief Contract System.
    `.trim();

    const msg = {
      to: recipient.email,
      from: {
        email: fromEmail,
        name: brand.name
      },
      subject: `Contract Completed: ${contract.title}`,
      html,
      text,
    };

    console.log('[Contract Submit] Sending email with message:', {
      to: msg.to,
      from: msg.from,
      subject: msg.subject
    });

    await sgMail.send(msg);
    console.log(`[Contract Submit] Fallback completion email sent successfully to ${recipient.email}`);
  } catch (emailError) {
    console.error('[Contract Submit] Error sending fallback completion email:', emailError);
    console.error('[Contract Submit] Email error stack:', emailError.stack);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Contract Submit] Starting contract submission process...');
    const body = await request.json() as SubmitSigningRequest;
    const { contractId, token, fieldValues, userAgent } = body;

    console.log('[Contract Submit] Request data:', {
      contractId,
      token: token?.substring(0, 10) + '...',
      fieldCount: Object.keys(fieldValues || {}).length,
      userAgent: userAgent?.substring(0, 50) + '...'
    });

    if (!contractId || !token || !fieldValues) {
      console.error('[Contract Submit] Missing required data:', { contractId: !!contractId, token: !!token, fieldValues: !!fieldValues });
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const supabase = await createServerAdminClient();
    console.log('[Contract Submit] Supabase client created successfully');

    // 1. Verify the token is still valid and unused
    console.log('[Contract Submit] Verifying signing token...');
    const { data: tokenData, error: tokenError } = await supabase
      .from('contract_signing_tokens')
      .select('recipient_id, expires_at, used_at')
      .eq('contract_id', contractId)
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error('[Contract Submit] Token verification error:', tokenError?.message);
      return NextResponse.json({ error: 'Invalid signing token' }, { status: 401 });
    }

    console.log('[Contract Submit] Token verified successfully for recipient:', tokenData.recipient_id);

    if (tokenData.used_at) {
      console.error('[Contract Submit] Token already used at:', tokenData.used_at);
      return NextResponse.json({ error: 'This signing link has already been used' }, { status: 403 });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      console.error('[Contract Submit] Token expired at:', tokenData.expires_at);
      return NextResponse.json({ error: 'This signing link has expired' }, { status: 403 });
    }

    const recipientId = tokenData.recipient_id;
    console.log('[Contract Submit] Processing submission for recipient ID:', recipientId);

    // 2. Get IP address from request headers
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    console.log('[Contract Submit] Client IP address:', ipAddress);

    // 3. Store field values in the contract_fields table
    console.log('[Contract Submit] Updating field values...', Object.keys(fieldValues));
    const fieldUpdatePromises = Object.entries(fieldValues).map(async ([fieldId, value]) => {
      console.log(`[Contract Submit] Updating field ${fieldId} with value length:`, value?.length || 0);
      const { error } = await supabase
        .from('contract_fields')
        .update({ value })
        .eq('id', fieldId)
        .eq('contract_id', contractId)
        .eq('recipient_id', recipientId);
      
      if (error) {
        console.error(`[Contract Submit] Error updating field ${fieldId}:`, error);
        throw new Error(`Failed to save field value: ${error.message}`);
      } else {
        console.log(`[Contract Submit] Successfully updated field ${fieldId}`);
      }
    });

    try {
      await Promise.all(fieldUpdatePromises);
      console.log('[Contract Submit] All field values updated successfully');
    } catch (error) {
      console.error('[Contract Submit] Error updating field values:', error);
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
    console.log('[Contract Submit] Starting ContractService integration...');
    try {
      // Get field types from database
      console.log('[Contract Submit] Fetching field types from database...');
      const { data: contractFields, error: fieldsError } = await supabase
        .from('contract_fields')
        .select('id, type')
        .eq('contract_id', contractId)
        .eq('recipient_id', recipientId);

      if (fieldsError) {
        console.error('[Contract Submit] Error fetching field types:', fieldsError);
        throw new Error(`Failed to get field types: ${fieldsError.message}`);
      }

      console.log('[Contract Submit] Field types fetched:', contractFields?.map(f => ({ id: f.id, type: f.type })));

      // Map field values with their correct types
      const signatures = Object.entries(fieldValues).map(([fieldId, value]) => {
        const field = contractFields?.find(f => f.id === fieldId);
        const signature = {
          fieldId,
          value,
          type: field?.type || 'signature'
        };
        console.log(`[Contract Submit] Mapped signature:`, { fieldId, type: signature.type, valueLength: value?.length });
        return signature;
      });

      console.log('[Contract Submit] Creating ContractService instance...');
      const contractService = ContractService.getInstance();
      
      console.log('[Contract Submit] Calling ContractService.submitSignature...');
      // This will handle PDF flattening, completion status, and email sending
      await contractService.submitSignature(
        contractId,
        recipientId,
        token,
        signatures,
        ipAddress,
        userAgent
      );
      
      console.log(`[Contract Submit] Contract completion handled successfully by ContractService for ${contractId}`);
    } catch (contractServiceError) {
      console.error('[Contract Submit] Error with ContractService completion:', contractServiceError);
      console.error('[Contract Submit] ContractService error stack:', contractServiceError.stack);
      
      // Fallback to manual completion if ContractService fails
      console.log('[Contract Submit] Using fallback completion logic...');
      
      // Check if all recipients have signed
      const { data: allRecipients, error: recipientsError } = await supabase
        .from('contract_recipients')
        .select('status')
        .eq('contract_id', contractId);

      console.log('[Contract Submit] Checking completion status, recipients:', allRecipients?.map(r => r.status));

      if (!recipientsError && allRecipients) {
        const allSigned = allRecipients.every(r => r.status === 'signed');
        console.log('[Contract Submit] All recipients signed:', allSigned);
        
        if (allSigned) {
          console.log('[Contract Submit] Updating contract to completed status...');
          const { error: contractUpdateError } = await supabase
            .from('contracts')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', contractId);

          if (contractUpdateError) {
            console.error('[Contract Submit] Error updating contract status:', contractUpdateError);
          } else {
            console.log('[Contract Submit] Contract marked as completed');
            
            // Attempt to send completion email as fallback
            await sendFallbackCompletionEmail(supabase, contractId, recipientId);
          }
        }
      }
    }

    // Add final success log
    console.log('[Contract Submit] Contract submission process completed successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Contract signed successfully' 
    });

  } catch (error) {
    console.error('[Contract Submit] Critical error in submission process:', error);
    console.error('[Contract Submit] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[Contract Submit] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      type: typeof error,
      errorObject: error
    });
    
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ 
      error: 'Failed to submit signature', 
      details: message 
    }, { status: 500 });
  }
} 