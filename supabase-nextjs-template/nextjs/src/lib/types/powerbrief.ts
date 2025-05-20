import { Json } from "../types";

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
  default_video_instructions?: string;
  default_designer_instructions?: string;
  system_instructions_image?: string;
  system_instructions_video?: string;
  created_at: string;
  updated_at: string;
}

// Brief Batch models
export interface BriefBatch {
  id: string;
  name: string;
  brand_id: string;
  user_id: string;
  created_at: string;
  status?: string | null;
  shared_with?: string[] | null;
  share_settings?: Record<string, ShareSettings> | null;
  updated_at: string;
}

// Brief Concept models
export interface Scene {
  scene_title: string;
  script: string;
  visuals: string;
  [key: string]: Json | undefined;
}

export interface BriefConcept {
  id: string;
  brief_batch_id: string;
  user_id: string;
  concept_title: string;
  body_content_structured: Scene[];
  order_in_batch: number;
  clickup_id: string | null;
  clickup_link: string | null;
  strategist: string | null;
  video_editor: string | null;
  status: string | null;
  media_url: string | null;
  media_type: string | null;
  ai_custom_prompt: string | null;
  caption_hook_options: string | null;
  cta_script: string | null;
  cta_text_overlay: string | null;
  videoInstructions: string | null;
  designerInstructions: string | null;
  shared_with?: string[] | null;
  share_settings?: Record<string, ShareSettings> | null;
  review_status?: 'pending' | 'ready_for_review' | 'approved' | 'needs_revisions' | null;
  review_link?: string | null;
  reviewer_notes?: string | null;
  created_at: string;
  updated_at: string;
}

// AI Generation models
export interface AiBriefingRequest {
  brandContext: {
    brand_info_data: BrandInfoData;
    target_audience_data: TargetAudienceData;
    competition_data: CompetitionData;
    system_instructions_image?: string;
    system_instructions_video?: string;
  };
  conceptSpecificPrompt: string;
  conceptCurrentData?: {
    caption_hook_options?: string;
    body_content_structured?: Scene[];
    cta_script?: string;
    cta_text_overlay?: string;
  };
  media?: {
    url: string;
    type: string;
  };
  desiredOutputFields: string[];
}

export interface AiBriefingResponse {
  caption_hook_options?: string;
  body_content_structured_scenes?: Scene[];
  cta_script?: string;
  cta_text_overlay?: string;
}

// Type helpers for database interactions
export type DbBrand = {
  id: string;
  user_id: string;
  name: string;
  brand_info_data: Json;
  target_audience_data: Json;
  competition_data: Json;
  default_video_instructions?: string;
  default_designer_instructions?: string;
  system_instructions_image?: string;
  system_instructions_video?: string;
  created_at: string;
  updated_at: string;
};

export type DbBriefBatch = {
  id: string;
  name: string;
  brand_id: string;
  user_id: string;
  created_at: string;
  status?: string | null;
  shared_with?: string[] | null;
  share_settings?: Record<string, ShareSettings> | null;
  updated_at: string;
};

export type DbBriefConcept = {
  id: string;
  brief_batch_id: string;
  user_id: string;
  concept_title: string;
  clickup_id: string | null;
  clickup_link: string | null;
  strategist: string | null;
  video_editor: string | null;
  status: string | null;
  media_url: string | null;
  media_type: string | null;
  ai_custom_prompt: string | null;
  caption_hook_options: string | null;
  body_content_structured: Json;
  cta_script: string | null;
  cta_text_overlay: string | null;
  videoInstructions: string | null;
  designerInstructions: string | null;
  order_in_batch: number;
  share_settings?: Record<string, ShareSettings> | null;
  shared_with?: string[] | null;
  review_status?: string | null;
  review_link?: string | null;
  reviewer_notes?: string | null;
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