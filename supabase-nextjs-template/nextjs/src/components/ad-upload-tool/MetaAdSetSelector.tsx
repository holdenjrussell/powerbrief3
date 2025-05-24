'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AdSet } from '@/lib/types/meta';
import { ChevronDown, Search } from 'lucide-react';

interface MetaAdSetSelectorProps {
  brandId: string | null;
  adAccountId: string | null; // Keep for potential future use or broader ad set fetching
  campaignId: string | null;
  selectedAdSetId: string | null;
  onAdSetSelect: (adSetId: string | null) => void;
  disabled?: boolean;
}

const MetaAdSetSelector: React.FC<MetaAdSetSelectorProps> = ({
  brandId,
  adAccountId, // Included for consistency, though campaignId is primary driver
  campaignId,
  selectedAdSetId,
  onAdSetSelect,
  disabled = false,
}) => {
  const [adSets, setAdSets] = useState<AdSet[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    if (brandId && campaignId) { // Primarily depends on campaignId
      setIsLoading(true);
      setError(null);
      setAdSets([]); // Clear previous ad sets
      // Construct query params, adAccountId is optional for this endpoint if campaignId is present
      const queryParams = new URLSearchParams({
        brandId: brandId,
        campaignId: campaignId,
      });
      if (adAccountId) queryParams.append('adAccountId', adAccountId);

      fetch(`/api/meta/adsets?${queryParams.toString()}`)
        .then(async res => {
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `Failed to fetch ad sets: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data: AdSet[]) => {
          setAdSets(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error fetching ad sets:', err);
          setError(err.message);
          setIsLoading(false);
        });
    } else {
      setAdSets([]); // Clear if no campaign ID
      onAdSetSelect(null); // Deselect ad set if campaign changes or is cleared
    }
  }, [brandId, campaignId, adAccountId]); // Added adAccountId to deps for completeness, onAdSetSelect removed

  const filteredAdSets = useMemo(() => {
    return adSets.filter(adSet =>
      adSet.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [adSets, searchTerm]);

  const handleSelect = (adSetId: string | null) => {
    onAdSetSelect(adSetId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedAdSetName = useMemo(() => {
    return adSets.find(as => as.id === selectedAdSetId)?.name || 'Select Ad Set';
  }, [adSets, selectedAdSetId]);

  return (
    <div className="relative w-full">
      <label htmlFor="adset-selector" className="block text-sm font-medium text-gray-700 mb-1">
        Ad Set
      </label>
      <button
        type="button"
        id="adset-selector"
        disabled={disabled || isLoading || !campaignId} // Disabled if no campaignId
        onClick={() => setIsOpen(!isOpen)}
        className="default-input flex items-center justify-between w-full text-left"
      >
        <span className="truncate">{isLoading ? 'Loading Ad Sets...' : selectedAdSetName}</span>
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
            {isLoading && <li className="px-3 py-2 text-sm text-gray-500">Loading...</li>}
            {error && <li className="px-3 py-2 text-sm text-red-500">Error: {error}</li>}
            {!isLoading && !error && filteredAdSets.length === 0 && (
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