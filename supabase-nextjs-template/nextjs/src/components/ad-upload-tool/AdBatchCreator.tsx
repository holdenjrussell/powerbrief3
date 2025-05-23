"use client";
import React, { useState, useEffect } from 'react';
import { ChevronDown, Facebook, Instagram, Link as LinkIcon, Activity, CheckCircle, Settings, Type, AlignLeft, Maximize2, MessageSquare } from 'lucide-react';
import { getBrands } from '@/lib/services/powerbriefService'; // Import getBrands
import { useGlobal } from '@/lib/context/GlobalContext'; // Import useGlobal to get user ID
import { Brand as PowerBriefBrand } from '@/lib/types/powerbrief'; // Import the Brand type from powerbrief

// Mock data for brands - replace with actual data fetching later
// const mockBrands = [
//   { id: 'brand1', name: 'Brand Alpha', fbPage: 'Alpha Page', igAccount: 'alpha_ig', pixel: 'PIXEL_ALPHA123', adAccountId: 'act_1234567890' },
//   { id: 'brand2', name: 'Brand Beta', fbPage: 'Beta Page', igAccount: 'beta_ig', pixel: 'PIXEL_BETA456', adAccountId: 'act_0987654321' },
// ];

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

// Mock CTA options (should come from API or config)
const callToActionOptions = [
  'BOOK_TRAVEL', 'CALL_NOW', 'CONTACT_US', 'DOWNLOAD', 'GET_DIRECTIONS',
  'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'SUBSCRIBE', 'WATCH_MORE',
  'NO_BUTTON' // Added for cases where no CTA is desired initially
];

interface AdBatchCreatorProps {
  onDefaultsSet: (defaults: DefaultValues) => void; // Callback when defaults are configured
}

const AdBatchCreator: React.FC<AdBatchCreatorProps> = ({ onDefaultsSet }) => {
  const { user } = useGlobal(); // Get user from GlobalContext
  const [brands, setBrands] = useState<Brand[]>([]); // Initialize with empty array
  const [isLoadingBrands, setIsLoadingBrands] = useState<boolean>(true);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [defaultValues, setDefaultValues] = useState<DefaultValues>({
    brandId: null,
    adAccountId: null,
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
  });

  useEffect(() => {
    // In a real app, fetch brands from your backend/Supabase
    // For now, we use mockBrands
    // if (brands.length > 0) {
    //   // Optionally pre-select the first brand
    //   // handleBrandChange(brands[0].id);
    // }
    const fetchBrands = async () => {
      if (user?.id) {
        setIsLoadingBrands(true);
        try {
          const fetchedBrands: PowerBriefBrand[] = await getBrands(user.id);
          // Map fetchedBrands to the local Brand interface
          const mappedBrands: Brand[] = fetchedBrands.map(b => ({
            id: b.id,
            name: b.name,
            // Adjusted mappings based on the PowerBriefBrand structure:
            fbPage: '', // No direct equivalent in PowerBriefBrand, set to empty or adjust as needed
            igAccount: '', // No direct equivalent in PowerBriefBrand, set to empty or adjust as needed
            pixel: '', // No direct equivalent in PowerBriefBrand, set to empty or adjust as needed
            adAccountId: b.adAccountId || '', // Use adAccountId from PowerBriefBrand
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
      setDefaultValues(prev => ({
        ...prev,
        brandId: brand.id,
        adAccountId: brand.adAccountId,
        fbPage: brand.fbPage,       // Pre-fill from brand data
        igAccount: brand.igAccount, // Pre-fill from brand data
        pixel: brand.pixel,         // Pre-fill from brand data
        primaryText: prev.primaryText, // Preserve manually entered or initial defaults
        headline: prev.headline,
        description: prev.description,
        destinationUrl: prev.destinationUrl,
        callToAction: prev.callToAction,
      }));
    }
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
    console.log('Default values set:', defaultValues);
    onDefaultsSet(defaultValues);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-700 mb-6">1. Create New Ad Batch</h2>
      
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <label htmlFor="fbPage" className="block text-sm font-medium text-gray-700 mb-1">
                  <Facebook className="inline-block mr-2 h-4 w-4 text-blue-600" /> Facebook Page
                </label>
                <input
                  type="text"
                  name="fbPage"
                  id="fbPage"
                  value={defaultValues.fbPage}
                  onChange={handleInputChange}
                  className="default-input"
                  placeholder="Your Facebook Page"
                  required
                />
              </div>
              <div>
                <label htmlFor="igAccount" className="block text-sm font-medium text-gray-700 mb-1">
                  <Instagram className="inline-block mr-2 h-4 w-4 text-pink-500" /> Instagram Account
                </label>
                <input
                  type="text"
                  name="igAccount"
                  id="igAccount"
                  value={defaultValues.igAccount}
                  onChange={handleInputChange}
                  className="default-input"
                  placeholder="Your Instagram Handle"
                  required
                />
              </div>
              <div>
                <label htmlFor="pixel" className="block text-sm font-medium text-gray-700 mb-1">
                  <Activity className="inline-block mr-2 h-4 w-4 text-red-500" /> Facebook Pixel ID
                </label>
                <input
                  type="text"
                  name="pixel"
                  id="pixel"
                  value={defaultValues.pixel}
                  onChange={handleInputChange}
                  className="default-input"
                  placeholder="Pixel ID"
                  required
                />
              </div>
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
          </>
        )}

        <div className="pt-6 text-right">
          <button
            type="submit"
            disabled={!selectedBrand}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Configure Ad Sheet & Proceed
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