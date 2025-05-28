"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Grid, 
  List, 
  Search, 
  Download, 
  Heart, 
  Play, 
  Image as ImageIcon,
  Folder,
  ExternalLink,
  Zap
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Brand {
  id: string;
  name: string;
  created_at: string;
}

interface SocialMediaContent {
  id: string;
  brand_id: string;
  source_url: string;
  platform: string;
  title: string;
  content_type: 'image' | 'video';
  file_url: string;
  file_name: string;
  file_size: number;
  thumbnail_url?: string;
  tags: string[];
  notes?: string;
  is_favorite: boolean;
  created_at: string;
  download_count: number;
}

export default function AdRipperPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [content, setContent] = useState<SocialMediaContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddUrls, setShowAddUrls] = useState(false);
  const [mediaUrls, setMediaUrls] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Load brands on component mount
  useEffect(() => {
    loadBrands();
  }, []);

  // Load content when brand is selected
  useEffect(() => {
    if (selectedBrand) {
      loadContent(selectedBrand.id);
    }
  }, [selectedBrand]);

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, created_at')
        .order('name');

      if (error) throw error;
      setBrands(data || []);
      
      // Auto-select first brand if available
      if (data && data.length > 0 && !selectedBrand) {
        setSelectedBrand(data[0]);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const loadContent = async (brandId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('social_media_content')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to check if a line is a valid URL for supported platforms
  const isValidSocialMediaUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      return (
        hostname.includes('facebook.com') ||
        hostname.includes('fb.watch') ||
        hostname.includes('instagram.com') ||
        hostname.includes('tiktok.com')
      );
    } catch {
      return false;
    }
  };

  const handleAddUrls = async () => {
    if (!selectedBrand || !mediaUrls.trim()) return;

    setIsProcessing(true);
    try {
      // Filter out non-URL lines and only keep valid social media URLs
      const allLines = mediaUrls.split('\n').map(line => line.trim()).filter(line => line);
      const urls = allLines.filter(isValidSocialMediaUrl);

      if (urls.length === 0) {
        alert('Please enter at least one valid social media URL from Facebook, Instagram, or TikTok.');
        return;
      }

      // Call API to save to Supabase
      const response = await fetch('/api/social-media-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId: selectedBrand.id,
          urls: urls
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process URLs');
      }

      const result = await response.json();
      const successCount = result.results.filter((r: { status: string }) => r.status === 'success').length;
      
      alert(`Successfully ripped ${successCount} ads to ${selectedBrand.name} board! 🎉`);
      
      // Reload content and clear form
      await loadContent(selectedBrand.id);
      setMediaUrls('');
      setShowAddUrls(false);
      
    } catch (error) {
      console.error('Error adding URLs:', error);
      alert('Failed to rip ads. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedContent.size === 0) return;

    const selectedItems = content.filter(item => selectedContent.has(item.id));
    
    for (const item of selectedItems) {
      try {
        // Download from Supabase storage
        const response = await fetch(item.file_url);
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = item.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Update download count
        await supabase
          .from('social_media_content')
          .update({ 
            download_count: item.download_count + 1,
            last_downloaded_at: new Date().toISOString()
          })
          .eq('id', item.id);
        
      } catch (error) {
        console.error(`Error downloading ${item.file_name}:`, error);
      }
    }

    // Clear selection and reload content
    setSelectedContent(new Set());
    await loadContent(selectedBrand!.id);
  };

  const toggleFavorite = async (contentId: string) => {
    const item = content.find(c => c.id === contentId);
    if (!item) return;

    try {
      await supabase
        .from('social_media_content')
        .update({ is_favorite: !item.is_favorite })
        .eq('id', contentId);
      
      await loadContent(selectedBrand!.id);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Filter content based on search and filters
  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.platform.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlatform = filterPlatform === 'all' || item.platform === filterPlatform;
    const matchesType = filterType === 'all' || item.content_type === filterType;
    
    return matchesSearch && matchesPlatform && matchesType;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            AdRipper
          </h1>
          <p className="text-gray-600 mt-1">Rip ads from social media and organize them by brand</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Brand Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Folder className="h-5 w-5" />
                Brands
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {brands.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No brands found. Create a brand in PowerBrief first.
                </div>
              ) : (
                brands.map((brand) => (
                  <Button
                    key={brand.id}
                    variant={selectedBrand?.id === brand.id ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedBrand(brand)}
                  >
                    <Folder className="h-4 w-4 mr-2" />
                    {brand.name}
                  </Button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {selectedBrand ? (
            <div className="space-y-4">
              {/* Header with brand name and actions */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">{selectedBrand.name}</h2>
                  <p className="text-gray-600">{filteredContent.length} ripped ads</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowAddUrls(!showAddUrls)}
                    variant="outline"
                    className="bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
                  >
                    <Zap className="h-4 w-4 mr-2 text-yellow-600" />
                    Rip Ads
                  </Button>
                  {selectedContent.size > 0 && (
                    <Button onClick={handleDownloadSelected}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Selected ({selectedContent.size})
                    </Button>
                  )}
                </div>
              </div>

              {/* Add URLs Section */}
              {showAddUrls && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-600" />
                      Rip Ads from Social Media
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-white p-3 rounded-lg border">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Supported Platforms:</h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          Facebook
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                          Instagram
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-black rounded-full"></div>
                          TikTok
                        </div>
                      </div>
                    </div>
                    
                    <Textarea
                      value={mediaUrls}
                      onChange={(e) => setMediaUrls(e.target.value)}
                      placeholder="Campaign Name: Holiday Sale&#10;&#10;Facebook Videos:&#10;https://www.facebook.com/page/posts/123456789/&#10;https://www.facebook.com/watch?v=1234567890&#10;&#10;Instagram Posts:&#10;https://www.instagram.com/p/CabcdeFgHij/&#10;&#10;TikTok Videos:&#10;https://www.tiktok.com/@username/video/1234567890123456789&#10;&#10;(Non-URL lines like headers and labels will be automatically skipped)"
                      rows={8}
                      disabled={isProcessing}
                      className="font-mono text-sm"
                    />
                    
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-xs text-green-700">
                        <strong>Smart Filtering:</strong> Paste mixed content with headers, labels, and URLs. 
                        Only valid social media URLs will be processed - everything else is automatically skipped.
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleAddUrls} 
                        disabled={isProcessing || !mediaUrls.trim()}
                        className="bg-yellow-600 hover:bg-yellow-700"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Ripping Ads...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Rip Ads
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAddUrls(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search and Filters */}
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search ripped ads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                  title="Filter by platform"
                >
                  <option value="all">All Platforms</option>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                  title="Filter by content type"
                >
                  <option value="all">All Types</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                </select>
              </div>

              {/* Content Grid/List */}
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
                  Loading ripped ads...
                </div>
              ) : filteredContent.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No ads ripped yet</h3>
                  <p className="text-gray-500 mb-4">Start by ripping some ads from social media!</p>
                  <Button 
                    onClick={() => setShowAddUrls(true)}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Rip Your First Ads
                  </Button>
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 
                  'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 
                  'space-y-2'
                }>
                  {filteredContent.map((item) => (
                    <Card 
                      key={item.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedContent.has(item.id) ? 'ring-2 ring-yellow-500' : ''
                      }`}
                      onClick={() => {
                        const newSelected = new Set(selectedContent);
                        if (newSelected.has(item.id)) {
                          newSelected.delete(item.id);
                        } else {
                          newSelected.add(item.id);
                        }
                        setSelectedContent(newSelected);
                      }}
                    >
                      {viewMode === 'grid' ? (
                        <div>
                          {/* Media Preview */}
                          <div className="relative aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                            {item.content_type === 'image' ? (
                              <img
                                src={item.file_url}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder-image.png';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                {item.thumbnail_url ? (
                                  <img
                                    src={item.thumbnail_url}
                                    alt={item.title}
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
                                {item.content_type === 'image' ? <ImageIcon className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                              </Badge>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs capitalize ${
                                  item.platform === 'facebook' ? 'bg-blue-100 text-blue-700' :
                                  item.platform === 'instagram' ? 'bg-pink-100 text-pink-700' :
                                  item.platform === 'tiktok' ? 'bg-gray-100 text-gray-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {item.platform}
                              </Badge>
                            </div>
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 p-1 h-auto"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item.id);
                              }}
                            >
                              <Heart 
                                className={`h-4 w-4 ${item.is_favorite ? 'fill-red-500 text-red-500' : 'text-white'}`} 
                              />
                            </Button>
                          </div>
                          
                          {/* Content Info */}
                          <CardContent className="p-3">
                            <h3 className="font-medium text-sm truncate" title={item.title}>
                              {item.title}
                            </h3>
                            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                              <span>{formatFileSize(item.file_size)}</span>
                              <span>{formatDate(item.created_at)}</span>
                            </div>
                            {item.download_count > 0 && (
                              <div className="text-xs text-gray-400 mt-1">
                                Downloaded {item.download_count} times
                              </div>
                            )}
                          </CardContent>
                        </div>
                      ) : (
                        /* List View */
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                              {item.content_type === 'image' ? (
                                <img
                                  src={item.file_url}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Play className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{item.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs capitalize ${
                                    item.platform === 'facebook' ? 'bg-blue-100 text-blue-700' :
                                    item.platform === 'instagram' ? 'bg-pink-100 text-pink-700' :
                                    item.platform === 'tiktok' ? 'bg-gray-100 text-gray-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {item.platform}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {item.content_type}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {formatFileSize(item.file_size)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(item.source_url, '_blank');
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(item.id);
                                }}
                              >
                                <Heart 
                                  className={`h-4 w-4 ${item.is_favorite ? 'fill-red-500 text-red-500' : ''}`} 
                                />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Folder className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a brand to start</h3>
              <p className="text-gray-500">Choose a brand from the sidebar to view and manage ripped ads</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 