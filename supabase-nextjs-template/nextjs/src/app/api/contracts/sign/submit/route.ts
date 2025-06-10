import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import sgMail from '@sendgrid/mail';

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

    // 6. Check if all recipients have signed
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

    // 7. Send confirmation email to the signer using existing SendGrid setup
    try {
      // Get contract, recipient, and brand details for email
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

      if (!contractFetchError && !recipientFetchError && contract && recipient && process.env.SENDGRID_API_KEY) {
        // Initialize SendGrid
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const brand = contract.brand;
        const fromEmail = brand.email_identifier 
          ? `${brand.email_identifier}@mail.powerbrief.ai`
          : 'noreply@powerbrief.ai';

        const downloadUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/public/contracts/download/${contractId}?token=${contract.share_token}`;

        // Generate email content (matching existing ContractService style)
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

        await sgMail.send(msg);
        console.log(`[Contract Submit] Completion email sent to ${recipient.email} for contract ${contractId}`);
      } else {
        console.log('[Contract Submit] Skipping email - missing data or SendGrid not configured');
      }
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the entire request if email fails
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