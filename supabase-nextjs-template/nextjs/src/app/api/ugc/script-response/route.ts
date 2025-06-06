import { NextResponse } from 'next/server';
import { createSSRClient } from '@/lib/supabase/server';
import { updateUgcCreatorScript } from '@/lib/services/ugcCreatorService';
import { ugcAiCoordinator } from '@/lib/services/ugcAiCoordinator';
import { UgcCreator, UgcCreatorScript } from '@/lib/types/ugcCreator';
import { Brand } from '@/lib/types/powerbrief';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Decode the token
    let action: string, scriptId: string, timestamp: string;
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      [action, scriptId, timestamp] = decoded.split(':');
    } catch {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
    }

    if (!action || !scriptId || !timestamp) {
      return NextResponse.json({ error: 'Invalid token data' }, { status: 400 });
    }

    // Check if token is too old (24 hours)
    const tokenTime = parseInt(timestamp);
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    if (now - tokenTime > twentyFourHours) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 });
    }

    const supabase = await createSSRClient();

    // Get the script
    const { data: script, error: scriptError } = await supabase
      .from('ugc_creator_scripts')
      .select('*, ugc_creators(*)')
      .eq('id', scriptId)
      .single();

    if (scriptError || !script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    // Handle the action
    if (action === 'approve') {
      // Update script status to approved
      await updateUgcCreatorScript({
        id: scriptId,
        status: 'CREATOR_APPROVED',
        concept_status: 'Creator Shooting'
      });

      // Get coordinator and send follow-up email about payment details
      const coordinator = await ugcAiCoordinator.getOrCreateCoordinator(
        script.brand_id,
        script.user_id
      );

      // Generate payment follow-up email
      const { data: brand } = await supabase
        .from('brands')
        .select('*')
        .eq('id', script.brand_id)
        .single();

      if (brand) {
        try {
          // Convert database types to TypeScript interfaces
          const creator: UgcCreator = {
            ...script.ugc_creators,
            products: Array.isArray(script.ugc_creators.products) 
              ? script.ugc_creators.products as string[]
              : JSON.parse(script.ugc_creators.products as string || '[]'),
            content_types: Array.isArray(script.ugc_creators.content_types)
              ? script.ugc_creators.content_types as string[]
              : JSON.parse(script.ugc_creators.content_types as string || '[]'),
            platforms: Array.isArray(script.ugc_creators.platforms)
              ? script.ugc_creators.platforms as string[]
              : JSON.parse(script.ugc_creators.platforms as string || '[]')
          };

          const brandData: Brand = {
            ...brand,
            brand_info_data: typeof brand.brand_info_data === 'string' 
              ? JSON.parse(brand.brand_info_data) 
              : brand.brand_info_data || {},
            target_audience_data: typeof brand.target_audience_data === 'string'
              ? JSON.parse(brand.target_audience_data)
              : brand.target_audience_data || {},
            competition_data: typeof brand.competition_data === 'string'
              ? JSON.parse(brand.competition_data)
              : brand.competition_data || {},
            editing_resources: Array.isArray(brand.editing_resources)
              ? brand.editing_resources
              : JSON.parse(brand.editing_resources as string || '[]'),
            dos_and_donts: typeof brand.dos_and_donts === 'string'
              ? JSON.parse(brand.dos_and_donts)
              : brand.dos_and_donts || {}
          };

          const scriptData: UgcCreatorScript = {
            ...script,
            script_content: typeof script.script_content === 'string'
              ? JSON.parse(script.script_content)
              : script.script_content,
            b_roll_shot_list: Array.isArray(script.b_roll_shot_list)
              ? script.b_roll_shot_list as string[]
              : JSON.parse(script.b_roll_shot_list as string || '[]')
          };

          const emailContent = await ugcAiCoordinator.generateEmail(coordinator.id, {
            creator,
            brand: brandData,
            script: scriptData,
            purpose: 'Script approved - collect payment details',
            tone: 'friendly',
            includeElements: ['payment_request', 'next_steps']
          });

          // Send the follow-up email (but don't fail if it doesn't work)
          // This could be automated or require approval based on coordinator settings
          console.log('Generated follow-up email for script approval:', emailContent.subject);
        } catch (emailError) {
          console.error('Failed to generate follow-up email:', emailError);
        }
      }

      // Return success response
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Script Approved</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .success { color: #10b981; font-size: 18px; margin-bottom: 20px; }
            .next-steps { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
          </style>
        </head>
        <body>
          <h1>✅ Script Approved!</h1>
          <div class="success">Thank you for approving the script: "${script.title}"</div>
          
          <div class="next-steps">
            <h3>Next Steps:</h3>
            <ol>
              <li>We'll send you payment details via email shortly</li>
              <li>Once we receive your payment info, we'll send the deposit</li>
              <li>Product will be shipped to your address</li>
              <li>You can start filming once everything arrives!</li>
            </ol>
          </div>
          
          <p>We're excited to work with you on this project!</p>
          <p><em>The Grounding Co Team</em></p>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });

    } else if (action === 'reject') {
      // Update script status to rejected
      await updateUgcCreatorScript({
        id: scriptId,
        status: 'CREATOR_REASSIGNMENT',
        concept_status: 'Creator Assignment'
      });

      // Return rejection response with form to collect reason
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Script Rejected</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; }
            textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
            button { background: #ef4444; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
            button:hover { background: #dc2626; }
          </style>
        </head>
        <body>
          <h1>Script Rejection</h1>
          <p>You've indicated that you cannot take on the script: "<strong>${script.title}</strong>"</p>
          
          <form action="/api/ugc/script-response/rejection" method="POST">
            <input type="hidden" name="scriptId" value="${scriptId}" />
            <input type="hidden" name="token" value="${token}" />
            
            <div class="form-group">
              <label for="reason">Please let us know why you're unable to take on this script (optional):</label>
              <textarea name="reason" id="reason" rows="4" placeholder="e.g., scheduling conflict, not a good fit, rate concerns, etc."></textarea>
            </div>
            
            <button type="submit">Submit Rejection</button>
          </form>
          
          <p><em>Thank you for your quick response. We'll find another creator for this project.</em></p>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing script response:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const scriptId = formData.get('scriptId') as string;
    const token = formData.get('token') as string;
    const reason = formData.get('reason') as string;

    if (!scriptId || !token) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createSSRClient();

    // Get the script and creator details
    const { data: script } = await supabase
      .from('ugc_creator_scripts')
      .select('*, ugc_creators(*)')
      .eq('id', scriptId)
      .single();

    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    // Update script with rejection reason
    await updateUgcCreatorScript({
      id: scriptId,
      revision_notes: reason || 'Creator rejected script without specific reason'
    });

    // Log the rejection in AI coordinator
    try {
      const coordinator = await ugcAiCoordinator.getOrCreateCoordinator(
        script.brand_id,
        script.user_id
      );

      await ugcAiCoordinator.logAction(
        coordinator.id,
        'status_changed',
        { 
          script_id: scriptId,
          previous_status: script.status,
          new_status: 'CREATOR_REASSIGNMENT',
          rejection_reason: reason 
        },
        `Creator ${script.ugc_creators.name} rejected script: ${script.title}`,
        true,
        undefined,
        script.creator_id,
        scriptId
      );
    } catch (coordinatorError) {
      console.error('Failed to log rejection in AI coordinator:', coordinatorError);
    }

    // Return success response
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rejection Submitted</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .success { color: #10b981; font-size: 18px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>✅ Rejection Submitted</h1>
        <div class="success">Thank you for letting us know about the script: "${script.title}"</div>
        <p>We appreciate your quick response and will find another creator for this project.</p>
        <p>We'll keep you in mind for future opportunities that might be a better fit!</p>
        <p><em>The Grounding Co Team</em></p>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Error submitting rejection:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 