import { NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function POST(req: Request) {
  try {
    const supabase = await createSSRClient();
    
    // Extract data from request
    const { email, brandName, inviteUrl, invitationToken } = await req.json();
    
    // Check for required fields
    if (!email || !brandName || !inviteUrl || !invitationToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for required environment variables
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      console.error('SendGrid configuration missing. Add SENDGRID_API_KEY and SENDGRID_FROM_EMAIL to your .env.local');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get the sender's name from user metadata or email
    const senderName = user.user_metadata?.full_name || user.email || 'A colleague';
    
    // Prepare email content
    const emailSubject = `${senderName} has invited you to collaborate on ${brandName}`;
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Brand Collaboration Invitation</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">PowerBrief</h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 16px;">Brand Collaboration Invitation</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 32px 24px;">
            <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 24px;">You've been invited to collaborate!</h2>
            <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
              ${senderName} has invited you to collaborate on the brand <strong>"${brandName}"</strong> in PowerBrief.
            </p>
            
            <!-- Brand Info Card -->
            <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #4F46E5;">
              <p style="margin: 0 0 12px 0; color: #374151;"><strong>Brand:</strong> ${brandName}</p>
              <p style="margin: 0; color: #374151;"><strong>Invited by:</strong> ${senderName}</p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
              <a href="${inviteUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Accept Invitation
              </a>
            </div>
            
            <!-- Instructions -->
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; color: #92400e; font-weight: 600;">Getting Started:</p>
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                If you don't have a PowerBrief account yet, you'll be prompted to create one when you accept the invitation.
              </p>
            </div>
            
            <!-- Alternative Link -->
            <p style="color: #6b7280; font-size: 14px; margin: 24px 0 0 0;">
              Can't click the button? Copy and paste this link into your browser:<br>
              <a href="${inviteUrl}" style="color: #4F46E5; word-break: break-all;">${inviteUrl}</a>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0; text-align: center;">
              This invitation was sent to ${email}. If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0; text-align: center;">
              © 2024 PowerBrief. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Send email via SendGrid
    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: 'PowerBrief'
      },
      subject: emailSubject,
      html: emailBody,
      // Optional: Add text version for better deliverability
      text: `
        ${senderName} has invited you to collaborate on "${brandName}" in PowerBrief.
        
        Accept your invitation: ${inviteUrl}
        
        If you don't have a PowerBrief account yet, you'll be prompted to create one when you accept the invitation.
        
        This invitation was sent to ${email}.
      `.trim()
    };

    try {
      await sgMail.send(msg);
      console.log('Brand share invitation email sent successfully to:', email);
    } catch (sendGridError: unknown) {
      console.error('SendGrid error:', sendGridError);
      
      // Handle specific SendGrid errors
      if (sendGridError && typeof sendGridError === 'object' && 'response' in sendGridError) {
        const sgError = sendGridError as { response?: { body?: unknown } };
        console.error('SendGrid response body:', sgError.response?.body);
        return NextResponse.json({ 
          error: 'Failed to send email. Please check your SendGrid configuration.' 
        }, { status: 500 });
      }
      
      throw sendGridError;
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Invitation sent successfully'
    });
    
  } catch (error: unknown) {
    console.error('Error sending invitation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
    return NextResponse.json({ 
      error: errorMessage 
    }, { status: 500 });
  }
} 