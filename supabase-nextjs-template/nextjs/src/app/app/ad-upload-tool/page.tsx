"use client";
import React, { useState, useEffect } from 'react';
import AdSheetView from '@/components/ad-upload-tool/AdSheetView';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Loader2, Settings, ChevronDown } from 'lucide-react';
import { SiteLink, AdvantageCreativeEnhancements } from '@/components/ad-upload-tool/adUploadTypes';
import { getBrands } from '@/lib/services/powerbriefService';
import { Brand as PowerBriefBrand } from '@/lib/types/powerbrief';

// Updated DefaultValues interface to include Meta features
interface DefaultValues {
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
  // New Meta features
  siteLinks: SiteLink[];
  advantageCreative: AdvantageCreativeEnhancements;
}

interface Brand {
  id: string;
  name: string;
  fbPage: string;
  igAccount: string;
  pixel: string;
  adAccountId: string;
}

const AdUploadToolPage = () => {
  const { user } = useGlobal();
  const [currentDefaults, setCurrentDefaults] = useState<DefaultValues | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Load saved settings and brands on component mount
  useEffect(() => {
    if (user?.id) {
      loadInitialData();
    }
  }, [user?.id]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Load brands
      setIsLoadingBrands(true);
      const fetchedBrands: PowerBriefBrand[] = await getBrands(user!.id);
      const mappedBrands: Brand[] = fetchedBrands.map(b => ({
        id: b.id,
        name: b.name,
        fbPage: b.meta_facebook_page_id || '',
        igAccount: b.meta_instagram_actor_id || '',
        pixel: b.meta_pixel_id || '',
        adAccountId: b.meta_ad_account_id || '',
      }));
      setBrands(mappedBrands);
      setIsLoadingBrands(false);
      
      // Try to load saved settings
      const savedSettings = localStorage.getItem(`ad-upload-settings-${user?.id}`);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setCurrentDefaults(settings);
        
        // Find and set the selected brand
        const brand = mappedBrands.find(b => b.id === settings.brandId);
        if (brand) {
          setSelectedBrand(brand);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setIsLoadingBrands(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrandSelect = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    if (brand) {
      setSelectedBrand(brand);
      
      // Create default settings for this brand
      const defaults: DefaultValues = {
        brandId: brand.id,
        adAccountId: brand.adAccountId,
        campaignId: null,
        adSetId: null,
        fbPage: brand.fbPage,
        igAccount: brand.igAccount,
        urlParams: '',
        pixel: brand.pixel,
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
          music: false,
          '3d_animation': false,
          translate_text: false
        }
      };
      
      setCurrentDefaults(defaults);
      saveSettings(defaults);
    }
  };

  const saveSettings = async (defaults: DefaultValues) => {
    try {
      localStorage.setItem(`ad-upload-settings-${user?.id}`, JSON.stringify(defaults));
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleSettingsUpdate = (updatedDefaults: DefaultValues) => {
    setCurrentDefaults(updatedDefaults);
    saveSettings(updatedDefaults);
    setShowSettingsModal(false);
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
          
          {/* Settings button - only show when brand is selected */}
          <div className="flex items-center space-x-3">
            {selectedBrand && (
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-600 rounded-md hover:bg-primary-50 flex items-center"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
            )}
          </div>
        </div>
        
        {selectedBrand && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Current Brand:</strong> {selectedBrand.name}
              <span className="text-blue-600 ml-2">
                • Ad Account: {selectedBrand.adAccountId || 'Not set'}
              </span>
            </p>
          </div>
        )}
      </header>

      {!selectedBrand ? (
        // Brand Selection View
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
          <h2 className="text-2xl font-semibold text-gray-700 mb-6">Select Brand</h2>
          
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
              Choose a brand to start creating ads
            </label>
            <div className="relative">
              <select
                id="brand"
                value=""
                onChange={(e) => handleBrandSelect(e.target.value)}
                className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md shadow-sm appearance-none"
                disabled={isLoadingBrands}
              >
                <option value="" disabled>
                  {isLoadingBrands ? 'Loading Brands...' : '-- Select a Brand --'}
                </option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Ad Sheet View
        currentDefaults && (
          <AdSheetView 
            defaults={currentDefaults} 
            onGoBack={() => {
              setSelectedBrand(null);
              setCurrentDefaults(null);
            }}
            activeBatch={null}
          />
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Meta Integration Info */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-3">Meta Integration Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>Ad Account: {brand.adAccountId || 'Not connected'}</div>
                <div>Facebook Page: {brand.fbPage || 'Not connected'}</div>
                <div>Instagram Account: {brand.igAccount || 'Not connected'}</div>
                <div>Pixel ID: {brand.pixel || 'Not connected'}</div>
              </div>
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
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdUploadToolPage; 