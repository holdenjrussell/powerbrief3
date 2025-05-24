"use client";
import React, { useState, useEffect } from 'react';
import { ChevronDown, Facebook, Instagram, Link as LinkIcon, Activity, CheckCircle, Settings, Type, AlignLeft, Maximize2, MessageSquare, Target } from 'lucide-react';
import { getBrands } from '@/lib/services/powerbriefService'; // Import getBrands
import { useGlobal } from '@/lib/context/GlobalContext'; // Import useGlobal to get user ID
import { Brand as PowerBriefBrand } from '@/lib/types/powerbrief'; // Import the Brand type from powerbrief
import MetaCampaignSelector from './MetaCampaignSelector'; // Import new component
import MetaAdSetSelector from './MetaAdSetSelector'; // Import new component
import SiteLinksManager from './SiteLinksManager';
import AdvantageCreativeManager from './AdvantageCreativeManager';
import { SiteLink, AdvantageCreativeEnhancements } from './adUploadTypes';

// Updated Brand interface to match PowerBriefBrand structure for necessary fields
interface Brand {
  id: string;
  name: string;
  fbPage: string;
  igAccount: string;
  pixel: string;
  adAccountId: string;
}

// Updated DefaultValues interface
interface DefaultValues {
  brandId: string | null;
  adAccountId: string | null;
  campaignId: string | null; // Added campaignId
  adSetId: string | null;    // Added adSetId
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

interface AdBatch {
  id: string;
  name: string;
  brand_id: string;
  ad_account_id: string | null;
  campaign_id: string | null;
  ad_set_id: string | null;
  fb_page_id: string | null;
  ig_account_id: string | null;
  pixel_id: string | null;
  url_params: string | null;
  destination_url: string | null;
  call_to_action: string | null;
  status: string;
  primary_text: string | null;
  headline: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Mock CTA options (should come from API or config)
const callToActionOptions = [
  'BOOK_TRAVEL', 'CALL_NOW', 'CONTACT_US', 'DOWNLOAD', 'GET_DIRECTIONS',
  'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'SUBSCRIBE', 'WATCH_MORE',
  'NO_BUTTON' // Added for cases where no CTA is desired initially
];

interface AdBatchCreatorProps {
  onDefaultsSet: (defaults: DefaultValues) => void; // Callback when defaults are configured
  initialDefaults?: DefaultValues | null; // Pre-filled values from saved batch
  activeBatch?: AdBatch | null; // Current active batch info
}

const AdBatchCreator: React.FC<AdBatchCreatorProps> = ({ onDefaultsSet, initialDefaults, activeBatch }) => {
  const { user } = useGlobal(); // Get user from GlobalContext
  const [brands, setBrands] = useState<Brand[]>([]); // Initialize with empty array
  const [isLoadingBrands, setIsLoadingBrands] = useState<boolean>(true);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null); // New state
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);    // New state
  const [defaultValues, setDefaultValues] = useState<DefaultValues>({
    brandId: null,
    adAccountId: null,
    campaignId: null, // Initialize new field
    adSetId: null,    // Initialize new field
    fbPage: '',
    igAccount: '',
    urlParams: '',
    pixel: '',
    status: 'PAUSED',
    primaryText: 'Check out our latest offer!', // Example default
    headline: 'Amazing New Product',        // Example default
    description: '',                     // Optional, so can be empty
    destinationUrl: 'https://example.com', // Example default
    callToAction: callToActionOptions[0], // Default to first CTA
    // Initialize new Meta features
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
      site_extensions: false
    }
  });

  // Effect to load initial defaults when provided
  useEffect(() => {
    if (initialDefaults) {
      setDefaultValues(initialDefaults);
      setSelectedCampaignId(initialDefaults.campaignId);
      setSelectedAdSetId(initialDefaults.adSetId);
      
      // Find and set the selected brand
      if (initialDefaults.brandId && brands.length > 0) {
        const brand = brands.find(b => b.id === initialDefaults.brandId);
        if (brand) {
          setSelectedBrand(brand);
        }
      }
    }
  }, [initialDefaults, brands]);

  useEffect(() => {
    const fetchBrands = async () => {
      if (user?.id) {
        setIsLoadingBrands(true);
        try {
          const fetchedBrands: PowerBriefBrand[] = await getBrands(user.id);
          // Map fetchedBrands to the local Brand interface
          const mappedBrands: Brand[] = fetchedBrands.map(b => ({
            id: b.id,
            name: b.name,
            // Use Meta integration fields from PowerBriefBrand:
            fbPage: b.meta_facebook_page_id || '', // Use Meta Facebook Page ID
            igAccount: b.meta_instagram_actor_id || '', // Use Meta Instagram Account ID
            pixel: b.meta_pixel_id || '', // Use Meta Pixel ID
            adAccountId: b.meta_ad_account_id || '', // Use Meta Ad Account ID
          }));
          setBrands(mappedBrands);
        } catch (error) {
          console.error("Failed to fetch brands:", error);
          // Handle error appropriately in UI
        }
        setIsLoadingBrands(false);
      }
    };

    fetchBrands();
  }, [user?.id]);

  const handleBrandChange = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    if (brand) {
      setSelectedBrand(brand);
      setSelectedCampaignId(null); // Reset campaign on brand change
      setSelectedAdSetId(null);    // Reset ad set on brand change
      setDefaultValues(prev => ({
        ...prev,
        brandId: brand.id,
        adAccountId: brand.adAccountId,
        campaignId: null, // Reset campaignId in defaults
        adSetId: null,    // Reset adSetId in defaults
        fbPage: brand.fbPage,       // Pre-fill from brand data
        igAccount: brand.igAccount, // Pre-fill from brand data
        pixel: brand.pixel,         // Pre-fill from brand data
        primaryText: prev.primaryText, // Preserve manually entered or initial defaults
        headline: prev.headline,
        description: prev.description,
        destinationUrl: prev.destinationUrl,
        callToAction: prev.callToAction,
      }));
    } else {
      setSelectedBrand(null);
      setSelectedCampaignId(null);
      setSelectedAdSetId(null);
      setDefaultValues(prev => ({
        ...prev,
        brandId: null,
        adAccountId: null,
        campaignId: null,
        adSetId: null,
        fbPage: '',
        igAccount: '',
        pixel: '',
      }));
    }
  };

  const handleCampaignSelect = (campaignId: string | null) => {
    setSelectedCampaignId(campaignId);
    setSelectedAdSetId(null); // Reset ad set when campaign changes
    setDefaultValues(prev => ({
      ...prev,
      campaignId: campaignId,
      adSetId: null, // Reset adSetId in defaults
    }));
  };

  const handleAdSetSelect = (adSetId: string | null) => {
    setSelectedAdSetId(adSetId);
    setDefaultValues(prev => ({
      ...prev,
      adSetId: adSetId,
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDefaultValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand) {
      alert('Please select a brand.'); // Replace with better UI feedback
      return;
    }
    if (!selectedCampaignId) { // Ensure campaign is selected
        alert('Please select a campaign.');
        return;
    }
    // Ad set selection could be optional depending on requirements
    // if (!selectedAdSetId) {
    //   alert('Please select an ad set.');
    //   return;
    // }
    console.log('Default values set:', { ...defaultValues, campaignId: selectedCampaignId, adSetId: selectedAdSetId });
    onDefaultsSet({ ...defaultValues, campaignId: selectedCampaignId, adSetId: selectedAdSetId });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-700">
          {activeBatch ? `Edit Ad Batch: ${activeBatch.name}` : '1. Create New Ad Batch'}
        </h2>
        {activeBatch && (
          <span className="text-sm text-gray-500">
            Last saved: {new Date(activeBatch.updated_at).toLocaleString()}
          </span>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
            Select Brand
          </label>
          <div className="relative">
            <select
              id="brand"
              name="brand"
              value={selectedBrand?.id || ''}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md shadow-sm appearance-none default-input"
              required
              disabled={isLoadingBrands} // Disable while loading
            >
              <option value="" disabled>-- {isLoadingBrands ? 'Loading Brands...' : 'Select a Brand'} --</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        {selectedBrand && (
          <>
            <h3 className="text-xl font-medium text-gray-600 mt-8 mb-4 border-b pb-2">Configure Default Ad Values</h3>
            
            {/* Meta Assets Section */}
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
                <Facebook className="h-4 w-4 mr-2" />
                Meta Integration Assets
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Target className="inline-block mr-2 h-4 w-4 text-green-500" /> Ad Account ID
                  </label>
                  <div className="p-2 bg-white border border-gray-200 rounded-md text-sm text-gray-600">
                    {defaultValues.adAccountId || 'Not connected - Please set up Meta integration in brand settings'}
                  </div>
                </div>
                {/* Campaign Selector - Moved here, after Ad Account ID */}
                {defaultValues.adAccountId && selectedBrand && (
                    <div className="mb-0"> {/* Adjusted margin for inline feel if needed */}
                    <MetaCampaignSelector
                        brandId={selectedBrand.id}
                        adAccountId={defaultValues.adAccountId}
                        selectedCampaignId={selectedCampaignId}
                        onCampaignSelect={handleCampaignSelect}
                        disabled={!defaultValues.adAccountId}
                    />
                    </div>
                )}
                {/* Ad Set Selector - Moved here, after Campaign Selector */}
                {selectedCampaignId && defaultValues.adAccountId && selectedBrand && (
                    <div className="mb-0"> {/* Adjusted margin */}
                    <MetaAdSetSelector
                        brandId={selectedBrand.id}
                        adAccountId={defaultValues.adAccountId}
                        campaignId={selectedCampaignId}
                        selectedAdSetId={selectedAdSetId}
                        onAdSetSelect={handleAdSetSelect}
                        disabled={!selectedCampaignId}
                    />
                    </div>
                )}
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Facebook className="inline-block mr-2 h-4 w-4 text-blue-600" /> Facebook Page
                  </label>
                  <div className="p-2 bg-white border border-gray-200 rounded-md text-sm text-gray-600">
                    {defaultValues.fbPage || 'Not connected - Please set up Meta integration in brand settings'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Instagram className="inline-block mr-2 h-4 w-4 text-pink-500" /> Instagram Account
                  </label>
                  <div className="p-2 bg-white border border-gray-200 rounded-md text-sm text-gray-600">
                    {defaultValues.igAccount || 'Not connected - Please set up Meta integration in brand settings'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Activity className="inline-block mr-2 h-4 w-4 text-red-500" /> Facebook Pixel ID
                  </label>
                  <div className="p-2 bg-white border border-gray-200 rounded-md text-sm text-gray-600">
                    {defaultValues.pixel || 'Not connected - Please set up Meta integration in brand settings'}
                  </div>
                </div>
              </div>
              {(!defaultValues.fbPage || !defaultValues.igAccount || !defaultValues.pixel || !defaultValues.adAccountId) && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Some Meta assets are missing. Please complete the Meta integration in your brand settings to enable full functionality.
                  </p>
                  {!defaultValues.igAccount && (
                    <p className="text-xs text-yellow-800 mt-1">
                      <strong>Note:</strong> Missing Instagram Account - ads will be created for Facebook placement only.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Campaign Selector - Conditionally Rendered */}
            {defaultValues.adAccountId && (
              <div className="mb-4">
                 <MetaCampaignSelector
                  brandId={selectedBrand.id}
                  adAccountId={defaultValues.adAccountId}
                  selectedCampaignId={selectedCampaignId}
                  onCampaignSelect={handleCampaignSelect}
                  disabled={!defaultValues.adAccountId}
                />
              </div>
            )}

            {/* Ad Set Selector - Conditionally Rendered */}
            {selectedCampaignId && defaultValues.adAccountId && (
              <div className="mb-4">
                <MetaAdSetSelector
                  brandId={selectedBrand.id}
                  adAccountId={defaultValues.adAccountId} // Pass adAccountId for completeness or future use
                  campaignId={selectedCampaignId}
                  selectedAdSetId={selectedAdSetId}
                  onAdSetSelect={handleAdSetSelect}
                  disabled={!selectedCampaignId}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label htmlFor="destinationUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  <LinkIcon className="inline-block mr-2 h-4 w-4 text-gray-500" /> Default Destination URL
                </label>
                <input
                  type="url"
                  name="destinationUrl"
                  id="destinationUrl"
                  value={defaultValues.destinationUrl}
                  onChange={handleInputChange}
                  className="default-input"
                  placeholder="https://yourproduct.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="urlParams" className="block text-sm font-medium text-gray-700 mb-1">
                  <Maximize2 className="inline-block mr-2 h-4 w-4 text-gray-500" /> Default URL Parameters
                </label>
                <input
                  type="text"
                  name="urlParams"
                  id="urlParams"
                  value={defaultValues.urlParams}
                  onChange={handleInputChange}
                  className="default-input"
                  placeholder="utm_source=facebook"
                />
              </div>
              <div>
                <label htmlFor="callToAction" className="block text-sm font-medium text-gray-700 mb-1">
                  <MessageSquare className="inline-block mr-2 h-4 w-4 text-green-500" /> Default Call To Action
                </label>
                <div className="relative">
                  <select
                    id="callToAction"
                    name="callToAction"
                    value={defaultValues.callToAction}
                    onChange={handleInputChange}
                    className="default-input appearance-none"
                    required
                  >
                    {callToActionOptions.map(cta => (
                      <option key={cta} value={cta}>{cta.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  <Settings className="inline-block mr-2 h-4 w-4 text-gray-500" /> Default Ad Status on Launch
                </label>
                <select
                  id="status"
                  name="status"
                  value={defaultValues.status}
                  onChange={handleInputChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md shadow-sm appearance-none"
                  required
                >
                  <option value="PAUSED">Paused</option>
                  <option value="ACTIVE">Active</option>
                </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <ChevronDown className="h-4 w-4" />
                 </div>
              </div>
              <div className="md:col-span-2 sm:col-span-1"></div> 

              <div className="md:col-span-2">
                <label htmlFor="primaryText" className="block text-sm font-medium text-gray-700 mb-1">
                  <Type className="inline-block mr-2 h-4 w-4 text-indigo-500" /> Default Primary Text
                </label>
                <textarea
                  name="primaryText"
                  id="primaryText"
                  value={defaultValues.primaryText}
                  onChange={handleInputChange}
                  rows={3}
                  className="default-input"
                  placeholder="Your main ad copy..."
                />
              </div>
              <div>
                <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-1">
                  <AlignLeft className="inline-block mr-2 h-4 w-4 text-purple-500" /> Default Headline
                </label>
                <input
                  type="text"
                  name="headline"
                  id="headline"
                  value={defaultValues.headline}
                  onChange={handleInputChange}
                  className="default-input"
                  placeholder="Catchy headline..."
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  <AlignLeft className="inline-block mr-2 h-4 w-4 text-teal-500" /> Default Description <span className="text-xs text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="description"
                  id="description"
                  value={defaultValues.description}
                  onChange={handleInputChange}
                  className="default-input"
                  placeholder="Short description..."
                />
              </div>
            </div>

            {/* Meta Features Section */}
            <div className="mt-8 space-y-6">
              <h3 className="text-xl font-medium text-gray-600 border-b pb-2">Advanced Meta Features</h3>
              
              {/* Site Links */}
              <div className="bg-white p-4 border border-gray-200 rounded-lg">
                <SiteLinksManager
                  siteLinks={defaultValues.siteLinks}
                  onChange={(siteLinks) => setDefaultValues(prev => ({ ...prev, siteLinks }))}
                />
              </div>

              {/* Advantage+ Creative */}
              <div className="bg-white p-4 border border-gray-200 rounded-lg">
                <AdvantageCreativeManager
                  advantageCreative={defaultValues.advantageCreative}
                  onChange={(advantageCreative) => setDefaultValues(prev => ({ ...prev, advantageCreative }))}
                />
              </div>
            </div>
          </>
        )}

        <div className="pt-6 text-right">
          <button
            type="submit"
            disabled={!selectedBrand || !selectedCampaignId } // Also disable if campaign not selected
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            {activeBatch ? 'Update Configuration & Proceed' : 'Configure Ad Sheet & Proceed'}
          </button>
        </div>
      </form>
      <style jsx global>{`
        .default-input {
          display: block;
          width: 100%;
          padding-left: 0.75rem; 
          padding-right: 0.75rem; 
          padding-top: 0.5rem; 
          padding-bottom: 0.5rem; 
          border-width: 1px;
          border-color: #D1D5DB; 
          border-radius: 0.375rem; 
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); 
          margin-top: 0.25rem; 
        }
        .default-input:focus {
          outline: 2px solid transparent;
          outline-offset: 2px;
          border-color: #4F46E5; 
          box-shadow: 0 0 0 2px #A5B4FC; 
        }
        select.default-input {
            padding-right: 2.5rem; 
        }
      `}</style>
    </div>
  );
};

export default AdBatchCreator; 