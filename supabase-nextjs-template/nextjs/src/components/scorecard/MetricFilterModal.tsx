'use client';

import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui';
import { Plus, X, Info } from 'lucide-react';
import { ScorecardMetric, CampaignFilter, AdSetFilter, AdFilter } from '@/lib/types/scorecard';

interface MetricFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: ScorecardMetric;
  onSave: (filters: {
    campaigns?: CampaignFilter[];
    adSets?: AdSetFilter[];
    ads?: AdFilter[];
  }) => void;
}

export default function MetricFilterModal({ 
  open, 
  onOpenChange, 
  metric,
  onSave 
}: MetricFilterModalProps) {
  const [campaignFilters, setCampaignFilters] = useState<CampaignFilter[]>(
    metric.meta_campaigns || []
  );
  const [adSetFilters, setAdSetFilters] = useState<AdSetFilter[]>(
    metric.meta_ad_sets || []
  );
  const [adFilters, setAdFilters] = useState<AdFilter[]>(
    metric.meta_ads || []
  );

  // Determine which tab to show based on metric
  const getDefaultTab = () => {
    if (metric.metric_key.includes('video_ads_roas') || metric.metric_key.includes('image_ads_roas')) {
      return 'ads';
    }
    return 'campaigns';
  };

  const [activeTab, setActiveTab] = useState(getDefaultTab());

  const filterOperators = [
    { value: 'contains', label: 'Contains', description: 'Name includes this text' },
    { value: 'not_contains', label: 'Does not contain', description: 'Name excludes this text' },
    { value: 'starts_with', label: 'Starts with', description: 'Name begins with this text' },
    { value: 'ends_with', label: 'Ends with', description: 'Name ends with this text' },
    { value: 'equals', label: 'Equals exactly', description: 'Name matches exactly' }
  ];

  const addFilter = (type: 'campaign' | 'adSet' | 'ad') => {
    const newFilter = { operator: 'contains' as const, value: '', case_sensitive: false };
    switch (type) {
      case 'campaign':
        setCampaignFilters([...campaignFilters, newFilter]);
        break;
      case 'adSet':
        setAdSetFilters([...adSetFilters, newFilter]);
        break;
      case 'ad':
        setAdFilters([...adFilters, newFilter]);
        break;
    }
  };

  const removeFilter = (type: 'campaign' | 'adSet' | 'ad', index: number) => {
    switch (type) {
      case 'campaign':
        setCampaignFilters(campaignFilters.filter((_, i) => i !== index));
        break;
      case 'adSet':
        setAdSetFilters(adSetFilters.filter((_, i) => i !== index));
        break;
      case 'ad':
        setAdFilters(adFilters.filter((_, i) => i !== index));
        break;
    }
  };

  const updateFilter = (type: 'campaign' | 'adSet' | 'ad', index: number, filter: CampaignFilter | AdSetFilter | AdFilter) => {
    switch (type) {
      case 'campaign':
        const updatedCampaigns = [...campaignFilters];
        updatedCampaigns[index] = filter as CampaignFilter;
        setCampaignFilters(updatedCampaigns);
        break;
      case 'adSet':
        const updatedAdSets = [...adSetFilters];
        updatedAdSets[index] = filter as AdSetFilter;
        setAdSetFilters(updatedAdSets);
        break;
      case 'ad':
        const updatedAds = [...adFilters];
        updatedAds[index] = filter as AdFilter;
        setAdFilters(updatedAds);
        break;
    }
  };

  const handleSave = () => {
    // Remove empty filters
    const validCampaignFilters = campaignFilters.filter(f => f.value.trim() !== '');
    const validAdSetFilters = adSetFilters.filter(f => f.value.trim() !== '');
    const validAdFilters = adFilters.filter(f => f.value.trim() !== '');
    
    onSave({
      campaigns: validCampaignFilters.length > 0 ? validCampaignFilters : undefined,
      adSets: validAdSetFilters.length > 0 ? validAdSetFilters : undefined,
      ads: validAdFilters.length > 0 ? validAdFilters : undefined
    });
  };

  const getPreview = (filters: (CampaignFilter | AdSetFilter | AdFilter)[], type: string) => {
    const validFilters = filters.filter(f => f.value.trim() !== '');
    if (validFilters.length === 0) return `All ${type}`;
    
    return validFilters.map((filter, index) => {
      const op = filterOperators.find(o => o.value === filter.operator);
      return `${index > 0 ? ' AND ' : ''}${op?.label} "${filter.value}"`;
    }).join('');
  };

  const renderFilterSection = (
    filters: (CampaignFilter | AdSetFilter | AdFilter)[],
    type: 'campaign' | 'adSet' | 'ad',
    title: string,
    description: string
  ) => (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">{title}</p>
          <p className="mt-1">{description}</p>
        </div>
      </div>

      <div className="space-y-3">
        {filters.map((filter, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-600">Operator</Label>
                    <Select 
                      value={filter.operator}
                      onValueChange={(value) => updateFilter(type, index, { ...filter, operator: value as CampaignFilter['operator'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {filterOperators.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            <div>
                              <div className="font-medium">{op.label}</div>
                              <div className="text-xs text-gray-500">{op.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-gray-600">Value</Label>
                    <Input
                      value={filter.value}
                      onChange={(e) => updateFilter(type, index, { ...filter, value: e.target.value })}
                      placeholder={type === 'ad' ? 'e.g., video, carousel' : 'e.g., creative_testing'}
                    />
                  </div>
                </div>
                
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-600 mt-6">
                    <input
                      type="checkbox"
                      checked={filter.case_sensitive || false}
                      onChange={(e) => updateFilter(type, index, { ...filter, case_sensitive: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    Case sensitive
                  </label>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeFilter(type, index)}
                    className="mt-6"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        <Button
          type="button"
          variant="outline"
          onClick={() => addFilter(type)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Filter
        </Button>
      </div>

      <div className="p-3 bg-gray-50 rounded-lg">
        <Label className="text-sm font-medium">Preview:</Label>
        <p className="text-sm text-gray-700 mt-1">
          This metric will include {type === 'campaign' ? 'campaigns' : type === 'adSet' ? 'ad sets' : 'ads'} that match: <strong>{getPreview(filters, type === 'campaign' ? 'campaigns' : type === 'adSet' ? 'ad sets' : 'ads')}</strong>
        </p>
      </div>
    </div>
  );

  // Determine which tabs to show
  const showCampaignTab = !metric.metric_key.includes('video_ads_roas') && !metric.metric_key.includes('image_ads_roas');
  const showAdTab = metric.metric_key.includes('video_ads_roas') || metric.metric_key.includes('image_ads_roas');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filters for {metric.display_name}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="campaigns" disabled={!showCampaignTab}>Campaigns</TabsTrigger>
            <TabsTrigger value="adSets" disabled={!showCampaignTab}>Ad Sets</TabsTrigger>
            <TabsTrigger value="ads" disabled={!showAdTab}>Ads</TabsTrigger>
          </TabsList>
          
          <TabsContent value="campaigns" className="mt-4">
            {renderFilterSection(
              campaignFilters,
              'campaign',
              'Filter by Campaign Name',
              'Only campaigns matching these filters will be included in the metric calculation.'
            )}
          </TabsContent>
          
          <TabsContent value="adSets" className="mt-4">
            {renderFilterSection(
              adSetFilters,
              'adSet',
              'Filter by Ad Set Name',
              'Only ad sets matching these filters will be included in the metric calculation.'
            )}
          </TabsContent>
          
          <TabsContent value="ads" className="mt-4">
            {renderFilterSection(
              adFilters,
              'ad',
              'Filter by Ad Name',
              'Only ads matching these filters will be included in the metric calculation. Use this to filter by creative type (e.g., "video", "image", "carousel").'
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 