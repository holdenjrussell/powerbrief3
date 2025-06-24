'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, RefreshCw, Trash2, ExternalLink, Image, Video, Sparkles, Play, X, AlertTriangle, Upload, BarChart3, PieChart as PieChartIcon, Settings, Brain } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { AIStrategistOpinion } from '@/lib/types/onesheet';
import { AIInstructionsTab } from './AIInstructionsTab';
import { AIStrategistTab } from './AIStrategistTab';

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B'];

interface AdData {
  id: string;
  name: string;
  status: string;
  assetUrl: string;
  assetType: string;
  assetId: string;
  assetLoadFailed: boolean;
  manuallyUploaded?: boolean;
  landingPage: string;
  spend: string;
  impressions: number;
  cpa: string;
  roas: string;
  purchaseRevenue: string;
  hookRate: string;
  holdRate: string;
  purchases: number;
  video3s: number;
  video25: number;
  video50: number;
  video75: number;
  video100: number;
  campaignName: string;
  adsetName: string;
  creativeTitle: string;
  creativeBody: string;
  // Creative preview fields
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  videoId?: string | null;
  // Gemini analysis fields
  type?: string | null;
  adDuration?: number | string | null;
  productIntro?: number | string | null;
  sitInProblemSeconds?: number | null;
  sitInProblem?: string | null;
  sitInProblemPercent?: number | null;
  creatorsUsed?: number | null;
  angle?: string | null;
  format?: string | null;
  emotion?: string | null;
  framework?: string | null;
  awarenessLevel?: string | null;
  contentVariables?: string | null;
  transcription?: string | null;
  visualDescription?: string | null;
}

interface AdAccountAuditDashboardProps {
  onesheetId: string;
  brandId: string;
  initialData?: {
    ad_account_audit?: {
      ads?: AdData[];
      demographicBreakdown?: {
        age: Record<string, number>;
        gender: Record<string, number>;
        placement: Record<string, number>;
      };
      lastImported?: string;
      dateRange?: string;
      totalAdsImported?: number;
      importMethod?: string;
    };
  };
}

