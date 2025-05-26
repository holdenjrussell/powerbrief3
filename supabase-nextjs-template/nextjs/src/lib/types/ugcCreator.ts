import { Json } from './supabase';

// UGC Creator models
export interface UgcCreator {
  id: string;
  user_id: string;
  brand_id: string;
  name: string;
  gender?: string | null;
  status?: string;
  products?: string[];
  content_types?: string[];
  contract_status?: string;
  product_shipment_status?: string;
  product_shipped?: boolean;
  tracking_number?: string | null;
  portfolio_link?: string | null;
  per_script_fee?: number | null;
  email?: string | null;
  phone_number?: string | null;
  instagram_handle?: string | null;
  tiktok_handle?: string | null;
  platforms?: string[];
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  contacted_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScriptSegment {
  segment: string;
  script: string;
  visuals: string;
}

export interface UgcCreatorScript {
  id: string;
  creator_id: string;
  user_id: string;
  brand_id: string;
  title: string;
  script_content: {
    scene_start?: string;
    segments?: ScriptSegment[];
    scene_end?: string;
  };
  status?: string;
  concept_status?: string;
  revision_notes?: string | null;
  b_roll_shot_list?: string[];
  ai_custom_prompt?: string | null;
  system_instructions?: string | null;
  hook_type?: string;
  hook_count?: number;
  hook_body?: string | null;
  cta?: string | null;
  company_description?: string | null;
  guide_description?: string | null;
  filming_instructions?: string | null;
  media_type?: string;
  final_content_link?: string | null;
  linked_brief_concept_id?: string | null;
  linked_brief_batch_id?: string | null;
  original_creator_script?: string | null;
  creator_footage?: string | null;
  public_share_id?: string | null;
  inspiration_video_url?: string | null;
  inspiration_video_notes?: string | null;
  is_ai_generated?: boolean;
  creative_strategist?: string | null;
  // Payment tracking fields
  payment_status?: string | null;
  deposit_amount?: number | null;
  final_payment_amount?: number | null;
  payment_notes?: string | null;
  deposit_paid_date?: string | null;
  final_payment_paid_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UgcScriptShare {
  id: string;
  creator_id: string;
  user_id: string;
  brand_id: string;
  share_id: string;
  scripts: string[];
  created_at: string;
  updated_at: string;
}

export type DbUgcCreator = {
  id: string;
  user_id: string;
  brand_id: string;
  name: string;
  gender?: string | null;
  status?: string;
  products?: Json;
  content_types?: Json;
  contract_status?: string;
  product_shipment_status?: string;
  product_shipped?: boolean;
  tracking_number?: string | null;
  portfolio_link?: string | null;
  per_script_fee?: number | null;
  email?: string | null;
  phone_number?: string | null;
  instagram_handle?: string | null;
  tiktok_handle?: string | null;
  platforms?: Json;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  contacted_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type DbUgcCreatorScript = {
  id: string;
  creator_id: string;
  user_id: string;
  brand_id: string;
  title: string;
  script_content: Json;
  status?: string;
  concept_status?: string;
  revision_notes?: string | null;
  b_roll_shot_list?: Json;
  ai_custom_prompt?: string | null;
  system_instructions?: string | null;
  hook_type?: string;
  hook_count?: number;
  hook_body?: string | null;
  cta?: string | null;
  company_description?: string | null;
  guide_description?: string | null;
  filming_instructions?: string | null;
  media_type?: string;
  final_content_link?: string | null;
  linked_brief_concept_id?: string | null;
  linked_brief_batch_id?: string | null;
  original_creator_script?: string | null;
  creator_footage?: string | null;
  public_share_id?: string | null;
  inspiration_video_url?: string | null;
  inspiration_video_notes?: string | null;
  is_ai_generated?: boolean;
  creative_strategist?: string | null;
  // Payment tracking fields
  payment_status?: string | null;
  deposit_amount?: number | null;
  final_payment_amount?: number | null;
  payment_notes?: string | null;
  deposit_paid_date?: string | null;
  final_payment_paid_date?: string | null;
  created_at: string;
  updated_at: string;
};

export type DbUgcScriptShare = {
  id: string;
  creator_id: string;
  user_id: string;
  brand_id: string;
  share_id: string;
  scripts: Json;
  created_at: string;
  updated_at: string;
};

// Extended brand type with UGC fields
export interface UgcBrandFields {
  ugc_filming_instructions?: string | null;
  ugc_company_description?: string | null;
  ugc_guide_description?: string | null;
  ugc_default_system_instructions?: string | null;
}

// UGC Creator Pipeline status options
export const UGC_CREATOR_STATUSES = [
  'Active',
  'Inactive',
  'Paused',
  'Active in Slack'
];

export const UGC_CREATOR_CONTRACT_STATUSES = [
  'not signed',
  'contract sent',
  'contract signed'
];

export const UGC_CREATOR_PRODUCT_SHIPMENT_STATUSES = [
  'Not Shipped',
  'Processing',
  'Shipped',
  'Delivered',
  'Returned'
];

export const UGC_CREATOR_SCRIPT_STATUSES = [
  'PENDING_APPROVAL',
  'REVISION_REQUESTED', 
  'APPROVED',
  'CREATOR_REASSIGNMENT',
  'SCRIPT_ASSIGNED',
  'CREATOR_APPROVED',
  'CONTENT_REVISION_REQUESTED',
  'CONTENT_SUBMITTED',
  'COMPLETED'
];

export const UGC_CREATOR_ONBOARDING_STATUSES = [
  'New Creator Submission',
  'Cold Outreach',
  'Primary Screen',
  'Backlog',
  'Approved for Next Steps',
  'Schedule Call',
  'Call Schedule Attempted',
  'Call Scheduled',
  'READY FOR SCRIPTS'
];

export const UGC_CREATOR_SCRIPT_CONCEPT_STATUSES = [
  'Script Approval',
  'Creator Assignment',
  'Send Script to Creator',
  'Creator Shooting',
  'Content Approval',
  'To Edit'
];

export const UGC_SCRIPT_PAYMENT_STATUSES = [
  'No Payment Due',
  'Deposit Due', 
  'Deposit Paid',
  'Final Payment Due',
  'Fully Paid'
];

export const UGC_CREATOR_GENDERS = [
  'Male',
  'Female',
  'Other'
];

export const UGC_CREATOR_MEDIA_TYPES = [
  'video',
  'image',
  'text'
]; 