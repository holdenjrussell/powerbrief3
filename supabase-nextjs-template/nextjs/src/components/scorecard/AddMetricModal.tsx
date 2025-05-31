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
  Textarea,
  Alert,
  AlertDescription
} from '@/components/ui';
import { Loader2, Target, Settings, Info } from 'lucide-react';
import { 
  META_API_METRICS, 
  CreateMetricRequest, 
  ScorecardMetric 
} from '@/lib/types/scorecard';

interface AddMetricModalProps {
  onClose: () => void;
  onMetricAdded: (metric: ScorecardMetric) => void;
}

export default function AddMetricModal({ onClose, onMetricAdded }: AddMetricModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [formData, setFormData] = useState<CreateMetricRequest>({
    name: '',
    description: '',
    type: 'meta_api',
    meta_metric_name: '',
    meta_ad_account_id: '',
    meta_level: 'account',
    display_format: 'number',
    decimal_places: 2,
    status_calculation_method: 'average_based'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTemplateSelect = (templateName: string) => {
    const template = META_API_METRICS.find(m => m.name === templateName);
    if (template) {
      setSelectedTemplate(templateName);
      setFormData({
        ...formData,
        name: template.name,
        description: template.description,
        meta_metric_name: template.meta_metric_name,
        meta_level: template.meta_level,
        meta_breakdowns: 'meta_breakdowns' in template ? [...(template.meta_breakdowns || [])] : undefined,
        display_format: template.display_format,
        decimal_places: template.decimal_places
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // In real implementation, this would call the API
      const newMetric: ScorecardMetric = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: 'current-user',
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status_calculation_method: formData.status_calculation_method || 'average_based',
        display_format: formData.display_format || 'number',
        decimal_places: formData.decimal_places || 2
      };

      onMetricAdded(newMetric);
    } catch {
      setError('Failed to create metric. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-6">
      {/* Template Selection */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="template">Choose a Metric Template</Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select from common Meta metrics..." />
            </SelectTrigger>
            <SelectContent>
              {[...META_API_METRICS].map((template) => (
                <SelectItem key={template.name} value={template.name}>
                  <div className="flex flex-col">
                    <span className="font-medium">{template.name}</span>
                    <span className="text-xs text-gray-500">{template.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTemplate && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Template selected: {selectedTemplate}. You can customize the settings below.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="border-t pt-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Metric Configuration</h3>
          
          <div>
            <Label htmlFor="name">Metric Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Meta Account ROAS"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe what this metric measures..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="meta_metric_name">Meta API Metric *</Label>
              <Input
                id="meta_metric_name"
                value={formData.meta_metric_name || ''}
                onChange={(e) => setFormData({...formData, meta_metric_name: e.target.value})}
                placeholder="e.g., purchase_roas, ctr, spend"
                required
              />
            </div>

            <div>
              <Label htmlFor="meta_level">Level</Label>
              <Select 
                value={formData.meta_level || 'account'} 
                onValueChange={(value) => setFormData({...formData, meta_level: value as 'account' | 'campaign' | 'adset' | 'ad'})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="adset">Ad Set</SelectItem>
                  <SelectItem value="ad">Ad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="meta_ad_account_id">Meta Ad Account ID</Label>
            <Input
              id="meta_ad_account_id"
              value={formData.meta_ad_account_id || ''}
              onChange={(e) => setFormData({...formData, meta_ad_account_id: e.target.value})}
              placeholder="Leave empty to use default account"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        {/* Goals Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium">Goals</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weekly_goal">Weekly Goal</Label>
              <Input
                id="weekly_goal"
                type="number"
                step="0.01"
                value={formData.weekly_goal || ''}
                onChange={(e) => setFormData({...formData, weekly_goal: parseFloat(e.target.value) || undefined})}
                placeholder="e.g., 2.00"
              />
            </div>

            <div>
              <Label htmlFor="monthly_goal">Monthly Goal</Label>
              <Input
                id="monthly_goal"
                type="number"
                step="0.01"
                value={formData.monthly_goal || ''}
                onChange={(e) => setFormData({...formData, monthly_goal: parseFloat(e.target.value) || undefined})}
                placeholder="e.g., 2.00"
              />
            </div>

            <div>
              <Label htmlFor="quarterly_goal">Quarterly Goal</Label>
              <Input
                id="quarterly_goal"
                type="number"
                step="0.01"
                value={formData.quarterly_goal || ''}
                onChange={(e) => setFormData({...formData, quarterly_goal: parseFloat(e.target.value) || undefined})}
                placeholder="e.g., 2.00"
              />
            </div>

            <div>
              <Label htmlFor="annual_goal">Annual Goal</Label>
              <Input
                id="annual_goal"
                type="number"
                step="0.01"
                value={formData.annual_goal || ''}
                onChange={(e) => setFormData({...formData, annual_goal: parseFloat(e.target.value) || undefined})}
                placeholder="e.g., 2.00"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        {/* Display Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-medium">Display Settings</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="display_format">Format</Label>
              <Select 
                value={formData.display_format || 'number'} 
                onValueChange={(value) => setFormData({...formData, display_format: value as 'number' | 'currency' | 'percentage'})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency ($)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="decimal_places">Decimal Places</Label>
              <Input
                id="decimal_places"
                type="number"
                min="0"
                max="4"
                value={formData.decimal_places || 2}
                onChange={(e) => setFormData({...formData, decimal_places: parseInt(e.target.value) || 2})}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !formData.name || !formData.meta_metric_name}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Add Metric
        </Button>
      </div>
    </form>
  );
} 