import { createSPAClient } from '@/lib/supabase/client';
import {
  CreatorFieldConfig,
  CreateCreatorFieldConfig,
  UpdateCreatorFieldConfig,
  CreatorFieldGroup,
  PROTECTED_CREATOR_FIELDS
} from '@/lib/types/ugcCreatorFields';

const supabase = createSPAClient();

// Get all field configurations for a brand
export async function getCreatorFieldConfigs(brandId: string): Promise<CreatorFieldConfig[]> {
  const { data, error } = await supabase
    .from('ugc_creator_field_configs')
    .select('*')
    .eq('brand_id', brandId)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching creator field configs:', error);
    throw error;
  }

  return data || [];
}

// Get field configurations visible on the public onboarding form
export async function getPublicFormFieldConfigs(brandId: string): Promise<CreatorFieldConfig[]> {
  const { data, error } = await supabase
    .from('ugc_creator_field_configs')
    .select('*')
    .eq('brand_id', brandId)
    .eq('is_visible_on_form', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching public form field configs:', error);
    throw error;
  }

  return data || [];
}

// Get field configurations visible in the creator editor
export async function getEditorFieldConfigs(brandId: string): Promise<CreatorFieldConfig[]> {
  const { data, error } = await supabase
    .from('ugc_creator_field_configs')
    .select('*')
    .eq('brand_id', brandId)
    .eq('is_visible_in_editor', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching editor field configs:', error);
    throw error;
  }

  return data || [];
}

// Get field configurations grouped by field_group
export async function getGroupedFieldConfigs(brandId: string): Promise<Record<CreatorFieldGroup, CreatorFieldConfig[]>> {
  const configs = await getCreatorFieldConfigs(brandId);
  
  const grouped: Record<CreatorFieldGroup, CreatorFieldConfig[]> = {
    basic: [],
    contact: [],
    address: [],
    social: [],
    demographics: [],
    business: [],
    custom: [],
    admin: []
  };

  configs.forEach(config => {
    grouped[config.field_group].push(config);
  });

  return grouped;
}

