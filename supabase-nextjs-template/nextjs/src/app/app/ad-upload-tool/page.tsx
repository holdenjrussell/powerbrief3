"use client";
import React, { useState, useEffect } from 'react';
import AdSheetView from '@/components/ad-upload-tool/AdSheetView';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useBrand } from '@/lib/context/BrandContext';
import { Loader2, Settings, ChevronDown, Save, Trash2, Building2 } from 'lucide-react';
import { SiteLink, AdvantageCreativeEnhancements } from '@/components/ad-upload-tool/adUploadTypes';
import SiteLinksManager from '@/components/ad-upload-tool/SiteLinksManager';
import AdvantageCreativeManager from '@/components/ad-upload-tool/AdvantageCreativeManager';
import MetaCampaignSelector from '@/components/ad-upload-tool/MetaCampaignSelector';
import MetaAdSetSelector from '@/components/ad-upload-tool/MetaAdSetSelector';
import { AdConfiguration, AdConfigurationSettings } from '@/lib/types/adConfigurations';
import { Card, CardContent } from '@/components/ui/card';

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
  // Use Page as Actor setting
  usePageAsActor?: boolean;
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

interface BrandMetaData {
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
  const { selectedBrand, isLoading: brandsLoading } = useBrand();
  const [currentDefaults, setCurrentDefaults] = useState<DefaultValues | null>(null);
  const [brandMetaData, setBrandMetaData] = useState<BrandMetaData | null>(null);
  const [configurations, setConfigurations] = useState<AdConfiguration[]>([]);
  const [selectedConfiguration, setSelectedConfiguration] = useState<AdConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingConfigurations, setIsLoadingConfigurations] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSaveConfigModal, setShowSaveConfigModal] = useState(false);

  // Load saved settings and brand meta data on component mount or brand change
  useEffect(() => {
    if (user?.id && selectedBrand) {
      loadBrandMetaData();
    } else if (!selectedBrand) {
      setBrandMetaData(null);
      setCurrentDefaults(null);
      setConfigurations([]);
      setSelectedConfiguration(null);
    }
  }, [user?.id, selectedBrand]);

  // Load configurations when brand changes
  useEffect(() => {
    if (selectedBrand?.id) {
      loadConfigurations(selectedBrand.id);
    } else {
      setConfigurations([]);
      setSelectedConfiguration(null);
    }
  }, [selectedBrand?.id]);

  const loadBrandMetaData = async () => {
    if (!selectedBrand) return;
    
    try {
      setIsLoading(true);
      
      // Fetch Meta configuration for the brand
      let metaConfig = null;
      try {
        const metaResponse = await fetch(`/api/meta/brand-config?brandId=${selectedBrand.id}`);
        if (metaResponse.ok) {
          const metaData = await metaResponse.json();
          metaConfig = metaData.config;
        }
      } catch (error) {
        console.error(`Error fetching Meta config for brand ${selectedBrand.id}:`, error);
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

      const brandData: BrandMetaData = {
        id: selectedBrand.id,
        name: selectedBrand.name,
        fbPage: selectedBrand.meta_facebook_page_id || '',
        fbPageName: metaConfig ? getAccountDisplayName(
          selectedBrand.meta_facebook_page_id || '', 
          metaConfig.facebookPages || [], 
          metaConfig.manualPageLabels || {}
        ) : null,
        igAccount: selectedBrand.meta_instagram_actor_id || '',
        igAccountName: metaConfig ? getAccountDisplayName(
          selectedBrand.meta_instagram_actor_id || '', 
          metaConfig.instagramAccounts || [], 
          metaConfig.manualInstagramLabels || {}
        ) : null,
        pixel: selectedBrand.meta_pixel_id || '',
        pixelName: metaConfig ? getAccountDisplayName(
          selectedBrand.meta_pixel_id || '', 
          metaConfig.pixels || [], 
          {}
        ) : null,
        adAccountId: selectedBrand.meta_ad_account_id || '',
        adAccountName: metaConfig ? getAccountDisplayName(
          selectedBrand.meta_ad_account_id || '', 
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
      
      setBrandMetaData(brandData);
      
      // Try to load saved settings from localStorage
      const savedSettings = localStorage.getItem(`ad-upload-settings-${user?.id}`);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        // Only use saved settings if they match the current brand
        if (settings.brandId === selectedBrand.id) {
          setCurrentDefaults(settings);
        } else {
          // Create default settings for this brand
          createDefaultSettings(brandData);
        }
      } else {
        // Create default settings for this brand
        createDefaultSettings(brandData);
      }
    } catch (error) {
      console.error('Error loading brand meta data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultSettings = (brandData: BrandMetaData) => {
    const defaults: DefaultValues = {
      brandId: brandData.id,
      adAccountId: brandData.adAccountId,
      adAccountName: brandData.adAccountName,
      campaignId: null,
      campaignName: null,
      adSetId: null,
      adSetName: null,
      fbPage: brandData.fbPage,
      fbPageName: brandData.fbPageName,
      igAccount: brandData.igAccount,
      igAccountName: brandData.igAccountName,
      urlParams: '',
      pixel: brandData.pixel,
      pixelName: brandData.pixelName,
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
      },
      // Include Use Page as Actor setting from brand config
      usePageAsActor: brandData.metaConfig?.usePageAsActor || false
    };
    
    setCurrentDefaults(defaults);
    saveSettings(defaults);
  };

  const loadConfigurations = async (brandId: string) => {
    try {
      setIsLoadingConfigurations(true);
      const response = await fetch(`/api/ad-configurations?brandId=${brandId}`);
      if (response.ok) {
        const configs = await response.json();
        setConfigurations(configs);
        
        // Auto-select default configuration if exists
        const defaultConfig = configs.find((c: AdConfiguration) => c.is_default);
        if (defaultConfig) {
          setSelectedConfiguration(defaultConfig);
          loadConfigurationSettings(defaultConfig);
        }
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
    } finally {
      setIsLoadingConfigurations(false);
    }
  };

  const loadConfigurationSettings = (config: AdConfiguration) => {
    if (!brandMetaData) return;
    
    const defaults: DefaultValues = {
      brandId: brandMetaData.id,
      adAccountId: brandMetaData.adAccountId,
      adAccountName: brandMetaData.adAccountName,
      fbPage: brandMetaData.fbPage,
      fbPageName: brandMetaData.fbPageName,
      igAccount: brandMetaData.igAccount,
      igAccountName: brandMetaData.igAccountName,
      pixel: brandMetaData.pixel,
      pixelName: brandMetaData.pixelName,
      // Spread the configuration settings to preserve all saved values including names
      ...config.settings
    };
    
    setCurrentDefaults(defaults);
    saveSettings(defaults);
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
    if (!brandMetaData || !currentDefaults) return;

    try {
      // Helper function to get account name for saving
      const getAccountName = (id: string | null, accounts: MetaAccount[], manualLabels: Record<string, string>) => {
        if (!id) return null;
        
        // Check manual labels first
        if (manualLabels[id]) {
          return manualLabels[id];
        }
        
        // Then check API accounts
        const account = accounts.find(acc => acc.id === id);
        return account?.name || null;
      };

      const settings: AdConfigurationSettings = {
        campaignId: currentDefaults.campaignId,
        campaignName: currentDefaults.campaignName,
        adSetId: currentDefaults.adSetId,
        adSetName: currentDefaults.adSetName,
        // Include Meta account IDs and names
        adAccountId: currentDefaults.adAccountId,
        adAccountName: getAccountName(
          currentDefaults.adAccountId, 
          brandMetaData.metaConfig?.adAccounts || [], 
          {}
        ),
        fbPage: currentDefaults.fbPage,
        fbPageName: getAccountName(
          currentDefaults.fbPage, 
          brandMetaData.metaConfig?.facebookPages || [], 
          brandMetaData.metaConfig?.manualPageLabels || {}
        ),
        igAccount: currentDefaults.igAccount,
        igAccountName: getAccountName(
          currentDefaults.igAccount, 
          brandMetaData.metaConfig?.instagramAccounts || [], 
          brandMetaData.metaConfig?.manualInstagramLabels || {}
        ),
        pixel: currentDefaults.pixel,
        pixelName: getAccountName(
          currentDefaults.pixel, 
          brandMetaData.metaConfig?.pixels || [], 
          {}
        ),
        urlParams: currentDefaults.urlParams,
        status: currentDefaults.status,
        primaryText: currentDefaults.primaryText,
        headline: currentDefaults.headline,
        description: currentDefaults.description,
        destinationUrl: currentDefaults.destinationUrl,
        callToAction: currentDefaults.callToAction,
        siteLinks: currentDefaults.siteLinks,
        advantageCreative: currentDefaults.advantageCreative,
        // Include Use Page as Actor setting
        usePageAsActor: brandMetaData.metaConfig?.usePageAsActor || false
      };

      const response = await fetch('/api/ad-configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandMetaData.id,
          name,
          description,
          is_default: isDefault,
          settings
        })
      });

      if (response.ok) {
        const newConfig = await response.json();
        setConfigurations(prev => [...prev, newConfig]);
        setShowSaveConfigModal(false);
        
        // If this is set as default, select it
        if (isDefault) {
          setSelectedConfiguration(newConfig);
        }
      } else {
        const errorData = await response.json();
        console.error('Error saving configuration:', errorData);
        // You might want to show an error message to the user here
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      // You might want to show an error message to the user here
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

  if (isLoading || brandsLoading) {
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

  if (!selectedBrand) {
    return (
      <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No brand selected</h3>
            <p className="max-w-md mx-auto">
              Please select a brand from the dropdown above to start creating ads.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Ad Upload Tool - {selectedBrand.name}</h1>
            <p className="text-gray-600">Streamline your ad creation and launching process.</p>
          </div>
          
          {/* Configuration Selection and Settings in header */}
          <div className="flex items-center space-x-3">
            {/* Configuration Selection Dropdown */}
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
                  {isLoadingConfigurations ? 'Loading Configurations...' : 'Select Configuration'}
                </option>
                {configurations.map(config => (
                  <option key={config.id} value={config.id}>
                    {config.name} {config.is_default && '(Default)'}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>

            {/* Save Configuration Button */}
            <button
              onClick={() => setShowSaveConfigModal(true)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              title="Save current settings as configuration"
              disabled={!currentDefaults}
            >
              <Save className="h-5 w-5" />
            </button>

            {/* Delete Configuration Button */}
            {selectedConfiguration && (
              <button
                onClick={() => handleDeleteConfiguration(selectedConfiguration.id)}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                title="Delete selected configuration"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}

            {/* Settings Button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              title="Ad Upload Settings"
              disabled={!currentDefaults}
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {currentDefaults && brandMetaData ? (
        <AdSheetView 
          defaults={currentDefaults} 
          activeBatch={null}
          selectedConfiguration={selectedConfiguration}
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading ad configuration...</p>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && currentDefaults && brandMetaData && (
        <SettingsModal
          defaults={currentDefaults}
          brand={brandMetaData}
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
  brand: BrandMetaData;
  onSave: (defaults: DefaultValues) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ defaults, brand, onSave, onClose }) => {
  const [formData, setFormData] = useState<DefaultValues>(defaults);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle Facebook page selection with auto-selection of linked Instagram account
  const handlePageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pageId = e.target.value;
    setFormData(prev => {
      const newFormData = { ...prev, fbPage: pageId };
      
      // Auto-select linked Instagram account if available
      if (pageId && brand.metaConfig) {
        // Check for manual pairing first
        const manualPairing = brand.metaConfig.manualInstagramPairings?.[pageId];
        if (manualPairing) {
          newFormData.igAccount = manualPairing;
          newFormData.igAccountName = brand.metaConfig.manualInstagramLabels?.[manualPairing] || null;
        } else if (brand.metaConfig.usePageAsActor) {
          // If Use Page as Actor is enabled, set special indicator
          newFormData.igAccount = `PBIA:${pageId}`;
          newFormData.igAccountName = 'Page-Backed Instagram Account';
        }
        
        // Update page name
        const page = brand.metaConfig.facebookPages?.find(p => p.id === pageId);
        if (page?.name) {
          newFormData.fbPageName = page.name;
        } else if (brand.metaConfig.manualPageLabels?.[pageId]) {
          newFormData.fbPageName = brand.metaConfig.manualPageLabels[pageId];
        }
      }
      
      return newFormData;
    });
  };

  // Handle Instagram account selection
  const handleInstagramSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const igAccountId = e.target.value;
    setFormData(prev => {
      const newFormData = { ...prev, igAccount: igAccountId };
      
      // Update Instagram account name
      if (igAccountId && brand.metaConfig) {
        if (igAccountId.startsWith('PBIA:')) {
          newFormData.igAccountName = 'Page-Backed Instagram Account';
        } else {
          // Check manual labels first
          if (brand.metaConfig.manualInstagramLabels?.[igAccountId]) {
            newFormData.igAccountName = brand.metaConfig.manualInstagramLabels[igAccountId];
          } else {
            // Then check API accounts
            const account = brand.metaConfig.instagramAccounts?.find(acc => acc.id === igAccountId);
            newFormData.igAccountName = account?.name || null;
          }
        }
      }
      
      return newFormData;
    });
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

  // Helper function to get display name for Meta accounts
  const getDisplayName = (id: string, accounts: MetaAccount[], manualLabels: Record<string, string>) => {
    if (!id) return id;
    
    // Handle Page-Backed Instagram Account
    if (id.startsWith('PBIA:')) {
      const pageId = id.replace('PBIA:', '');
      const pageName = getDisplayName(pageId, brand.metaConfig?.facebookPages || [], brand.metaConfig?.manualPageLabels || {});
      return `Page-Backed IG (${pageName})`;
    }
    
    // Check manual labels first
    if (manualLabels[id]) {
      return `${manualLabels[id]} (${id})`;
    }
    
    // Then check API accounts
    const account = accounts.find(acc => acc.id === id);
    if (account?.name) {
      return `${account.name} (${id})`;
    }
    
    return id;
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
            {/* Meta Account Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Meta Account Settings</h3>
              <div className="bg-white p-4 border border-gray-200 rounded-lg space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Select which Meta accounts to use for this configuration. These will override the brand defaults for ads created with this configuration.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ad Account
                    </label>
                    <select
                      name="adAccountId"
                      value={formData.adAccountId || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      aria-label="Select ad account"
                    >
                      <option value="">Use brand default</option>
                      {/* Show brand default first */}
                      {brand.adAccountId && (
                        <option value={brand.adAccountId}>
                          {brand.adAccountName ? `${brand.adAccountName} (${brand.adAccountId}) - Brand Default` : `${brand.adAccountId} - Brand Default`}
                        </option>
                      )}
                      {/* Show all available ad accounts from Meta config */}
                      {brand.metaConfig?.adAccounts?.map((account) => (
                        account.id !== brand.adAccountId && (
                          <option key={account.id} value={account.id}>
                            {account.name ? `${account.name} (${account.id})` : account.id}
                          </option>
                        )
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Configure multiple accounts in Brand Settings → Meta Integration
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Facebook Page
                    </label>
                    <select
                      name="fbPage"
                      value={formData.fbPage || ''}
                      onChange={handlePageSelect}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      aria-label="Select Facebook page"
                    >
                      <option value="">Use brand default</option>
                      {/* Show brand default first */}
                      {brand.fbPage && (
                        <option value={brand.fbPage}>
                          {getDisplayName(brand.fbPage, brand.metaConfig?.facebookPages || [], brand.metaConfig?.manualPageLabels || {})} - Brand Default
                        </option>
                      )}
                      {/* Show all available pages from Meta config */}
                      {brand.metaConfig?.facebookPages?.map((page) => (
                        page.id !== brand.fbPage && (
                          <option key={page.id} value={page.id}>
                            {getDisplayName(page.id, brand.metaConfig?.facebookPages || [], brand.metaConfig?.manualPageLabels || {})}
                          </option>
                        )
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Configure multiple pages in Brand Settings → Meta Integration
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instagram Account
                    </label>
                    <select
                      name="igAccount"
                      value={formData.igAccount || ''}
                      onChange={handleInstagramSelect}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      aria-label="Select Instagram account"
                    >
                      <option value="">Use brand default</option>
                      {/* Show brand default first */}
                      {brand.igAccount && (
                        <option value={brand.igAccount}>
                          {getDisplayName(brand.igAccount, brand.metaConfig?.instagramAccounts || [], brand.metaConfig?.manualInstagramLabels || {})} - Brand Default
                        </option>
                      )}
                      {/* Show Page-Backed Instagram Account option if Use Page as Actor is enabled */}
                      {brand.metaConfig?.usePageAsActor && formData.fbPage && (
                        <option value={`PBIA:${formData.fbPage}`}>
                          Page-Backed Instagram Account (Auto-created)
                        </option>
                      )}
                      {/* Show all available Instagram accounts from Meta config */}
                      {brand.metaConfig?.instagramAccounts?.map((account) => (
                        account.id !== brand.igAccount && (
                          <option key={account.id} value={account.id}>
                            {getDisplayName(account.id, brand.metaConfig?.instagramAccounts || [], brand.metaConfig?.manualInstagramLabels || {})}
                          </option>
                        )
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {brand.metaConfig?.usePageAsActor ? 
                        'Page-Backed Instagram Accounts will be auto-created when needed' :
                        'Configure multiple accounts in Brand Settings → Meta Integration'
                      }
                    </p>
                    {formData.igAccount?.startsWith('PBIA:') && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs text-blue-800">
                          <strong>Page-Backed Instagram Account:</strong> This will use your Facebook Page&apos;s identity for Instagram ads. 
                          The account will be created automatically when ads are launched.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Facebook Pixel
                    </label>
                    <select
                      name="pixel"
                      value={formData.pixel || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      aria-label="Select Facebook pixel"
                    >
                      <option value="">Use brand default</option>
                      {/* Show brand default first */}
                      {brand.pixel && (
                        <option value={brand.pixel}>
                          {getDisplayName(brand.pixel, brand.metaConfig?.pixels || [], {})} - Brand Default
                        </option>
                      )}
                      {/* Show all available pixels from Meta config */}
                      {brand.metaConfig?.pixels?.map((pixel) => (
                        pixel.id !== brand.pixel && (
                          <option key={pixel.id} value={pixel.id}>
                            {getDisplayName(pixel.id, brand.metaConfig?.pixels || [], {})}
                          </option>
                        )
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Configure multiple pixels in Brand Settings → Meta Integration
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> These settings will override the brand defaults for ads created with this configuration. 
                    To add more accounts/pages/pixels, visit Brand Settings → Meta Integration.
                  </p>
                </div>
              </div>
            </div>

            {/* Basic Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Campaign ID
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