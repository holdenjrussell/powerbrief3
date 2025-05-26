'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdSet } from '@/lib/types/meta';
import { ChevronDown, Search } from 'lucide-react';

interface MetaAdSetSelectorProps {
  brandId: string | null;
  adAccountId: string | null;
  campaignId: string | null;
  selectedAdSetId: string | null;
  selectedAdSetName?: string | null;
  onAdSetSelect: (adSetId: string | null, adSetName?: string | null) => void;
  disabled?: boolean;
}

const MetaAdSetSelector: React.FC<MetaAdSetSelectorProps> = ({
  brandId,
  adAccountId,
  campaignId,
  selectedAdSetId,
  selectedAdSetName,
  onAdSetSelect,
  disabled = false,
}) => {
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [hasFetched, setHasFetched] = useState<boolean>(false);

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

  // Only fetch ad sets when dropdown is opened and we haven't fetched yet
  const fetchAdSets = async () => {
    if (!brandId || !adAccountId || !campaignId || isLoading || hasFetched) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetchWithRetry(`/api/meta/adsets?brandId=${brandId}&adAccountId=${adAccountId}&campaignId=${campaignId}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch ad sets: ${res.statusText}`);
      }
      
      const data: AdSet[] = await res.json();
      setAdSets(data);
      setHasFetched(true);
      
      // If we have a selected ad set ID but no name, auto-save the name
      if (selectedAdSetId && !selectedAdSetName) {
        const matchingAdSet = data.find(a => a.id === selectedAdSetId);
        if (matchingAdSet) {
          onAdSetSelect(selectedAdSetId, matchingAdSet.name);
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching ad sets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ad sets');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset fetched state when campaign changes
  useEffect(() => {
    setHasFetched(false);
    setAdSets([]);
    setError(null);
    if (!campaignId) {
      onAdSetSelect(null);
    }
  }, [brandId, adAccountId, campaignId]);

  const filteredAdSets = useMemo(() => {
    return adSets.filter(adSet =>
      adSet.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [adSets, searchTerm]);

  const handleToggleOpen = () => {
    if (!isOpen && !hasFetched) {
      fetchAdSets();
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (adSetId: string | null) => {
    const adSetName = adSetId ? adSets.find(a => a.id === adSetId)?.name : null;
    onAdSetSelect(adSetId, adSetName);
    setIsOpen(false);
    setSearchTerm(''); // Clear search term on selection
  };

  const getDisplayName = () => {
    if (!selectedAdSetId) return 'Select Ad Set';
    
    // If we have the stored ad set name, use it
    if (selectedAdSetName) {
      return selectedAdSetName;
    }
    
    // If we have the ad set data, show the name
    const adSet = adSets.find(a => a.id === selectedAdSetId);
    if (adSet) {
      return adSet.name;
    }
    
    // If we don't have the ad set data yet but have an ID, trigger fetch and show loading
    if (selectedAdSetId && campaignId && !hasFetched && !isLoading) {
      fetchAdSets();
      return 'Loading ad set...';
    }
    
    // If we don't have the ad set data yet, just show the ID
    return `Ad Set ID: ${selectedAdSetId}`;
  };

  return (
    <div className="relative w-full">
      <label htmlFor="adset-selector" className="block text-sm font-medium text-gray-700 mb-1">
        Ad Set
      </label>
      <button
        type="button"
        id="adset-selector"
        disabled={disabled || !campaignId}
        onClick={handleToggleOpen}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 bg-white text-left flex items-center justify-between"
      >
        <span className="truncate">{getDisplayName()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search ad sets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
              />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
          <ul>
            {isLoading && <li className="px-3 py-2 text-sm text-gray-500">Loading ad sets...</li>}
            {error && <li className="px-3 py-2 text-sm text-red-500">Error: {error}</li>}
            {!isLoading && !error && filteredAdSets.length === 0 && hasFetched && (
              <li className="px-3 py-2 text-sm text-gray-500">No ad sets found.</li>
            )}
            {!isLoading && !error && filteredAdSets.map(adSet => (
              <li
                key={adSet.id}
                onClick={() => handleSelect(adSet.id)}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                  selectedAdSetId === adSet.id ? 'bg-primary-50 text-primary-600' : 'text-gray-900'
                }`}
              >
                {adSet.name} (ID: {adSet.id})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MetaAdSetSelector; 