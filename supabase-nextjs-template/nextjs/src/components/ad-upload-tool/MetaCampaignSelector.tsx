'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Campaign } from '@/lib/types/meta';
import { ChevronDown, Search } from 'lucide-react';

interface MetaCampaignSelectorProps {
  brandId: string | null;
  adAccountId: string | null;
  selectedCampaignId: string | null;
  onCampaignSelect: (campaignId: string | null) => void;
  disabled?: boolean;
}

const MetaCampaignSelector: React.FC<MetaCampaignSelectorProps> = ({
  brandId,
  adAccountId,
  selectedCampaignId,
  onCampaignSelect,
  disabled = false,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    if (brandId && adAccountId) {
      setIsLoading(true);
      setError(null);
      setCampaigns([]); // Clear previous campaigns
      fetch(`/api/meta/campaigns?brandId=${brandId}&adAccountId=${adAccountId}`)
        .then(async res => {
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `Failed to fetch campaigns: ${res.statusText}`);
          }
          return res.json();
        })
        .then((data: Campaign[]) => {
          setCampaigns(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error fetching campaigns:', err);
          setError(err.message);
          setIsLoading(false);
        });
    } else {
      setCampaigns([]); // Clear if no ad account ID
      onCampaignSelect(null); // Deselect campaign if ad account changes or is cleared
    }
  }, [brandId, adAccountId]); // Removed onCampaignSelect from dependency array

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(campaign =>
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [campaigns, searchTerm]);

  const handleSelect = (campaignId: string | null) => {
    onCampaignSelect(campaignId);
    setIsOpen(false);
    setSearchTerm(''); // Clear search term on selection
  };

  const selectedCampaignName = useMemo(() => {
    return campaigns.find(c => c.id === selectedCampaignId)?.name || 'Select Campaign';
  }, [campaigns, selectedCampaignId]);

  return (
    <div className="relative w-full">
      <label htmlFor="campaign-selector" className="block text-sm font-medium text-gray-700 mb-1">
        Campaign
      </label>
      <button
        type="button"
        id="campaign-selector"
        disabled={disabled || isLoading || !adAccountId}
        onClick={() => setIsOpen(!isOpen)}
        className="default-input flex items-center justify-between w-full text-left"
      >
        <span className="truncate">{isLoading ? 'Loading Campaigns...' : selectedCampaignName}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search campaigns..."
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
            {!isLoading && !error && filteredCampaigns.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No campaigns found.</li>
            )}
            {!isLoading && !error && filteredCampaigns.map(campaign => (
              <li
                key={campaign.id}
                onClick={() => handleSelect(campaign.id)}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${
                  selectedCampaignId === campaign.id ? 'bg-primary-50 text-primary-600' : 'text-gray-900'
                }`}
              >
                {campaign.name} (ID: {campaign.id})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MetaCampaignSelector; 