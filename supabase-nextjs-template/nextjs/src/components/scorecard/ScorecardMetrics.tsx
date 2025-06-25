'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  SelectValue
} from '@/components/ui';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { 
  PREDEFINED_METRICS, 
  ScorecardMetric, 
  MetricWithData,
  DateRange,
  formatMetricValue,
  getMetricStatus
} from '@/lib/types/scorecard';
import MetricChartModal from './MetricChartModal';

interface ScorecardMetricsProps {
  brandId: string;
  teamId?: string;
}

export default function ScorecardMetrics({ brandId, teamId }: ScorecardMetricsProps) {
  const [metrics, setMetrics] = useState<ScorecardMetric[]>([]);
  const [metricsData, setMetricsData] = useState<Record<string, MetricWithData['data']>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('last_13_weeks');
  const [timePeriod, setTimePeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState<ScorecardMetric | null>(null);
  const [showChartModal, setShowChartModal] = useState(false);

  // Calculate date ranges
  const getDateRanges = useCallback((): DateRange[] => {
    const now = new Date();
    const ranges: DateRange[] = [];
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
      default: return 13;
    }
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

  // Initialize metrics from predefined list
  const initializeMetrics = async () => {
    try {
      console.log('[Scorecard] Initializing metrics');
      
      // For now, use the predefined metrics directly
      // In a real implementation, we'd fetch from the database
      const predefinedMetrics: ScorecardMetric[] = PREDEFINED_METRICS.map((metric, index) => ({
        ...metric,
        id: `metric-${index}`,
        brand_id: brandId,
        team_id: teamId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      setMetrics(predefinedMetrics);
      setLoading(false);
    } catch (error) {
      console.error('[Scorecard] Error initializing metrics:', error);
      setLoading(false);
    }
  };

  // Fetch metrics data
  const fetchMetricsData = async () => {
    try {
      const dateRanges = getDateRanges();
      console.log(`[Scorecard] Fetching data for ${metrics.length} metrics and ${dateRanges.length} periods`);
      
      // Get data from scorecard_data table
      const response = await fetch(`/api/scorecard/data?brandId=${brandId}${teamId ? `&teamId=${teamId}` : ''}`);
      
      if (response.ok) {
        const { data } = await response.json();
        
        // Process data into the format we need
        const processedData: Record<string, MetricWithData['data']> = {};
        
                 metrics.forEach(metric => {
          const metricData = data.filter((d: { metric_id: string; value: number; period_start: string; period_end: string }) => d.metric_id === metric.id);
          
          if (metricData.length > 0) {
            // Calculate current (most recent period)
            const current = metricData[0]?.value || 0;
            
            // Calculate average
            const average = metricData.reduce((sum: number, d: { value: number }) => sum + d.value, 0) / metricData.length;
            
            // Calculate trend
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (metricData.length >= 2) {
              const previous = metricData[1]?.value || 0;
              if (current > previous * 1.05) trend = 'up';
              else if (current < previous * 0.95) trend = 'down';
            }
            
            // Map periods
            const periods = dateRanges.map(range => {
              const periodData = metricData.find((d: { period_start: string; period_end: string; value: number }) => 
                d.period_start === range.start.toISOString().split('T')[0] &&
                d.period_end === range.end.toISOString().split('T')[0]
              );
              
              return {
                period: range.label,
                value: periodData?.value || 0
              };
            });
            
            processedData[metric.id] = {
              current,
              average,
              trend,
              periods
            };
          }
        });
        
        setMetricsData(processedData);
      }
    } catch (error) {
      console.error('[Scorecard] Error fetching metrics data:', error);
    }
  };

  // Refresh data from Meta
  const handleRefreshData = async () => {
    if (metrics.length === 0) return;
    
    setRefreshing(true);
    console.log('[Scorecard] Starting data refresh');
    
    try {
      const dateRanges = getDateRanges();
      
      const response = await fetch('/api/scorecard/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          teamId,
          dateRanges: dateRanges.map(range => ({
            start: range.start,
            end: range.end,
            label: range.label
          }))
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('[Scorecard] Refresh completed:', result.summary);
        
        // Refetch metrics data
        await fetchMetricsData();
      } else {
        const data = await response.json();
        console.error('[Scorecard] Failed to refresh data:', data.error);
      }
    } catch (error) {
      console.error('[Scorecard] Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };



  useEffect(() => {
    initializeMetrics();
  }, [brandId, teamId]);

  useEffect(() => {
    if (metrics.length > 0) {
      fetchMetricsData();
    }
  }, [metrics, selectedDateRange, timePeriod, currentWeekOffset]);

  const dateRanges = getDateRanges();
  const visibleDateRanges = dateRanges.slice(0, 5); // Show 5 periods at a time

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Scorecard Metrics</h2>
          <p className="text-gray-600">Track your key performance indicators</p>
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
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Showing: {visibleDateRanges[0]?.label} - {visibleDateRanges[visibleDateRanges.length - 1]?.label}</span>
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
        <div className="overflow-hidden">
          {/* Scrollable container */}
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white border-b">
                <div className="grid grid-cols-[50px_250px_100px_100px_100px_1fr_100px] gap-4 px-4 py-3 bg-gray-50 font-medium text-sm text-gray-600">
                  <div>Status</div>
                  <div>Metric</div>
                  <div className="text-right">Current</div>
                  <div className="text-right">Average</div>
                  <div className="text-right">Goal</div>
                  <div className="flex items-center justify-between px-4">
                    <button
                      onClick={() => setCurrentWeekOffset(Math.min(currentWeekOffset + 1, dateRanges.length - 5))}
                      className="p-1 hover:bg-gray-200 rounded"
                      disabled={currentWeekOffset >= dateRanges.length - 5}
                      aria-label="Previous weeks"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex-1 grid grid-cols-5 gap-4">
                      {visibleDateRanges.map((range, index) => (
                        <div key={index} className="text-center text-xs">
                          {range.label}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentWeekOffset(Math.max(0, currentWeekOffset - 1))}
                      className="p-1 hover:bg-gray-200 rounded"
                      disabled={currentWeekOffset === 0}
                      aria-label="Next weeks"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-center">Actions</div>
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y">
                {metrics.map((metric) => {
                  const data = metricsData[metric.id];
                  const status = getMetricStatus(data?.current || 0, metric.goal_value, metric.goal_operator);
                  
                  return (
                    <div key={metric.id} className="grid grid-cols-[50px_250px_100px_100px_100px_1fr_100px] gap-4 px-4 py-3 hover:bg-gray-50">
                      {/* Status */}
                      <div className="flex items-center justify-center">
                        <div className={`w-3 h-3 rounded-full ${
                          status === 'on-track' ? 'bg-green-500' :
                          status === 'at-risk' ? 'bg-yellow-500' :
                          status === 'off-track' ? 'bg-red-500' :
                          'bg-gray-300'
                        }`} />
                      </div>
                      
                      {/* Metric Name */}
                      <div>
                        <div className="font-medium text-gray-900">{metric.display_name}</div>
                        <div className="text-xs text-gray-500">{metric.description}</div>
                      </div>
                      
                      {/* Current */}
                      <div className="text-right font-medium">
                        {formatMetricValue(data?.current, metric)}
                      </div>
                      
                      {/* Average */}
                      <div className="text-right text-gray-600">
                        {formatMetricValue(data?.average, metric)}
                      </div>
                      
                      {/* Goal */}
                      <div className="text-right">
                        {metric.goal_value ? (
                          <span className={`font-medium ${
                            status === 'on-track' ? 'text-green-600' :
                            status === 'at-risk' ? 'text-yellow-600' :
                            status === 'off-track' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {formatMetricValue(metric.goal_value, metric)}
                          </span>
                        ) : (
                          <span className="text-gray-400">--</span>
                        )}
                      </div>
                      
                      {/* Period Values */}
                      <div className="grid grid-cols-5 gap-4 px-4">
                        {visibleDateRanges.map((range, index) => {
                          const periodData = data?.periods.find(p => p.period === range.label);
                          return (
                            <div key={index} className="text-right text-sm">
                              {periodData ? formatMetricValue(periodData.value, metric) : '--'}
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMetric(metric);
                            setShowChartModal(true);
                          }}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No metrics configured</h3>
          <p className="mt-1 text-sm text-gray-500">Metrics will be automatically created when you refresh data.</p>
          <div className="mt-6">
            <Button onClick={handleRefreshData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Initialize Metrics
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


    </div>
  );
}