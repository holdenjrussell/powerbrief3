'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Badge
} from '@/components/ui';
import { 
  Plus, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import MetricRow from './MetricRow';
import MetricChartModal from './MetricChartModal';
import MetricConfigModal from './MetricConfigModal';
import { fetchMetaInsights } from '@/lib/metaService';

export interface Metric {
  id: string;
  brand_id: string;
  team_id?: string;
  metric_key: string;
  display_name: string;
  goal_value?: number;
  goal_operator?: string;
  meta_campaigns?: string[];
  formula?: any[];
  created_at: string;
  updated_at: string;
}

interface ScorecardMetricsProps {
  brandId: string;
  teamId?: string;
}

export default function ScorecardMetrics({ brandId, teamId }: ScorecardMetricsProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [metricsData, setMetricsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('last_13_weeks');
  const [timePeriod, setTimePeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const [showChartModal, setShowChartModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);

  // Fetch metrics configuration
  const fetchMetrics = async () => {
    try {
      const params = new URLSearchParams({ brandId });
      if (teamId) {
        params.append('teamId', teamId);
      }
      
      const response = await fetch(`/api/scorecard/metrics?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setMetrics(data.metrics || []);
      } else {
        console.error('Failed to fetch metrics:', data.error);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate date ranges
  const getDateRanges = useCallback(() => {
    const now = new Date();
    const ranges = [];
    const numberOfPeriods = getNumberOfPeriods();
    
    for (let i = 0; i < numberOfPeriods; i++) {
      const offset = i + currentWeekOffset;
      let startDate: Date, endDate: Date;
      
      switch (timePeriod) {
        case 'weekly':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - (offset * 7) - now.getDay());
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
          break;
        case 'quarterly':
          const quarterOffset = Math.floor(now.getMonth() / 3) - offset;
          const quarterStartMonth = quarterOffset * 3;
          startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 3, 0);
          break;
      }
      
      ranges.push({
        start: startDate,
        end: endDate,
        label: formatDateRangeLabel(startDate, endDate, timePeriod)
      });
    }
    
    return ranges;
  }, [timePeriod, currentWeekOffset, selectedDateRange]);

  const getNumberOfPeriods = () => {
    switch (selectedDateRange) {
      case 'last_4_weeks': return 4;
      case 'last_13_weeks': return 13;
      case 'last_26_weeks': return 26;
      case 'last_52_weeks': return 52;
      case 'qtd': return getQuarterToDatePeriods();
      case 'ytd': return getYearToDatePeriods();
      default: return 13;
    }
  };

  const getQuarterToDatePeriods = () => {
    const now = new Date();
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1);
    const weeksSinceQuarterStart = Math.ceil((now.getTime() - quarterStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.min(weeksSinceQuarterStart, 13);
  };

  const getYearToDatePeriods = () => {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const weeksSinceYearStart = Math.ceil((now.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.min(weeksSinceYearStart, 52);
  };

  const formatDateRangeLabel = (start: Date, end: Date, period: string) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    
    switch (period) {
      case 'weekly':
        return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
      case 'monthly':
        return start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      case 'quarterly':
        const quarter = Math.floor(start.getMonth() / 3) + 1;
        return `Q${quarter} ${start.getFullYear()}`;
      default:
        return '';
    }
  };

  // Refresh data from Meta
  const handleRefreshData = async () => {
    if (metrics.length === 0) return;
    
    setRefreshing(true);
    
    try {
      const dateRanges = getDateRanges();
      const response = await fetch('/api/scorecard/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          teamId,
          dateRange: {
            start: dateRanges[dateRanges.length - 1].start.toISOString().split('T')[0],
            end: dateRanges[0].end.toISOString().split('T')[0]
          },
          metrics
        })
      });
      
      if (response.ok) {
        // Refetch metrics data
        await fetchMetricsData();
      } else {
        const data = await response.json();
        console.error('Failed to refresh data:', data.error);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch metrics data
  const fetchMetricsData = async () => {
    // Implementation to fetch actual metric values
    // This would call the meta-insights API for each metric and date range
    // For now, using mock data
    const mockData: Record<string, any> = {};
    
    metrics.forEach(metric => {
      mockData[metric.id] = {
        current: Math.random() * 10,
        average: Math.random() * 10,
        goal: metric.goal_value || 0,
        trend: Math.random() > 0.5 ? 'up' : 'down',
        periods: getDateRanges().map(() => ({
          value: Math.random() * 10
        }))
      };
    });
    
    setMetricsData(mockData);
  };

  // Save metric configuration
  const handleSaveMetric = async (metric: Partial<Metric>) => {
    try {
      const method = metric.id ? 'PUT' : 'POST';
      const response = await fetch('/api/scorecard/metrics', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...metric,
          brand_id: brandId,
          team_id: teamId
        })
      });
      
      if (response.ok) {
        await fetchMetrics();
        setShowConfigModal(false);
        setEditingMetric(null);
      } else {
        const data = await response.json();
        console.error('Failed to save metric:', data.error);
      }
    } catch (error) {
      console.error('Error saving metric:', error);
    }
  };

  // Delete metric
  const handleDeleteMetric = async (metricId: string) => {
    if (!confirm('Are you sure you want to delete this metric?')) return;
    
    try {
      const response = await fetch(`/api/scorecard/metrics?id=${metricId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchMetrics();
      } else {
        const data = await response.json();
        console.error('Failed to delete metric:', data.error);
      }
    } catch (error) {
      console.error('Error deleting metric:', error);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [brandId, teamId]);

  useEffect(() => {
    if (metrics.length > 0) {
      fetchMetricsData();
    }
  }, [metrics, selectedDateRange, timePeriod, currentWeekOffset]);

  const dateRanges = getDateRanges();
  const currentPeriodInfo = dateRanges[0] || { label: '' };

  return (
    <div className="space-y-6">
      {/* Development Warning - Remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <span className="font-medium text-orange-800">Development Mode:</span>
            <span className="text-orange-700 ml-1">Scorecard is using mock data. Connect Meta for live data.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Scorecard Metrics</h2>
          <p className="text-gray-600">Track your key performance indicators and goals</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshData}
            disabled={refreshing || metrics.length === 0}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button
            onClick={() => {
              setEditingMetric(null);
              setShowConfigModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Metric
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Tabs 
                value={timePeriod} 
                onValueChange={(value) => {
                  setTimePeriod(value as typeof timePeriod);
                  setCurrentWeekOffset(0);
                }}
              >
                <TabsList>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                </TabsList>
              </Tabs>

              <Select 
                value={selectedDateRange} 
                onValueChange={(value) => {
                  setSelectedDateRange(value);
                  setCurrentWeekOffset(0);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_4_weeks">Last 4 Weeks</SelectItem>
                  <SelectItem value="last_13_weeks">Last 13 Weeks</SelectItem>
                  <SelectItem value="last_26_weeks">Last 26 Weeks</SelectItem>
                  <SelectItem value="last_52_weeks">Last 52 Weeks</SelectItem>
                  <SelectItem value="qtd">Quarter to Date</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Current Period: {currentPeriodInfo.label}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading metrics...</div>
        </div>
      ) : metrics.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                {/* Table Header */}
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-sm text-gray-600 w-16">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-sm text-gray-600 min-w-[200px]">Metric</th>
                    <th className="text-left px-4 py-3 font-medium text-sm text-gray-600 w-20">Current</th>
                    <th className="text-left px-4 py-3 font-medium text-sm text-gray-600 w-20">Average</th>
                    <th className="text-left px-4 py-3 font-medium text-sm text-gray-600 w-20">Goal</th>
                    <th className="text-left px-4 py-3 font-medium text-sm text-gray-600 relative">
                      <div className="flex items-center min-w-max">
                        <button
                          onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
                          className="p-1 hover:bg-gray-200 rounded mr-2 flex-shrink-0"
                          disabled={currentWeekOffset >= getNumberOfPeriods() - dateRanges.length}
                          title="View earlier periods"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <div className="flex gap-4 min-w-max">
                          {dateRanges.map((range, index) => (
                            <div key={index} className="text-center min-w-[80px] text-xs">
                              {range.label}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setCurrentWeekOffset(Math.max(0, currentWeekOffset - 1))}
                          className="p-1 hover:bg-gray-200 rounded ml-2 flex-shrink-0"
                          disabled={currentWeekOffset === 0}
                          title="View later periods"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-sm text-gray-600 w-32">Actions</th>
                  </tr>
                </thead>
                
                {/* Table Body */}
                <tbody>
                  {metrics.map((metric, rowIndex) => (
                    <MetricRow
                      key={metric.id}
                      metric={metric}
                      data={metricsData[metric.id]}
                      dateRanges={dateRanges}
                      isLastRow={rowIndex === metrics.length - 1}
                      onEdit={() => {
                        setEditingMetric(metric);
                        setShowConfigModal(true);
                      }}
                      onDelete={() => handleDeleteMetric(metric.id)}
                      onViewChart={() => {
                        setSelectedMetric(metric);
                        setShowChartModal(true);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No metrics yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first metric.</p>
          <div className="mt-6">
            <Button
              onClick={() => {
                setEditingMetric(null);
                setShowConfigModal(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Metric
            </Button>
          </div>
        </div>
      )}

      {/* Metric Chart Modal */}
      {selectedMetric && (
        <MetricChartModal
          open={showChartModal}
          onOpenChange={setShowChartModal}
          metric={selectedMetric}
          data={metricsData[selectedMetric.id]}
          dateRanges={dateRanges}
        />
      )}

      {/* Metric Configuration Modal */}
      <MetricConfigModal
        open={showConfigModal}
        onOpenChange={setShowConfigModal}
        metric={editingMetric}
        onSave={handleSaveMetric}
      />
    </div>
  );
}