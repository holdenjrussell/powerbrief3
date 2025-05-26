export type AdCreativeStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DRAFT';

export interface AdDraftAsset {
  name: string;
  supabaseUrl: string;
  type: 'image' | 'video';
  aspectRatios?: string[];
}

export interface AdDraft {
  id: string;
  brandId?: string;
  adName: string;
  primaryText: string;
  headline?: string;
  description?: string;
  campaignId: string | null;
  campaignName?: string | null;
  adSetId: string | null;
  adSetName?: string | null;
  destinationUrl: string;
  callToAction: string; 
  assets: AdDraftAsset[];
  status: AdCreativeStatus;
  appStatus?: AppAdDraftStatus;
  // New Meta features
  siteLinks?: SiteLink[];
  advantageCreative?: AdvantageCreativeEnhancements;
  // PowerBrief context
  videoEditor?: string;
  strategist?: string;
}

export const callToActionOptions: readonly string[] = [
  'BOOK_TRAVEL', 'CALL_NOW', 'CONTACT_US', 'DOWNLOAD', 'GET_DIRECTIONS',
  'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'SUBSCRIBE', 'WATCH_MORE', 'NO_BUTTON'
] as const;

export const adCreativeStatusOptions: readonly AdCreativeStatus[] = ['DRAFT', 'PAUSED', 'ACTIVE', 'ARCHIVED'] as const;

// New type and options for internal app status
export type AppAdDraftStatus = 'DRAFT' | 'UPLOADING' | 'UPLOADED' | 'PUBLISHED' | 'ERROR';

export const appAdDraftStatusOptions: readonly AppAdDraftStatus[] = [
  'DRAFT',
  'UPLOADING',
  'UPLOADED',
  'PUBLISHED',
  'ERROR'
] as const;

// For the modal, specific to what can be edited in bulk
export type BulkEditableAdDraftFields = {
  primaryText?: string;
  headline?: string;
  description?: string;
  campaignId?: string | null;
  adSetId?: string | null;
  destinationUrl?: string;
  callToAction?: string;
  status?: AdCreativeStatus;
  appStatus?: AppAdDraftStatus;
  brandId?: string;
};

// Used in AdSheetView for column definitions
export interface ColumnDef<TData> {
  id: Extract<keyof TData, string> | 'actions' | 'select';
  label: string;
  visible: boolean;
  type: 'text' | 'textarea' | 'select' | 'url' | 'custom' | 'status' | 'appStatus';
  options?: string[]; // For select type columns
}

// Used by AssetImportModal and AdSheetView
export interface ImportedAssetGroup {
  groupName: string;
  files: Array<{ id: string; name: string; supabaseUrl: string; type: 'image' | 'video'; detectedAspectRatio?: string }>;
  aspectRatiosDetected?: string[];
}

// Copied from AdSheetView, needs to be shared or passed if BulkEditModal uses it directly.
// For now, assuming BulkEditModal might need it if it evolves to use DefaultValues for pre-filling.
export interface AdSheetDefaultValues {
  brandId: string | null;
  adAccountId: string | null;
  campaignId: string | null;
  campaignName?: string | null;
  adSetId: string | null;
  adSetName?: string | null;
  fbPage: string;
  igAccount: string;
  urlParams: string;
  pixel: string;
  status: 'ACTIVE' | 'PAUSED';
  primaryText: string; 
  headline: string;    
  description: string; 
  destinationUrl: string; 
  callToAction: string;
  // New Meta features
  siteLinks: SiteLink[];
  advantageCreative: AdvantageCreativeEnhancements;
}

// New interfaces for Meta advertising features
export interface SiteLink {
  site_link_title: string;
  site_link_url: string;
  site_link_image_hash?: string;
  site_link_image_url?: string;
  is_site_link_sticky?: boolean;  // Added from official docs
  site_link_hash?: string;        // Added from official docs (computed during creation)
}

export interface AdvantageCreativeEnhancements {
  // Advantage+ Creative features that can be opted-in
  inline_comment: boolean;           // Relevant comments
  image_templates: boolean;          // Add overlays  
  image_touchups: boolean;           // Visual touch-ups
  video_auto_crop: boolean;          // Visual touch-ups for video
  image_brightness_and_contrast: boolean; // Adjust brightness and contrast
  enhance_cta: boolean;              // Enhance CTA
  text_optimizations: boolean;       // Text improvements
  image_uncrop: boolean;             // Expand image
  adapt_to_placement: boolean;       // Adapt to placement
  media_type_automation: boolean;    // Media type automation
  product_extensions: boolean;       // Product extensions
  description_automation: boolean;   // Description automation
  add_text_overlay: boolean;         // Add text overlay
  site_extensions: boolean;          // Site extensions
  // New enhancements
  music: boolean;                    // Add music to videos
  '3d_animation': boolean;           // Add 3D animation effects
  translate_text: boolean;           // Translate text for different audiences
} 