// Create a new field configuration
export async function createCreatorFieldConfig(config: CreateCreatorFieldConfig): Promise<CreatorFieldConfig> {
  // Validate field name is unique for this brand
  const { data: existing } = await supabase
    .from('ugc_creator_field_configs')
    .select('id')
    .eq('brand_id', config.brand_id)
    .eq('field_name', config.field_name)
    .single();

  if (existing) {
    throw new Error(`Field with name '${config.field_name}' already exists for this brand`);
  }

  const { data, error } = await supabase
    .from('ugc_creator_field_configs')
    .insert({
      ...config,
      is_protected: false, // New fields are never protected
      validation_rules: config.validation_rules || {},
      field_options: config.field_options || []
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating creator field config:', error);
    throw error;
  }

  return data;
}

// Update an existing field configuration
export async function updateCreatorFieldConfig(
  fieldId: string,
  updates: UpdateCreatorFieldConfig
): Promise<CreatorFieldConfig> {
  // First check if the field is protected
  const { data: existing, error: fetchError } = await supabase
    .from('ugc_creator_field_configs')
    .select('field_name, is_protected')
    .eq('id', fieldId)
    .single();

  if (fetchError) {
    console.error('Error fetching field config:', fetchError);
    throw fetchError;
  }

  if (existing?.is_protected) {
    // For protected fields, only allow certain updates
    const allowedUpdates: Partial<UpdateCreatorFieldConfig> = {};
    
    // Protected fields can only update these properties
    if (updates.field_label !== undefined) allowedUpdates.field_label = updates.field_label;
    if (updates.field_placeholder !== undefined) allowedUpdates.field_placeholder = updates.field_placeholder;
    if (updates.field_description !== undefined) allowedUpdates.field_description = updates.field_description;
    if (updates.display_order !== undefined) allowedUpdates.display_order = updates.display_order;
    if (updates.field_options !== undefined) allowedUpdates.field_options = updates.field_options;
    
    // For admin-only fields, allow visibility changes in editor but not form
    if (existing.field_name.startsWith('status') || existing.field_name.startsWith('contract') || 
        existing.field_name.startsWith('product') || existing.field_name.startsWith('tracking') ||
        existing.field_name === 'contacted_by') {
      if (updates.is_visible_in_editor !== undefined) {
        allowedUpdates.is_visible_in_editor = updates.is_visible_in_editor;
      }
    } else {
      // Core fields can have visibility changed
      if (updates.is_visible_on_form !== undefined) allowedUpdates.is_visible_on_form = updates.is_visible_on_form;
      if (updates.is_visible_in_editor !== undefined) allowedUpdates.is_visible_in_editor = updates.is_visible_in_editor;
    }

    updates = allowedUpdates;
  }

  const { data, error } = await supabase
    .from('ugc_creator_field_configs')
    .update(updates)
    .eq('id', fieldId)
    .select()
    .single();

  if (error) {
    console.error('Error updating creator field config:', error);
    throw error;
  }

  return data;
}

// Delete a field configuration (only if not protected)
export async function deleteCreatorFieldConfig(fieldId: string): Promise<void> {
  // First check if the field is protected
  const { data: existing, error: fetchError } = await supabase
    .from('ugc_creator_field_configs')
    .select('field_name, is_protected')
    .eq('id', fieldId)
    .single();

  if (fetchError) {
    console.error('Error fetching field config:', fetchError);
    throw fetchError;
  }

  if (existing?.is_protected) {
    throw new Error(`Cannot delete protected field: ${existing.field_name}`);
  }

  const { error } = await supabase
    .from('ugc_creator_field_configs')
    .delete()
    .eq('id', fieldId);

  if (error) {
    console.error('Error deleting creator field config:', error);
    throw error;
  }
}

// Reorder field configurations
export async function reorderCreatorFieldConfigs(
  brandId: string,
  fieldOrders: { fieldId: string; order: number }[]
): Promise<void> {
  const updates = fieldOrders.map(({ fieldId, order }) => 
    supabase
      .from('ugc_creator_field_configs')
      .update({ display_order: order })
      .eq('id', fieldId)
      .eq('brand_id', brandId)
  );

  await Promise.all(updates);
}

// Initialize default field configurations for a new brand
export async function initializeDefaultFieldConfigs(brandId: string): Promise<void> {
  // This is handled by the database migration, but we can call it manually if needed
  // The migration already inserts default fields for all existing brands
  
  // Check if fields already exist
  const { data: existing } = await supabase
    .from('ugc_creator_field_configs')
    .select('id')
    .eq('brand_id', brandId)
    .limit(1);

  if (existing && existing.length > 0) {
    // Fields already exist, no need to initialize
    return;
  }

  // If no fields exist, the migration should have created them
  // This might happen if a brand was created after the migration
  console.warn(`No field configs found for brand ${brandId}. They should have been created by migration.`);
}

// Validate field configuration
export function validateFieldConfig(config: CreateCreatorFieldConfig | UpdateCreatorFieldConfig): string[] {
  const errors: string[] = [];

  // Check field name format (only for create)
  if ('field_name' in config) {
    if (!config.field_name || !/^[a-z_][a-z0-9_]*$/.test(config.field_name)) {
      errors.push('Field name must be lowercase with underscores only (e.g., "custom_field")');
    }

    if (PROTECTED_CREATOR_FIELDS.includes(config.field_name as typeof PROTECTED_CREATOR_FIELDS[number])) {
      errors.push(`Field name '${config.field_name}' is reserved and cannot be used`);
    }
  }

  // Check field label
  if (config.field_label && config.field_label.trim().length === 0) {
    errors.push('Field label cannot be empty');
  }

  // Check field options for select/multiselect fields
  if ('field_type' in config && (config.field_type === 'select' || config.field_type === 'multiselect')) {
    if (!config.field_options || config.field_options.length === 0) {
      errors.push('Select and multiselect fields must have at least one option');
    }
  }

  return errors;
}

// Get field configuration by field name
export async function getFieldConfigByName(brandId: string, fieldName: string): Promise<CreatorFieldConfig | null> {
  const { data, error } = await supabase
    .from('ugc_creator_field_configs')
    .select('*')
    .eq('brand_id', brandId)
    .eq('field_name', fieldName)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching field config by name:', error);
    throw error;
  }

  return data;
}

