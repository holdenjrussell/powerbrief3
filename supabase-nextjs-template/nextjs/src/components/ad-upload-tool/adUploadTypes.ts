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
  adSetId: string | null;
  destinationUrl: string;
  callToAction: string; 
  assets: AdDraftAsset[];
  status: AdCreativeStatus;
  appStatus?: AppAdDraftStatus;
}

export const callToActionOptions: readonly string[] = [
  'BOOK_TRAVEL', 'CALL_NOW', 'CONTACT_US', 'DOWNLOAD', 'GET_DIRECTIONS',
  'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'SUBSCRIBE', 'WATCH_MORE', 'NO_BUTTON'
] as const;

export const adCreativeStatusOptions: readonly AdCreativeStatus[] = ['DRAFT', 'PAUSED', 'ACTIVE', 'ARCHIVED'] as const;

// New type and options for internal app status
export type AppAdDraftStatus = 'DRAFT' | 'UPLOADING' | 'PUBLISHED' | 'ERROR';

export const appAdDraftStatusOptions: readonly AppAdDraftStatus[] = [
  'DRAFT',
  'UPLOADING', 
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
  files: Array<{ id: string; name: string; supabaseUrl: string; type: 'image' | 'video' }>;
  aspectRatiosDetected?: string[];
}

// Copied from AdSheetView, needs to be shared or passed if BulkEditModal uses it directly.
// For now, assuming BulkEditModal might need it if it evolves to use DefaultValues for pre-filling.
export interface AdSheetDefaultValues {
  brandId: string | null;
  adAccountId: string | null;
  campaignId: string | null;
  adSetId: string | null;
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
} 