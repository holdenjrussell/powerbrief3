"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Download, 
  Heart, 
  Play, 
  Image as ImageIcon,
  Settings,
  Calendar,
  Users,
  TrendingUp,
  ExternalLink,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { type AdSpySearchParams, type AdSpyAd } from '@/lib/services/adspyService';

interface Brand {
  id: string;
  name: string;
  adspy_enabled?: boolean;
}

interface AdSpySearchProps {
  selectedBrand: Brand | null;
  userId: string;
  onAdDownloaded: () => void;
}

export default function AdSpySearch({ selectedBrand, userId, onAdDownloaded }: AdSpySearchProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [searchParams, setSearchParams] = useState<AdSpySearchParams>({
    siteType: 'facebook',
    page: 1,
    orderBy: 'total_loves'
  });
  const [searchResults, setSearchResults] = useState<AdSpyAd[]>([]);
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Check if brand has AdSpy enabled
  useEffect(() => {
    if (selectedBrand?.adspy_enabled) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [selectedBrand]);

  const handleAuthenticate = async () => {
    if (!selectedBrand || !credentials.username || !credentials.password) return;

    try {
      const response = await fetch('/api/adspy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'authenticate',
          brandId: selectedBrand.id,
          credentials
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setIsAuthenticated(true);
        if (result.subscriptionValid) {
          alert('AdSpy credentials saved successfully! ✅');
        } else {
          alert('AdSpy credentials saved, but your subscription may not be active. Please check your AdSpy account.');
        }
      } else {
        // Show more specific error messages
        let errorMessage = result.error || 'Authentication failed';
        
        if (errorMessage.includes('subscription')) {
          errorMessage = '❌ AdSpy API subscription required. Please ensure you have an active AdSpy API subscription in addition to your regular AdSpy account.';
        } else if (errorMessage.includes('credentials') || errorMessage.includes('401')) {
          errorMessage = '❌ Invalid credentials. Please check your AdSpy username and password.';
        } else if (errorMessage.includes('connection') || errorMessage.includes('fetch')) {
          errorMessage = '❌ Unable to connect to AdSpy. Please check your internet connection and try again.';
        } else if (errorMessage.includes('error page')) {
          errorMessage = '❌ AdSpy API error. This may indicate server issues or subscription problems. Please try again later or contact AdSpy support.';
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert('❌ Failed to authenticate with AdSpy. Please check your connection and try again.');
    }
  };

  const handleSearch = async () => {
    if (!selectedBrand || !isAuthenticated) return;

    setIsSearching(true);
    try {
      const response = await fetch('/api/adspy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          brandId: selectedBrand.id,
          userId,
          searchParams: { ...searchParams, page: currentPage }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSearchResults(result.results.ads || []);
        setTotalResults(result.results.total_count || 0);
      } else {
        alert(`Search failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search AdSpy');
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownloadSelected = async () => {
    if (!selectedBrand || selectedAds.size === 0) return;

    setIsDownloading(true);
    try {
      const adsToDownload = searchResults.filter(ad => selectedAds.has(ad.id));
      
      const response = await fetch('/api/adspy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'download',
          brandId: selectedBrand.id,
          userId,
          ads: adsToDownload
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const successCount = result.results.filter((r: { status: string }) => r.status === 'success').length;
        alert(`Successfully downloaded ${successCount} ads to ${selectedBrand.name} board!`);
        setSelectedAds(new Set());
        onAdDownloaded();
      } else {
        alert(`Download failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download ads');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!selectedBrand) {
    return (
      <div className="text-center py-8">
        <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select a brand to search AdSpy</h3>
        <p className="text-gray-500">Choose a brand from the sidebar to start searching ads</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Authentication Section */}
      {!isAuthenticated && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              AdSpy Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your AdSpy credentials to enable ad searching for this brand.
            </p>
            
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">📋 Requirements:</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Active AdSpy account with API subscription</li>
                <li>• API subscription is separate from regular AdSpy subscription</li>
                <li>• Use your AdSpy login email and password</li>
              </ul>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="email"
                placeholder="AdSpy Username/Email"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
              />
              <Input
                type="password"
                placeholder="AdSpy Password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            
            <Button 
              onClick={handleAuthenticate}
              disabled={!credentials.username || !credentials.password}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              Save AdSpy Credentials
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search Interface */}
      {isAuthenticated && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Search AdSpy Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Platform</label>
                <select
                  value={searchParams.siteType || 'facebook'}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, siteType: e.target.value as 'facebook' | 'instagram' }))}
                  className="w-full px-3 py-2 border rounded-md"
                  title="Select platform"
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Media Type</label>
                <select
                  value={searchParams.mediaType || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, mediaType: e.target.value as 'video' | 'photo' || undefined }))}
                  className="w-full px-3 py-2 border rounded-md"
                  title="Select media type"
                >
                  <option value="">All Types</option>
                  <option value="video">Video</option>
                  <option value="photo">Photo</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Sort By</label>
                <select
                  value={searchParams.orderBy || 'total_loves'}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, orderBy: e.target.value as AdSpySearchParams['orderBy'] }))}
                  className="w-full px-3 py-2 border rounded-md"
                  title="Select sort order"
                >
                  <option value="total_loves">Most Loved</option>
                  <option value="total_likes">Most Liked</option>
                  <option value="total_shares">Most Shared</option>
                  <option value="created_on_asc">Newest First</option>
                </select>
              </div>
            </div>

            {/* Search Text */}
            <div>
              <label className="block text-sm font-medium mb-1">Search Text</label>
              <Input
                placeholder="Enter keywords to search in ad text..."
                value={searchParams.searches?.[0]?.value || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchParams(prev => ({
                    ...prev,
                    searches: value ? [{ type: 'texts', value, locked: false }] : undefined
                  }));
                }}
              />
            </div>

            {/* Advanced Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
              {showAdvancedFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Gender</label>
                    <select
                      value={searchParams.gender || ''}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' || undefined }))}
                      className="w-full px-3 py-2 border rounded-md"
                      title="Select gender"
                    >
                      <option value="">All Genders</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Advertiser Username</label>
                    <Input
                      placeholder="e.g., nike, adidas"
                      value={searchParams.username || ''}
                      onChange={(e) => setSearchParams(prev => ({ ...prev, username: e.target.value || undefined }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Min Age</label>
                    <Input
                      type="number"
                      min="18"
                      max="64"
                      placeholder="18"
                      value={searchParams.ages?.[0] || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          setSearchParams(prev => ({
                            ...prev,
                            ages: [value, prev.ages?.[1] || value]
                          }));
                        } else {
                          setSearchParams(prev => ({ ...prev, ages: undefined }));
                        }
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Age</label>
                    <Input
                      type="number"
                      min="18"
                      max="64"
                      placeholder="64"
                      value={searchParams.ages?.[1] || ''}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value)) {
                          setSearchParams(prev => ({
                            ...prev,
                            ages: [prev.ages?.[0] || 18, value]
                          }));
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Countries (comma-separated)</label>
                  <Input
                    placeholder="US, UK, CA"
                    value={searchParams.countries?.join(', ') || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchParams(prev => ({
                        ...prev,
                        countries: value ? value.split(',').map(c => c.trim().toUpperCase()) : undefined
                      }));
                    }}
                  />
                </div>
              </div>
            )}

            {/* Search Button */}
            <Button 
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching AdSpy...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Ads
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Search Results ({totalResults.toLocaleString()} ads found)
              </CardTitle>
              {selectedAds.size > 0 && (
                <Button 
                  onClick={handleDownloadSelected}
                  disabled={isDownloading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Add to Board ({selectedAds.size})
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchResults.map((ad) => (
                <Card 
                  key={ad.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedAds.has(ad.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => {
                    const newSelected = new Set(selectedAds);
                    if (newSelected.has(ad.id)) {
                      newSelected.delete(ad.id);
                    } else {
                      newSelected.add(ad.id);
                    }
                    setSelectedAds(newSelected);
                  }}
                >
                  {/* Media Preview */}
                  <div className="relative aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                    {ad.media_type === 'photo' ? (
                      <img
                        src={ad.media_url}
                        alt={ad.text}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-image.png';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        {ad.thumbnail_url ? (
                          <img
                            src={ad.thumbnail_url}
                            alt={ad.text}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Play className="h-12 w-12 text-gray-400" />
                        )}
                      </div>
                    )}
                    
                    {/* Overlay with type and platform */}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {ad.media_type === 'photo' ? <ImageIcon className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs capitalize ${
                          ad.platform === 'facebook' ? 'bg-blue-100 text-blue-700' :
                          'bg-pink-100 text-pink-700'
                        }`}
                      >
                        {ad.platform}
                      </Badge>
                    </div>
                    
                    {/* External link button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 p-1 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(ad.landing_page_url, '_blank');
                      }}
                    >
                      <ExternalLink className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                  
                  {/* Content Info */}
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm line-clamp-2" title={ad.text}>
                        {ad.text || `Ad by ${ad.advertiser_name}`}
                      </h3>
                      
                      <div className="text-xs text-gray-600">
                        <div className="flex items-center gap-1 mb-1">
                          <Users className="h-3 w-3" />
                          {ad.advertiser_name}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3 text-red-500" />
                            {formatNumber(ad.total_loves)}
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-blue-500" />
                            {formatNumber(ad.total_likes)}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(ad.first_seen)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalResults > 10 && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <Button
                  variant="outline"
                  disabled={currentPage === 1 || isSearching}
                  onClick={() => {
                    setCurrentPage(prev => prev - 1);
                    handleSearch();
                  }}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {Math.ceil(totalResults / 10)}
                </span>
                
                <Button
                  variant="outline"
                  disabled={currentPage >= Math.ceil(totalResults / 10) || isSearching}
                  onClick={() => {
                    setCurrentPage(prev => prev + 1);
                    handleSearch();
                  }}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 