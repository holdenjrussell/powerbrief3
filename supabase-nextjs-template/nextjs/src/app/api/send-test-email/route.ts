import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function POST(req: Request) {
  try {
    // Check for required environment variables
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      return NextResponse.json({ 
        error: 'SendGrid configuration missing. Add SENDGRID_API_KEY and SENDGRID_FROM_EMAIL to your .env.local',
        hasApiKey: !!process.env.SENDGRID_API_KEY,
        hasFromEmail: !!process.env.SENDGRID_FROM_EMAIL
      }, { status: 500 });
    }

    const { to } = await req.json();
    
    if (!to) {
      return NextResponse.json({ error: 'Email recipient (to) is required' }, { status: 400 });
    }

    // Your test message (similar to the SendGrid example you shared)
    const msg = {
      to: to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL!,
        name: 'PowerBrief Test'
      },
      subject: 'Sending with SendGrid is Fun! 🎉',
      text: 'and easy to do anywhere, even with Node.js',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5;">🎉 Your first SendGrid email!</h2>
          <p><strong>and easy to do anywhere, even with Node.js</strong></p>
          <p>This email was sent from your PowerBrief app using SendGrid!</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Test Details:</strong></p>
            <ul style="margin: 8px 0;">
              <li>From: ${process.env.SENDGRID_FROM_EMAIL}</li>
              <li>To: ${to}</li>
              <li>Time: ${new Date().toISOString()}</li>
            </ul>
          </div>
          <p style="color: #666; font-size: 14px;">
            Sent from PowerBrief via SendGrid API
          </p>
        </div>
      `
    };

    await sgMail.send(msg);
    
    console.log('Email sent successfully!');
    
    return NextResponse.json({ 
      success: true,
      message: 'Email sent successfully!',
      sentTo: to,
      from: process.env.SENDGRID_FROM_EMAIL
    });
    
  } catch (error: unknown) {
    console.error('SendGrid error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      error: 'Failed to send email',
      details: errorMessage
    }, { status: 500 });
  }
} 