"use client";
import React, { useState, useEffect } from 'react';
import AdBatchCreator from '@/components/ad-upload-tool/AdBatchCreator';
import AdSheetView from '@/components/ad-upload-tool/AdSheetView';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Loader2, ChevronLeft, Trash2 } from 'lucide-react';
import { SiteLink, AdvantageCreativeEnhancements } from '@/components/ad-upload-tool/adUploadTypes';

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
  // New Meta features
  site_links?: SiteLink[];
  advantage_plus_creative?: AdvantageCreativeEnhancements;
}

const AdUploadToolPage = () => {
  const { user } = useGlobal();
  const [currentDefaults, setCurrentDefaults] = useState<DefaultValues | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [activeBatch, setActiveBatch] = useState<AdBatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentBatches, setRecentBatches] = useState<AdBatch[]>([]);
  const [showRecentBatches, setShowRecentBatches] = useState(false);

  // Load active batch on component mount
  useEffect(() => {
    if (user?.id) {
      loadActiveBatch();
    }
  }, [user?.id]);

  const loadActiveBatch = async () => {
    try {
      setIsLoading(true);
      
      // Try to load the user's active batch
      const response = await fetch('/api/ad-batches?active=true');
      if (response.ok) {
        const batches = await response.json();
        if (batches.length > 0) {
          const batch = batches[0];
          setActiveBatch(batch);
          
          // Convert batch to DefaultValues format
          const defaults: DefaultValues = {
            brandId: batch.brand_id,
            adAccountId: batch.ad_account_id,
            campaignId: batch.campaign_id,
            adSetId: batch.ad_set_id,
            fbPage: batch.fb_page_id || '',
            igAccount: batch.ig_account_id || '',
            urlParams: batch.url_params || '',
            pixel: batch.pixel_id || '',
            status: batch.status as 'ACTIVE' | 'PAUSED',
            primaryText: batch.primary_text || '',
            headline: batch.headline || '',
            description: batch.description || '',
            destinationUrl: batch.destination_url || '',
            callToAction: batch.call_to_action || '',
            siteLinks: batch.site_links || [],
            advantageCreative: batch.advantage_plus_creative || {
              inline_comment: false,
              image_templates: false,
              image_touchups: false,
              video_auto_crop: false,
              image_brightness_and_contrast: false,
              enhance_cta: false,
              text_optimizations: false,
              image_background_gen: false,
              image_uncrop: false,
              adapt_to_placement: false,
              media_type_automation: false,
              product_extensions: false,
              description_automation: false,
              add_text_overlay: false,
              site_extensions: false
            },
          };
          
          setCurrentDefaults(defaults);
          setShowSheet(true);
        }
      }
      
      // Also load recent batches for the dropdown
      const recentResponse = await fetch('/api/ad-batches');
      if (recentResponse.ok) {
        const recent = await recentResponse.json();
        setRecentBatches(recent.slice(0, 5)); // Show last 5 batches
      }
    } catch (error) {
      console.error('Error loading active batch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBatch = async (defaults: DefaultValues, batchName?: string) => {
    try {
      const batchData = {
        id: activeBatch?.id, // Include ID for updates
        name: batchName || activeBatch?.name || `Ad Batch ${new Date().toLocaleDateString()}`,
        brand_id: defaults.brandId!,
        ad_account_id: defaults.adAccountId,
        campaign_id: defaults.campaignId,
        ad_set_id: defaults.adSetId,
        fb_page_id: defaults.fbPage || null,
        ig_account_id: defaults.igAccount || null,
        pixel_id: defaults.pixel || null,
        url_params: defaults.urlParams || null,
        destination_url: defaults.destinationUrl || null,
        call_to_action: defaults.callToAction || null,
        status: defaults.status,
        primary_text: defaults.primaryText || null,
        headline: defaults.headline || null,
        description: defaults.description || null,
        site_links: defaults.siteLinks || [],
        advantage_plus_creative: defaults.advantageCreative || {
          inline_comment: false,
          image_templates: false,
          image_touchups: false,
          video_auto_crop: false,
          image_brightness_and_contrast: false,
          enhance_cta: false,
          text_optimizations: false,
          image_background_gen: false,
          image_uncrop: false,
          adapt_to_placement: false,
          media_type_automation: false,
          product_extensions: false,
          description_automation: false,
          add_text_overlay: false,
          site_extensions: false
        },
      };

      const response = await fetch('/api/ad-batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batchData),
      });

      if (response.ok) {
        const savedBatch = await response.json();
        setActiveBatch(savedBatch);
        console.log('Batch saved successfully:', savedBatch.name);
      } else {
        console.error('Failed to save batch');
      }
    } catch (error) {
      console.error('Error saving batch:', error);
    }
  };

  const handleDefaultsSet = async (defaults: DefaultValues) => {
    setCurrentDefaults(defaults);
    setShowSheet(true);
    
    // Save the batch automatically when defaults are set
    await saveBatch(defaults);
  };

  const handleGoBackToConfig = () => {
    setShowSheet(false);
    // Don't clear the defaults - keep them for editing
  };

  const loadRecentBatch = async (batch: AdBatch) => {
    setActiveBatch(batch);
    
    // Convert to defaults and show sheet
    const defaults: DefaultValues = {
      brandId: batch.brand_id,
      adAccountId: batch.ad_account_id,
      campaignId: batch.campaign_id,
      adSetId: batch.ad_set_id,
      fbPage: batch.fb_page_id || '',
      igAccount: batch.ig_account_id || '',
      urlParams: batch.url_params || '',
      pixel: batch.pixel_id || '',
      status: batch.status as 'ACTIVE' | 'PAUSED',
      primaryText: batch.primary_text || '',
      headline: batch.headline || '',
      description: batch.description || '',
      destinationUrl: batch.destination_url || '',
      callToAction: batch.call_to_action || '',
      siteLinks: batch.site_links || [],
      advantageCreative: batch.advantage_plus_creative || {
        inline_comment: false,
        image_templates: false,
        image_touchups: false,
        video_auto_crop: false,
        image_brightness_and_contrast: false,
        enhance_cta: false,
        text_optimizations: false,
        image_background_gen: false,
        image_uncrop: false,
        adapt_to_placement: false,
        media_type_automation: false,
        product_extensions: false,
        description_automation: false,
        add_text_overlay: false,
        site_extensions: false
      },
    };
    
    setCurrentDefaults(defaults);
    setShowSheet(true);
    setShowRecentBatches(false);

    // Mark this batch as active
    await saveBatch(defaults, batch.name);
  };

  const deleteBatch = async (batchId: string) => {
    try {
      const response = await fetch(`/api/ad-batches?id=${batchId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Reload recent batches
        await loadActiveBatch();
        
        // If we deleted the active batch, reset to config mode
        if (activeBatch?.id === batchId) {
          setActiveBatch(null);
          setCurrentDefaults(null);
          setShowSheet(false);
        }
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
    }
  };

  const startNewBatch = () => {
    setActiveBatch(null);
    setCurrentDefaults(null);
    setShowSheet(false);
    setShowRecentBatches(false);
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
          
          {/* Action buttons */}
          <div className="flex items-center space-x-3">
            {(showSheet || activeBatch) && (
              <button 
                onClick={startNewBatch}
                className="px-4 py-2 text-sm font-medium text-primary-600 bg-white border border-primary-600 rounded-md hover:bg-primary-50"
              >
                New Batch
              </button>
            )}
            
            {recentBatches.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowRecentBatches(!showRecentBatches)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Recent Batches ({recentBatches.length})
                </button>
                
                {showRecentBatches && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Ad Batches</h3>
                      <div className="space-y-2">
                        {recentBatches.map((batch) => (
                          <div key={batch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div className="flex-1 cursor-pointer" onClick={() => loadRecentBatch(batch)}>
                              <p className="text-sm font-medium text-gray-900">{batch.name}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(batch.updated_at).toLocaleDateString()} • 
                                {batch.is_active ? ' Active' : ' Inactive'}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteBatch(batch.id);
                              }}
                              className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Delete batch"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {activeBatch && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Active Batch:</strong> {activeBatch.name} 
              <span className="text-blue-600 ml-2">
                (Last updated: {new Date(activeBatch.updated_at).toLocaleString()})
              </span>
            </p>
          </div>
        )}
      </header>

      {!showSheet ? (
        <AdBatchCreator 
          onDefaultsSet={handleDefaultsSet}
          initialDefaults={currentDefaults}
          activeBatch={activeBatch}
        />
      ) : (
        currentDefaults && (
          <div>
            <div className="mb-4">
              <button 
                onClick={handleGoBackToConfig} 
                className="inline-flex items-center text-sm text-primary-600 hover:text-primary-800 focus:outline-none"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Configuration
              </button>
            </div>
            <AdSheetView 
              defaults={currentDefaults} 
              onGoBack={handleGoBackToConfig}
              activeBatch={activeBatch}
            />
          </div>
        )
      )}
    </div>
  );
};

export default AdUploadToolPage; 