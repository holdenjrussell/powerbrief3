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
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription
} from '@/components/ui';
import { Loader2, AlertCircle } from 'lucide-react';
import { ScorecardMetric, MetricWithData, formatMetricValue, getMetricStatus } from '@/lib/types/scorecard';

interface CreateIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: ScorecardMetric;
  data: MetricWithData['data'];
  brandId: string;
  teamId?: string;
  onIssueCreated: () => void;
}

export default function CreateIssueModal({
  open,
  onOpenChange,
  metric,
  data,
  brandId,
  onIssueCreated
}: CreateIssueModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    additionalNotes: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  const status = getMetricStatus(data?.current || 0, metric.goal_value, metric.goal_operator);

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on-track': return 'On Track';
      case 'at-risk': return 'At Risk';
      case 'off-track': return 'Off Track';
      default: return 'No Goal';
    }
  };

  const getDefaultPriority = () => {
    switch (status) {
      case 'off-track': return 'high';
      case 'at-risk': return 'medium';
      default: return 'low';
    }
  };

  const getDefaultTitle = () => {
    return `${metric.display_name} - ${getStatusText(status)}`;
  };

  const getDefaultDescription = () => {
    return `## Metric Performance Alert

**Metric:** ${metric.display_name}
**Current Value:** ${formatMetricValue(data?.current, metric)}
**Goal:** ${metric.goal_operator === 'lte' ? '≤' : '≥'} ${formatMetricValue(metric.goal_value, metric)}
**Status:** ${getStatusText(status)}
**Average:** ${formatMetricValue(data?.average, metric)}
**Trend:** ${data?.trend || 'stable'}

### Recent Performance
${data?.periods?.slice(0, 5).map(p => `- ${p.period}: ${formatMetricValue(p.value, metric)}`).join('\n') || 'No recent data available'}

### Action Required
Please investigate the ${status === 'off-track' ? 'significant underperformance' : status === 'at-risk' ? 'declining performance' : 'performance'} of this metric and create an action plan.`;
  };

  // Initialize form data when modal opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        title: getDefaultTitle(),
        description: getDefaultDescription(),
        additionalNotes: '',
        priority: getDefaultPriority() as 'low' | 'medium' | 'high'
      });
      setError(null);
    }
  }, [open, metric, data, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Combine description and additional notes
      const fullDescription = formData.additionalNotes 
        ? `${formData.description}\n\n### Additional Notes\n${formData.additionalNotes}`
        : formData.description;

      const response = await fetch('/api/team-sync/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: brandId,
          title: formData.title,
          description: fullDescription,
          issue_type: 'short_term',
          priority_order: formData.priority === 'high' ? 1 : formData.priority === 'medium' ? 5 : 10,
          metadata: {
            metric_id: metric.id,
            metric_key: metric.metric_key,
            current_value: data?.current,
            goal_value: metric.goal_value,
            goal_operator: metric.goal_operator,
            status: status,
            source: 'scorecard'
          }
        })
      });

      if (response.ok) {
        onIssueCreated();
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create issue. Please try again.');
      }
    } catch (error) {
      console.error('Error creating issue:', error);
      setError('Error creating issue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Issue from Metric</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Metric Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Metric Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Metric:</span>
                <span className="ml-2 font-medium">{metric.display_name}</span>
              </div>
              <div>
                <span className="text-gray-600">Current Value:</span>
                <span className="ml-2 font-medium">{formatMetricValue(data?.current, metric)}</span>
              </div>
              <div>
                <span className="text-gray-600">Goal:</span>
                <span className="ml-2 font-medium">
                  {metric.goal_value 
                    ? `${metric.goal_operator === 'lte' ? '≤' : '≥'} ${formatMetricValue(metric.goal_value, metric)}`
                    : 'No goal set'
                  }
                </span>
              </div>
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                  status === 'on-track' ? 'text-green-700 bg-green-100' :
                  status === 'at-risk' ? 'text-yellow-700 bg-yellow-100' :
                  status === 'off-track' ? 'text-red-700 bg-red-100' :
                  'text-gray-600 bg-gray-100'
                }`}>
                  {getStatusText(status)}
                </span>
              </div>
            </div>
          </div>

          {/* Issue Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Issue Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter issue title"
                required
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as 'low' | 'medium' | 'high' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the issue..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <Label htmlFor="additionalNotes">Additional Notes</Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                placeholder="Add any additional context, action items, or notes..."
                rows={4}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Issue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 