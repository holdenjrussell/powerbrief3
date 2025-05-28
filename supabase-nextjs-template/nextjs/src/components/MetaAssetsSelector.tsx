"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, Facebook, Instagram, Target, Edit3 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * MetaAssetsSelector Component
 * 
 * This component allows users to select and configure Meta (Facebook/Instagram) assets
 * for their brand integration. It supports both automatic discovery of assets through
 * the Meta API and manual input for cases where assets are not accessible.
 * 
 * Features:
 * - Automatic fetching of ad accounts, Facebook pages, and pixels from Meta API
 * - Manual Facebook page ID input for pages not found or accessible
 * - Auto-detection of Instagram business accounts linked to Facebook pages
 * - Manual Instagram account ID input when using manual page ID
 * - Persistent state management for previously manually entered page IDs
 * 
 * Manual Page ID Use Cases:
 * 1. No pages found in Meta API response (permissions issue)
 * 2. Desired page not accessible through current Meta token
 * 3. User wants to use a specific page ID not in the fetched list
 * 4. Page was manually entered previously and should remain editable
 */

interface MetaAdAccount {
  id: string;
  name: string;
  account_status: string;
  account_id: string;
  business_name?: string;
  currency: string;
  timezone_name: string;
}

interface MetaPage {
  id: string;
  name: string;
  category: string;
  tasks: string[];
  access_token: string;
  instagram_business_account?: {
    id: string;
    name: string;
    username: string;
  };
}

interface MetaPixel {
  id: string;
  name: string;
  creation_time?: string;
}

interface MetaAssetsSelectorProps {
  brandId: string;
  currentAdAccountId?: string | null;
  currentFacebookPageId?: string | null;
  currentInstagramAccountId?: string | null;
  currentPixelId?: string | null;
  onAssetsSaved: () => void;
}

