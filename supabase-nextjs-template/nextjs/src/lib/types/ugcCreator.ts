import { Json } from '../types';

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
  b_roll_shot_list?: string[];
  ai_custom_prompt?: string | null;
  system_instructions?: string | null;
  hook_type?: string;
  hook_count?: number;
  final_content_link?: string | null;
  linked_brief_concept_id?: string | null;
  linked_brief_batch_id?: string | null;
  original_creator_script?: string | null;
  creator_footage?: string | null;
  public_share_id?: string | null;
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
  b_roll_shot_list?: Json;
  ai_custom_prompt?: string | null;
  system_instructions?: string | null;
  hook_type?: string;
  hook_count?: number;
  final_content_link?: string | null;
  linked_brief_concept_id?: string | null;
  linked_brief_batch_id?: string | null;
  original_creator_script?: string | null;
  creator_footage?: string | null;
  public_share_id?: string | null;
  created_at: string;
  updated_at: string;
};

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

export const UGC_CREATOR_SCRIPT_STATUSES = [
  'NEW CREATOR SUBMISSION',
  'COLD OUTREACH',
  'PRIMARY SCREEN',
  'BACKLOG',
  'APPROVED FOR NEXT STEPS',
  'SCHEDULE CALL',
  'CALL SCHEDULED',
  'SCRIPT ASSIGNMENT',
  'SCRIPT ASSIGNED',
  'CONTRACT SENT',
  'PRODUCT SHIPMENT',
  'CREATOR FILMING',
  'FINAL CONTENT UPLOAD',
  'CONTENT UPLOADED',
  'READY FOR PAYMENT',
  'COMPLETED',
  'INACTIVE/REJECTED'
];

export const UGC_CREATOR_SCRIPT_CONCEPT_STATUSES = [
  'Script Approval',
  'Creator Assignment',
  'Creator Shooting',
  'Content Approval',
  'To Edit'
]; 