export function AdAccountAuditDashboard({ onesheetId, brandId, initialData }: AdAccountAuditDashboardProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState('');
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzeMessage, setAnalyzeMessage] = useState('');
  const [dateRange, setDateRange] = useState('last_30d');
  const [maxAds, setMaxAds] = useState(100);
  const [auditData, setAuditData] = useState<typeof initialData['ad_account_audit'] | null>(initialData?.ad_account_audit || null);
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
  const [selectedVideo, setSelectedVideo] = useState<{ videoId: string; thumbnailUrl: string; adName: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ imageUrl: string; adName: string } | null>(null);
  const [uploadingAd, setUploadingAd] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState<{ adId: string; adName: string } | null>(null);
  const [activeTab, setActiveTab] = useState('data');
  const [isRunningStrategist] = useState(false);
  const [isRescraping, setIsRescraping] = useState(false);
  const [strategistOpinion, setStrategistOpinion] = useState<AIStrategistOpinion | null>(null);
  const [isPullingDemographics, setIsPullingDemographics] = useState(false);
  const [isClearingDemographics, setIsClearingDemographics] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  const ads: AdData[] = auditData?.ads || [];
  const hasAds = ads.length > 0;
  const needsAnalysis = ads.some(ad => !ad.angle);
  const analyzedCount = ads.filter(ad => ad.angle).length;

  useEffect(() => {
    if (!initialData) {
      loadAuditData();
    }
  }, [onesheetId]);

  const loadAuditData = async () => {
    try {
      const { data, error } = await supabase
        .from('onesheet')
        .select('ad_account_audit, ai_strategist_opinion')
        .eq('id', onesheetId)
        .single();
      
      if (error) throw error;
      
      if (data?.ad_account_audit) {
        setAuditData(data.ad_account_audit);
      }
      
      if (data?.ai_strategist_opinion) {
        setStrategistOpinion(data.ai_strategist_opinion);
      }
    } catch (error) {
      console.error('Error loading audit data:', error);
      toast({
        title: "Error",
        description: "Failed to load audit data",
        variant: "destructive"
      });
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    
    // Generate a request ID for tracking progress
    const requestId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Poll for real progress updates
    const progressInterval = setInterval(async () => {
      try {
        const progressResponse = await fetch(`/api/onesheet/ad-audit/import-progress?requestId=${requestId}`);
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          setImportProgress(progressData.progress);
          setImportMessage(progressData.message);
          console.log(`Import progress: ${progressData.progress}% - ${progressData.message}`);
        } else if (progressResponse.status === 404) {
          // Progress not yet initialized, show default message
          console.log('Progress not yet available');
        }
    } catch (error) {
        // Ignore errors in progress polling
        console.log('Progress polling error:', error);
      }
    }, 500); // Poll every 500ms

    try {
      const response = await fetch('/api/onesheet/ad-audit/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          onesheet_id: onesheetId,
          date_range: dateRange,
          max_ads: maxAds,
          request_id: requestId,
          import_demographics: true // Always include demographics with ads import
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import ads');
      }

      const result = await response.json();
      
      // Complete progress
      clearInterval(progressInterval);
      setImportProgress(100);
      
      // Brief delay to show 100% before hiding
      setTimeout(() => {
        setImportProgress(0);
      }, 1500);
      
      toast({
        title: "Success",
        description: `Successfully imported ${result.data.adsImported} ads with demographics`
      });
      
      // Refresh the data
      await loadAuditData();
    } catch (error) {
      clearInterval(progressInterval);
      setImportProgress(0);
      console.error('Error importing ads:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to import ads',
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handlePullDemographics = async () => {
    setIsPullingDemographics(true);
    try {
      const response = await fetch('/api/onesheet/ad-audit/pull-demographics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          onesheet_id: onesheetId,
          date_range: dateRange
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to pull demographics');
      }

      await response.json();
      
      toast({
        title: "Success",
        description: "Successfully pulled demographic data"
      });
      
      // Refresh the data
      await loadAuditData();
    } catch (error) {
      console.error('Error pulling demographics:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to pull demographics',
        variant: "destructive"
      });
    } finally {
      setIsPullingDemographics(false);
    }
  };

  const handleClearDemographics = async () => {
    if (!confirm('Are you sure you want to clear demographic data? Ad data will be preserved.')) {
      return;
    }

    setIsClearingDemographics(true);
    try {
      const response = await fetch('/api/onesheet/ad-audit/clear-demographics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onesheet_id: onesheetId }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear demographics');
      }

      toast({
        title: "Success",
        description: "Demographic data cleared successfully"
      });
      
      // Reload the audit data
      await loadAuditData();
    } catch (error) {
      console.error('Error clearing demographics:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to clear demographics',
        variant: "destructive"
      });
    } finally {
      setIsClearingDemographics(false);
    }
  };

  const handleAnalyze = async () => {
    if (selectedAds.size === 0) return;

    setIsAnalyzing(true);
    setAnalyzeProgress(0);
    setAnalyzeMessage('Starting analysis...');
    
    const requestId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Poll for real progress updates
    const progressInterval = setInterval(async () => {
      try {
        const progressResponse = await fetch(`/api/onesheet/ad-audit/analyze-progress?requestId=${requestId}`);
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          setAnalyzeProgress(progressData.progress);
          setAnalyzeMessage(progressData.message);
          console.log(`Analyze progress: ${progressData.currentAd}/${progressData.totalAds} - ${progressData.message}`);
        }
      } catch (error) {
        // Ignore errors in progress polling
        console.log('Progress polling error:', error);
      }
    }, 500); // Poll every 500ms
    
    try {
      const response = await fetch('/api/onesheet/ad-audit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          onesheet_id: onesheetId,
          ad_ids: Array.from(selectedAds),
          request_id: requestId
        })
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze ads');
      }

      const result = await response.json();
      
      console.log('Analyze response:', result); // Debug logging
      
      toast({
        title: "Success",
        description: `Successfully analyzed ${result.data?.adsAnalyzed || 0} ads${result.data?.adsFailed ? `, ${result.data.adsFailed} failed` : ''}`
      });
      
      // Clear selection after successful analysis
      setSelectedAds(new Set());
      
      // Refresh the data
      await loadAuditData();
    } catch (error) {
      clearInterval(progressInterval);
      console.error('Error analyzing ads:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to analyze ads',
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRescrapeVideos = async () => {
    if (selectedAds.size === 0) return;

    setIsRescraping(true);
    try {
      // Filter ads to only rescrape selected ones with videos
      const adsToRescrape = ads.filter(ad => selectedAds.has(ad.id) && ad.videoId);
      
      if (adsToRescrape.length === 0) {
        toast({
          title: "No Videos Selected",
          description: "Please select ads with videos to rescrape",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch('/api/onesheet/ad-audit/rescrape-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ads: adsToRescrape,
          onesheetId,
          brandId
        })
      });

      if (!response.ok) throw new Error('Failed to rescrape videos');
      
      const data = await response.json();
      
      toast({
        title: "Rescraping Complete",
        description: `Successfully rescraped ${data.rescrapedCount || 0} video ads. ${data.failedCount || 0} failed.`
      });
      
      // Force refresh the full data from server after rescraping
      await loadAuditData();
    } catch (error) {
      console.error('Error rescraping videos:', error);
      toast({
        title: "Error",
        description: "Failed to rescrape videos",
        variant: "destructive"
      });
    } finally {
      setIsRescraping(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all ad data and analysis? AI instructions will be preserved.')) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch('/api/onesheet/ad-audit/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onesheet_id: onesheetId }),
      });

      if (!response.ok) {
        throw new Error('Failed to clear data');
      }

      // Clear the strategist opinion from local state
      setStrategistOpinion(null);

      toast({
        title: "Success",
        description: "Ad data and analysis cleared successfully. AI instructions preserved."
      });
      
      // Reload the audit data (AI instructions are preserved on the server)
      await loadAuditData();
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to clear data',
        variant: "destructive"
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleUploadAsset = async (file: File, adId: string) => {
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 50MB",
        variant: "destructive"
      });
      return;
    }

    setUploadingAd(adId);
    try {
      const fileName = `ads/${onesheetId}/${adId}/${uuidv4()}-${file.name}`;
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('powerbrief-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('powerbrief-assets')
        .getPublicUrl(fileName);

      // Update the ad in the onesheet data
      const updatedAds = ads.map(ad => 
        ad.id === adId ? {
          ...ad,
          assetUrl: publicUrl,
          thumbnailUrl: file.type.startsWith('video/') ? ad.thumbnailUrl : publicUrl,
          imageUrl: file.type.startsWith('image/') ? publicUrl : ad.imageUrl,
          assetLoadFailed: false,
          manuallyUploaded: true
        } : ad
      );

      // Update the onesheet with the new ad data
      const { error: updateError } = await supabase
        .from('onesheet')
        .update({
          ad_account_audit: {
            ...auditData,
            ads: updatedAds
          }
        })
        .eq('id', onesheetId);

      if (updateError) throw updateError;
      
      toast({
        title: "Success",
        description: "Asset uploaded successfully"
      });

      // Reload the data
      await loadAuditData();
      setShowUploadDialog(null);
    } catch (error) {
      console.error('Error uploading asset:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to upload asset',
        variant: "destructive"
      });
    } finally {
      setUploadingAd(null);
    }
  };

  const handleExport = () => {
    if (!hasAds) return;

    // Prepare CSV headers
    const headers = [
      'ID', 'Name', 'Status', 'Landing Page', 'Spend', 'CPA', 'ROAS', 'Revenue',
      'Hook Rate', 'Hold Rate', 'Impressions', 'Purchases', '3s Views', '25% Views', 
      '50% Views', '75% Views', '100% Views', 'Campaign', 'Ad Set',
      'Type', 'Duration', 'Product Intro', 'Sit in Problem (s)', 'Sit in Problem %', 
      'Creators Used', 'Angle', 'Awareness Level', 'Content Variables',
      'Format', 'Emotion', 'Framework', 'Transcription', 'Visual Description'
    ];

    // Convert ads data to CSV rows
    const rows = ads.map(ad => [
      ad.id,
      ad.name,
      ad.status,
      ad.landingPage,
      ad.spend,
      ad.cpa,
      ad.roas,
      ad.purchaseRevenue || '0.00',
      ad.hookRate,
      ad.holdRate,
      ad.impressions,
      ad.purchases,
      ad.video3s,
      ad.video25,
      ad.video50,
      ad.video75,
      ad.video100,
      ad.campaignName,
      ad.adsetName,
      ad.type || '',
      ad.adDuration || '',
      ad.productIntro || '',
      ad.sitInProblemSeconds || '',
      ad.sitInProblem || '',
      ad.creatorsUsed || '',
      ad.angle || '',
      ad.awarenessLevel || '',
      ad.contentVariables || '',
      ad.format || '',
      ad.emotion || '',
      ad.framework || '',
      ad.transcription || '',
      ad.visualDescription || ''
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape cells containing commas or quotes
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ad-audit-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleAdSelection = (adId: string) => {
    const newSelection = new Set(selectedAds);
    if (newSelection.has(adId)) {
      newSelection.delete(adId);
    } else {
      newSelection.add(adId);
    }
    setSelectedAds(newSelection);
  };

  const selectAll = () => {
    if (selectedAds.size === ads.length) {
      setSelectedAds(new Set());
    } else {
      setSelectedAds(new Set(ads.map(ad => ad.id)));
    }
  };

  const handleRunStrategist = async () => {
    // This function would typically be implemented with the strategist logic
    // For now, it's a placeholder
    toast({
      title: "Coming Soon",
      description: "AI Strategist analysis will be available soon",
    });
  };

  if (isImporting || isAnalyzing || isClearing) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">
            {isImporting ? 'Importing ads...' : isAnalyzing ? 'Analyzing ads...' : 'Clearing data...'}
          </p>
          {isImporting && importProgress > 0 && (
            <div className="w-64 mx-auto">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span className="truncate max-w-[200px]">
                  {importMessage || 'Starting import...'}
                </span>
                <span className="font-medium">{importProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>
          )}
          {isAnalyzing && analyzeProgress > 0 && (
            <div className="w-64 mx-auto">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span className="truncate max-w-[200px]">
                  {analyzeMessage || 'Starting analysis...'}
                </span>
                <span className="font-medium">{analyzeProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${analyzeProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-full">
                  <BarChart3 className="h-5 w-5" />
                </div>
                Ad Account Audit
              </CardTitle>
              <CardDescription className="text-emerald-100">
                Import and analyze your ad performance data
                {hasAds && needsAnalysis && (
                  <span className="text-amber-200 ml-2 font-semibold">
                    ({analyzedCount}/{ads.length} ads analyzed)
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!hasAds ? (
                <>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40 bg-white text-gray-900 border border-gray-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last_7d">Last 7 days</SelectItem>
                      <SelectItem value="last_14d">Last 14 days</SelectItem>
                      <SelectItem value="last_30d">Last 30 days</SelectItem>
                      <SelectItem value="last_90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="max-ads" className="text-xs text-emerald-200">Max Ads</Label>
                    <Input
                      id="max-ads"
                      type="number"
                      min={10}
                      max={1000}
                      value={maxAds}
                      onChange={(e) => setMaxAds(Math.min(Math.max(parseInt(e.target.value) || 100, 10), 1000))}
                      className="w-20 h-8 text-sm bg-white text-gray-900"
                      placeholder="100"
                    />
                  </div>
                  <Button onClick={handleImport} disabled={isImporting} className="bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200">
                    <RefreshCw className={`mr-2 h-4 w-4 ${isImporting ? 'animate-spin' : ''}`} />
                    Import Ads
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing} 
                    variant={needsAnalysis ? "default" : "outline"}
                    className={`${needsAnalysis ? "animate-pulse bg-white text-emerald-700 hover:bg-emerald-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 bg-white"}`}
                  >
                    <Sparkles className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    {isAnalyzing ? 'Analyzing...' : needsAnalysis ? 'Analyze with AI' : 'Re-analyze'}
                    {selectedAds.size > 0 && ` (${selectedAds.size})`}
                  </Button>
                  {selectedAds.size > 0 && ads.filter(ad => selectedAds.has(ad.id) && ad.videoId).length > 0 && (
                    <Button 
                      onClick={handleRescrapeVideos} 
                      disabled={isRescraping} 
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 bg-white"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isRescraping ? 'animate-spin' : ''}`} />
                      {isRescraping ? 'Rescraping...' : 'Rescrape Videos'}
                      {` (${ads.filter(ad => selectedAds.has(ad.id) && ad.videoId).length})`}
                    </Button>
                  )}
                  {analyzedCount > 0 && (
                    <Button 
                      onClick={handleRunStrategist} 
                      disabled={isRunningStrategist} 
                      variant="outline"
                      className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 bg-white"
                    >
                      <Brain className={`mr-2 h-4 w-4 ${isRunningStrategist ? 'animate-spin' : ''}`} />
                      {isRunningStrategist ? 'Analyzing...' : 'AI Strategist'}
                      {strategistOpinion && ' ✓'}
                    </Button>
                  )}
                  <Button onClick={handleExport} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 bg-white">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  {hasAds && (
                    <Button 
                      onClick={handleClear} 
                      disabled={isClearing} 
                      className="!bg-red-500 hover:!bg-red-600 disabled:!bg-red-400 disabled:hover:!bg-red-400 !text-white !border-red-500 hover:!border-red-600 disabled:!border-red-400"
                      style={{
                        backgroundColor: isClearing ? '#f87171' : '#ef4444',
                        borderColor: isClearing ? '#f87171' : '#ef4444',
                        color: 'white'
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isClearing ? 'Clearing...' : 'Clear Data'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Info Banner for AI Analysis */}
      {hasAds && needsAnalysis && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-800">
                Click &quot;Analyze with AI&quot; to extract creative attributes like Type, Duration, Angle, Format, Emotion, Framework, Transcript/Text, and Visual Description (with hex colors for images) from your ads.
                {selectedAds.size > 0 && ` You have ${selectedAds.size} ads selected for analysis.`}
                <br />
                <span className="text-xs text-amber-700 mt-1 inline-block">
                  Red flags (🔺) on assets indicate they failed to download to Supabase and are using Meta fallback URLs.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Assets Help Banner */}
      {hasAds && ads.some(ad => ad.assetLoadFailed) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div className="text-sm text-red-800">
                <p className="font-semibold mb-1">Asset Upload Required</p>
                <p>
                  Rows highlighted in red have assets that failed to download. Click the blue upload button (📤) on these rows to manually upload the video or image files for better AI analysis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content with Tabs */}
      {hasAds && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="data" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Data Table
            </TabsTrigger>
            <TabsTrigger value="visualizations" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Visualizations
            </TabsTrigger>
            <TabsTrigger value="ai-instructions" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              AI Instructions
            </TabsTrigger>
            <TabsTrigger value="strategist" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Strategist
              {strategistOpinion && <span className="ml-1 text-xs">✓</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">
                      <input
                        type="checkbox"
                        checked={selectedAds.size === ads.length}
                        onChange={selectAll}
                        className="rounded"
                        aria-label="Select all ads"
                      />
                    </th>
                    <th className="p-2 text-left">Asset</th>
                    <th className="p-2 text-left bg-red-50 min-w-[100px]">Video ID (Debug)</th>
                    <th className="p-2 text-left min-w-[200px]">Ad Name</th>
                    <th className="p-2 text-left min-w-[200px]">Landing Page</th>
                    <th className="p-2 text-right">Spend</th>
                    <th className="p-2 text-right">CPA</th>
                    <th className="p-2 text-right">ROAS</th>
                    <th className="p-2 text-right">Website Purchase Revenue</th>
                    <th className="p-2 text-right">Hook Rate</th>
                    <th className="p-2 text-right">Hold Rate</th>
                    <th className="p-2 text-left bg-blue-50">Type</th>
                    <th className="p-2 text-right bg-blue-50">Duration</th>
                    <th className="p-2 text-right bg-blue-50">Product Intro</th>
                    <th className="p-2 text-right bg-blue-50">Sit in Problem (s)</th>
                    <th className="p-2 text-right bg-blue-50">Sit in Problem %</th>
                    <th className="p-2 text-right bg-blue-50">Creators</th>
                    <th className="p-2 text-left bg-green-50">Angle</th>
                    <th className="p-2 text-left bg-green-50">Awareness Level</th>
                    <th className="p-2 text-left bg-green-50">Content Variables</th>
                    <th className="p-2 text-left bg-green-50">Format</th>
                    <th className="p-2 text-left bg-green-50">Emotion</th>
                    <th className="p-2 text-left bg-green-50">Framework</th>
                    <th className="p-2 text-left bg-purple-50 min-w-[300px]">Transcript/Text</th>
                    <th className="p-2 text-left bg-orange-50 min-w-[350px]">Visual Description</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad, index) => (
                    <tr key={ad.id} className={`border-b hover:bg-muted/30 ${ad.assetLoadFailed ? 'bg-red-50 hover:bg-red-100' : (index % 2 === 0 ? 'bg-white' : 'bg-muted/10')}`}>
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedAds.has(ad.id)}
                          onChange={() => toggleAdSelection(ad.id)}
                          className="rounded"
                          aria-label={`Select ${ad.name}`}
                        />
                      </td>
                      <td className="p-2">
                        <div className="relative">
                          <div 
                            className="relative w-16 h-12 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center group cursor-pointer"
                            onClick={() => {
                            if (ad.videoId && (ad.thumbnailUrl || ad.imageUrl)) {
                              // Open video in modal
                              setSelectedVideo({
                                videoId: ad.videoId,
                                thumbnailUrl: ad.assetUrl || ad.thumbnailUrl || ad.imageUrl || '', // Use assetUrl (Supabase stored) first
                                adName: ad.name
                              });
                            } else if (ad.thumbnailUrl || ad.imageUrl) {
                              // Open image in modal
                              setSelectedImage({
                                imageUrl: ad.assetUrl || ad.imageUrl || ad.thumbnailUrl || '', // Use assetUrl (Supabase stored) first
                                adName: ad.name
                              });
                            }
                          }}
                        >
                          {ad.thumbnailUrl || ad.imageUrl ? (
                            <>
                              <img
                                src={ad.thumbnailUrl || ad.imageUrl || ''}
                                alt={`Preview of ${ad.name}`}
                                className="w-full h-full object-cover transition-opacity group-hover:opacity-80"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (nextElement) {
                                    nextElement.style.display = 'flex';
                                  }
                                }}
                              />
                              <div className="hidden w-full h-full items-center justify-center">
                                {ad.assetType === 'video' ? (
                                  <Video className="h-6 w-6 text-blue-500" />
                                ) : (
                                  <Image className="h-6 w-6 text-green-500" />
                                )}
                              </div>
                              {/* Play overlay for videos */}
                              {ad.videoId && (
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                                  <div className="bg-white bg-opacity-90 rounded-full p-1.5 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                                    <Play className="h-3 w-3 text-blue-600 fill-current" />
                                  </div>
                                </div>
                              )}
                              {/* Image overlay for images */}
                              {!ad.videoId && (ad.thumbnailUrl || ad.imageUrl) && (
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                                  <div className="bg-white bg-opacity-90 rounded-full p-1.5 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                                    <Image className="h-3 w-3 text-green-600" />
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {ad.assetType === 'video' ? (
                                <Video className="h-6 w-6 text-blue-500" />
                              ) : ad.assetType === 'image' ? (
                                <Image className="h-6 w-6 text-green-500" />
                              ) : (
                                <div className="h-6 w-6 rounded bg-gray-300" />
                              )}
                            </div>
                          )}
                          </div>
                          {/* Red flag for failed asset loads and upload button */}
                          {ad.assetLoadFailed && (
                            <>
                              <div 
                                className="absolute -top-2 -right-2 z-10"
                                title="Asset failed to load from Supabase, using Meta fallback"
                              >
                                <AlertTriangle className="h-5 w-5 text-red-500 bg-white rounded-full border-2 border-red-500 p-0.5" />
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowUploadDialog({ adId: ad.id, adName: ad.name });
                                }}
                                className="absolute -bottom-2 -right-2 z-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 transition-transform hover:scale-110"
                                title="Upload replacement asset"
                                disabled={uploadingAd === ad.id}
                              >
                                {uploadingAd === ad.id ? (
                                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-2 bg-red-50 font-mono text-xs">
                        {ad.videoId ? (
                          <span className="text-blue-600" title={ad.videoId}>
                            {ad.videoId.substring(0, 12)}...
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-2 font-medium">{ad.name}</td>
                      <td className="p-2">
                        <a href={ad.landingPage} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-[200px]">
                          {ad.landingPage}
                        </a>
                      </td>
                      <td className="p-2 text-right">${ad.spend}</td>
                      <td className="p-2 text-right">${ad.cpa}</td>
                      <td className="p-2 text-right">{ad.roas}</td>
                      <td className="p-2 text-right">${ad.purchaseRevenue || '0.00'}</td>
                      <td className="p-2 text-right">{ad.hookRate === 'N/A' ? 'N/A' : `${ad.hookRate}%`}</td>
                      <td className="p-2 text-right">{ad.holdRate === 'N/A' ? 'N/A' : `${ad.holdRate}%`}</td>
                      <td className={`p-2 ${!ad.type ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.type || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 text-right ${!ad.adDuration || ad.adDuration === 'N/A' ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.adDuration === 'N/A' ? 'N/A' : ad.adDuration ? `${ad.adDuration}s` : '-'}
                      </td>
                      <td className={`p-2 text-right ${!ad.productIntro || ad.productIntro === 'N/A' ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.productIntro === 'N/A' ? 'N/A' : ad.productIntro ? `${ad.productIntro}s` : '-'}
                      </td>
                      <td className={`p-2 text-right ${!ad.sitInProblemSeconds ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.sitInProblemSeconds !== undefined && ad.sitInProblemSeconds !== null ? `${ad.sitInProblemSeconds}s` : '-'}
                      </td>
                      <td className={`p-2 text-right ${!ad.sitInProblem ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.sitInProblem || '-'}
                      </td>
                      <td className={`p-2 text-right ${!ad.creatorsUsed ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.creatorsUsed || '-'}
                      </td>
                      <td className={`p-2 ${!ad.angle ? 'text-gray-400 bg-green-50' : 'bg-green-50'}`}>
                        {ad.angle || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 ${!ad.awarenessLevel ? 'text-gray-400 bg-green-50' : 'bg-green-50'}`}>
                        {ad.awarenessLevel || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 ${!ad.contentVariables ? 'text-gray-400 bg-green-50' : 'bg-green-50'} max-w-[200px]`}>
                        {ad.contentVariables ? (
                          <div 
                            className="max-h-20 overflow-y-auto text-wrap break-words text-xs leading-tight scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                            style={{ wordBreak: 'break-word', hyphens: 'auto' }}
                          >
                            {ad.contentVariables}
                          </div>
                        ) : (
                          <span className="italic">Needs AI</span>
                        )}
                      </td>
                      <td className={`p-2 ${!ad.format ? 'text-gray-400 bg-green-50' : 'bg-green-50'}`}>
                        {ad.format || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 ${!ad.emotion ? 'text-gray-400 bg-green-50' : 'bg-green-50'}`}>
                        {ad.emotion || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 ${!ad.framework ? 'text-gray-400 bg-green-50' : 'bg-green-50'}`}>
                        {ad.framework || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 bg-purple-50 max-w-[300px] ${!ad.transcription ? 'text-gray-400' : ''}`}>
                        {ad.transcription ? (
                          <div 
                            className="max-h-20 overflow-y-auto text-wrap break-words text-xs leading-tight scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                            style={{ wordBreak: 'break-word', hyphens: 'auto' }}
                          >
                            {ad.transcription}
                          </div>
                        ) : (
                          <span className="italic">Needs AI</span>
                        )}
                      </td>
                      <td className={`p-2 bg-orange-50 max-w-[350px] ${!ad.visualDescription ? 'text-gray-400' : ''}`}>
                        {ad.visualDescription ? (
                          <div 
                            className="max-h-20 overflow-y-auto text-wrap break-words text-xs leading-tight scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                            style={{ wordBreak: 'break-word', hyphens: 'auto' }}
                          >
                            {ad.visualDescription}
                          </div>
                        ) : (
                          <span className="italic">Needs AI</span>
                        )}
                      </td>
                      <td className="p-2">
                        <a
                          href={`https://business.facebook.com/adsmanager/manage/ads?act=${brandId}&selected_ad_ids=${ad.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="visualizations" className="space-y-4">
            {/* Demographics Controls */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Demographics Data</h3>
              <div className="flex gap-2">
                <Button
                  onClick={handlePullDemographics}
                  disabled={isPullingDemographics}
                  variant="outline"
                  size="sm"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isPullingDemographics ? 'animate-spin' : ''}`} />
                  {isPullingDemographics ? 'Pulling...' : 'Pull Demographics'}
                </Button>
                {Object.keys(auditData?.demographicBreakdown || {}).length > 0 && (
                  <Button
                    onClick={handleClearDemographics}
                    disabled={isClearingDemographics}
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className={`mr-2 h-4 w-4 ${isClearingDemographics ? 'animate-spin' : ''}`} />
                    {isClearingDemographics ? 'Clearing...' : 'Clear Demographics'}
                  </Button>
                )}
              </div>
                </div>

            {Object.keys(auditData?.demographicBreakdown || {}).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Age Breakdown */}
                {auditData?.demographicBreakdown?.age && Object.keys(auditData.demographicBreakdown.age).length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Age Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                          data={Object.entries(auditData.demographicBreakdown.age).map(([age, percentage]) => ({
                                name: age,
                            value: percentage
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                          fill="#8884d8"
                              dataKey="value"
                            >
                          {Object.keys(auditData.demographicBreakdown.age).map((_, index) => (
                            <Cell key={`age-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                          </PieChart>
                        </ResponsiveContainer>
                    </Card>
                  )}

                {/* Gender Breakdown */}
                {auditData?.demographicBreakdown?.gender && Object.keys(auditData.demographicBreakdown.gender).length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Gender Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                          data={Object.entries(auditData.demographicBreakdown.gender).map(([gender, percentage]) => ({
                            name: gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Unknown',
                            value: percentage
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                          fill="#82ca9d"
                              dataKey="value"
                            >
                          {Object.keys(auditData.demographicBreakdown.gender).map((_, index) => (
                            <Cell key={`gender-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                          </PieChart>
                        </ResponsiveContainer>
                    </Card>
                  )}

                {/* Placement Breakdown */}
                {auditData?.demographicBreakdown?.placement && Object.keys(auditData.demographicBreakdown.placement).length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Placement Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                          data={Object.entries(auditData.demographicBreakdown.placement).map(([placement, percentage]) => ({
                            name: placement === 'facebook' ? 'Facebook' : 
                                  placement === 'instagram' ? 'Instagram' : 
                                  placement === 'audience_network' ? 'Audience Network' : 
                                  placement === 'messenger' ? 'Messenger' : placement,
                            value: percentage
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                          fill="#ffc658"
                              dataKey="value"
                            >
                          {Object.keys(auditData.demographicBreakdown.placement).map((_, index) => (
                            <Cell key={`placement-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                        <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                          </PieChart>
                        </ResponsiveContainer>
                    </Card>
                  )}
              </div>
            ) : (
              <div className="text-center py-8">
                <PieChart className="mx-auto h-24 w-24 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No demographic data available</h3>
                <p className="text-gray-600 mb-4">
                  Click &quot;Pull Demographics&quot; to fetch demographic breakdowns from your ad account
                </p>
                <p className="text-sm text-gray-500">
                  Demographics are pulled at the account level for the selected date range
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai-instructions">
            <AIInstructionsTab onesheetId={onesheetId} brandId={brandId} />
          </TabsContent>

          <TabsContent value="strategist">
            <AIStrategistTab 
              onesheetId={onesheetId}
              brandId={brandId}
              analyzedAdsCount={analyzedCount}
              totalAdsCount={ads.length}
              hasAds={hasAds}
              strategistOpinion={strategistOpinion}
              onRunStrategist={handleRunStrategist}
              isRunning={isRunningStrategist}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!hasAds && !isImporting && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No ad data imported yet. Select a date range and click &quot;Import Ads&quot; to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setSelectedVideo(null)}>
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] w-full mx-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold truncate">{selectedVideo.adName}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVideo(null)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
              {/* Check if we have a local video URL stored in Supabase */}
              {selectedVideo.thumbnailUrl && (selectedVideo.thumbnailUrl.includes('supabase') || selectedVideo.thumbnailUrl.includes('.mp4')) ? (
                // Local video stored in Supabase or direct video URL - use HTML5 video player
                <video
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                  onError={() => {
                    console.error('Video playback failed, falling back to Facebook iframe');
                    // Could add fallback logic here
                  }}
                >
                  <source src={selectedVideo.thumbnailUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                // External video - use Facebook iframe fallback
                <iframe
                  src={`https://www.facebook.com/plugins/video.php?height=480&href=https%3A%2F%2Fwww.facebook.com%2Fvideo.php%3Fv%3D${selectedVideo.videoId}&show_text=false&width=854&t=0`}
                  width="100%"
                  height="100%"
                  style={{ border: 'none', overflow: 'hidden' }}
                  scrolling="no"
                  frameBorder="0"
                  allowFullScreen={true}
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Click outside the video or press the X button to close
            </p>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] w-full mx-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold truncate">{selectedImage.adName}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[75vh] bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
              <img
                src={selectedImage.imageUrl}
                alt={`Full size preview of ${selectedImage.adName}`}
                className="max-w-full max-h-full object-contain"
                onError={(event) => {
                  console.error('Image failed to load:', selectedImage.imageUrl);
                  (event.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NSA4NUwxMTUgMTE1TTE4NSA4NUwxMTUgMTE1TDE4NSAxMTVNODUgMTE1TDExNSA4NU04NSA4NUwxMTUgMTE1IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjwvdGV4dD4KPC9zdmc+';
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Click outside the image or press the X button to close
            </p>
          </div>
        </div>
      )}

      {/* Upload Asset Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Replacement Asset</h3>
              <button
                onClick={() => setShowUploadDialog(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Upload a new asset for: <strong>{showUploadDialog.adName}</strong>
              </p>
              <p className="text-xs text-gray-500">
                Supported formats: JPEG, PNG, WebP, GIF, MP4, MOV, AVI, WebM (Max: 50MB)
              </p>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadAsset(file, showUploadDialog.adId);
                    }
                  }}
                  className="hidden"
                  id="asset-upload"
                />
                <label htmlFor="asset-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUploadDialog(null)}
                  disabled={uploadingAd === showUploadDialog.adId}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 