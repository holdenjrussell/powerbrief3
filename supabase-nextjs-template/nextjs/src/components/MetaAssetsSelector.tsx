"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, Facebook, Instagram, Target, Edit3, Star, StarOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * MetaAssetsSelector Component
 * 
 * This component allows users to select and configure Meta (Facebook/Instagram) assets
 * for their brand integration. It supports both automatic discovery of assets through
 * the Meta API and manual input for cases where assets are not accessible.
 * 
 * Features:
 * - Multiple selection of ad accounts, Facebook pages, and pixels
 * - Default selection system for each asset type
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

interface MetaInstagramAccount {
  id: string;
  name: string;
  username: string;
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
  
  // Multiple selections state
  const [selectedAdAccounts, setSelectedAdAccounts] = useState<Set<string>>(new Set());
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [selectedPixels, setSelectedPixels] = useState<Set<string>>(new Set());
  
  // Default selections state
  const [defaultAdAccount, setDefaultAdAccount] = useState<string>(currentAdAccountId || '');
  const [defaultPage, setDefaultPage] = useState<string>(currentFacebookPageId || '');
  const [defaultPixel, setDefaultPixel] = useState<string>(currentPixelId || '');
  
  // Instagram accounts derived from selected pages
  const [defaultInstagramAccount, setDefaultInstagramAccount] = useState<string>(currentInstagramAccountId || '');
  
  // Use Page As Actor state
  const [usePageAsActor, setUsePageAsActor] = useState<boolean>(false);
  const [pageBackedInstagramAccounts, setPageBackedInstagramAccounts] = useState<Record<string, string>>({});
  
  // Manual input state
  const [isManualPageInput, setIsManualPageInput] = useState(false);
  const [manualPageId, setManualPageId] = useState<string>('');
  const [manualPageLabel, setManualPageLabel] = useState<string>('');
  const [manualInstagramId, setManualInstagramId] = useState<string>('');
  const [manualInstagramLabel, setManualInstagramLabel] = useState<string>('');
  
  // Arrays to store multiple manual entries
  const [manualPages, setManualPages] = useState<MetaPage[]>([]);
  const [manualInstagramAccounts, setManualInstagramAccounts] = useState<MetaInstagramAccount[]>([]);
  
  // Labels for manual entries
  const [manualPageLabels, setManualPageLabels] = useState<Record<string, string>>({});
  const [manualInstagramLabels, setManualInstagramLabels] = useState<Record<string, string>>({});
  
  // Manual Instagram pairing for Facebook pages (pageId -> instagramId)
  const [manualInstagramPairings, setManualInstagramPairings] = useState<Record<string, string>>({});
  
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

  // Update Instagram accounts when pages selection changes
  useEffect(() => {
    // Determine the default Instagram account from available accounts
    const availableInstagramAccounts: MetaInstagramAccount[] = [];
    
    // Add Instagram accounts from selected API-fetched pages
    selectedPages.forEach(pageId => {
      const page = pages.find(p => p.id === pageId);
      if (page?.instagram_business_account) {
        const igAccount = {
          id: page.instagram_business_account.id,
          name: page.instagram_business_account.name,
          username: page.instagram_business_account.username
        };
        if (!availableInstagramAccounts.find(a => a.id === igAccount.id)) {
          availableInstagramAccounts.push(igAccount);
        }
      }
    });
    
    // Add manually paired Instagram accounts
    Object.values(manualInstagramPairings).forEach(instagramId => {
      const manualAccount = manualInstagramAccounts.find(a => a.id === instagramId);
      if (manualAccount && !availableInstagramAccounts.find(a => a.id === manualAccount.id)) {
        availableInstagramAccounts.push(manualAccount);
      }
    });
    
    // Set default Instagram account logic
    if (defaultInstagramAccount && !availableInstagramAccounts.find(a => a.id === defaultInstagramAccount)) {
      // Update default if current default is no longer available
      setDefaultInstagramAccount(availableInstagramAccounts.length > 0 ? availableInstagramAccounts[0].id : '');
    } else if (!defaultInstagramAccount && availableInstagramAccounts.length > 0) {
      // Set first available as default if no default is set
      setDefaultInstagramAccount(availableInstagramAccounts[0].id);
    }
  }, [selectedPages, pages, manualInstagramPairings, manualInstagramAccounts, defaultInstagramAccount]);

