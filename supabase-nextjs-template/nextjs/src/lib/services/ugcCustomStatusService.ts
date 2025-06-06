import { createSPAClient } from '@/lib/supabase/client';

export interface UgcCustomCreatorStatus {
  id: string;
  brand_id: string;
  status_name: string;
  category: 'onboarding' | 'script_pipeline' | 'negotiation' | 'production' | 'delivery';
  display_order: number;
  color: string;
  is_active: boolean;
  is_final: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormBranding {
  logo?: string;
  primary_color?: string;
  secondary_color?: string;
}

export interface UgcOnboardingFormConfig {
  id: string;
  brand_id: string;
  form_name: string;
  description?: string;
  welcome_message?: string;
  success_message: string;
  is_public: boolean;
  is_active: boolean;
  requires_approval: boolean;
  auto_assign_status: string;
  collect_demographics: boolean;
  collect_social_handles: boolean;
  collect_address: boolean;
  collect_portfolio: boolean;
  custom_fields: CustomField[];
  branding: FormBranding;
  notification_emails: string[];
  created_at: string;
  updated_at: string;
}

const supabase = createSPAClient();

// Custom Status Management
export async function getCustomStatusesForBrand(brandId: string): Promise<UgcCustomCreatorStatus[]> {
  const { data, error } = await supabase
    .from('ugc_custom_creator_statuses')
    .select('*')
    .eq('brand_id', brandId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching custom statuses:', error);
    throw error;
  }

  return data || [];
}

export async function getCustomStatusesByCategory(brandId: string, category: string): Promise<UgcCustomCreatorStatus[]> {
  const { data, error } = await supabase
    .from('ugc_custom_creator_statuses')
    .select('*')
    .eq('brand_id', brandId)
    .eq('category', category)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching custom statuses by category:', error);
    throw error;
  }

  return data || [];
}

export async function createCustomStatus(status: Partial<UgcCustomCreatorStatus>): Promise<UgcCustomCreatorStatus> {
  const { data, error } = await supabase
    .from('ugc_custom_creator_statuses')
    .insert({
      brand_id: status.brand_id,
      status_name: status.status_name,
      category: status.category,
      display_order: status.display_order || 0,
      color: status.color || '#6B7280',
      is_final: status.is_final || false,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating custom status:', error);
    throw error;
  }

  return data;
}

export async function updateCustomStatus(id: string, updates: Partial<UgcCustomCreatorStatus>): Promise<UgcCustomCreatorStatus> {
  const { data, error } = await supabase
    .from('ugc_custom_creator_statuses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating custom status:', error);
    throw error;
  }

  return data;
}

export async function deleteCustomStatus(id: string): Promise<void> {
  const { error } = await supabase
    .from('ugc_custom_creator_statuses')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('Error deleting custom status:', error);
    throw error;
  }
}

// Onboarding Form Management
export async function getOnboardingFormsForBrand(brandId: string): Promise<UgcOnboardingFormConfig[]> {
  const { data, error } = await supabase
    .from('ugc_onboarding_form_configs')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching onboarding forms:', error);
    throw error;
  }

  return data || [];
}

export async function getPublicOnboardingForm(brandId: string, formName?: string): Promise<UgcOnboardingFormConfig | null> {
  let query = supabase
    .from('ugc_onboarding_form_configs')
    .select('*')
    .eq('brand_id', brandId)
    .eq('is_public', true)
    .eq('is_active', true);

  if (formName) {
    query = query.eq('form_name', formName);
  } else {
    query = query.limit(1);
  }

  const { data, error } = await query.single();

  if (error) {
    console.error('Error fetching public onboarding form:', error);
    return null;
  }

  return data;
}

export async function createOnboardingForm(form: Partial<UgcOnboardingFormConfig>): Promise<UgcOnboardingFormConfig> {
  const { data, error } = await supabase
    .from('ugc_onboarding_form_configs')
    .insert({
      brand_id: form.brand_id,
      form_name: form.form_name || 'Creator Application',
      description: form.description,
      welcome_message: form.welcome_message,
      success_message: form.success_message || 'Thank you for your application! We will review it and get back to you soon.',
      is_public: form.is_public !== undefined ? form.is_public : true,
      is_active: form.is_active !== undefined ? form.is_active : true,
      requires_approval: form.requires_approval !== undefined ? form.requires_approval : true,
      auto_assign_status: form.auto_assign_status || 'New Creator Submission',
      collect_demographics: form.collect_demographics !== undefined ? form.collect_demographics : true,
      collect_social_handles: form.collect_social_handles !== undefined ? form.collect_social_handles : true,
      collect_address: form.collect_address !== undefined ? form.collect_address : true,
      collect_portfolio: form.collect_portfolio !== undefined ? form.collect_portfolio : true,
      custom_fields: form.custom_fields || [],
      branding: form.branding || {},
      notification_emails: form.notification_emails || []
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating onboarding form:', error);
    throw error;
  }

  return data;
}

export async function updateOnboardingForm(id: string, updates: Partial<UgcOnboardingFormConfig>): Promise<UgcOnboardingFormConfig> {
  const { data, error } = await supabase
    .from('ugc_onboarding_form_configs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating onboarding form:', error);
    throw error;
  }

  return data;
}

// Helper functions to replace hardcoded statuses
export async function getOnboardingStatusesForBrand(brandId: string): Promise<string[]> {
  const statuses = await getCustomStatusesByCategory(brandId, 'onboarding');
  return statuses.map(status => status.status_name);
}

export async function getScriptPipelineStatusesForBrand(brandId: string): Promise<string[]> {
  const statuses = await getCustomStatusesByCategory(brandId, 'script_pipeline');
  return statuses.map(status => status.status_name);
}

export async function getContractStatusesForBrand(brandId: string): Promise<string[]> {
  const statuses = await getCustomStatusesByCategory(brandId, 'negotiation');
  return statuses.map(status => status.status_name);
}

export async function getProductionStatusesForBrand(brandId: string): Promise<string[]> {
  const statuses = await getCustomStatusesByCategory(brandId, 'production');
  return statuses.map(status => status.status_name);
}

export async function getDeliveryStatusesForBrand(brandId: string): Promise<string[]> {
  const statuses = await getCustomStatusesByCategory(brandId, 'delivery');
  return statuses.map(status => status.status_name);
} 