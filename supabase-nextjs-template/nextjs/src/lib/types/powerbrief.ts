import { Json } from "./supabase";

// Product models
export interface Product {
  id: string;
  brand_id: string;
  user_id: string;
  name: string;
  identifier?: string; // Product identifier/SKU - now optional
  description?: string;
  category?: string;
  price?: number; // Regular price
  msrp?: number; // Manufacturer's Suggested Retail Price
  sale_price?: number; // Sale/discounted price
  currency?: string;
  image_url?: string;
  product_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Brand models
export interface BrandInfoData {
  positioning: string;
  product: string;
  technology: string;
  testimonials: string;
  healthBenefits: string;
  targetAudienceSummary: string;
  brandVoice: string;
  competitiveAdvantage: string;
  videoInstructions: string;
  designerInstructions: string;
  [key: string]: Json | undefined;
}

export interface EditingResource {
  name: string;
  url: string;
}

export interface ResourceLogin {
  resourceName: string;
  username: string;
  password: string;
}

export interface DosAndDonts {
  imagesDos: string[];
  imagesDonts: string[];
  videosDos: string[];
  videosDonts: string[];
}

export interface TargetAudienceData {
  gender: string;
  age: string;
  topSpendingDemographics: string;
  location: string;
  characteristics: string;
  [key: string]: Json | undefined;
}

export interface CompetitionData {
  competitorAdLibraries: string;
  notes: string;
  [key: string]: Json | undefined;
}

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  brand_info_data: BrandInfoData;
  target_audience_data: TargetAudienceData;
  competition_data: CompetitionData;
  editing_resources?: EditingResource[];
  resource_logins?: ResourceLogin[];
  dos_and_donts?: DosAndDonts;
  default_video_instructions?: string;
  default_designer_instructions?: string;
  system_instructions_image?: string;
  system_instructions_video?: string;
  elevenlabs_api_key?: string;
  adAccountId?: string;
  // Meta Integration fields
  meta_access_token?: string | null;
  meta_access_token_iv?: string | null;
  meta_access_token_auth_tag?: string | null;
  meta_access_token_expires_at?: string | null;
  meta_user_id?: string | null;
  meta_ad_account_id?: string | null;
  meta_facebook_page_id?: string | null;
  meta_instagram_actor_id?: string | null;
  meta_pixel_id?: string | null;
  // Slack Integration fields
  slack_webhook_url?: string | null;
  slack_channel_name?: string | null;
  slack_notifications_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

// Editor interface for saved editors
export interface Editor {
  id: string;
  brand_id: string;
  user_id: string;
  name: string;
  email?: string;
  role: 'editor' | 'designer' | 'video_editor' | 'both';
  specialties?: string[]; // e.g., ['video', 'image', 'motion_graphics']
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Brief Batch models
export interface BriefBatch {
  id: string;
  name: string;
  brand_id: string;
  user_id: string;
  content_type?: string; // Content type for the batch (ads, email, sms, etc.)
  created_at: string;
  status?: string | null;
  shared_with?: string[] | null;
  share_settings?: Record<string, ShareSettings> | null;
  starting_concept_number?: number;
  updated_at: string;
}

// Brief Concept models
export interface Scene {
  scene_title: string;
  script: string;
  visuals: string;
  [key: string]: Json | undefined;
}

export interface Hook {
  id: string;
  title: string;
  content: string;
}

export interface CustomLink {
  id: string;
  name: string;
  url: string;
}

export interface Prerequisite {
  id: string;
  type: 'AI Voiceover' | 'UGC Script' | 'UGC B Roll' | 'AI UGC' | 'AI B Roll' | 'Stock Footage' | 'Custom Animation' | string;
  completed: boolean;
}

export interface BriefConcept {
  id: string;
  brief_batch_id: string;
  user_id: string;
  concept_title: string;
  body_content_structured: Scene[];
  order_in_batch: number;
  created_at: string;
  updated_at: string;
  clickup_id: string | null;
  clickup_link: string | null;
  custom_links: CustomLink[];
  prerequisites: Prerequisite[];
  strategist: string | null;
  creative_coordinator: string | null;
  video_editor: string | null;
  editor_id: string | null;
  custom_editor_name: string | null;
  status: string | null;
  date_assigned: string | null;
  media_url: string | null;
  media_type: string | null;
  ai_custom_prompt: string | null;
  text_hook_options: Hook[] | null;
  spoken_hook_options: Hook[] | null;
  cta_script: string | null;
  cta_text_overlay: string | null;
  description: string | null;
  videoInstructions: string | null;
  designerInstructions: string | null;
  review_status: 'pending' | 'ready_for_review' | 'approved' | 'needs_revisions' | null;
  review_link: string | null;
  review_comments: string | null;
  brief_revision_comments: string | null;
  hook_type: 'text' | 'verbal' | 'both' | null;
  hook_count: number | null;
  product_id: string | null;
}

// AI Generation models
export interface AiBriefingRequest {
  brandContext: {
    brand_info_data: string | null;
    target_audience_data: string | null;
    competition_data: string | null;
    system_instructions_image: string | null;
    system_instructions_video: string | null;
    product_info?: {
      name: string;
      identifier: string;
      description?: string;
      category?: string;
      price?: number;
      currency?: string;
    } | null;
  };
  conceptSpecificPrompt: string;
  conceptCurrentData: {
    text_hook_options?: string[];
    spoken_hook_options?: string[];
    body_content_structured?: Scene[];
    cta_script?: string;
    cta_text_overlay?: string;
    description?: string;
  };
  media?: {
    url: string;
    type: string;
  };
  inspirationFiles?: string[]; // Array of file URLs for multimodal analysis
  desiredOutputFields: string[];
  hookOptions?: {
    type: 'text' | 'verbal' | 'both';
    count: number;
  };
}

export interface AiBriefingResponse {
  text_hook_options: string[];
  spoken_hook_options: string[];
  body_content_structured_scenes: Scene[];
  cta_script: string;
  cta_text_overlay: string;
  description?: string;
}

// Type helpers for database interactions
export type DbBrand = {
  id: string;
  user_id: string;
  name: string;
  brand_info_data: Json;
  target_audience_data: Json;
  competition_data: Json;
  editing_resources?: Json;
  resource_logins?: Json;
  dos_and_donts?: Json;
  default_video_instructions?: string;
  default_designer_instructions?: string;
  system_instructions_image?: string;
  system_instructions_video?: string;
  elevenlabs_api_key?: string;
  created_at: string;
  updated_at: string;
};

export type DbBriefBatch = {
  id: string;
  name: string;
  brand_id: string;
  user_id: string;
  content_type?: string; // Content type for the batch (ads, email, sms, etc.)
  created_at: string;
  status?: string | null;
  shared_with?: string[] | null;
  share_settings?: Json | null;
  starting_concept_number?: number;
  updated_at: string;
};

export type DbBriefConcept = {
  id: string;
  brief_batch_id: string;
  user_id: string;
  concept_title: string;
  clickup_id: string | null;
  clickup_link: string | null;
  custom_links: Json | null;
  prerequisites: Json | null;
  strategist: string | null;
  creative_coordinator: string | null;
  video_editor: string | null;
  editor_id: string | null;
  custom_editor_name: string | null;
  status: string | null;
  date_assigned: string | null;
  media_url: string | null;
  media_type: string | null;
  ai_custom_prompt: string | null;
  text_hook_options: Json | null;
  spoken_hook_options: Json | null;
  body_content_structured: Json;
  cta_script: string | null;
  cta_text_overlay: string | null;
  description: string | null;
  videoInstructions: string | null;
  designerInstructions: string | null;
  hook_type?: string | null;
  hook_count?: number | null;
  order_in_batch: number;
  share_settings?: Json | null;
  shared_with?: string[] | null;
  review_status?: string | null;
  review_link?: string | null;
  reviewer_notes?: string | null;
  brief_revision_comments?: string | null;
  created_at: string;
  updated_at: string;
};

export interface ShareSettings {
  is_editable: boolean;
  expires_at: string | null;
  email?: string;
  share_type?: 'link' | 'email';
  created_at?: string;
}

export interface ShareResult {
  share_id: string;
  share_url: string;
}

// New interfaces for asset management
export interface UploadedAsset {
  id: string;
  name: string;
  supabaseUrl: string;
  type: 'image' | 'video';
  aspectRatio: string;
  baseName: string;
  uploadedAt: string;
  thumbnailUrl?: string;
}

export interface UploadedAssetGroup {
  baseName: string;
  assets: UploadedAsset[];
  aspectRatios: string[];
  uploadedAt: string;
}

// Editor-related utility types and interfaces
export interface EditorOption {
  type: 'saved' | 'custom';
  id?: string; // Only for saved editors
  name: string;
  email?: string;
  role?: string;
  specialties?: string[];
}

export interface ConceptEditorInfo {
  concept_id: string;
  brief_batch_id: string;
  editor_name: string | null;
  editor_type: 'saved' | 'custom' | 'legacy';
  editor_id: string | null;
  editor_email: string | null;
  editor_role: string | null;
  editor_specialties: string[] | null;
}

// Helper function type for getting editor display name
export type GetEditorDisplayName = (concept: BriefConcept) => string | null;

// Editor creation/update interfaces
export interface CreateEditorRequest {
  brand_id: string;
  name: string;
  email?: string;
  role: 'editor' | 'designer' | 'video_editor' | 'both';
  specialties?: string[];
  notes?: string;
}

export interface UpdateEditorRequest extends Partial<CreateEditorRequest> {
  id: string;
  is_active?: boolean;
}

export interface CreateBriefConceptInput {
  brief_batch_id: string;
  user_id: string;
  concept_title: string;
  body_content_structured: Scene[];
  order_in_batch: number;
  clickup_id: string | null;
  clickup_link: string | null;
  custom_links: CustomLink[];
  prerequisites: Prerequisite[];
  strategist: string | null;
  creative_coordinator: string | null;
  video_editor: string | null;
  editor_id: string | null;
  custom_editor_name: string | null;
  status: string | null;
  date_assigned: string | null;
  media_url: string | null;
  media_type: string | null;
  ai_custom_prompt: string | null;
  text_hook_options: Hook[] | null;
  spoken_hook_options: Hook[] | null;
  cta_script: string | null;
  cta_text_overlay: string | null;
  description: string | null;
  videoInstructions: string | null;
  designerInstructions: string | null;
  review_status: 'pending' | 'ready_for_review' | 'approved' | 'needs_revisions' | null;
  review_link: string | null;
  review_comments: string | null;
  brief_revision_comments: string | null;
  hook_type: 'text' | 'verbal' | 'both' | null;
  hook_count: number | null;
  product_id: string | null;
} 