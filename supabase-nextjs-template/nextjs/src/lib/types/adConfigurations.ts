import { SiteLink, AdvantageCreativeEnhancements } from '@/components/ad-upload-tool/adUploadTypes';

// Configuration settings that can be saved
export interface AdConfigurationSettings {
  campaignId: string | null;
  adSetId: string | null;
  urlParams: string;
  status: 'ACTIVE' | 'PAUSED';
  primaryText: string;
  headline: string;
  description: string;
  destinationUrl: string;
  callToAction: string;
  siteLinks: SiteLink[];
  advantageCreative: AdvantageCreativeEnhancements;
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