// Helper function to separate core fields from custom fields
export function separateCreatorFields(creatorData: Record<string, any>, fieldConfigs: CreatorFieldConfig[]) {
  const coreFields: Record<string, any> = {};
  const customFields: Record<string, any> = {};

  // Define core field names that have dedicated columns
  const coreFieldNames = [
    'name', 'email', 'phone_number', 'gender', 'status', 'contract_status',
    'product_shipped', 'product_shipment_status', 'tracking_number',
    'portfolio_link', 'per_script_fee', 'instagram_handle', 'tiktok_handle',
    'platforms', 'content_types', 'products', 'address_line1', 'address_line2',
    'city', 'state', 'zip', 'country', 'contacted_by'
  ];

  // Separate fields based on whether they have dedicated columns
  Object.entries(creatorData).forEach(([fieldName, value]) => {
    if (coreFieldNames.includes(fieldName)) {
      coreFields[fieldName] = value;
    } else {
      // Check if this is a custom field configured by the brand
      const fieldConfig = fieldConfigs.find(config => config.field_name === fieldName);
      if (fieldConfig && !fieldConfig.is_protected) {
        customFields[fieldName] = value;
      }
    }
  });

  return { coreFields, customFields };
}

// Helper function to merge core fields with custom fields for display
export function mergeCreatorFields(coreCreator: any, fieldConfigs: CreatorFieldConfig[]): Record<string, any> {
  const merged = { ...coreCreator };
  
  // Add custom fields from the custom_fields JSON column
  if (coreCreator.custom_fields) {
    Object.entries(coreCreator.custom_fields).forEach(([fieldName, value]) => {
      merged[fieldName] = value;
    });
  }

  return merged;
}

// Save creator data using hybrid approach
export async function saveCreatorWithCustomFields(
  brandId: string,
  creatorData: Record<string, any>,
  creatorId?: string
): Promise<any> {
  // Get field configurations for this brand
  const fieldConfigs = await getCreatorFieldConfigs(brandId);
  
  // Separate core fields from custom fields
  const { coreFields, customFields } = separateCreatorFields(creatorData, fieldConfigs);
  
  // Prepare the data for database insertion/update
  const dbData = {
    ...coreFields,
    custom_fields: customFields,
    brand_id: brandId
  };

  if (creatorId) {
    // Update existing creator
    const { data, error } = await supabase
      .from('ugc_creators')
      .update(dbData)
      .eq('id', creatorId)
      .eq('brand_id', brandId)
      .select()
      .single();

    if (error) {
      console.error('Error updating creator:', error);
      throw error;
    }

    return data;
  } else {
    // Create new creator
    const { data, error } = await supabase
      .from('ugc_creators')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('Error creating creator:', error);
      throw error;
    }

    return data;
  }
}

// Get creator data with custom fields merged
export async function getCreatorWithCustomFields(
  brandId: string,
  creatorId: string
): Promise<Record<string, any> | null> {
  // Get the creator data
  const { data: creator, error } = await supabase
    .from('ugc_creators')
    .select('*')
    .eq('id', creatorId)
    .eq('brand_id', brandId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching creator:', error);
    throw error;
  }

  // Get field configurations to properly merge data
  const fieldConfigs = await getCreatorFieldConfigs(brandId);
  
  // Merge core fields with custom fields
  return mergeCreatorFields(creator, fieldConfigs);
} 