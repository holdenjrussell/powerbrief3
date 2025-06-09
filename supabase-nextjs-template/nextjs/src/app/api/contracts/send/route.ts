import { NextRequest, NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient'; // Import Supabase admin client
import crypto from 'crypto'; // For generating secure tokens

interface SimpleRecipient {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface BrandDataFromDB {
    name: string | null;
    email_identifier: string | null;
    // Add logo_url here if you confirm the column name, e.g., logo_url: string | null;
}

// TODO: Define this interface based on your actual contract data structure
interface ContractData {
  contractId: string; // ID of the saved contract instance
  recipients: SimpleRecipient[];
  documentName: string;
  brandId: string; 
  // You might also need the ID of the user sending/initiating this
  // and potentially the full contract document or a link to it if it's part of the email
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ContractData;
    const {
      contractId,
      recipients,
      documentName,
      brandId
    } = body;

    if (!contractId || !recipients || !recipients.length || !documentName || !brandId) {
      return NextResponse.json({ error: 'Missing required contract data' }, { status: 400 });
    }

    // 1. Retrieve SendGrid API Key
    // IMPORTANT: Store your API key securely, preferably in environment variables.
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendGridApiKey) {
      console.error('SendGrid API Key not found in environment variables.');
      return NextResponse.json({ error: 'Email configuration error' }, { status: 500 });
    }
    sgMail.setApiKey(sendGridApiKey);

    // Fetch brand-specific email settings
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@powerbrief.ai';
    let replyToEmail: string | null = null;
    let brandNameToDisplay = 'Your Company'; // Default brand name for email
    // let brandLogoForEmail: string | null = null; // Removed for now, will add back if logo_url is confirmed

    try {
      const supabase = await createServerAdminClient();
      // Select only 'name' and 'email_identifier' for now
      const { data: fetchedBrandData, error: brandFetchError } = await supabase
        .from('brands')
        .select('name, email_identifier') 
        .eq('id', brandId)
        .single<BrandDataFromDB>(); // Explicitly type the expected data

      if (brandFetchError) {
        console.warn(`Could not fetch brand settings for brand ${brandId}:`, brandFetchError.message);
      } else if (fetchedBrandData) {
        brandNameToDisplay = fetchedBrandData.name || brandNameToDisplay;
        // Example for if you add logo_url back:
        // if (fetchedBrandData.logo_url && typeof fetchedBrandData.logo_url === 'string') {
        //     brandLogoForEmail = fetchedBrandData.logo_url;
        // }

        if (fetchedBrandData.email_identifier) {
          replyToEmail = `${fetchedBrandData.email_identifier}@mail.powerbrief.ai`;
          console.log(`Using custom replyTo email for brand ${brandId}: ${replyToEmail}`);
        } else {
          console.log(`Brand ${brandId} does not have a custom email_identifier. No reply-to will be set.`);
        }
      }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'Unknown error fetching brand settings';
      console.warn(`Error fetching brand email settings for brand ${brandId}: ${err}`);
    }
    
    if (!fromEmail || fromEmail === 'noreply@yourcompany.com') {
        console.error('CRITICAL: SENDGRID_FROM_EMAIL is not set properly.');
        return NextResponse.json({ error: 'Email server configuration error: No FROM_EMAIL set.' }, { status: 500 });
    }

    // 2. Process each recipient
    const emailPromises = recipients.map(async (editorRecipient) => {
      const supabase = await createServerAdminClient();

      console.log(`[API Send] Processing editorRecipient: ID=${editorRecipient.id}, Email=${editorRecipient.email} for ContractID=${contractId}`);

      const { data: dbRecipient, error: dbRecipientError } = await supabase
        .from('contract_recipients')
        .select('id, name, email')
        .eq('contract_id', contractId)
        .eq('email', editorRecipient.email)
        .maybeSingle();

      if (dbRecipientError) {
        console.error(`[API Send] Error fetching recipient ${editorRecipient.email} from DB for contract ${contractId}:`, dbRecipientError.message);
        return { email: editorRecipient.email, status: 'failed', error: 'Internal error fetching recipient data (send).' };
      }

      if (!dbRecipient) {
        console.error(`[API Send] Recipient ${editorRecipient.email} not found in contract_recipients for contract ${contractId}. Token not generated.`);
        return { email: editorRecipient.email, status: 'failed', error: 'Recipient not found in saved contract (send).' };
      }
      
      console.log(`[API Send] Found dbRecipient: ID=${dbRecipient.id}, Name=${dbRecipient.name}, Email=${dbRecipient.email}`);
      const actualRecipientIdForToken = dbRecipient.id; // This should be the PK from contract_recipients
      console.log(`[API Send] Using actualRecipientIdForToken: ${actualRecipientIdForToken} for contract_signing_tokens.`);

      const tokenValue = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: tokenInsertError } = await supabase
        .from('contract_signing_tokens')
        .insert({
          contract_id: contractId,
          recipient_id: actualRecipientIdForToken, 
          token: tokenValue,
          expires_at: expiresAt.toISOString(),
        });

      if (tokenInsertError) {
        console.error(`[API Send] Error saving signing token for recipient ${editorRecipient.email} (DB ID: ${actualRecipientIdForToken}):`, tokenInsertError.message);
        return {
          email: editorRecipient.email,
          status: 'failed',
          error: `Failed to generate signing token: ${tokenInsertError.message}`
        };
      }
      console.log(`[API Send] Successfully inserted token for recipient_id ${actualRecipientIdForToken}.`);

      const signingBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      // Use dbRecipient.name for the email personalization, as it's from the DB.
      const signingLink = `${signingBaseUrl}/public/contracts/sign/${contractId}?token=${tokenValue}`;

      const emailSubject = `Action Required: Sign Your Document - ${documentName}`;
      
      // Enhanced HTML Email Body
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${emailSubject}</title>
          <style>
            body { margin: 0; padding: 0; background-color: #f8f9fa; font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
            .header { background-color: #4F46E5; /* PowerBrief purple */ padding: 30px 20px; text-align: center; }
            /* .header img { max-width: 150px; max-height: 50px; margin-bottom: 10px; } */ /* Logo style removed for now */
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
            .content { padding: 30px; }
            .content p { margin-bottom: 15px; line-height: 1.6; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { background-color: #10B981; /* PowerBrief green */ color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;}
            .footer { background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .footer a { color: #4F46E5; text-decoration: none; }
            .sender-info { margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;}
            .sender-info p { margin: 5px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #ffffff; font-size: 24px;">${brandNameToDisplay}</h1>
              <h2 style="color: #ffffff; margin:15px 0 0; font-size: 22px;">You've been sent a document to review and sign.</h2>
            </div>
            <div class="content">
              <p>Hello ${dbRecipient.name || editorRecipient.name},</p>
              <p><strong>${brandNameToDisplay}</strong> has sent you the document "<strong>${documentName}</strong>" for your signature.</p>
              <div class="button-container">
                <a href="${signingLink}" class="button">REVIEW DOCUMENT</a>
              </div>
              <div class="sender-info">
                 <p>This contract was sent to you by ${brandNameToDisplay} via PowerBrief.</p>
                 <p>If you have any questions regarding the document, please reach out to them directly.</p>
              </div>
            </div>
            <div class="footer">
              <p>Powered by <a href="https://powerbrief.ai">PowerBrief</a></p>
              <p>Do Not Share This Email: This email contains a secure link. Please do not share this email or link.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `Hello ${dbRecipient.name || editorRecipient.name},\n\n${brandNameToDisplay} has sent you the document "${documentName}" for your signature.\n\nPlease review and sign your document by clicking this link: ${signingLink}\n\nIf you have any questions regarding the document, please reach out to them directly.\n\nPowered by PowerBrief.`;

      const msg: {
        to: string;
        from: string;
        subject: string;
        text: string;
        html: string;
        replyTo?: string;
      } = {
        to: editorRecipient.email,
        from: fromEmail, 
        subject: emailSubject,
        text: emailText, // Fallback for email clients that don't support HTML
        html: emailHtml,
      };

      // Add reply-to if brand has custom email
      if (replyToEmail) {
        msg.replyTo = replyToEmail;
      }

      try {
        await sgMail.send(msg);
        console.log(`Email sent successfully to ${editorRecipient.email} for contract ${contractId}`);
        return { email: editorRecipient.email, status: 'sent' };
      } catch (error: unknown) {
        let errorMessage = 'An unknown error occurred while sending email';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        // Attempt to get more specific error from SendGrid
        const sendGridError = error as { response?: { body?: { errors?: Array<{ message: string }> } } };
        if (sendGridError.response?.body?.errors && sendGridError.response.body.errors.length > 0) {
          errorMessage = sendGridError.response.body.errors.map(e => e.message).join('; ');
        }

        console.error(`Error sending email to ${editorRecipient.email}:`, errorMessage);
        if (sendGridError.response?.body) {
          console.error('SendGrid error details:', sendGridError.response.body);
        }
        return { email: editorRecipient.email, status: 'failed', error: errorMessage };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const allSent = emailResults.every(r => r.status === 'sent');

    if (allSent) {
      return NextResponse.json({ message: 'Contract emails sent successfully', results: emailResults });
    } else {
      // Even if some emails failed, we might consider the operation partially successful
      // or you might want to return a 500 if any email fails.
      console.warn('Some emails failed to send:', emailResults.filter(r => r.status === 'failed'));
      return NextResponse.json(
        { 
          message: 'Some contract emails could not be sent', 
          results: emailResults 
        }, 
        { status: 207 } // Multi-Status
      );
    }

  } catch (error: unknown) {
    let message = 'Internal server error';
    if (error instanceof Error) {
      message = error.message;
    }
    console.error('Error in /api/contracts/send:', error);
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
} 