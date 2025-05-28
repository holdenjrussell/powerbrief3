'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Campaign } from '@/lib/types/meta';
import { ChevronDown, Search, Filter, Star } from 'lucide-react';

interface CampaignFavorite {
  id: string;
  campaign_id: string;
  campaign_name: string;
  ad_account_id: string;
}

interface MetaCampaignSelectorProps {
  brandId: string | null;
  adAccountId: string | null;
  selectedCampaignId: string | null;
  selectedCampaignName?: string | null;
  onCampaignSelect: (campaignId: string | null, campaignName?: string | null) => void;
  disabled?: boolean;
}

const MetaCampaignSelector: React.FC<MetaCampaignSelectorProps> = ({
  brandId,
  adAccountId,
  selectedCampaignId,
  selectedCampaignName,
  onCampaignSelect,
  disabled = false,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [favorites, setFavorites] = useState<CampaignFavorite[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(false);

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

  // Fetch campaign favorites
  const fetchFavorites = async () => {
    if (!brandId || !adAccountId) return;
    
    try {
      const res = await fetch(`/api/campaign-favorites?brandId=${brandId}&adAccountId=${adAccountId}`);
      if (res.ok) {
        const data = await res.json();
        setFavorites(data);
      }
    } catch (err) {
      console.error('Error fetching campaign favorites:', err);
    }
  };

  // Only fetch campaigns when dropdown is opened and we haven't fetched yet
  const fetchCampaigns = async () => {
    if (!brandId || !adAccountId || isLoading || hasFetched) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetchWithRetry(`/api/meta/campaigns?brandId=${brandId}&adAccountId=${adAccountId}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch campaigns: ${res.statusText}`);
      }
      
      const data: Campaign[] = await res.json();
      setCampaigns(data);
      setHasFetched(true);
      
      // If we have a selected campaign ID but no name, auto-save the name
      if (selectedCampaignId && !selectedCampaignName) {
        const matchingCampaign = data.find(c => c.id === selectedCampaignId);
        if (matchingCampaign) {
          onCampaignSelect(selectedCampaignId, matchingCampaign.name);
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching campaigns:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset fetched state when ad account changes
  useEffect(() => {
    setHasFetched(false);
    setCampaigns([]);
    setFavorites([]);
    setError(null);
    if (!adAccountId) {
      onCampaignSelect(null);
    } else {
      fetchFavorites();
    }
  }, [brandId, adAccountId]);

  // Toggle favorite status
  const toggleFavorite = async (campaign: Campaign, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!brandId || !adAccountId) return;
    
    const isFavorited = favorites.some(f => f.campaign_id === campaign.id);
    
    try {
      if (isFavorited) {
        // Remove from favorites
        const res = await fetch(`/api/campaign-favorites?brandId=${brandId}&campaignId=${campaign.id}`, {
          method: 'DELETE',
        });
        
        if (res.ok) {
          setFavorites(prev => prev.filter(f => f.campaign_id !== campaign.id));
        }
      } else {
        // Add to favorites
        const res = await fetch('/api/campaign-favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId,
            campaignId: campaign.id,
            campaignName: campaign.name,
            adAccountId
          }),
        });
        
        if (res.ok) {
          const newFavorite = await res.json();
          setFavorites(prev => [...prev, newFavorite]);
        }
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns.filter(campaign =>
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter by active status if enabled
    if (showActiveOnly) {
      filtered = filtered.filter(campaign => campaign.status === 'ACTIVE');
    }

    // Sort campaigns: favorites first, then alphabetically
    const favoriteIds = new Set(favorites.map(f => f.campaign_id));
    
    return filtered.sort((a, b) => {
      const aIsFavorite = favoriteIds.has(a.id);
      const bIsFavorite = favoriteIds.has(b.id);
      
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      
      return a.name.localeCompare(b.name);
    });
  }, [campaigns, searchTerm, showActiveOnly, favorites]);

  const handleToggleOpen = () => {
    if (!isOpen && !hasFetched) {
      fetchCampaigns();
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (campaignId: string | null) => {
    const campaignName = campaignId ? campaigns.find(c => c.id === campaignId)?.name : null;
    onCampaignSelect(campaignId, campaignName);
    setIsOpen(false);
    setSearchTerm(''); // Clear search term on selection
  };

  const getDisplayName = () => {
    if (!selectedCampaignId) return 'Select Campaign';
    
    // If we have the stored campaign name, use it (this prevents unnecessary fetches)
    if (selectedCampaignName) {
      return selectedCampaignName;
    }
    
    // If we have the campaign data, show the name
    const campaign = campaigns.find(c => c.id === selectedCampaignId);
    if (campaign) {
      return campaign.name;
    }
    
    // Only trigger fetch if we don't have a stored name AND user is actively trying to use the selector
    // Don't auto-fetch on component mount/render - only when dropdown is opened
    
    // If we don't have the campaign data yet, just show the ID
    return `Campaign ID: ${selectedCampaignId}`;
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'PAUSED': 'bg-yellow-100 text-yellow-800',
      'ARCHIVED': 'bg-gray-100 text-gray-800',
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="relative w-full">
      <label htmlFor="campaign-selector" className="block text-sm font-medium text-gray-700 mb-1">
        Campaign
      </label>
      <button
        type="button"
        id="campaign-selector"
        disabled={disabled || !adAccountId}
        onClick={handleToggleOpen}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white text-left flex items-center justify-between"
      >
        <span className="truncate">{getDisplayName()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  showActiveOnly 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                <Filter className="h-3 w-3" />
                <span>Active Only</span>
              </button>
              {favorites.length > 0 && (
                <span className="text-xs text-gray-500">
                  {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {isLoading && (
              <div className="px-3 py-2 text-sm text-gray-500">Loading campaigns...</div>
            )}
            {error && (
              <div className="px-3 py-2 text-sm text-red-500">Error: {error}</div>
            )}
            {!isLoading && !error && filteredCampaigns.length === 0 && hasFetched && (
              <div className="px-3 py-2 text-sm text-gray-500">
                {showActiveOnly ? 'No active campaigns found.' : 'No campaigns found.'}
              </div>
            )}
            {!isLoading && !error && filteredCampaigns.map(campaign => {
              const isFavorited = favorites.some(f => f.campaign_id === campaign.id);
              return (
                <div
                  key={campaign.id}
                  onClick={() => handleSelect(campaign.id)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                    selectedCampaignId === campaign.id ? 'bg-primary-50 text-primary-600' : 'text-gray-900'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      {isFavorited && <Star className="h-3 w-3 text-yellow-500 fill-current flex-shrink-0" />}
                      <span className="truncate font-medium">{campaign.name}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusBadge(campaign.status)}
                      <span className="text-xs text-gray-500">ID: {campaign.id}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(campaign, e)}
                    className={`ml-2 p-1 rounded hover:bg-gray-200 transition-colors ${
                      isFavorited ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                    }`}
                    title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star className={`h-4 w-4 ${isFavorited ? 'fill-current' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetaCampaignSelector; 