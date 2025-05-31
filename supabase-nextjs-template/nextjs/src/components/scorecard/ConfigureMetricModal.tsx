'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Badge
} from '@/components/ui';
import { Plus, X, Filter, Target, Info, AlertCircle } from 'lucide-react';
import { 
  MetricWithData,
  CampaignFilter,
  FilterOperator
} from '@/lib/types/scorecard';

interface ConfigureMetricModalProps {
  metric: MetricWithData;
  onClose: () => void;
  onSave: (updatedMetric: MetricWithData) => void;
}

export default function ConfigureMetricModal({ metric, onClose, onSave }: ConfigureMetricModalProps) {
  const [formData, setFormData] = useState({
    ...metric,
    campaign_name_filters: metric.campaign_name_filters || [],
    weekly_goal: metric.weekly_goal || undefined,
    monthly_goal: metric.monthly_goal || undefined,
    quarterly_goal: metric.quarterly_goal || undefined,
    annual_goal: metric.annual_goal || undefined,
  });

  const [campaignFilters, setCampaignFilters] = useState<CampaignFilter[]>(
    metric.campaign_name_filters || []
  );

  const filterOperators: { value: FilterOperator; label: string; description: string }[] = [
    { value: 'contains', label: 'Contains', description: 'Campaign name includes this text' },
    { value: 'not_contains', label: 'Does not contain', description: 'Campaign name excludes this text' },
    { value: 'starts_with', label: 'Starts with', description: 'Campaign name begins with this text' },
    { value: 'ends_with', label: 'Ends with', description: 'Campaign name ends with this text' },
    { value: 'equals', label: 'Equals', description: 'Campaign name matches exactly' },
    { value: 'not_equals', label: 'Does not equal', description: 'Campaign name does not match' }
  ];

  const addFilter = () => {
    setCampaignFilters([...campaignFilters, { operator: 'contains', value: '', case_sensitive: false }]);
  };

  const removeFilter = (index: number) => {
    setCampaignFilters(campaignFilters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, filter: CampaignFilter) => {
    const updated = [...campaignFilters];
    updated[index] = filter;
    setCampaignFilters(updated);
  };

  const handleSave = () => {
    const updatedMetric: MetricWithData = {
      ...metric,
      ...formData,
      campaign_name_filters: campaignFilters.length > 0 ? campaignFilters : undefined,
      requires_configuration: false // Mark as configured
    };
    onSave(updatedMetric);
  };

  const getFilterPreview = () => {
    if (campaignFilters.length === 0) return 'All campaigns';
    
    return campaignFilters.map((filter, index) => {
      const operator = filterOperators.find(op => op.value === filter.operator);
      return `${index > 0 ? ' AND ' : ''}${operator?.label} "${filter.value}"${filter.case_sensitive ? ' (case sensitive)' : ''}`;
    }).join('');
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Configure {metric.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Configuration Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>{metric.name}</strong> needs to be configured with campaign filters to accurately track your specific campaigns.
              Set up filters below to include only the campaigns you want to track for this metric.
            </AlertDescription>
          </Alert>

          {/* Campaign Filters Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                Campaign Filters
              </CardTitle>
              <p className="text-sm text-gray-600">
                Define which campaigns should be included when calculating this metric
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaignFilters.map((filter, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`operator-${index}`} className="text-xs text-gray-600">Operator</Label>
                      <Select 
                        value={filter.operator}
                        onValueChange={(value) => updateFilter(index, { ...filter, operator: value as FilterOperator })}
                      >
                        <SelectTrigger id={`operator-${index}`}>
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
                      <Label htmlFor={`value-${index}`} className="text-xs text-gray-600">Value</Label>
                      <Input
                        id={`value-${index}`}
                        value={filter.value}
                        onChange={(e) => updateFilter(index, { ...filter, value: e.target.value })}
                        placeholder="e.g., prospecting, retargeting, creative"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600 mt-6">
                      <input
                        type="checkbox"
                        checked={filter.case_sensitive || false}
                        onChange={(e) => updateFilter(index, { ...filter, case_sensitive: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      Case sensitive
                    </label>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeFilter(index)}
                      className="mt-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {campaignFilters.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                  <p>No filters configured. This metric will include all campaigns.</p>
                  <p className="text-sm mt-1">Add filters to track specific campaign types.</p>
                </div>
              )}
              
              <Button
                type="button"
                variant="outline"
                onClick={addFilter}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Campaign Filter
              </Button>
              
              {/* Filter Preview */}
              {campaignFilters.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <Label className="text-sm font-medium text-blue-900">Filter Preview:</Label>
                  <p className="text-sm text-blue-700 mt-1">
                    This metric will include campaigns that match: <strong>{getFilterPreview()}</strong>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Goals Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Performance Goals
              </CardTitle>
              <p className="text-sm text-gray-600">
                Set target goals for different time periods
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weekly_goal">Weekly Goal</Label>
                  <Input
                    id="weekly_goal"
                    type="number"
                    step="0.01"
                    value={formData.weekly_goal || ''}
                    onChange={(e) => setFormData({...formData, weekly_goal: e.target.value ? parseFloat(e.target.value) : undefined})}
                    placeholder={metric.display_format === 'currency' ? '10000' : '2.00'}
                  />
                </div>

                <div>
                  <Label htmlFor="monthly_goal">Monthly Goal</Label>
                  <Input
                    id="monthly_goal"
                    type="number"
                    step="0.01"
                    value={formData.monthly_goal || ''}
                    onChange={(e) => setFormData({...formData, monthly_goal: e.target.value ? parseFloat(e.target.value) : undefined})}
                    placeholder={metric.display_format === 'currency' ? '40000' : '2.00'}
                  />
                </div>

                <div>
                  <Label htmlFor="quarterly_goal">Quarterly Goal</Label>
                  <Input
                    id="quarterly_goal"
                    type="number"
                    step="0.01"
                    value={formData.quarterly_goal || ''}
                    onChange={(e) => setFormData({...formData, quarterly_goal: e.target.value ? parseFloat(e.target.value) : undefined})}
                    placeholder={metric.display_format === 'currency' ? '120000' : '2.00'}
                  />
                </div>

                <div>
                  <Label htmlFor="annual_goal">Annual Goal</Label>
                  <Input
                    id="annual_goal"
                    type="number"
                    step="0.01"
                    value={formData.annual_goal || ''}
                    onChange={(e) => setFormData({...formData, annual_goal: e.target.value ? parseFloat(e.target.value) : undefined})}
                    placeholder={metric.display_format === 'currency' ? '480000' : '2.00'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metric Details */}
          <Card>
            <CardHeader>
              <CardTitle>Metric Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Type</Label>
                  <Badge variant="outline" className="mt-1">
                    {metric.type === 'meta_api' ? 'Meta API' : 'Custom'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Meta Metric</Label>
                  <p className="text-sm font-medium">{metric.meta_metric_name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Level</Label>
                  <p className="text-sm font-medium capitalize">{metric.meta_level || 'Account'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Display Format</Label>
                  <p className="text-sm font-medium capitalize">{metric.display_format}</p>
                </div>
              </div>
              
              {metric.description && (
                <div>
                  <Label className="text-sm text-gray-600">Description</Label>
                  <p className="text-sm mt-1">{metric.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 