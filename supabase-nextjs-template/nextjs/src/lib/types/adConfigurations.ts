import { SiteLink, AdvantageCreativeEnhancements } from '@/components/ad-upload-tool/adUploadTypes';

// Configuration settings that can be saved
export interface AdConfigurationSettings {
  campaignId: string | null;
  campaignName?: string | null; // Store campaign name for display
  adSetId: string | null;
  adSetName?: string | null; // Store ad set name for display
  // Meta account settings with names for display
  adAccountId?: string | null;
  adAccountName?: string | null; // Store ad account name for display
  fbPage?: string;
  fbPageName?: string | null; // Store Facebook page name for display
  igAccount?: string;
  igAccountName?: string | null; // Store Instagram account name for display
  pixel?: string;
  pixelName?: string | null; // Store pixel name for display
  urlParams: string;
  status: 'ACTIVE' | 'PAUSED';
  primaryText: string;
  headline: string;
  description: string;
  destinationUrl: string;
  callToAction: string;
  siteLinks: SiteLink[];
  advantageCreative: AdvantageCreativeEnhancements;
  // Use Page as Actor setting
  usePageAsActor?: boolean;
}

// Full configuration object
export interface AdConfiguration {
  id: string;
  user_id: string;
  brand_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  settings: AdConfigurationSettings;
  created_at: string;
  updated_at: string;
}

// For creating new configurations
export interface CreateAdConfigurationRequest {
  brand_id: string;
  name: string;
  description?: string;
  is_default?: boolean;
  settings: AdConfigurationSettings;
}

// For updating configurations
export interface UpdateAdConfigurationRequest {
  name?: string;
  description?: string;
  is_default?: boolean;
  settings?: AdConfigurationSettings;
} 