/* eslint-disable @typescript-eslint/no-explicit-any */
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
  Zap,
  Database,
  Trash2,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { createSPAClient } from '@/lib/supabase/client';
import AdSpySearch from '@/components/AdSpySearch';
import { useGlobal } from "@/lib/context/GlobalContext";
import { getBrands } from '@/lib/services/powerbriefService';
import { Brand as PowerBriefBrand } from '@/lib/types/powerbrief';

const supabase = createSPAClient();

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
  source_type?: 'manual' | 'adspy';
  adspy_ad_id?: string;
  adspy_metadata?: Record<string, string | number | string[] | boolean>;
}

// Video Modal Component
interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoItem: SocialMediaContent | null;
}

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, videoItem }) => {
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !videoItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
        {/* Close button - positioned outside video area */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute -top-12 right-0 text-white hover:text-gray-300 z-20 bg-black bg-opacity-50 hover:bg-opacity-75"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Video container */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            src={videoItem.file_url}
            controls
            autoPlay
            muted={isMuted}
            className="w-full h-auto max-h-[80vh]"
            style={{ outline: 'none' }}
            onError={(e) => {
              console.error('Video failed to load:', e);
            }}
          >
            Your browser does not support the video tag.
          </video>

          {/* Mute/Unmute button - positioned to not interfere with controls */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-75 z-10"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>

          {/* Video info overlay - positioned to not cover controls */}
          <div className="absolute top-4 left-4 right-16 pointer-events-none">
            <div className="bg-black bg-opacity-50 rounded-lg p-3 backdrop-blur-sm">
              <h3 className="text-white font-medium mb-1 text-sm">{videoItem.title}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-300">
                <Badge variant="secondary" className="bg-white bg-opacity-20 text-white text-xs">
                  {videoItem.platform}
                </Badge>
                <span>•</span>
                <span>{new Date(videoItem.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>{(videoItem.file_size / (1024 * 1024)).toFixed(1)} MB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  const [activeTab, setActiveTab] = useState<'manual' | 'adspy'>('manual');
  const [showAddUrls, setShowAddUrls] = useState(false);
  const [mediaUrls, setMediaUrls] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, currentUrl: '' });
  
  // Video modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedVideoItem, setSelectedVideoItem] = useState<SocialMediaContent | null>(null);

  const { user } = useGlobal();

  // Open video modal
  const openVideoModal = (item: SocialMediaContent) => {
    setSelectedVideoItem(item);
    setIsVideoModalOpen(true);
  };

  // Close video modal
  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedVideoItem(null);
  };

  // Handle card click - open video modal for videos, toggle selection for images
  const handleCardClick = (item: SocialMediaContent) => {
    if (item.content_type === 'video') {
      openVideoModal(item);
    } else {
      // For images, toggle selection as before
      const newSelected = new Set(selectedContent);
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
      setSelectedContent(newSelected);
    }
  };

  // Load brands on component mount
  useEffect(() => {
    loadBrands();
  }, [user?.id]);

  // Load content when brand is selected
  useEffect(() => {
    if (selectedBrand) {
      loadContent(selectedBrand.id);
    }
  }, [selectedBrand]);

  const loadBrands = async () => {
    if (!user?.id) return;
    
    try {
      // Use the same getBrands service that PowerBrief and ad uploader use
      const brandsData = await getBrands(user.id);
      
      // Map to the local Brand interface
      const mappedBrands = brandsData.map((brand: PowerBriefBrand) => ({
        id: brand.id,
        name: brand.name,
        created_at: brand.created_at
      }));
      
      setBrands(mappedBrands);
      
      // Auto-select first brand if available
      if (mappedBrands.length > 0 && !selectedBrand) {
        setSelectedBrand(mappedBrands[0]);
      }
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const loadContent = async (brandId: string) => {
    setIsLoading(true);
    try {
      console.log('=== LOADING CONTENT DEBUG ===');
      console.log('Brand ID:', brandId);
      console.log('User:', user);
      console.log('User ID:', user?.id);
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      // First, let's check if we can query the table at all
      const { data: tableCheck, error: tableError } = await supabase
        .from('social_media_content' as any)
        .select('count(*)', { count: 'exact' });
      
      console.log('Table check result:', tableCheck);
      console.log('Table check error:', tableError);
      
      // Check if there's any content for this brand (without user filtering)
      const { data: allBrandContent, error: allBrandError } = await supabase
        .from('social_media_content' as any)
        .select('id, user_id, brand_id, title, created_at')
        .eq('brand_id', brandId);
      
      console.log('All content for brand (no user filter):', allBrandContent);
      console.log('All brand content error:', allBrandError);
      
      // Check if there's any content for this user
      const { data: allUserContent, error: allUserError } = await supabase
        .from('social_media_content' as any)
        .select('id, user_id, brand_id, title, created_at')
        .eq('user_id', user?.id);
      
      console.log('All content for user (no brand filter):', allUserContent);
      console.log('All user content error:', allUserError);
      
      // Now try to get content for this specific brand with user filter
      const { data, error } = await supabase
        .from('social_media_content' as any)
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

      console.log('Content query result:', data);
      console.log('Content query error:', error);
      console.log('Number of items found:', data?.length || 0);

      if (error) {
        console.error('Error loading content:', error);
        throw error;
      }
      
      // Ensure all items have required properties with defaults
      const contentWithDefaults = ((data as any[]) || []).map(item => ({
        ...item,
        download_count: item.download_count ?? 0,
        source_type: item.source_type ?? 'manual',
        adspy_ad_id: item.adspy_ad_id ?? null,
        adspy_metadata: item.adspy_metadata ?? null,
        original_filename: item.original_filename ?? item.file_name,
        mime_type: item.mime_type ?? null,
        tags: item.tags ?? [],
        is_favorite: item.is_favorite ?? false,
        thumbnail_url: item.thumbnail_url ?? null,
        notes: item.notes ?? null
      })) as SocialMediaContent[];
      
      console.log(`Loaded ${contentWithDefaults.length} content items for brand ${brandId}`);
      console.log('Content with defaults:', contentWithDefaults);
      setContent(contentWithDefaults);
    } catch (error) {
      console.error('Error loading content:', error);
      // Don't throw the error, just set empty content and show a message
      setContent([]);
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
    if (!selectedBrand || !mediaUrls.trim() || !user?.id) return;

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: 0, currentUrl: '' });
    
    try {
      // Filter out non-URL lines and only keep valid social media URLs
      const allLines = mediaUrls.split('\n').map(line => line.trim()).filter(line => line);
      const urls = allLines.filter(isValidSocialMediaUrl);

      if (urls.length === 0) {
        alert('Please enter at least one valid social media URL from Facebook, Instagram, or TikTok.');
        return;
      }

      // Set initial progress
      setProcessingProgress({ current: 0, total: urls.length, currentUrl: 'Starting...' });

      // Process URLs one by one for real-time progress
      const results = [];
      let successCount = 0;

      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        setProcessingProgress({ 
          current: i, 
          total: urls.length, 
          currentUrl: `Processing: ${url.substring(0, 50)}...` 
        });

        try {
          // Call API for single URL
          const response = await fetch('/api/social-media-download', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              brandId: selectedBrand.id,
              userId: user.id,
              urls: [url] // Process one URL at a time
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to process URL');
          }

          const result = await response.json();
          results.push(...result.results);
          
          if (result.results[0]?.status === 'success') {
            successCount++;
          }
        } catch (error) {
          console.error(`Error processing URL ${url}:`, error);
          results.push({
            url,
            status: 'error',
            error: 'Failed to process URL'
          });
        }
      }
      
      // Show final progress
      setProcessingProgress({ current: urls.length, total: urls.length, currentUrl: 'Complete!' });
      
      if (successCount > 0) {
        alert(`Successfully ripped ${successCount} ads to ${selectedBrand.name} board! 🎉`);
        // Reload content and clear form
        await loadContent(selectedBrand.id);
        setMediaUrls('');
        setShowAddUrls(false);
      } else {
        alert('No ads were successfully ripped. Please check the URLs and try again.');
      }
      
    } catch (error) {
      console.error('Error adding URLs:', error);
      alert('Failed to rip ads. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0, currentUrl: '' });
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
          .from('social_media_content' as any)
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
        .from('social_media_content' as any)
        .update({ is_favorite: !item.is_favorite })
        .eq('id', contentId);
      
      await loadContent(selectedBrand!.id);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const deleteContent = async (contentIds: string[]) => {
    if (contentIds.length === 0) return;
    
    const confirmMessage = contentIds.length === 1 
      ? 'Are you sure you want to delete this item?' 
      : `Are you sure you want to delete ${contentIds.length} items?`;
    
    if (!confirm(confirmMessage)) return;

    try {
      // Get the items to delete for file cleanup
      const itemsToDelete = content.filter(item => contentIds.includes(item.id));
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('social_media_content' as any)
        .delete()
        .in('id', contentIds);

      if (dbError) throw dbError;

      // Delete files from storage
      const filePaths = itemsToDelete.map(item => {
        // Extract the file path from the public URL
        const url = new URL(item.file_url);
        const pathParts = url.pathname.split('/');
        // Remove '/storage/v1/object/public/social-media-content/' part
        return pathParts.slice(5).join('/');
      });

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('social-media-content')
          .remove(filePaths);

        if (storageError) {
          console.error('Error deleting files from storage:', storageError);
          // Don't throw here as the database deletion was successful
        }
      }

      // Clear selection and reload content
      setSelectedContent(new Set());
      await loadContent(selectedBrand!.id);
      
      const deletedCount = contentIds.length;
      alert(`Successfully deleted ${deletedCount} item${deletedCount > 1 ? 's' : ''}!`);
      
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Failed to delete content. Please try again.');
    }
  };

  const handleDeleteSelected = () => {
    const selectedIds = Array.from(selectedContent);
    deleteContent(selectedIds);
  };

  const handleDeleteSingle = (contentId: string) => {
    deleteContent([contentId]);
  };

  const debugContentLoading = async () => {
    if (!selectedBrand) return;
    
    console.log('=== DEBUG: Content Loading ===');
    console.log('Selected brand:', selectedBrand);
    console.log('User:', user);
    
    try {
      // Check if we can connect to Supabase
      const { data: testData, error: testError } = await supabase
        .from('social_media_content' as any)
        .select('count(*)')
        .eq('brand_id', selectedBrand.id);
      
      console.log('Total content count for brand:', testData);
      if (testError) console.error('Count query error:', testError);
      
      // Get all content for this brand
      const { data: allData, error: allError } = await supabase
        .from('social_media_content' as any)
        .select('*')
        .eq('brand_id', selectedBrand.id);
      
      console.log('All content for brand:', allData);
      if (allError) console.error('All content query error:', allError);
      
      // Force reload
      await loadContent(selectedBrand.id);
      
    } catch (error) {
      console.error('Debug error:', error);
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
                  <Button
                    onClick={debugContentLoading}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    🔍 Debug
                  </Button>
                  {selectedContent.size > 0 && (
                    <Button onClick={handleDownloadSelected}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Selected ({selectedContent.size})
                    </Button>
                  )}
                  {selectedContent.size > 0 && (
                    <Button 
                      onClick={handleDeleteSelected}
                      variant="destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedContent.size})
                    </Button>
                  )}
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <Button
                  variant={activeTab === 'manual' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('manual')}
                  className="flex-1"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Manual Ripping
                </Button>
                <Button
                  variant={activeTab === 'adspy' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('adspy')}
                  className="flex-1"
                >
                  <Database className="h-4 w-4 mr-2" />
                  AdSpy Search
                </Button>
              </div>

              {/* Tab Content */}
              {activeTab === 'manual' && (
                <div className="space-y-4">
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
                                {processingProgress.total > 0 ? (
                                  `Ripping ${processingProgress.current}/${processingProgress.total} ads...`
                                ) : (
                                  'Ripping Ads...'
                                )}
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
                        
                        {/* Progress Bar */}
                        {isProcessing && processingProgress.total > 0 && (
                          <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                              ></div>
                            </div>
                            <p className="text-sm text-gray-600 text-center">
                              {processingProgress.currentUrl && `Processing: ${processingProgress.currentUrl}`}
                            </p>
                          </div>
                        )}
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
                          onClick={() => handleCardClick(item)}
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
                                    <div className="relative w-full h-full">
                                      <video
                                        src={item.file_url}
                                        className="w-full h-full object-cover"
                                        muted
                                        preload="metadata"
                                        onError={(e) => {
                                          console.error('Video preview failed to load:', e);
                                        }}
                                      />
                                      {/* Play overlay for videos */}
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-black bg-opacity-50 rounded-full p-3">
                                          <Play className="h-8 w-8 text-white fill-white" />
                                        </div>
                                      </div>
                                    </div>
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
                                  {item.source_type === 'adspy' && (
                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                      AdSpy
                                    </Badge>
                                  )}
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
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute top-2 right-8 p-1 h-auto"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSingle(item.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-white" />
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
                                      <div className="relative w-full h-full">
                                        <video
                                          src={item.file_url}
                                          className="w-full h-full object-cover"
                                          muted
                                          preload="metadata"
                                          onError={(e) => {
                                            console.error('Video preview failed to load:', e);
                                          }}
                                        />
                                        {/* Play overlay for videos */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div className="bg-black bg-opacity-50 rounded-full p-1">
                                            <Play className="h-3 w-3 text-white fill-white" />
                                          </div>
                                        </div>
                                      </div>
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
                                    {item.source_type === 'adspy' && (
                                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                                        AdSpy
                                      </Badge>
                                    )}
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
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSingle(item.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
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
              )}

              {activeTab === 'adspy' && user && (
                <AdSpySearch 
                  selectedBrand={selectedBrand}
                  userId={user.id}
                  onAdDownloaded={() => loadContent(selectedBrand.id)}
                />
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

      {/* Video Modal */}
      {isVideoModalOpen && selectedVideoItem && (
        <VideoModal
          isOpen={isVideoModalOpen}
          onClose={closeVideoModal}
          videoItem={selectedVideoItem}
        />
      )}
    </div>
  );
} 