  // Fetch all Meta assets
  const fetchMetaAssets = async () => {
    setIsLoading(true);
    setError(null);
    
    console.log('MetaAssetsSelector: Starting to fetch assets for brandId:', brandId);
    
    try {
      const [adAccountsRes, pagesRes, pixelsRes, brandConfigRes] = await Promise.all([
        fetchWithRetry(`/api/meta/ad-accounts?brandId=${brandId}`),
        fetchWithRetry(`/api/meta/pages?brandId=${brandId}`),
        fetchWithRetry(`/api/meta/pixels?brandId=${brandId}`),
        fetchWithRetry(`/api/meta/brand-config?brandId=${brandId}`)
      ]);
      
      console.log('MetaAssetsSelector: Response statuses:', {
        adAccounts: adAccountsRes.status,
        pages: pagesRes.status,
        pixels: pixelsRes.status,
        brandConfig: brandConfigRes.status
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

      // Handle brand config - it might fail if columns don't exist yet
      let brandConfig = null;
      if (brandConfigRes.ok) {
        const brandConfigData = await brandConfigRes.json();
        brandConfig = brandConfigData.config;
        console.log('MetaAssetsSelector: Brand config loaded:', brandConfig);
      } else {
        console.log('MetaAssetsSelector: Brand config not available (likely migration not applied)');
      }
      
      console.log('MetaAssetsSelector: Fetched data:', {
        adAccounts: adAccountsData.adAccounts?.length || 0,
        pages: pagesData.pages?.length || 0,
        pixels: pixelsData.pixels?.length || 0,
        brandConfig: brandConfig ? 'loaded' : 'not available'
      });
      
      setAdAccounts(adAccountsData.adAccounts || []);
      setPages(pagesData.pages || []);
      setPixels(pixelsData.pixels || []);
      setAssetsLoaded(true);

      // Initialize from brand config if available
      if (brandConfig) {
        // Load saved manual entries
        const savedManualPages = (brandConfig.facebookPages || []).filter((page: any) => 
          page.category === 'Manual Entry'
        );
        setManualPages(savedManualPages);
        setManualPageLabels(brandConfig.manualPageLabels || {});
        setManualInstagramLabels(brandConfig.manualInstagramLabels || {});
        setManualInstagramPairings(brandConfig.manualInstagramPairings || {});

        // Reconstruct manual Instagram accounts from pairings and labels
        const manualInstagramIds = new Set(Object.values(brandConfig.manualInstagramPairings || {}));
        const reconstructedManualInstagramAccounts = Array.from(manualInstagramIds).map(id => ({
          id: id as string,
          name: brandConfig.manualInstagramLabels?.[id as string] || `Manual: ${id}`,
          username: (brandConfig.manualInstagramLabels?.[id as string] || `Manual: ${id}`).replace('Manual: ', '')
        }));
        setManualInstagramAccounts(reconstructedManualInstagramAccounts);

        // Initialize selections from saved data with proper type casting
        const savedAdAccountIds: string[] = (brandConfig.adAccounts || []).map((acc: any) => String(acc.id));
        const savedPageIds: string[] = (brandConfig.facebookPages || []).map((page: any) => String(page.id));
        const savedPixelIds: string[] = (brandConfig.pixels || []).map((pixel: any) => String(pixel.id));

        setSelectedAdAccounts(new Set(savedAdAccountIds));
        setSelectedPages(new Set(savedPageIds));
        setSelectedPixels(new Set(savedPixelIds));

        // Set defaults
        setDefaultAdAccount(brandConfig.defaultAdAccountId || '');
        setDefaultPage(brandConfig.defaultFacebookPageId || '');
        setDefaultPixel(brandConfig.defaultPixelId || '');
        setDefaultInstagramAccount(brandConfig.defaultInstagramAccountId || '');

        // Initialize "Use Page As Actor" settings
        setUsePageAsActor(brandConfig.usePageAsActor || false);
        setPageBackedInstagramAccounts(brandConfig.pageBackedInstagramAccounts || {});

        console.log('MetaAssetsSelector: Initialized from brand config:', {
          manualPages: savedManualPages.length,
          manualInstagramAccounts: reconstructedManualInstagramAccounts.length,
          selectedAdAccounts: savedAdAccountIds.length,
          selectedPages: savedPageIds.length,
          selectedPixels: savedPixelIds.length,
          manualPageLabels: Object.keys(brandConfig.manualPageLabels || {}).length,
          manualInstagramLabels: Object.keys(brandConfig.manualInstagramLabels || {}).length,
          manualInstagramPairings: Object.keys(brandConfig.manualInstagramPairings || {}).length,
          usePageAsActor: brandConfig.usePageAsActor || false,
          pageBackedInstagramAccounts: Object.keys(brandConfig.pageBackedInstagramAccounts || {}).length
        });
      } else {
        // Fallback to legacy initialization with current props
        if (currentAdAccountId) {
          setSelectedAdAccounts(new Set([currentAdAccountId]));
        }
        if (currentFacebookPageId) {
          const pageExists = (pagesData.pages || []).some((page: MetaPage) => page.id === currentFacebookPageId);
          if (pageExists) {
            setSelectedPages(new Set([currentFacebookPageId]));
          } else {
            // Page was manually entered - create a manual page entry
            const manualPage = {
              id: currentFacebookPageId,
              name: `Manual: ${currentFacebookPageId}`,
              category: 'Manual Entry',
              tasks: [],
              access_token: ''
            };
            setManualPages([manualPage]);
            setManualPageLabels({ [currentFacebookPageId]: `Manual: ${currentFacebookPageId}` });
            setSelectedPages(new Set([currentFacebookPageId]));
          }
        }
        if (currentPixelId) {
          setSelectedPixels(new Set([currentPixelId]));
        }
        if (currentInstagramAccountId) {
          // Create a manual Instagram account entry
          const manualInstagramAccount = {
            id: currentInstagramAccountId,
            name: `Manual: ${currentInstagramAccountId}`,
            username: 'manual_entry'
          };
          setManualInstagramAccounts([manualInstagramAccount]);
          setManualInstagramLabels({ [currentInstagramAccountId]: `Manual: ${currentInstagramAccountId}` });
          setDefaultInstagramAccount(currentInstagramAccountId);
        }
      }
      
    } catch (err) {
      console.error('Error fetching Meta assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Meta assets. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle ad account selection
  const handleAdAccountToggle = (accountId: string, checked: boolean) => {
    const newSelected = new Set(selectedAdAccounts);
    if (checked) {
      newSelected.add(accountId);
      // Set as default if it's the first one selected
      if (newSelected.size === 1) {
        setDefaultAdAccount(accountId);
      }
    } else {
      newSelected.delete(accountId);
      // Update default if we removed the current default
      if (defaultAdAccount === accountId) {
        setDefaultAdAccount(newSelected.size > 0 ? Array.from(newSelected)[0] : '');
      }
    }
    setSelectedAdAccounts(newSelected);
  };

  // Handle page selection
  const handlePageToggle = (pageId: string, checked: boolean) => {
    const newSelected = new Set(selectedPages);
    if (checked) {
      newSelected.add(pageId);
      // Set as default if it's the first one selected
      if (newSelected.size === 1) {
        setDefaultPage(pageId);
      }
    } else {
      newSelected.delete(pageId);
      // Update default if we removed the current default
      if (defaultPage === pageId) {
        setDefaultPage(newSelected.size > 0 ? Array.from(newSelected)[0] : '');
      }
    }
    setSelectedPages(newSelected);
  };

  // Handle pixel selection
  const handlePixelToggle = (pixelId: string, checked: boolean) => {
    const newSelected = new Set(selectedPixels);
    if (checked) {
      newSelected.add(pixelId);
      // Set as default if it's the first one selected
      if (newSelected.size === 1) {
        setDefaultPixel(pixelId);
      }
    } else {
      newSelected.delete(pixelId);
      // Update default if we removed the current default
      if (defaultPixel === pixelId) {
        setDefaultPixel(newSelected.size > 0 ? Array.from(newSelected)[0] : '');
      }
    }
    setSelectedPixels(newSelected);
  };

  // Add manual Facebook page
  const addManualPage = () => {
    if (manualPageId.trim()) {
      const pageId = manualPageId.trim();
      const pageLabel = manualPageLabel.trim() || `Manual: ${pageId}`;
      
      const newPage: MetaPage = {
        id: pageId,
        name: pageLabel,
        category: 'Manual Entry',
        tasks: [],
        access_token: ''
      };
      
      setManualPages(prev => [...prev, newPage]);
      
      // Store the label mapping
      setManualPageLabels(prev => ({
        ...prev,
        [pageId]: pageLabel
      }));
      
      // Add to selected pages
      const newSelected = new Set(selectedPages);
      newSelected.add(pageId);
      setSelectedPages(newSelected);
      
      // Set as default if it's the first one
      if (!defaultPage) {
        setDefaultPage(pageId);
      }
      
      // Clear inputs and close input mode
      setManualPageId('');
      setManualPageLabel('');
      setIsManualPageInput(false);
    }
  };

  // Remove manual Facebook page
  const removeManualPage = (pageId: string) => {
    setManualPages(prev => prev.filter(p => p.id !== pageId));
    
    // Remove label mapping
    setManualPageLabels(prev => {
      const newLabels = { ...prev };
      delete newLabels[pageId];
      return newLabels;
    });
    
    // Remove Instagram pairing for this page
    setManualInstagramPairings(prev => {
      const newPairings = { ...prev };
      delete newPairings[pageId];
      return newPairings;
    });
    
    // Remove from selected pages
    const newSelected = new Set(selectedPages);
    newSelected.delete(pageId);
    setSelectedPages(newSelected);
    
    // Update default if we removed the current default
    if (defaultPage === pageId) {
      setDefaultPage(newSelected.size > 0 ? Array.from(newSelected)[0] : '');
    }
    
    // Clean up unpaired Instagram accounts
    setTimeout(() => cleanupUnpairedInstagramAccounts(), 0);
  };

  // Pair a manual Instagram account to a Facebook page
  const pairInstagramToPage = (pageId: string, instagramId: string | null) => {
    setManualInstagramPairings(prev => {
      const newPairings = { ...prev };
      if (instagramId) {
        newPairings[pageId] = instagramId;
      } else {
        delete newPairings[pageId];
        // Clean up unpaired Instagram accounts after state update
        setTimeout(() => cleanupUnpairedInstagramAccounts(), 0);
      }
      return newPairings;
    });
  };

  // Remove manual Instagram account if it's no longer paired to any page
  const cleanupUnpairedInstagramAccounts = () => {
    const pairedInstagramIds = new Set(Object.values(manualInstagramPairings));
    setManualInstagramAccounts(prev => 
      prev.filter(account => pairedInstagramIds.has(account.id))
    );
    setManualInstagramLabels(prev => {
      const newLabels = { ...prev };
      Object.keys(newLabels).forEach(id => {
        if (!pairedInstagramIds.has(id)) {
          delete newLabels[id];
        }
      });
      return newLabels;
    });
  };

  // Save selected assets
  const handleSaveAssets = async () => {
    try {
      setSaving(true);
      setError(null);

      // Prepare data for the API
      const selectedAdAccountsArray = Array.from(selectedAdAccounts).map(id => 
        adAccounts.find(acc => acc.id === id)
      ).filter(Boolean) as MetaAdAccount[];

      const selectedPagesArray = Array.from(selectedPages).map(id => {
        const page = pages.find(p => p.id === id);
        if (page) return page;
        // Handle manual pages
        const manualPage = manualPages.find(p => p.id === id);
        if (manualPage) return manualPage;
        return null;
      }).filter(Boolean) as MetaPage[];

      const selectedPixelsArray = Array.from(selectedPixels).map(id => 
        pixels.find(pixel => pixel.id === id)
      ).filter(Boolean) as MetaPixel[];

      // Collect Instagram accounts from both automatic and manual pairings
      const allInstagramAccounts: MetaInstagramAccount[] = [];
      
      // Add Instagram accounts from API-fetched pages
      selectedPages.forEach(pageId => {
        const page = pages.find(p => p.id === pageId);
        if (page?.instagram_business_account) {
          const igAccount = {
            id: page.instagram_business_account.id,
            name: page.instagram_business_account.name,
            username: page.instagram_business_account.username
          };
          if (!allInstagramAccounts.find(a => a.id === igAccount.id)) {
            allInstagramAccounts.push(igAccount);
          }
        }
      });
      
      // Add manually paired Instagram accounts
      Object.values(manualInstagramPairings).forEach(instagramId => {
        const manualAccount = manualInstagramAccounts.find(a => a.id === instagramId);
        if (manualAccount && !allInstagramAccounts.find(a => a.id === manualAccount.id)) {
          allInstagramAccounts.push(manualAccount);
        }
      });

      // Determine the default Instagram account
      let effectiveDefaultInstagramAccount = defaultInstagramAccount;
      if (!effectiveDefaultInstagramAccount && allInstagramAccounts.length > 0) {
        effectiveDefaultInstagramAccount = allInstagramAccounts[0].id;
      }

      console.log('Saving Meta assets:', {
        adAccounts: selectedAdAccountsArray.length,
        facebookPages: selectedPagesArray.length,
        instagramAccounts: allInstagramAccounts.length,
        pixels: selectedPixelsArray.length,
        manualPairings: Object.keys(manualInstagramPairings).length,
        manualPages: manualPages.length,
        manualInstagramAccounts: manualInstagramAccounts.length,
        manualPageLabels,
        manualInstagramLabels,
        manualInstagramPairings,
        selectedPagesArray,
        allInstagramAccounts
      });

      const response = await fetchWithRetryPost('/api/meta/save-assets', {
        brandId,
        adAccounts: selectedAdAccountsArray,
        facebookPages: selectedPagesArray,
        instagramAccounts: allInstagramAccounts,
        pixels: selectedPixelsArray,
        defaultAdAccountId: defaultAdAccount || null,
        defaultFacebookPageId: defaultPage || null,
        defaultInstagramAccountId: effectiveDefaultInstagramAccount || null,
        defaultPixelId: defaultPixel || null,
        manualPageLabels,
        manualInstagramLabels,
        manualInstagramPairings,
        usePageAsActor,
        pageBackedInstagramAccounts,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save Meta assets');
      }
      
      console.log('Meta assets saved successfully');
      onAssetsSaved();
      
    } catch (err) {
      console.error('Error saving Meta assets:', err);
      setError('Failed to save Meta assets. Please try again.');
    } finally {
      setSaving(false);
    }
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
      {/* Ad Accounts Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Target className="h-4 w-4 mr-2 text-blue-600" />
            Ad Accounts ({selectedAdAccounts.size} selected)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {adAccounts.length > 0 ? (
            <>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {adAccounts.map((account) => (
                  <div key={account.id} className="flex items-center space-x-3 p-2 border rounded-md">
                    <input
                      type="checkbox"
                      checked={selectedAdAccounts.has(account.id)}
                      onChange={(e) => handleAdAccountToggle(account.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      aria-label={`Select ad account ${account.name}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{account.name}</span>
                        {defaultAdAccount === account.id && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {account.business_name} • {account.currency}
                      </p>
                    </div>
                    {selectedAdAccounts.has(account.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultAdAccount(account.id)}
                        className="text-xs"
                      >
                        {defaultAdAccount === account.id ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        ) : (
                          <StarOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {selectedAdAccounts.size > 0 && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800">
                    <Star className="h-3 w-3 inline mr-1 text-yellow-500 fill-current" />
                    Default: {adAccounts.find(a => a.id === defaultAdAccount)?.name || 'None selected'}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No ad accounts found</p>
          )}
        </CardContent>
      </Card>

      {/* Facebook Pages Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Facebook className="h-4 w-4 mr-2 text-blue-600" />
            Facebook Pages ({selectedPages.size} selected)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isManualPageInput ? (
            <>
              {(pages.length > 0 || manualPages.length > 0) ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {/* API-fetched pages */}
                  {pages.map((page) => (
                    <div key={page.id} className="flex items-center space-x-3 p-2 border rounded-md">
                      <input
                        type="checkbox"
                        checked={selectedPages.has(page.id)}
                        onChange={(e) => handlePageToggle(page.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        aria-label={`Select Facebook page ${page.name}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{page.name}</span>
                          {defaultPage === page.id && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                          {page.instagram_business_account && (
                            <Instagram className="h-3 w-3 text-pink-500" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{page.category}</p>
                      </div>
                      {selectedPages.has(page.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDefaultPage(page.id)}
                          className="text-xs"
                        >
                          {defaultPage === page.id ? (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          ) : (
                            <StarOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {/* API-fetched pages - Instagram options */}
                  {pages.map((page) => (
                    selectedPages.has(page.id) && !page.instagram_business_account && (
                      <div key={`ig-${page.id}`} className="ml-6 p-2 bg-gray-50 border border-gray-200 rounded-md">
                        <div className="flex items-center space-x-2 mb-2">
                          <Instagram className="h-3 w-3 text-pink-500" />
                          <label className="text-xs font-medium text-gray-700">
                            Instagram Account for {page.name}:
                          </label>
                        </div>
                        
                        <div className="space-y-3">
                          {/* Option 1: Manual Instagram Account */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`manual-ig-${page.id}`}
                                name={`ig-option-${page.id}`}
                                value="manual"
                                className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <label htmlFor={`manual-ig-${page.id}`} className="text-xs font-medium text-gray-700">
                                Link existing Instagram Business Account
                              </label>
                            </div>
                            <div className="ml-5 flex space-x-2">
                              <Input
                                type="text"
                                placeholder="Instagram Account ID"
                                value={manualInstagramId}
                                onChange={(e) => setManualInstagramId(e.target.value)}
                                className="text-xs flex-1"
                              />
                              <Input
                                type="text"
                                placeholder="Label (optional)"
                                value={manualInstagramLabel}
                                onChange={(e) => setManualInstagramLabel(e.target.value)}
                                className="text-xs flex-1"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (manualInstagramId.trim()) {
                                    const accountId = manualInstagramId.trim();
                                    const accountLabel = manualInstagramLabel.trim() || `Manual: ${accountId}`;
                                    
                                    // Add to manual Instagram accounts if not already there
                                    if (!manualInstagramAccounts.find(a => a.id === accountId)) {
                                      const newAccount = {
                                        id: accountId,
                                        name: accountLabel,
                                        username: accountLabel.replace('Manual: ', '')
                                      };
                                      setManualInstagramAccounts(prev => [...prev, newAccount]);
                                      setManualInstagramLabels(prev => ({
                                        ...prev,
                                        [accountId]: accountLabel
                                      }));
                                    }
                                    
                                    // Pair to this page
                                    pairInstagramToPage(page.id, accountId);
                                    
                                    // Clear inputs
                                    setManualInstagramId('');
                                    setManualInstagramLabel('');
                                  }
                                }}
                                disabled={!manualInstagramId.trim()}
                                className="text-xs"
                              >
                                Link
                              </Button>
                            </div>
                          </div>
                          
                          {/* Option 2: Use Page As Actor */}
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`pbia-${page.id}`}
                                name={`ig-option-${page.id}`}
                                value="pbia"
                                checked={usePageAsActor}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setUsePageAsActor(true);
                                    // Create a PBIA mapping for this page
                                    setPageBackedInstagramAccounts(prev => ({
                                      ...prev,
                                      [page.id]: `pbia_${page.id}` // Placeholder - will be replaced with actual PBIA ID when created
                                    }));
                                  }
                                }}
                                className="h-3 w-3 text-pink-600 focus:ring-pink-500 border-gray-300"
                              />
                              <label htmlFor={`pbia-${page.id}`} className="text-xs font-medium text-gray-700">
                                Use Page As Actor for Instagram Ads
                              </label>
                            </div>
                            {usePageAsActor && (
                              <div className="ml-5 p-2 bg-pink-50 border border-pink-200 rounded-md">
                                <p className="text-xs text-pink-800">
                                  <strong>Page-Backed Instagram Account:</strong> Creates a shadow Instagram account using this Facebook Page name and profile picture for Instagram ads.
                                </p>
                                <p className="text-xs text-pink-700 mt-1">
                                  • No separate Instagram login required<br/>
                                  • Uses your Facebook Page identity<br/>
                                  • Managed through Meta APIs only
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Choose how to handle Instagram ads for this Facebook page
                        </p>
                      </div>
                    )
                  ))}
                  
                  {/* Manual pages */}
                  {manualPages.map((page) => (
                    <div key={page.id} className="space-y-2">
                      <div className="flex items-center space-x-3 p-2 border rounded-md bg-yellow-50">
                        <input
                          type="checkbox"
                          checked={selectedPages.has(page.id)}
                          onChange={(e) => handlePageToggle(page.id, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          aria-label={`Select Facebook page ${page.name}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{page.name}</span>
                            {defaultPage === page.id && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                            <span className="text-xs bg-yellow-200 text-yellow-800 px-1 rounded">Manual</span>
                          </div>
                          <p className="text-xs text-gray-500">ID: {page.id}</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          {selectedPages.has(page.id) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDefaultPage(page.id)}
                              className="text-xs"
                            >
                              {defaultPage === page.id ? (
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              ) : (
                                <StarOff className="h-4 w-4 text-gray-400" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeManualPage(page.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                      
                      {/* Instagram pairing for manual pages only */}
                      {selectedPages.has(page.id) && (
                        <div className="ml-6 p-2 bg-gray-50 border border-gray-200 rounded-md">
                          <div className="flex items-center space-x-2 mb-2">
                            <Instagram className="h-3 w-3 text-pink-500" />
                            <label className="text-xs font-medium text-gray-700">
                              Instagram Account for this page:
                            </label>
                          </div>
                          
                          {/* Show current pairing or input for new one */}
                          {manualInstagramPairings[page.id] ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-600">
                                Linked to: @{manualInstagramAccounts.find(a => a.id === manualInstagramPairings[page.id])?.username || manualInstagramPairings[page.id]}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => pairInstagramToPage(page.id, null)}
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                ✕ Remove
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Option 1: Manual Instagram Account */}
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id={`manual-ig-${page.id}`}
                                    name={`ig-option-${page.id}`}
                                    value="manual"
                                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                                  />
                                  <label htmlFor={`manual-ig-${page.id}`} className="text-xs font-medium text-gray-700">
                                    Link existing Instagram Business Account
                                  </label>
                                </div>
                                <div className="ml-5 flex space-x-2">
                                  <Input
                                    type="text"
                                    placeholder="Instagram Account ID"
                                    value={manualInstagramId}
                                    onChange={(e) => setManualInstagramId(e.target.value)}
                                    className="text-xs flex-1"
                                  />
                                  <Input
                                    type="text"
                                    placeholder="Label (optional)"
                                    value={manualInstagramLabel}
                                    onChange={(e) => setManualInstagramLabel(e.target.value)}
                                    className="text-xs flex-1"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (manualInstagramId.trim()) {
                                        const accountId = manualInstagramId.trim();
                                        const accountLabel = manualInstagramLabel.trim() || `Manual: ${accountId}`;
                                        
                                        // Add to manual Instagram accounts if not already there
                                        if (!manualInstagramAccounts.find(a => a.id === accountId)) {
                                          const newAccount = {
                                            id: accountId,
                                            name: accountLabel,
                                            username: accountLabel.replace('Manual: ', '')
                                          };
                                          setManualInstagramAccounts(prev => [...prev, newAccount]);
                                          setManualInstagramLabels(prev => ({
                                            ...prev,
                                            [accountId]: accountLabel
                                          }));
                                        }
                                        
                                        // Pair to this page
                                        pairInstagramToPage(page.id, accountId);
                                        
                                        // Clear inputs
                                        setManualInstagramId('');
                                        setManualInstagramLabel('');
                                      }
                                    }}
                                    disabled={!manualInstagramId.trim()}
                                    className="text-xs"
                                  >
                                    Link
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Option 2: Use Page As Actor */}
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id={`pbia-${page.id}`}
                                    name={`ig-option-${page.id}`}
                                    value="pbia"
                                    checked={usePageAsActor}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setUsePageAsActor(true);
                                        // Create a PBIA mapping for this page
                                        setPageBackedInstagramAccounts(prev => ({
                                          ...prev,
                                          [page.id]: `pbia_${page.id}` // Placeholder - will be replaced with actual PBIA ID when created
                                        }));
                                      }
                                    }}
                                    className="h-3 w-3 text-pink-600 focus:ring-pink-500 border-gray-300"
                                  />
                                  <label htmlFor={`pbia-${page.id}`} className="text-xs font-medium text-gray-700">
                                    Use Page As Actor for Instagram Ads
                                  </label>
                                </div>
                                {usePageAsActor && (
                                  <div className="ml-5 p-2 bg-pink-50 border border-pink-200 rounded-md">
                                    <p className="text-xs text-pink-800">
                                      <strong>Page-Backed Instagram Account:</strong> Creates a "shadow" Instagram account using this Facebook Page's name and profile picture for Instagram ads.
                                    </p>
                                    <p className="text-xs text-pink-700 mt-1">
                                      • No separate Instagram login required<br/>
                                      • Uses your Facebook Page identity<br/>
                                      • Managed through Meta APIs only
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Choose how to handle Instagram ads for this Facebook page
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No pages found</p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsManualPageInput(true)}
                className="text-xs w-full"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Add Page ID Manually
              </Button>
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
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Back to selection
                </Button>
              </div>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Enter Facebook Page ID (e.g., 123456789012345)"
                  value={manualPageId}
                  onChange={(e) => setManualPageId(e.target.value)}
                  className="text-sm flex-1"
                />
                <Input
                  type="text"
                  placeholder="Label/Name (optional)"
                  value={manualPageLabel}
                  onChange={(e) => setManualPageLabel(e.target.value)}
                  className="text-sm flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addManualPage}
                  disabled={!manualPageId.trim()}
                  className="text-xs"
                >
                  Add
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                You can find your Page ID in Facebook Page Settings → Page Info
              </p>
            </div>
          )}
          {selectedPages.size > 0 && (
            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-800">
                <Star className="h-3 w-3 inline mr-1 text-yellow-500 fill-current" />
                Default: {pages.find(p => p.id === defaultPage)?.name || manualPages.find(p => p.id === defaultPage)?.name || (defaultPage === manualPageId ? `Manual: ${manualPageId}` : defaultPage) || 'None selected'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pixels Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <Target className="h-4 w-4 mr-2 text-green-600" />
            Facebook Pixels ({selectedPixels.size} selected)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pixels.length > 0 ? (
            <>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pixels.map((pixel) => (
                  <div key={pixel.id} className="flex items-center space-x-3 p-2 border rounded-md">
                    <input
                      type="checkbox"
                      checked={selectedPixels.has(pixel.id)}
                      onChange={(e) => handlePixelToggle(pixel.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      aria-label={`Select pixel ${pixel.name}`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{pixel.name}</span>
                        {defaultPixel === pixel.id && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">ID: {pixel.id}</p>
                    </div>
                    {selectedPixels.has(pixel.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultPixel(pixel.id)}
                        className="text-xs"
                      >
                        {defaultPixel === pixel.id ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        ) : (
                          <StarOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {selectedPixels.size > 0 && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-800">
                    <Star className="h-3 w-3 inline mr-1 text-yellow-500 fill-current" />
                    Default: {pixels.find(p => p.id === defaultPixel)?.name || 'None selected'}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No pixels found</p>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveAssets}
          disabled={saving || selectedAdAccounts.size === 0}
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
              Save Selection ({selectedAdAccounts.size + selectedPages.size + selectedPixels.size} assets)
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default MetaAssetsSelector; 