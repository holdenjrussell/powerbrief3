import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { createSSRClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch onboarding forms for a brand
export async function GET(request: NextRequest) {
  try {
    const ssrSupabase = await createSSRClient();
    const { data: { user }, error: authError } = await ssrSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerAdminClient();
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID is required' }, { status: 400 });
    }

    const { data: forms, error } = await supabase
      .from('ugc_onboarding_form_configs')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching onboarding forms:', error);
      return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 });
    }

    return NextResponse.json(forms || []);

  } catch (error) {
    console.error('Onboarding forms API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new onboarding form
export async function POST(request: NextRequest) {
  try {
    const ssrSupabase = await createSSRClient();
    const { data: { user }, error: authError } = await ssrSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerAdminClient();
    const body = await request.json();
    const { 
      brand_id, 
      form_name, 
      description,
      welcome_message,
      success_message,
      is_public,
      is_active,
      requires_approval,
      auto_assign_status,
      collect_demographics,
      collect_social_handles,
      collect_address,
      collect_portfolio,
      custom_fields,
      branding,
      notification_emails
    } = body;

    if (!brand_id || !form_name) {
      return NextResponse.json({ 
        error: 'Missing required fields: brand_id, form_name' 
      }, { status: 400 });
    }

    // Check if form name already exists for this brand
    const { data: existing } = await supabase
      .from('ugc_onboarding_form_configs')
      .select('id')
      .eq('brand_id', brand_id)
      .eq('form_name', form_name)
      .single();

    if (existing) {
      return NextResponse.json({ 
        error: 'Form name already exists for this brand' 
      }, { status: 400 });
    }

    const { data: form, error } = await supabase
      .from('ugc_onboarding_form_configs')
      .insert({
        brand_id,
        form_name,
        description,
        welcome_message,
        success_message,
        is_public: is_public !== undefined ? is_public : true,
        is_active: is_active !== undefined ? is_active : true,
        requires_approval: requires_approval !== undefined ? requires_approval : true,
        auto_assign_status: auto_assign_status || 'New Creator Submission',
        collect_demographics: collect_demographics !== undefined ? collect_demographics : true,
        collect_social_handles: collect_social_handles !== undefined ? collect_social_handles : true,
        collect_address: collect_address !== undefined ? collect_address : true,
        collect_portfolio: collect_portfolio !== undefined ? collect_portfolio : true,
        custom_fields: custom_fields || [],
        branding: branding || {},
        notification_emails: notification_emails || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating onboarding form:', error);
      return NextResponse.json({ error: 'Failed to create form' }, { status: 500 });
    }

    return NextResponse.json(form);

  } catch (error) {
    console.error('Create onboarding form API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update an onboarding form
export async function PUT(request: NextRequest) {
  try {
    const ssrSupabase = await createSSRClient();
    const { data: { user }, error: authError } = await ssrSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerAdminClient();
    const body = await request.json();
    const { 
      id, 
      form_name, 
      description,
      welcome_message,
      success_message,
      is_public,
      is_active,
      requires_approval,
      auto_assign_status,
      collect_demographics,
      collect_social_handles,
      collect_address,
      collect_portfolio,
      custom_fields,
      branding,
      notification_emails
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Form ID is required' }, { status: 400 });
    }

    const updateData: {
      form_name?: string;
      description?: string;
      welcome_message?: string;
      success_message?: string;
      is_public?: boolean;
      is_active?: boolean;
      requires_approval?: boolean;
      auto_assign_status?: string;
      collect_demographics?: boolean;
      collect_social_handles?: boolean;
      collect_address?: boolean;
      collect_portfolio?: boolean;
      custom_fields?: any[];
      branding?: any;
      notification_emails?: string[];
    } = {};
    
    if (form_name !== undefined) updateData.form_name = form_name;
    if (description !== undefined) updateData.description = description;
    if (welcome_message !== undefined) updateData.welcome_message = welcome_message;
    if (success_message !== undefined) updateData.success_message = success_message;
    if (is_public !== undefined) updateData.is_public = is_public;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (requires_approval !== undefined) updateData.requires_approval = requires_approval;
    if (auto_assign_status !== undefined) updateData.auto_assign_status = auto_assign_status;
    if (collect_demographics !== undefined) updateData.collect_demographics = collect_demographics;
    if (collect_social_handles !== undefined) updateData.collect_social_handles = collect_social_handles;
    if (collect_address !== undefined) updateData.collect_address = collect_address;
    if (collect_portfolio !== undefined) updateData.collect_portfolio = collect_portfolio;
    if (custom_fields !== undefined) updateData.custom_fields = custom_fields;
    if (branding !== undefined) updateData.branding = branding;
    if (notification_emails !== undefined) updateData.notification_emails = notification_emails;

    const { data: form, error } = await supabase
      .from('ugc_onboarding_form_configs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating onboarding form:', error);
      return NextResponse.json({ error: 'Failed to update form' }, { status: 500 });
    }

    return NextResponse.json(form);

  } catch (error) {
    console.error('Update onboarding form API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 