const MetaAssetsSelector: React.FC<MetaAssetsSelectorProps> = ({
  brandId,
  currentAdAccountId,
  currentFacebookPageId,
  currentInstagramAccountId,
  currentPixelId,
  onAssetsSaved
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([]);
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [pixels, setPixels] = useState<MetaPixel[]>([]);
  
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>(currentAdAccountId || '');
  const [selectedPage, setSelectedPage] = useState<string>(currentFacebookPageId || '');
  const [selectedInstagramAccount, setSelectedInstagramAccount] = useState<string>(currentInstagramAccountId || '');
  const [selectedPixel, setSelectedPixel] = useState<string>(currentPixelId || '');
  
  // New state for manual Facebook page ID
  // This allows users to manually enter a Facebook page ID if:
  // 1. No pages are found in the Meta API response
  // 2. The desired page is not accessible through the current Meta token
  // 3. The user wants to use a specific page ID that's not in the list
  const [isManualPageInput, setIsManualPageInput] = useState(false);
  const [manualPageId, setManualPageId] = useState<string>('');
  
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Exponential backoff retry logic for POST requests
  const fetchWithRetryPost = async (url: string, body: Record<string, unknown>, maxRetries = 3): Promise<Response> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        
        // If successful or client error (4xx), return immediately
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }
        
        // For server errors (5xx), retry with backoff
        if (response.status >= 500 && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Cap at 10 seconds
          console.log(`Meta API server error (${response.status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If we've exhausted retries, throw the error
        throw new Error(`Meta API error: ${response.status} ${response.statusText}`);
        
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        
        // For network errors, retry with backoff
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Cap at 10 seconds
          console.log(`Meta API network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1}):`, err);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }
    
    throw lastError!;
  };

  // Exponential backoff retry logic
  const fetchWithRetry = async (url: string, maxRetries = 3): Promise<Response> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        
        // If successful or client error (4xx), return immediately
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }
        
        // For server errors (5xx), retry with backoff
        if (response.status >= 500 && attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Cap at 10 seconds
          console.log(`Meta API server error (${response.status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If we've exhausted retries, throw the error
        throw new Error(`Meta API error: ${response.status} ${response.statusText}`);
        
      } catch (err) {
        lastError = err instanceof Error ? err : new Error('Unknown error');
        
        // For network errors, retry with backoff
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Cap at 10 seconds
          console.log(`Meta API network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1}):`, err);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }
    
    throw lastError!;
  };

  // Fetch all Meta assets
  const fetchMetaAssets = async () => {
    setIsLoading(true);
    setError(null);
    
    console.log('MetaAssetsSelector: Starting to fetch assets for brandId:', brandId);
    
    try {
      const [adAccountsRes, pagesRes, pixelsRes] = await Promise.all([
        fetchWithRetry(`/api/meta/ad-accounts?brandId=${brandId}`),
        fetchWithRetry(`/api/meta/pages?brandId=${brandId}`),
        fetchWithRetry(`/api/meta/pixels?brandId=${brandId}`)
      ]);
      
      console.log('MetaAssetsSelector: Response statuses:', {
        adAccounts: adAccountsRes.status,
        pages: pagesRes.status,
        pixels: pixelsRes.status
      });
      
      // Check for individual failures
      if (!adAccountsRes.ok) {
        const errorData = await adAccountsRes.json();
        console.error('Ad accounts fetch failed:', errorData);
        throw new Error(`Failed to fetch ad accounts: ${errorData.error || adAccountsRes.statusText}`);
      }
      
      if (!pagesRes.ok) {
        const errorData = await pagesRes.json();
        console.error('Pages fetch failed:', errorData);
        throw new Error(`Failed to fetch pages: ${errorData.error || pagesRes.statusText}`);
      }
      
      if (!pixelsRes.ok) {
        const errorData = await pixelsRes.json();
        console.error('Pixels fetch failed:', errorData);
        throw new Error(`Failed to fetch pixels: ${errorData.error || pixelsRes.statusText}`);
      }
      
      const [adAccountsData, pagesData, pixelsData] = await Promise.all([
        adAccountsRes.json(),
        pagesRes.json(),
        pixelsRes.json()
      ]);
      
      console.log('MetaAssetsSelector: Fetched data:', {
        adAccounts: adAccountsData.adAccounts?.length || 0,
        pages: pagesData.pages?.length || 0,
        pixels: pixelsData.pixels?.length || 0
      });
      
      setAdAccounts(adAccountsData.adAccounts || []);
      setPages(pagesData.pages || []);
      setPixels(pixelsData.pixels || []);
      setAssetsLoaded(true);
      
      // Check if current Facebook page ID is not in the fetched pages
      // This indicates it was manually entered previously
      if (currentFacebookPageId && pagesData.pages && pagesData.pages.length > 0) {
        const pageExists = pagesData.pages.some((page: MetaPage) => page.id === currentFacebookPageId);
        if (!pageExists) {
          setIsManualPageInput(true);
          setManualPageId(currentFacebookPageId);
          setSelectedPage(currentFacebookPageId);
        }
      } else if (currentFacebookPageId && (!pagesData.pages || pagesData.pages.length === 0)) {
        // If there are no pages but we have a current page ID, it was manually entered
        setIsManualPageInput(true);
        setManualPageId(currentFacebookPageId);
        setSelectedPage(currentFacebookPageId);
      }
      
    } catch (err) {
      console.error('Error fetching Meta assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Meta assets. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save selected assets
  const handleSaveAssets = async () => {
    try {
      setSaving(true);
      setError(null);

      const effectivePageId = getEffectivePageId();

      const response = await fetchWithRetryPost('/api/meta/save-assets', {
        brandId,
        adAccountId: selectedAdAccount || undefined,
        facebookPageId: effectivePageId || undefined,
        instagramAccountId: selectedInstagramAccount || undefined,
        pixelId: selectedPixel || undefined,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save Meta assets');
      }
      
      onAssetsSaved();
      
    } catch (err) {
      console.error('Error saving Meta assets:', err);
      setError('Failed to save Meta assets. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle page selection and auto-select Instagram account if available
  const handlePageSelection = (pageId: string) => {
    // Check if user selected the manual input option
    if (pageId === 'manual') {
      setIsManualPageInput(true);
      setSelectedPage('');
      setSelectedInstagramAccount('');
      return;
    }
    
    setIsManualPageInput(false);
    setSelectedPage(pageId);
    
    // Find the selected page and auto-select its Instagram account if available
    const selectedPageData = pages.find(p => p.id === pageId);
    if (selectedPageData?.instagram_business_account) {
      setSelectedInstagramAccount(selectedPageData.instagram_business_account.id);
    } else {
      setSelectedInstagramAccount('');
    }
  };

  // Handle manual page ID input
  // When user manually enters a page ID, we can't auto-detect Instagram accounts
  const handleManualPageIdChange = (value: string) => {
    setManualPageId(value);
    setSelectedPage(value);
    // Clear Instagram account when manually entering page ID since we can't auto-detect it
    setSelectedInstagramAccount('');
  };

  // Get the effective page ID (either selected from dropdown or manually entered)
  const getEffectivePageId = () => {
    return isManualPageInput ? manualPageId : selectedPage;
  };

  // Load assets on component mount
  useEffect(() => {
    fetchMetaAssets();
  }, [brandId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading Meta assets...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
        <Button 
          variant="outline" 
          onClick={fetchMetaAssets}
          className="mt-2"
          size="sm"
        >
          Retry
        </Button>
      </Alert>
    );
  }

  if (!assetsLoaded) {
    return (
      <div className="text-center p-8 text-gray-500">
        No Meta assets available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ad Account Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Target className="h-4 w-4 mr-2 text-blue-600" />
              Ad Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedAdAccount} onValueChange={setSelectedAdAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Select an ad account" />
              </SelectTrigger>
              <SelectContent>
                {adAccounts.map((account, index) => (
                  <SelectItem key={`${account.id}-${index}`} value={account.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{account.name}</span>
                      <span className="text-xs text-gray-500">
                        {account.business_name} • {account.currency}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Pixel Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Target className="h-4 w-4 mr-2 text-green-600" />
              Facebook Pixel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedPixel} onValueChange={setSelectedPixel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a pixel" />
              </SelectTrigger>
              <SelectContent>
                {pixels.map((pixel, index) => (
                  <SelectItem key={`${pixel.id}-${index}`} value={pixel.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{pixel.name}</span>
                      <span className="text-xs text-gray-500">ID: {pixel.id}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Facebook Page Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Facebook className="h-4 w-4 mr-2 text-blue-600" />
              Facebook Page
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isManualPageInput ? (
              <>
                <Select value={selectedPage} onValueChange={handlePageSelection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Facebook page" />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map((page, index) => (
                      <SelectItem key={`${page.id}-${index}`} value={page.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{page.name}</span>
                          <span className="text-xs text-gray-500">{page.category}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="manual">
                      <div className="flex items-center">
                        <Edit3 className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="font-medium">Enter Page ID Manually</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {pages.length === 0 && (
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">No pages found</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsManualPageInput(true)}
                      className="text-xs"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      Enter Page ID Manually
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Facebook Page ID
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsManualPageInput(false);
                      setManualPageId('');
                      setSelectedPage('');
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Back to selection
                  </Button>
                </div>
                <Input
                  type="text"
                  placeholder="Enter Facebook Page ID (e.g., 123456789012345)"
                  value={manualPageId}
                  onChange={(e) => handleManualPageIdChange(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-gray-500">
                  You can find your Page ID in Facebook Page Settings → Page Info
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instagram Account Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <Instagram className="h-4 w-4 mr-2 text-pink-600" />
              Instagram Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isManualPageInput && selectedPage && pages.find(p => p.id === selectedPage)?.instagram_business_account ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <div>
                    <span className="font-medium text-green-800">
                      @{pages.find(p => p.id === selectedPage)?.instagram_business_account?.username}
                    </span>
                    <p className="text-xs text-green-700">
                      Auto-selected from Facebook page
                    </p>
                  </div>
                </div>
              </div>
            ) : isManualPageInput ? (
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Enter Instagram Account ID (optional)"
                  value={selectedInstagramAccount}
                  onChange={(e) => setSelectedInstagramAccount(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-gray-500">
                  Optional: Enter Instagram Business Account ID if you want to include Instagram placement
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-center text-sm text-gray-500">
                Select a Facebook page with linked Instagram account
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveAssets}
          disabled={saving || !selectedAdAccount || (!selectedPage && !manualPageId)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Selection
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default MetaAssetsSelector; 