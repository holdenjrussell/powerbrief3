export type CreatorFieldType = 
  | 'text' 
  | 'email' 
  | 'phone' 
  | 'url' 
  | 'textarea' 
  | 'select' 
  | 'multiselect' 
  | 'checkbox' 
  | 'number' 
  | 'date';

export type CreatorFieldGroup = 
  | 'basic' 
  | 'contact' 
  | 'address' 
  | 'social' 
  | 'demographics' 
  | 'business' 
  | 'custom' 
  | 'admin';

export interface CreatorFieldConfig {
  id: string;
  brand_id: string;
  field_name: string;
  field_type: CreatorFieldType;
  field_label: string;
  field_placeholder?: string;
  field_description?: string;
  is_required: boolean;
  is_visible_on_form: boolean;
  is_visible_in_editor: boolean;
  is_protected: boolean;
  display_order: number;
  field_options: string[];
  validation_rules: Record<string, string | number | boolean>;
  field_group: CreatorFieldGroup;
  created_at: string;
  updated_at: string;
}

export interface CreatorFieldValue {
  field_name: string;
  value: string | number | boolean | string[] | null;
}

export interface CreatorFieldValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'url';
  value?: string | number;
  message?: string;
}

export interface CreateCreatorFieldConfig {
  brand_id: string;
  field_name: string;
  field_type: CreatorFieldType;
  field_label: string;
  field_placeholder?: string;
  field_description?: string;
  is_required?: boolean;
  is_visible_on_form?: boolean;
  is_visible_in_editor?: boolean;
  display_order?: number;
  field_options?: string[];
  validation_rules?: Record<string, string | number | boolean>;
  field_group?: CreatorFieldGroup;
}

export interface UpdateCreatorFieldConfig {
  field_label?: string;
  field_placeholder?: string;
  field_description?: string;
  is_required?: boolean;
  is_visible_on_form?: boolean;
  is_visible_in_editor?: boolean;
  display_order?: number;
  field_options?: string[];
  validation_rules?: Record<string, string | number | boolean>;
  field_group?: CreatorFieldGroup;
}

// Protected fields that cannot be deleted or have core properties changed
export const PROTECTED_CREATOR_FIELDS = [
  'name',
  'email', 
  'phone_number',
  'address_line1',
  'address_line2', 
  'city',
  'state',
  'zip',
  'country',
  'status',
  'contract_status',
  'product_shipped',
  'product_shipment_status',
  'tracking_number',
  'contacted_by'
] as const;

// Fields that should not be visible on the public onboarding form
export const ADMIN_ONLY_FIELDS = [
  'status',
  'contract_status', 
  'product_shipped',
  'product_shipment_status',
  'tracking_number',
  'contacted_by'
] as const;

// Default field groups with their display names and descriptions
export const FIELD_GROUPS: Record<CreatorFieldGroup, { label: string; description: string; icon: string }> = {
  basic: {
    label: 'Basic Information',
    description: 'Essential creator details',
    icon: 'User'
  },
  contact: {
    label: 'Contact Information', 
    description: 'Phone and communication details',
    icon: 'Phone'
  },
  address: {
    label: 'Address Information',
    description: 'Shipping and location details', 
    icon: 'MapPin'
  },
  social: {
    label: 'Social Media',
    description: 'Social platform handles and portfolio',
    icon: 'Instagram'
  },
  demographics: {
    label: 'Demographics',
    description: 'Age, gender, and audience info',
    icon: 'Users'
  },
  business: {
    label: 'Business Details',
    description: 'Rates, contracts, and business info',
    icon: 'DollarSign'
  },
  custom: {
    label: 'Custom Fields',
    description: 'Brand-specific questions',
    icon: 'Settings'
  },
  admin: {
    label: 'Admin Only',
    description: 'Internal tracking fields',
    icon: 'Shield'
  }
};

// Default field types with their configurations
export const FIELD_TYPE_CONFIGS: Record<CreatorFieldType, {
  label: string;
  description: string;
  supportsOptions: boolean;
  supportsValidation: string[];
}> = {
  text: {
    label: 'Text Input',
    description: 'Single line text field',
    supportsOptions: false,
    supportsValidation: ['required', 'minLength', 'maxLength', 'pattern']
  },
  email: {
    label: 'Email Address',
    description: 'Email input with validation',
    supportsOptions: false,
    supportsValidation: ['required', 'email']
  },
  phone: {
    label: 'Phone Number',
    description: 'Phone number input',
    supportsOptions: false,
    supportsValidation: ['required', 'pattern']
  },
  url: {
    label: 'Website URL',
    description: 'URL input with validation',
    supportsOptions: false,
    supportsValidation: ['required', 'url']
  },
  textarea: {
    label: 'Text Area',
    description: 'Multi-line text field',
    supportsOptions: false,
    supportsValidation: ['required', 'minLength', 'maxLength']
  },
  select: {
    label: 'Dropdown Select',
    description: 'Single choice from options',
    supportsOptions: true,
    supportsValidation: ['required']
  },
  multiselect: {
    label: 'Multi-Select',
    description: 'Multiple choices from options',
    supportsOptions: true,
    supportsValidation: ['required']
  },
  checkbox: {
    label: 'Checkbox',
    description: 'True/false toggle',
    supportsOptions: false,
    supportsValidation: ['required']
  },
  number: {
    label: 'Number Input',
    description: 'Numeric input field',
    supportsOptions: false,
    supportsValidation: ['required', 'min', 'max']
  },
  date: {
    label: 'Date Picker',
    description: 'Date selection field',
    supportsOptions: false,
    supportsValidation: ['required']
  }
}; 