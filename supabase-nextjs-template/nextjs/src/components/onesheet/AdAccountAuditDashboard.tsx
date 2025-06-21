'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, RefreshCw, Trash2, Play, ExternalLink, Image, Video, Sparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface AdData {
  id: string;
  name: string;
  status: string;
  assetUrl: string;
  assetType: string;
  assetId: string;
  landingPage: string;
  spend: string;
  impressions: number;
  cpa: string;
  roas: string;
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
  // Gemini analysis fields
  type?: string | null;
  adDuration?: number | null;
  productIntro?: number | null;
  sitInProblem?: string | null;
  creatorsUsed?: number | null;
  angle?: string | null;
  format?: string | null;
  emotion?: string | null;
  framework?: string | null;
  transcription?: string | null;
}

interface AdAccountAuditDashboardProps {
  onesheetId: string;
  brandId: string;
  initialData?: any;
}

export function AdAccountAuditDashboard({ onesheetId, brandId, initialData }: AdAccountAuditDashboardProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [dateRange, setDateRange] = useState('last_30d');
  const [auditData, setAuditData] = useState<any>(initialData?.ad_account_audit || null);
  const [selectedAds, setSelectedAds] = useState<Set<string>>(new Set());
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
        .select('ad_account_audit')
        .eq('id', onesheetId)
        .single();
      
      if (error) throw error;
      
      if (data?.ad_account_audit) {
        setAuditData(data.ad_account_audit as any);
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
    try {
      const response = await fetch('/api/onesheet/ad-audit/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          onesheet_id: onesheetId,
          date_range: dateRange,
          fetch_limit: 800
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to import ads');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: `Successfully imported ${result.data.adsImported} ads`
      });
      
      // Refresh the data
      await loadAuditData();
    } catch (error) {
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

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/onesheet/ad-audit/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          onesheet_id: onesheetId,
          ad_ids: selectedAds.size > 0 ? Array.from(selectedAds) : undefined
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to analyze ads');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: `Successfully analyzed ${result.data.adsAnalyzed} ads`
      });
      
      // Refresh the data
      await loadAuditData();
    } catch (error) {
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

  const handleClear = async () => {
    if (!confirm('Are you sure you want to clear all ad data? This cannot be undone.')) {
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

      toast({
        title: "Success",
        description: "Ad data cleared successfully"
      });
      
      // Reload the audit data
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

  const handleExport = () => {
    if (!ads.length) return;

    const headers = [
      'Ad Name',
      'Landing Page',
      'Spend',
      'CPA',
      'ROAS',
      'Hook Rate',
      'Hold Rate',
      'Type',
      'Ad Duration',
      'Product Intro',
      'Sit in Problem %',
      'Creators Used',
      'Angle',
      'Format',
      'Emotion',
      'Framework',
      'Transcription'
    ];

    const rows = ads.map(ad => [
      ad.name,
      ad.landingPage,
      `$${ad.spend}`,
      `$${ad.cpa}`,
      ad.roas,
      `${ad.hookRate}%`,
      `${ad.holdRate}%`,
      ad.type || '',
      ad.adDuration ? `${ad.adDuration}s` : '',
      ad.productIntro ? `${ad.productIntro}s` : '',
      ad.sitInProblem || '',
      ad.creatorsUsed || '',
      ad.angle || '',
      ad.format || '',
      ad.emotion || '',
      ad.framework || '',
      ad.transcription || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
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

  // Calculate demographic data
  const demographicData = auditData?.demographicBreakdown || { age: {}, gender: {} };

  if (isImporting || isAnalyzing || isClearing) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isImporting ? 'Importing ads...' : isAnalyzing ? 'Analyzing ads...' : 'Clearing data...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ad Account Audit</CardTitle>
              <CardDescription>
                Import and analyze your ad performance data
                {hasAds && needsAnalysis && (
                  <span className="text-amber-600 ml-2">
                    ({analyzedCount}/{ads.length} ads analyzed)
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!hasAds ? (
                <>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last_7d">Last 7 days</SelectItem>
                      <SelectItem value="last_14d">Last 14 days</SelectItem>
                      <SelectItem value="last_30d">Last 30 days</SelectItem>
                      <SelectItem value="last_90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleImport} disabled={isImporting}>
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
                    className={needsAnalysis ? "animate-pulse" : ""}
                  >
                    <Sparkles className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    {isAnalyzing ? 'Analyzing...' : needsAnalysis ? 'Analyze with AI' : 'Re-analyze'}
                    {selectedAds.size > 0 && ` (${selectedAds.size})`}
                  </Button>
                  <Button onClick={handleExport} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button onClick={handleClear} disabled={isClearing} variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Data
                  </Button>
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
                Click "Analyze with AI" to extract creative attributes like Type, Duration, Angle, Format, Emotion, and Framework from your ads.
                {selectedAds.size > 0 && ` You have ${selectedAds.size} ads selected for analysis.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spreadsheet Table */}
      {hasAds && (
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
                    <th className="p-2 text-left min-w-[200px]">Ad Name</th>
                    <th className="p-2 text-left min-w-[200px]">Landing Page</th>
                    <th className="p-2 text-right">Spend</th>
                    <th className="p-2 text-right">CPA</th>
                    <th className="p-2 text-right">ROAS</th>
                    <th className="p-2 text-right">Hook Rate</th>
                    <th className="p-2 text-right">Hold Rate</th>
                    <th className="p-2 text-left bg-blue-50">Type</th>
                    <th className="p-2 text-right bg-blue-50">Duration</th>
                    <th className="p-2 text-right bg-blue-50">Product Intro</th>
                    <th className="p-2 text-right bg-blue-50">Sit in Problem</th>
                    <th className="p-2 text-right bg-blue-50">Creators</th>
                    <th className="p-2 text-left bg-green-50">Angle</th>
                    <th className="p-2 text-left bg-green-50">Format</th>
                    <th className="p-2 text-left bg-green-50">Emotion</th>
                    <th className="p-2 text-left bg-green-50">Framework</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad, index) => (
                    <tr key={ad.id} className={`border-b hover:bg-muted/30 ${index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
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
                        {ad.assetType === 'video' ? (
                          <Video className="h-5 w-5 text-blue-500" />
                        ) : ad.assetType === 'image' ? (
                          <Image className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="h-5 w-5 rounded bg-gray-200" />
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
                      <td className="p-2 text-right">{ad.hookRate}%</td>
                      <td className="p-2 text-right">{ad.holdRate}%</td>
                      <td className={`p-2 ${!ad.type ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.type || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 text-right ${!ad.adDuration ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.adDuration ? `${ad.adDuration}s` : '-'}
                      </td>
                      <td className={`p-2 text-right ${!ad.productIntro ? 'text-gray-400 bg-blue-50' : 'bg-blue-50'}`}>
                        {ad.productIntro ? `${ad.productIntro}s` : '-'}
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
                      <td className={`p-2 ${!ad.format ? 'text-gray-400 bg-green-50' : 'bg-green-50'}`}>
                        {ad.format || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 ${!ad.emotion ? 'text-gray-400 bg-green-50' : 'bg-green-50'}`}>
                        {ad.emotion || <span className="italic">Needs AI</span>}
                      </td>
                      <td className={`p-2 ${!ad.framework ? 'text-gray-400 bg-green-50' : 'bg-green-50'}`}>
                        {ad.framework || <span className="italic">Needs AI</span>}
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
      )}

      {/* Demographics Section (moved below) */}
      {hasAds && Object.keys(demographicData.age).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Age Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(demographicData.age).map(([age, value]) => ({
                  age,
                  value: value as number
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gender Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(demographicData.gender).map(([gender, value]) => ({
                      name: gender,
                      value: value as number
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(demographicData.gender).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#ec4899', '#8b5cf6'][index % 3]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!hasAds && !isImporting && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No ad data imported yet. Select a date range and click "Import Ads" to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 