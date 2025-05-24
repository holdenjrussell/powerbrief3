"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, Facebook, Instagram, Target } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([]);
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [pixels, setPixels] = useState<MetaPixel[]>([]);
  
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>(currentAdAccountId || '');
  const [selectedPage, setSelectedPage] = useState<string>(currentFacebookPageId || '');
  const [selectedInstagramAccount, setSelectedInstagramAccount] = useState<string>(currentInstagramAccountId || '');
  const [selectedPixel, setSelectedPixel] = useState<string>(currentPixelId || '');
  
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Fetch all Meta assets
  const fetchMetaAssets = async () => {
    setLoading(true);
    setError(null);
    
    console.log('MetaAssetsSelector: Starting to fetch assets for brandId:', brandId);
    
    try {
      const [adAccountsRes, pagesRes, pixelsRes] = await Promise.all([
        fetch(`/api/meta/ad-accounts?brandId=${brandId}`),
        fetch(`/api/meta/pages?brandId=${brandId}`),
        fetch(`/api/meta/pixels?brandId=${brandId}`)
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
      
    } catch (err) {
      console.error('Error fetching Meta assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Meta assets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Save selected assets
  const handleSaveAssets = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch('/api/meta/save-assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          adAccountId: selectedAdAccount || undefined,
          facebookPageId: selectedPage || undefined,
          instagramAccountId: selectedInstagramAccount || undefined,
          pixelId: selectedPixel || undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save Meta assets');
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
    setSelectedPage(pageId);
    
    // Find the selected page and auto-select its Instagram account if available
    const selectedPageData = pages.find(p => p.id === pageId);
    if (selectedPageData?.instagram_business_account) {
      setSelectedInstagramAccount(selectedPageData.instagram_business_account.id);
    } else {
      setSelectedInstagramAccount('');
    }
  };

  // Load assets on component mount
  useEffect(() => {
    fetchMetaAssets();
  }, [brandId]);

  if (loading) {
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
          <CardContent>
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
              </SelectContent>
            </Select>
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
            {selectedPage && pages.find(p => p.id === selectedPage)?.instagram_business_account ? (
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
          disabled={saving || !selectedAdAccount}
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