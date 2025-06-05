"use client";
import React, { useState, useEffect } from 'react';
import AdSheetView from '@/components/ad-upload-tool/AdSheetView';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Loader2, Settings, ChevronDown, Save, Trash2 } from 'lucide-react';
import { SiteLink, AdvantageCreativeEnhancements } from '@/components/ad-upload-tool/adUploadTypes';
import { getBrands } from '@/lib/services/powerbriefService';
import { Brand as PowerBriefBrand } from '@/lib/types/powerbrief';
import SiteLinksManager from '@/components/ad-upload-tool/SiteLinksManager';
import AdvantageCreativeManager from '@/components/ad-upload-tool/AdvantageCreativeManager';
import MetaCampaignSelector from '@/components/ad-upload-tool/MetaCampaignSelector';
import MetaAdSetSelector from '@/components/ad-upload-tool/MetaAdSetSelector';
import { AdConfiguration, AdConfigurationSettings } from '@/lib/types/adConfigurations';

// Updated DefaultValues interface to include Meta features
interface DefaultValues {
  brandId: string | null;
  adAccountId: string | null;
  adAccountName?: string | null; // Store ad account name for display
  campaignId: string | null;
  campaignName?: string | null;
  adSetId: string | null;
  adSetName?: string | null;
  fbPage: string;
  fbPageName?: string | null; // Store Facebook page name for display
  igAccount: string;
  igAccountName?: string | null; // Store Instagram account name for display
  urlParams: string;
  pixel: string;
  pixelName?: string | null; // Store pixel name for display
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

interface MetaAccount {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface MetaConfig {
  adAccounts: MetaAccount[];
  facebookPages: MetaAccount[];
  instagramAccounts: MetaAccount[];
  pixels: MetaAccount[];
  manualPageLabels: Record<string, string>;
  manualInstagramLabels: Record<string, string>;
  manualInstagramPairings: Record<string, string>;
  usePageAsActor?: boolean;
  pageBackedInstagramAccounts?: Record<string, string>;
}

interface Brand {
  id: string;
  name: string;
  fbPage: string;
  fbPageName?: string;
  igAccount: string;
  igAccountName?: string;
  pixel: string;
  pixelName?: string;
  adAccountId: string;
  adAccountName?: string;
  // Meta accounts arrays for dropdowns
  metaAdAccounts?: MetaAccount[];
  metaFacebookPages?: MetaAccount[];
  metaInstagramAccounts?: MetaAccount[];
  metaPixels?: MetaAccount[];
  // Manual entry labels
  manualPageLabels?: Record<string, string>;
  manualInstagramLabels?: Record<string, string>;
  // Full Meta configuration for enhanced display
  metaConfig?: MetaConfig;
}

const AdUploadToolPage = () => {
  const { user } = useGlobal();
  const [currentDefaults, setCurrentDefaults] = useState<DefaultValues | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [configurations, setConfigurations] = useState<AdConfiguration[]>([]);
  const [selectedConfiguration, setSelectedConfiguration] = useState<AdConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [isLoadingConfigurations, setIsLoadingConfigurations] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSaveConfigModal, setShowSaveConfigModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load saved settings and brands on component mount
  useEffect(() => {
    if (user?.id) {
      loadInitialData();
    }
  }, [user?.id]);

  // Load configurations when brand changes (but not on initial load)
  useEffect(() => {
    if (selectedBrand?.id && !isInitialLoad) {
      loadConfigurations(selectedBrand.id, selectedBrand);
    } else if (!selectedBrand?.id) {
      setConfigurations([]);
      setSelectedConfiguration(null);
    }
  }, [selectedBrand?.id, isInitialLoad]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Load brands
      setIsLoadingBrands(true);
      const fetchedBrands: PowerBriefBrand[] = await getBrands(user!.id);
      
      // Enhanced brand mapping with Meta configuration
      const mappedBrands: Brand[] = await Promise.all(
        fetchedBrands.map(async (b) => {
          // Fetch Meta configuration for each brand to get names and labels
          let metaConfig = null;
          try {
            const metaResponse = await fetch(`/api/meta/brand-config?brandId=${b.id}`);
            if (metaResponse.ok) {
              const metaData = await metaResponse.json();
              metaConfig = metaData.config;
            }
          } catch (error) {
            console.error(`Error fetching Meta config for brand ${b.id}:`, error);
          }

          // Helper function to get display name for an account
          const getAccountDisplayName = (id: string, accounts: MetaAccount[], manualLabels: Record<string, string>) => {
            if (!id) return null;
            
            // Check manual labels first
            if (manualLabels[id]) {
              return manualLabels[id];
            }
            
            // Then check API accounts
            const account = accounts.find(acc => acc.id === id);
            return account?.name || null;
          };

          return {
            id: b.id,
            name: b.name,
            fbPage: b.meta_facebook_page_id || '',
            fbPageName: metaConfig ? getAccountDisplayName(
              b.meta_facebook_page_id || '', 
              metaConfig.facebookPages || [], 
              metaConfig.manualPageLabels || {}
            ) : null,
            igAccount: b.meta_instagram_actor_id || '',
            igAccountName: metaConfig ? getAccountDisplayName(
              b.meta_instagram_actor_id || '', 
              metaConfig.instagramAccounts || [], 
              metaConfig.manualInstagramLabels || {}
            ) : null,
            pixel: b.meta_pixel_id || '',
            pixelName: metaConfig ? getAccountDisplayName(
              b.meta_pixel_id || '', 
              metaConfig.pixels || [], 
              {}
            ) : null,
            adAccountId: b.meta_ad_account_id || '',
            adAccountName: metaConfig ? getAccountDisplayName(
              b.meta_ad_account_id || '', 
              metaConfig.adAccounts || [], 
              {}
            ) : null,
            // Include full Meta config for enhanced functionality
            metaConfig,
            // Legacy fields for backward compatibility
            metaAdAccounts: metaConfig?.adAccounts || [],
            metaFacebookPages: metaConfig?.facebookPages || [],
            metaInstagramAccounts: metaConfig?.instagramAccounts || [],
            metaPixels: metaConfig?.pixels || [],
            manualPageLabels: metaConfig?.manualPageLabels || {},
            manualInstagramLabels: metaConfig?.manualInstagramLabels || {},
          };
        })
      );
      
      setBrands(mappedBrands);
      setIsLoadingBrands(false);
      
      // Try to load saved settings from localStorage
      const savedSettings = localStorage.getItem(`ad-upload-settings-${user?.id}`);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Find and set the selected brand
        const brand = mappedBrands.find(b => b.id === settings.brandId);
        if (brand) {
          setSelectedBrand(brand);
          // Load configurations for the saved brand
          await loadConfigurations(brand.id, brand);
        } else {
          // If saved brand not found, just set the defaults
          setCurrentDefaults(settings);
        }
        console.log('Settings loaded from localStorage');
      }
      
      // Mark initial load as complete
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setIsLoadingBrands(false);
      setIsInitialLoad(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConfigurations = async (brandId: string, brand?: Brand) => {
    try {
      setIsLoadingConfigurations(true);
      const response = await fetch(`/api/ad-configurations?brandId=${brandId}`);
      if (response.ok) {
        const configs = await response.json();
        setConfigurations(configs);
        
        // Auto-select default configuration if exists
        const defaultConfig = configs.find((c: AdConfiguration) => c.is_default);
        if (defaultConfig) {
          console.log('[AdUploadToolPage] Found default configuration:', defaultConfig.name);
          setSelectedConfiguration(defaultConfig);
          loadConfigurationSettings(defaultConfig, brand);
          // Small delay to ensure state updates properly
          await new Promise(resolve => setTimeout(resolve, 100));
        } else if (configs.length > 0) {
          // If no default, select the first configuration
          console.log('[AdUploadToolPage] No default configuration found, selecting first available');
          const firstConfig = configs[0];
          setSelectedConfiguration(firstConfig);
          loadConfigurationSettings(firstConfig, brand);
          // Small delay to ensure state updates properly
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          console.log('[AdUploadToolPage] No configurations found for brand');
          // Create basic defaults when no configurations exist
          const brandToUse = brand || selectedBrand;
          if (brandToUse) {
            const defaults: DefaultValues = {
              brandId: brandToUse.id,
              adAccountId: brandToUse.adAccountId,
              adAccountName: brandToUse.adAccountName,
              campaignId: null,
              campaignName: null,
              adSetId: null,
              adSetName: null,
              fbPage: brandToUse.fbPage,
              fbPageName: brandToUse.fbPageName,
              igAccount: brandToUse.igAccount,
              igAccountName: brandToUse.igAccountName,
              urlParams: '',
              pixel: brandToUse.pixel,
              pixelName: brandToUse.pixelName,
              status: 'PAUSED',
              primaryText: 'Check out our latest offer!',
              headline: 'Amazing New Product',
              description: '',
              destinationUrl: 'https://example.com',
              callToAction: 'LEARN_MORE',
              siteLinks: [],
              advantageCreative: {
                inline_comment: false,
                image_templates: false,
                image_touchups: false,
                video_auto_crop: false,
                image_brightness_and_contrast: false,
                enhance_cta: false,
                text_optimizations: false,
                image_uncrop: false,
                adapt_to_placement: false,
                media_type_automation: false,
                product_extensions: false,
                description_automation: false,
                add_text_overlay: false,
                site_extensions: false,
                '3d_animation': false,
                translate_text: false
              }
            };
            
            setCurrentDefaults(defaults);
            saveSettings(defaults);
          }
        }
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
    } finally {
      setIsLoadingConfigurations(false);
    }
  };

  const loadConfigurationSettings = (config: AdConfiguration, brand?: Brand) => {
    const brandToUse = brand || selectedBrand;
    if (!brandToUse) return;
    
    console.log('[loadConfigurationSettings] Loading config:', config.name);
    console.log('[loadConfigurationSettings] Config settings:', config.settings);
    
    const defaults: DefaultValues = {
      brandId: brandToUse.id,
      adAccountId: brandToUse.adAccountId,
      adAccountName: brandToUse.adAccountName,
      fbPage: brandToUse.fbPage,
      fbPageName: brandToUse.fbPageName,
      igAccount: brandToUse.igAccount,
      igAccountName: brandToUse.igAccountName,
      pixel: brandToUse.pixel,
      pixelName: brandToUse.pixelName,
      // Spread the configuration settings to preserve all saved values including names
      ...config.settings
    };
    
    console.log('[loadConfigurationSettings] Final defaults to be set:', defaults);
    
    setCurrentDefaults(defaults);
    saveSettings(defaults);
  };

  const handleBrandSelect = async (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    if (brand) {
      // Clear current state to ensure clean transition
      setCurrentDefaults(null);
      setSelectedBrand(brand);
      setSelectedConfiguration(null);
      
      // Load configurations for this brand and wait for them to complete
      await loadConfigurations(brandId, brand);
      
      // Don't set defaults here - let loadConfigurations handle it
      // The loadConfigurations function will auto-select and apply the default config
    }
  };

  const handleConfigurationSelect = (configId: string) => {
    const config = configurations.find(c => c.id === configId);
    if (config) {
      setSelectedConfiguration(config);
      loadConfigurationSettings(config);
    }
  };

  const saveSettings = async (defaults: DefaultValues) => {
    try {
      // Save to localStorage for immediate access
      localStorage.setItem(`ad-upload-settings-${user?.id}`, JSON.stringify(defaults));
      console.log('Settings saved to localStorage');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleSettingsUpdate = (updatedDefaults: DefaultValues) => {
    setCurrentDefaults(updatedDefaults);
    saveSettings(updatedDefaults);
    setShowSettingsModal(false);
  };

  const handleSaveConfiguration = async (name: string, description: string, isDefault: boolean) => {
    if (!selectedBrand || !currentDefaults) return;

    try {
      const settings: AdConfigurationSettings = {
        campaignId: currentDefaults.campaignId,
        campaignName: currentDefaults.campaignName,
        adSetId: currentDefaults.adSetId,
        adSetName: currentDefaults.adSetName,
        urlParams: currentDefaults.urlParams,
        status: currentDefaults.status,
        primaryText: currentDefaults.primaryText,
        headline: currentDefaults.headline,
        description: currentDefaults.description,
        destinationUrl: currentDefaults.destinationUrl,
        callToAction: currentDefaults.callToAction,
        siteLinks: currentDefaults.siteLinks,
        advantageCreative: currentDefaults.advantageCreative
      };

      const response = await fetch('/api/ad-configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: selectedBrand.id,
          name,
          description,
          is_default: isDefault,
          settings
        })
      });

      if (response.ok) {
        const newConfig = await response.json();
        setConfigurations(prev => [newConfig, ...prev]);
        setSelectedConfiguration(newConfig);
        setShowSaveConfigModal(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration');
    }
  };

  const handleDeleteConfiguration = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      const response = await fetch(`/api/ad-configurations/${configId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setConfigurations(prev => prev.filter(c => c.id !== configId));
        if (selectedConfiguration?.id === configId) {
          setSelectedConfiguration(null);
        }
      } else {
        alert('Failed to delete configuration');
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
      alert('Failed to delete configuration');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
            <p className="text-gray-600">Loading your ad upload configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
        <h1 className="text-3xl font-bold text-gray-800">Ad Upload Tool</h1>
        <p className="text-gray-600">Streamline your ad creation and launching process.</p>
          </div>
          
          {/* Brand Selection and Settings in header */}
          <div className="flex items-center space-x-3">
            {/* Brand Selection Dropdown */}
            <div className="relative">
              <label htmlFor="brand-select" className="sr-only">Select Brand</label>
              <select
                id="brand-select"
                value={selectedBrand?.id || ""}
                onChange={(e) => handleBrandSelect(e.target.value)}
                className="pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md shadow-sm appearance-none bg-white min-w-[200px]"
                disabled={isLoadingBrands}
                title="Select a brand to work with"
              >
                <option value="" disabled>
                  {isLoadingBrands ? 'Loading Brands...' : 'Select Brand'}
                </option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>

            {/* Configuration Selection Dropdown */}
            {selectedBrand && (
              <div className="relative">
                <label htmlFor="config-select" className="sr-only">Select Configuration</label>
                <select
                  id="config-select"
                  value={selectedConfiguration?.id || ""}
                  onChange={(e) => handleConfigurationSelect(e.target.value)}
                  className="pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 rounded-md shadow-sm appearance-none bg-white min-w-[200px]"
                  disabled={isLoadingConfigurations}
                  title="Select a saved configuration"
                >
                  <option value="" disabled>
                    {isLoadingConfigurations ? 'Loading Configs...' : 'Select Configuration'}
                  </option>
                  {configurations.map(config => (
                    <option key={config.id} value={config.id}>
                      {config.name} {config.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {selectedBrand && (
              <>
                <button 
                  onClick={() => setShowSaveConfigModal(true)}
                  className="px-3 py-2 text-sm font-medium text-green-600 bg-white border border-green-600 rounded-md hover:bg-green-50 flex items-center"
                  title="Save current settings as configuration"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save Config
                </button>

                <button 
                  onClick={() => setShowSettingsModal(true)}
                  className="px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-600 rounded-md hover:bg-primary-50 flex items-center"
                  title="Open settings modal"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </button>
              </>
            )}
          </div>
        </div>
        
        {selectedBrand && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-800">
                  <strong>Current Brand:</strong> {selectedBrand.name}
                  <span className="text-blue-600 ml-2">
                    • Ad Account: {selectedBrand.adAccountId || 'Not set'}
                  </span>
                </p>
                {selectedConfiguration && (
                  <p className="text-xs text-blue-700 mt-1">
                    <strong>Configuration:</strong> {selectedConfiguration.name}
                    {selectedConfiguration.description && ` - ${selectedConfiguration.description}`}
                  </p>
                )}
              </div>
              {selectedConfiguration && (
                <button
                  onClick={() => handleDeleteConfiguration(selectedConfiguration.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Delete configuration"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {!selectedBrand ? (
        // Brand Selection Prompt
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">Get Started</h2>
          <p className="text-gray-600 mb-4">
            Please select a brand from the dropdown in the header to start creating ads.
          </p>
          <div className="text-sm text-gray-500">
            Need to add a new brand? Visit the Brand Management section to set up your Meta integration.
          </div>
        </div>
      ) : (
        // Ad Sheet View - no back button needed
        currentDefaults && !isLoadingConfigurations ? (
          <AdSheetView 
            key={`${selectedBrand.id}-${selectedConfiguration?.id || 'no-config'}`}
            defaults={currentDefaults} 
            activeBatch={null}
            selectedConfiguration={selectedConfiguration}
          />
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
              <p className="text-gray-600">Loading configuration...</p>
            </div>
          </div>
        )
      )}

      {/* Settings Modal */}
      {showSettingsModal && currentDefaults && (
        <SettingsModal
          defaults={currentDefaults}
          brand={selectedBrand!}
          onSave={handleSettingsUpdate}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Save Configuration Modal */}
      {showSaveConfigModal && (
        <SaveConfigurationModal
          onSave={handleSaveConfiguration}
          onClose={() => setShowSaveConfigModal(false)}
          existingNames={configurations.map(c => c.name)}
        />
      )}
    </div>
  );
};

// Settings Modal Component
interface SettingsModalProps {
  defaults: DefaultValues;
  brand: Brand;
  onSave: (defaults: DefaultValues) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ defaults, brand, onSave, onClose }) => {
  const [formData, setFormData] = useState<DefaultValues>(defaults);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCampaignSelect = (campaignId: string | null, campaignName?: string | null) => {
    setFormData(prev => ({ 
      ...prev, 
      campaignId,
      campaignName,
      adSetId: null, // Reset ad set when campaign changes
      adSetName: null
    }));
  };

  const handleAdSetSelect = (adSetId: string | null, adSetName?: string | null) => {
    setFormData(prev => ({ 
      ...prev, 
      adSetId,
      adSetName
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const callToActionOptions = [
    'BOOK_TRAVEL', 'CALL_NOW', 'CONTACT_US', 'DOWNLOAD', 'GET_DIRECTIONS',
    'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'SUBSCRIBE', 'WATCH_MORE', 'NO_BUTTON'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Ad Settings for {brand.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close settings modal"
              title="Close settings modal"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Campaign
                  </label>
                  <MetaCampaignSelector
                    brandId={brand.id}
                    adAccountId={brand.adAccountId}
                    selectedCampaignId={formData.campaignId}
                    selectedCampaignName={formData.campaignName}
                    onCampaignSelect={handleCampaignSelect}
                    disabled={!brand.adAccountId}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Ad Set ID
                  </label>
                  <MetaAdSetSelector
                    brandId={brand.id}
                    adAccountId={brand.adAccountId}
                    campaignId={formData.campaignId}
                    selectedAdSetId={formData.adSetId}
                    selectedAdSetName={formData.adSetName}
                    onAdSetSelect={handleAdSetSelect}
                    disabled={!formData.campaignId}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destination URL
                  </label>
                  <input
                    type="url"
                    name="destinationUrl"
                    value={formData.destinationUrl}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                    title="Enter the destination URL for your ads"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL Parameters
                  </label>
                  <input
                    type="text"
                    name="urlParams"
                    value={formData.urlParams}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="utm_source=facebook"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Call To Action
                  </label>
                  <select
                    name="callToAction"
                    value={formData.callToAction}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                    aria-label="Call to action"
                  >
                    {callToActionOptions.map(cta => (
                      <option key={cta} value={cta}>{cta.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Ad Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                    aria-label="Default ad status"
                  >
                    <option value="PAUSED">Paused</option>
                    <option value="ACTIVE">Active</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Primary Text
                </label>
                <textarea
                  name="primaryText"
                  value={formData.primaryText}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Your main ad copy..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Headline
                  </label>
                  <input
                    type="text"
                    name="headline"
                    value={formData.headline}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Catchy headline..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Description
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Optional description..."
                  />
                </div>
              </div>
            </div>

            {/* Meta Integration Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-3">Meta Integration Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>Ad Account: {brand.adAccountName ? `${brand.adAccountName} (${brand.adAccountId})` : (brand.adAccountId || 'Not connected')}</div>
                <div>Facebook Page: {brand.fbPageName ? `${brand.fbPageName} (${brand.fbPage})` : (brand.fbPage || 'Not connected')}</div>
                <div>Instagram Account: {brand.igAccountName ? `${brand.igAccountName} (${brand.igAccount})` : (brand.igAccount || 'Not connected')}</div>
                <div>Pixel ID: {brand.pixelName ? `${brand.pixelName} (${brand.pixel})` : (brand.pixel || 'Not connected')}</div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex items-center space-x-2 text-sm">
                  <span className="font-medium text-blue-800">Use Page As Actor:</span>
                  <span className="px-2 py-1 rounded-full text-xs bg-pink-100 text-pink-800">
                    Feature Available - Configure in Brand Settings → Meta Integration
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  When enabled, creates Page-Backed Instagram Accounts for Instagram ads using your Facebook Page identity.
                </p>
              </div>
            </div>

            {/* Meta Site Links */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Meta Site Links</h3>
              <div className="bg-white p-4 border border-gray-200 rounded-lg">
                <SiteLinksManager
                  siteLinks={formData.siteLinks}
                  onChange={(siteLinks) => setFormData(prev => ({ ...prev, siteLinks }))}
                />
              </div>
            </div>

            {/* Advantage+ Creative */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Advantage+ Creative Enhancements</h3>
              <div className="bg-white p-4 border border-gray-200 rounded-lg">
                <AdvantageCreativeManager
                  advantageCreative={formData.advantageCreative}
                  onChange={(advantageCreative) => setFormData(prev => ({ ...prev, advantageCreative }))}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Save Configuration Modal Component
interface SaveConfigurationModalProps {
  onSave: (name: string, description: string, isDefault: boolean) => void;
  onClose: () => void;
  existingNames: string[];
}

const SaveConfigurationModal: React.FC<SaveConfigurationModalProps> = ({ onSave, onClose, existingNames }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (existingNames.includes(name)) {
      alert('A configuration with this name already exists. Please choose a different name.');
      return;
    }
    
    onSave(name, description, isDefault);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Save Configuration</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Configuration Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Landing Page A, Black Friday Campaign"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Optional description of this configuration..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                Set as default configuration for this brand
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
              >
                Save Configuration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdUploadToolPage; 