"use client";
import React, { useState } from 'react';
import { Plus, X, Link, Upload, Eye } from 'lucide-react';
import { SiteLink } from './adUploadTypes';

interface SiteLinksManagerProps {
  siteLinks: SiteLink[];
  onChange: (siteLinks: SiteLink[]) => void;
  maxLinks?: number;
}

const SiteLinksManager: React.FC<SiteLinksManagerProps> = ({ 
  siteLinks = [],
  onChange, 
  maxLinks = 15 
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const safeSiteLinks = siteLinks || [];

  const addSiteLink = () => {
    if (safeSiteLinks.length >= maxLinks) return;
    
    const newSiteLink: SiteLink = {
      site_link_title: '',
      site_link_url: '',
      site_link_image_url: '',
      is_site_link_sticky: false
    };
    
    onChange([...safeSiteLinks, newSiteLink]);
    setExpandedIndex(safeSiteLinks.length); // Expand the new item
  };

  const removeSiteLink = (index: number) => {
    const updatedLinks = safeSiteLinks.filter((_, i) => i !== index);
    onChange(updatedLinks);
    setExpandedIndex(null);
  };

  const updateSiteLink = (index: number, field: keyof SiteLink, value: string | boolean) => {
    const updatedLinks = safeSiteLinks.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    );
    onChange(updatedLinks);
  };

  const toggleExpanded = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <Link className="h-4 w-4 mr-2 text-blue-500" />
          Site Links
        </h4>
        <button
          type="button"
          onClick={addSiteLink}
          disabled={safeSiteLinks.length >= maxLinks}
          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Link ({safeSiteLinks.length}/{maxLinks})
        </button>
      </div>

      {safeSiteLinks.length === 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-dashed border-gray-200">
          No site links added. Site links provide users with additional navigation options directly from your ad.
        </div>
      )}

      <div className="space-y-2">
        {safeSiteLinks.map((link, index) => (
          <div key={index} className="border border-gray-200 rounded-lg bg-white">
            <div 
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleExpanded(index)}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {link.site_link_title || `Site Link ${index + 1}`}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {link.site_link_url || 'No URL set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(index);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Toggle site link details"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSiteLink(index);
                  }}
                  className="text-red-400 hover:text-red-600"
                  aria-label="Remove site link"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {expandedIndex === index && (
              <div className="border-t border-gray-200 p-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Site Link URL *
                  </label>
                  <input
                    type="url"
                    value={link.site_link_url}
                    onChange={(e) => updateSiteLink(index, 'site_link_url', e.target.value)}
                    placeholder="https://example.com/page"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Site Link Title *
                  </label>
                  <input
                    type="text"
                    value={link.site_link_title}
                    onChange={(e) => updateSiteLink(index, 'site_link_title', e.target.value)}
                    placeholder="Shop Now, Learn More, Contact Us..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Site Link Image URL (Optional)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={link.site_link_image_url || ''}
                      onChange={(e) => updateSiteLink(index, 'site_link_image_url', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      className="px-3 py-2 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Upload site link image"
                    >
                      <Upload className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Optional image to display with the site link
                  </p>
                </div>

                <div>
                  <label className="flex items-center space-x-2 text-xs">
                    <input
                      type="checkbox"
                      checked={link.is_site_link_sticky || false}
                      onChange={(e) => updateSiteLink(index, 'is_site_link_sticky', e.target.checked)}
                      className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="font-medium text-gray-700">Sticky Site Link</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    When enabled, this site link will be prioritized for display
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SiteLinksManager; 