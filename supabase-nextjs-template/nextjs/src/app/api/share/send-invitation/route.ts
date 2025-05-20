import { NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createSSRClient(cookieStore);
    
    // Extract data from request
    const { email, shareUrl, shareType, batchId, conceptId, shareId } = await req.json();
    
    // Check for required fields
    if (!email || !shareUrl) {
      return NextResponse.json({ error: 'Email and shareUrl are required' }, { status: 400 });
    }
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Get the sender's name or email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();
      
    const senderName = profile?.full_name || user.email || 'A colleague';
    
    // Get resource details based on type
    let resourceName = '';
    
    if (shareType === 'batch' && batchId) {
      const { data: batch } = await supabase
        .from('brief_batches')
        .select('name')
        .eq('id', batchId)
        .single();
        
      resourceName = batch?.name || 'a brief batch';
    } else if (shareType === 'concept' && conceptId) {
      const { data: concept } = await supabase
        .from('brief_concepts')
        .select('concept_title')
        .eq('id', conceptId)
        .single();
        
      resourceName = concept?.concept_title || 'a concept';
    }
    
    // Send email via Resend API or your email service
    // This is a placeholder for your actual email sending logic
    // You would need to implement a proper email service integration
    const emailSubject = `${senderName} has shared ${resourceName} with you`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've been invited to view content</h2>
        <p>${senderName} has shared ${resourceName} with you.</p>
        <div style="margin: 30px 0;">
          <a href="${shareUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Shared Content
          </a>
        </div>
        <p>Or copy this link: ${shareUrl}</p>
        <hr style="margin: 30px 0; border: 1px solid #eaeaea;" />
        <p style="color: #6b7280; font-size: 14px;">This is an automated message from PowerBrief.</p>
      </div>
    `;
    
    // For demo purposes, we'll just log the email details
    console.log('Email invitation details:', {
      to: email,
      subject: emailSubject,
      html: emailBody
    });
    
    // In a real implementation, you would connect to an email service like Resend, SendGrid, etc.
    // Example with a hypothetical email service:
    /*
    await emailService.send({
      to: email,
      subject: emailSubject,
      html: emailBody,
      from: 'noreply@yourdomain.com'
    });
    */
    
    // Record share activity in the database
    await supabase
      .from('share_activities')
      .insert({
        user_id: user.id,
        share_id: shareId,
        resource_type: shareType,
        resource_id: shareType === 'batch' ? batchId : conceptId,
        recipient_email: email,
        share_url: shareUrl
      });
    
    return NextResponse.json({ 
      success: true,
      message: 'Invitation sent successfully'
    });
    
  } catch (error: any) {
    console.error('Error sending invitation:', error);
    return NextResponse.json({ error: error.message || 'Failed to send invitation' }, { status: 500 });
  }
} 