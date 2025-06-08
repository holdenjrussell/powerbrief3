import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { NextRequest, NextResponse } from 'next/server';

// POST - Submit onboarding form and create UGC creator
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerAdminClient();
    const body = await request.json();
    const { 
      brand_id,
      form_config_id,
      submission_data,
      status = 'pending',
      utm_source,
      utm_medium,
      utm_campaign
    } = body;

    if (!brand_id || !submission_data) {
      return NextResponse.json({ 
        error: 'Missing required fields: brand_id, submission_data' 
      }, { status: 400 });
    }

    // Validate that the form exists and is active
    const { data: formConfig, error: formError } = await supabase
      .from('ugc_onboarding_form_configs')
      .select('*')
      .eq('id', form_config_id)
      .eq('brand_id', brand_id)
      .eq('is_active', true)
      .single();

    if (formError || !formConfig) {
      return NextResponse.json({ 
        error: 'Form not found or inactive' 
      }, { status: 404 });
    }

    // Create form submission record
    const { data: submission, error: submissionError } = await supabase
      .from('ugc_form_submissions')
      .insert({
        form_config_id,
        brand_id,
        submission_data,
        status,
        utm_source,
        utm_medium,
        utm_campaign
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Error creating form submission:', submissionError);
      return NextResponse.json({ 
        error: 'Failed to submit form' 
      }, { status: 500 });
    }

    // If auto-approval is enabled or status is approved, create UGC creator
    if (!formConfig.requires_approval || status === 'approved') {
      try {
        // Create a temporary user account for the creator
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: submission_data.email,
          email_confirm: true,
          user_metadata: {
            name: submission_data.name,
            created_via: 'ugc_onboarding'
          }
        });

        if (authError) {
          console.error('Error creating auth user:', authError);
          // Continue without creating auth user - we'll handle this manually later
        }

        // Create UGC creator record
        const creatorData = {
          user_id: authUser?.user?.id || null,
          brand_id,
          name: submission_data.name,
          email: submission_data.email,
          phone_number: submission_data.phone_number,
          instagram_handle: submission_data.instagram_handle,
          tiktok_handle: submission_data.tiktok_handle,
          portfolio_link: submission_data.portfolio_link,
          per_script_fee: submission_data.per_script_fee,
          gender: submission_data.demographics?.gender,
          platforms: submission_data.platforms || [],
          content_types: submission_data.content_types || [],
          address_line1: submission_data.address?.address_line1,
          address_line2: submission_data.address?.address_line2,
          city: submission_data.address?.city,
          state: submission_data.address?.state,
          zip: submission_data.address?.zip,
          country: submission_data.address?.country,
          status: formConfig.auto_assign_status || 'New Creator Submission',
          contract_status: 'not signed'
        };

        const { data: creator, error: creatorError } = await supabase
          .from('ugc_creators')
          .insert(creatorData)
          .select()
          .single();

        if (creatorError) {
          console.error('Error creating UGC creator:', creatorError);
          return NextResponse.json({ 
            error: 'Failed to create creator profile' 
          }, { status: 500 });
        }

        // Update submission with creator ID
        await supabase
          .from('ugc_form_submissions')
          .update({ creator_id: creator.id })
          .eq('id', submission.id);

        // Send notification emails if configured
        if (formConfig.notification_emails && formConfig.notification_emails.length > 0) {
          // TODO: Implement email notifications
          console.log('TODO: Send notification emails to:', formConfig.notification_emails);
        }

        return NextResponse.json({ 
          success: true, 
          submission,
          creator,
          message: 'Application submitted and creator profile created successfully!'
        });

      } catch (error) {
        console.error('Error in creator creation process:', error);
        return NextResponse.json({ 
          success: true, 
          submission,
          message: 'Application submitted successfully! Creator profile will be created manually.'
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      submission,
      message: 'Application submitted successfully! It will be reviewed shortly.'
    });

  } catch (error) {
    console.error('Onboarding submission API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 