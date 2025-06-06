import { NextRequest, NextResponse } from 'next/server';
import { processCreatorEmailResponse } from '@/lib/services/ugcEmailResponseHandler';

export async function POST(request: NextRequest) {
  try {
    // Parse SendGrid inbound email data
    const formData = await request.formData();
    
    const emailData = {
      to: formData.get('to') as string,
      from: formData.get('from') as string,
      subject: formData.get('subject') as string,
      text: formData.get('text') as string,
      html: formData.get('html') as string,
      headers: formData.get('headers') as string,
      attachments: formData.get('attachment-info') as string,
      envelope: formData.get('envelope') as string,
    };

    console.log('📧 Received inbound email:', {
      to: emailData.to,
      from: emailData.from,
      subject: emailData.subject,
    });

    // Extract brand identifier from email address
    const brandIdentifier = extractBrandIdentifierFromEmail(emailData.to);
    if (!brandIdentifier) {
      console.error('❌ Could not extract brand from email:', emailData.to);
      return NextResponse.json({ error: 'Invalid email routing' }, { status: 400 });
    }

    // Process the email response
    const result = await processCreatorEmailResponse({
      brandIdentifier,
      emailData,
    });

    if (result.success) {
      console.log('✅ Email processed successfully:', result.threadId);
      return NextResponse.json({ 
        success: true, 
        threadId: result.threadId,
        actionsTaken: result.actionsTaken 
      });
    } else {
      console.error('❌ Failed to process email:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function extractBrandIdentifierFromEmail(toEmail: string): string | null {
  // First, extract the actual email address from potential "Display Name <email@domain.com>" format
  let emailAddress = toEmail;
  const angleMatch = toEmail.match(/<([^>]+)>/);
  if (angleMatch) {
    emailAddress = angleMatch[1];
  }
  
  console.log('📧 Extracted email address:', emailAddress, 'from original:', toEmail);
  
  // Handle emails to: brandidentifier@mail.powerbrief.ai
  const mailSubdomainMatch = emailAddress.match(/^([a-z0-9-]+)@mail\.powerbrief\.ai$/);
  if (mailSubdomainMatch) {
    console.log('✅ Found brand identifier:', mailSubdomainMatch[1]);
    return mailSubdomainMatch[1];
  }

  // Legacy: Handle plus addressing on mail subdomain: creators+brandname@mail.powerbrief.ai
  const legacyMailMatch = emailAddress.match(/creators\+([^@]+)@mail\.powerbrief\.ai/);
  if (legacyMailMatch) {
    console.log('✅ Found legacy brand identifier (mail):', legacyMailMatch[1]);
    return legacyMailMatch[1];
  }

  // Legacy: Handle plus addressing on main domain: creators+brandname@powerbrief.ai
  const legacyPlusMatch = emailAddress.match(/creators\+([^@]+)@powerbrief\.ai/);
  if (legacyPlusMatch) {
    console.log('✅ Found legacy brand identifier (main):', legacyPlusMatch[1]);
    return legacyPlusMatch[1];
  }

  console.log('❌ No brand identifier found for:', emailAddress);
  return null;
} 