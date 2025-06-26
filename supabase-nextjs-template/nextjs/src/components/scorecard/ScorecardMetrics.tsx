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
  RefreshCw,
  BarChart3,
  Target,
  Info,
  AlertCircle
} from 'lucide-react';
import { 
  ScorecardMetric, 
  MetricWithData,
  DateRange,
  formatMetricValue,
  getMetricStatus
} from '@/lib/types/scorecard';
import MetricChartModal from './MetricChartModal';
import CreateIssueModal from './CreateIssueModal';

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
  const [selectedMetric, setSelectedMetric] = useState<ScorecardMetric | null>(null);
  const [showChartModal, setShowChartModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [goalValue, setGoalValue] = useState<string>('');
  const [goalOperator, setGoalOperator] = useState<'gte' | 'lte'>('gte');

  const [issueModalMetric, setIssueModalMetric] = useState<ScorecardMetric | null>(null);

  // Calculate date ranges for display
  const getDateRanges = useCallback((): DateRange[] => {
    const now = new Date();
    const ranges: DateRange[] = [];
    
    switch (timePeriod) {
      case 'weekly':
        const numberOfPeriods = getNumberOfPeriods();
        for (let i = 0; i < numberOfPeriods; i++) {
          // Calculate the most recent completed Sunday (not current week)
          const mostRecentSunday = new Date(now);
          mostRecentSunday.setDate(now.getDate() - now.getDay());
          
          // If today is Sunday and it's early in the day, consider last week as the most recent complete week
          // Otherwise, if we're in the middle of a week, use last Sunday as the start of the incomplete week
          const isCurrentWeekComplete = now.getDay() === 0 && now.getHours() >= 23; // Sunday late in the day
          const weekOffset = isCurrentWeekComplete ? i : i + 1; // Skip current incomplete week
          
          // Go back 'weekOffset' weeks from the most recent Sunday
          const startDate = new Date(mostRecentSunday);
          startDate.setDate(mostRecentSunday.getDate() - (weekOffset * 7));
          
          // End date is 6 days after start date (Saturday)
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          
          ranges.push({
            start: startDate,
            end: endDate,
            label: formatDateRangeLabel(startDate, endDate, timePeriod)
          });
        }
        break;
        
      case 'monthly':
        // For monthly: This Month, Quarter to Date, Year to Date, Last Year, This Year to Date
        if (selectedDateRange === 'this_month') {
          const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          ranges.push({
            start: startDate,
            end: endDate,
            label: 'This Month'
          });
        } else if (selectedDateRange === 'quarter_to_date') {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
          const endDate = new Date(now);
          ranges.push({
            start: startDate,
            end: endDate,
            label: 'Quarter to Date'
          });
        } else if (selectedDateRange === 'year_to_date') {
          const startDate = new Date(now.getFullYear(), 0, 1);
          const endDate = new Date(now);
          ranges.push({
            start: startDate,
            end: endDate,
            label: 'Year to Date'
          });
        } else if (selectedDateRange === 'last_year') {
          const startDate = new Date(now.getFullYear() - 1, 0, 1);
          const endDate = new Date(now.getFullYear() - 1, 11, 31);
          ranges.push({
            start: startDate,
            end: endDate,
            label: 'Last Year'
          });
        } else if (selectedDateRange === 'this_year_to_date') {
          // Monthly breakdown for this year to date
          for (let month = 0; month <= now.getMonth(); month++) {
            const startDate = new Date(now.getFullYear(), month, 1);
            const endDate = new Date(now.getFullYear(), month + 1, 0);
            ranges.push({
              start: startDate,
              end: endDate,
              label: startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            });
          }
        }
        break;
        
      case 'quarterly':
        // For quarterly: Quarter to Date, Year to Date, Last Year, This Year to Date
        if (selectedDateRange === 'quarter_to_date') {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          const startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
          const endDate = new Date(now);
          ranges.push({
            start: startDate,
            end: endDate,
            label: 'Q' + (currentQuarter + 1) + ' to Date'
          });
        } else if (selectedDateRange === 'year_to_date') {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          for (let q = 0; q <= currentQuarter; q++) {
            const startDate = new Date(now.getFullYear(), q * 3, 1);
            const endDate = new Date(now.getFullYear(), (q + 1) * 3, 0);
            ranges.push({
              start: startDate,
              end: endDate,
              label: `Q${q + 1} ${now.getFullYear()}`
            });
          }
        } else if (selectedDateRange === 'last_year') {
          for (let q = 0; q < 4; q++) {
            const startDate = new Date(now.getFullYear() - 1, q * 3, 1);
            const endDate = new Date(now.getFullYear() - 1, (q + 1) * 3, 0);
            ranges.push({
              start: startDate,
              end: endDate,
              label: `Q${q + 1} ${now.getFullYear() - 1}`
            });
          }
        } else if (selectedDateRange === 'this_year_to_date') {
          const currentQuarter = Math.floor(now.getMonth() / 3);
          for (let q = 0; q <= currentQuarter; q++) {
            const startDate = new Date(now.getFullYear(), q * 3, 1);
            const endDate = new Date(now.getFullYear(), (q + 1) * 3, 0);
            ranges.push({
              start: startDate,
              end: endDate,
              label: `Q${q + 1} ${now.getFullYear()}`
            });
          }
        }
        break;
    }
    
    // Reverse to show most recent first for weekly, but keep chronological for monthly/quarterly
    return timePeriod === 'weekly' ? ranges : ranges;
  }, [timePeriod, selectedDateRange]);

  // Get date ranges for data fetching (always 52 weeks)
  const getDataFetchRanges = useCallback((): DateRange[] => {
    const now = new Date();
    const ranges: DateRange[] = [];
    
    // Always fetch 52 weeks of data
    for (let i = 0; i < 52; i++) {
      const mostRecentSunday = new Date(now);
      mostRecentSunday.setDate(now.getDate() - now.getDay());
      
      const isCurrentWeekComplete = now.getDay() === 0 && now.getHours() >= 23;
      const weekOffset = isCurrentWeekComplete ? i : i + 1;
      
      const startDate = new Date(mostRecentSunday);
      startDate.setDate(mostRecentSunday.getDate() - (weekOffset * 7));
      
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      
      ranges.push({
        start: startDate,
        end: endDate,
        label: formatDateRangeLabel(startDate, endDate, 'weekly')
      });
    }
    
    return ranges;
  }, []);

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
      
      // Fetch metrics from the database
      const response = await fetch(`/api/scorecard/metrics?brandId=${brandId}${teamId ? `&teamId=${teamId}` : ''}`);
      
      if (response.ok) {
        const { metrics: dbMetrics } = await response.json();
        
        if (dbMetrics && dbMetrics.length > 0) {
          console.log(`[Scorecard] Loaded ${dbMetrics.length} metrics from database`);
          // Ensure unique metrics by metric_key
          const uniqueMetrics = dbMetrics.reduce((acc: ScorecardMetric[], metric: ScorecardMetric) => {
            if (!acc.find(m => m.metric_key === metric.metric_key)) {
              acc.push(metric);
            }
            return acc;
          }, []);
          setMetrics(uniqueMetrics);
        } else {
          console.log('[Scorecard] No metrics found in database');
          setMetrics([]);
        }
      } else {
        console.error('[Scorecard] Failed to fetch metrics');
        setMetrics([]);
      }
      
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
        
        console.log('[Scorecard] Processing data:', data);
        
                 metrics.forEach(metric => {
          // Filter data for this specific metric
          const metricData = data.filter((d: { scorecard_metrics?: { id: string }; metric_id?: string; period_start: string; period_end: string; value: string | number }) => {
            // Handle both nested structure and direct metric_id
            const metricId = d.scorecard_metrics?.id || d.metric_id;
            return metricId === metric.id;
          }).sort((a: { period_start: string }, b: { period_start: string }) => {
            // Sort by period_start descending (most recent first)
            return new Date(b.period_start).getTime() - new Date(a.period_start).getTime();
          });
          
          console.log(`[Scorecard] Found ${metricData.length} data points for metric ${metric.metric_key}`);
          
          if (metricData.length > 0) {
            // Calculate current (most recent period)
            const current = parseFloat(metricData[0]?.value.toString()) || 0;
            
            // Calculate average
            const average = metricData.reduce((sum: number, d: { value: string | number }) => sum + parseFloat(d.value.toString() || '0'), 0) / metricData.length;
            
            // Calculate trend
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (metricData.length >= 2) {
              const previous = parseFloat(metricData[1]?.value.toString()) || 0;
              if (current > previous * 1.05) trend = 'up';
              else if (current < previous * 0.95) trend = 'down';
            }
            
            // Map periods
            const periods = dateRanges.map(range => {
              const periodData = metricData.find((d: { period_start: string; period_end: string; value: string | number }) => 
                d.period_start === range.start.toISOString().split('T')[0] &&
                d.period_end === range.end.toISOString().split('T')[0]
              );
              
              return {
                period: range.label,
                value: periodData ? parseFloat(periodData.value.toString() || '0') : 0
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
        
        console.log('[Scorecard] Processed data:', processedData);
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
      // Always fetch 52 weeks of data
      const dataFetchRanges = getDataFetchRanges();
      
      const response = await fetch('/api/scorecard/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          teamId,
          dateRanges: dataFetchRanges.map(range => ({
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

  // Update metric goal
  const updateMetricGoal = async (metricId: string, newGoalValue: number | null, operator: 'gte' | 'lte') => {
    try {
      // Build update object based on current time period
      const updateData: {
        id: string;
        weekly_goal_value?: number | null;
        weekly_goal_operator?: 'gte' | 'lte';
        monthly_goal_value?: number | null;
        monthly_goal_operator?: 'gte' | 'lte';
        quarterly_goal_value?: number | null;
        quarterly_goal_operator?: 'gte' | 'lte';
      } = { id: metricId };
      
      if (timePeriod === 'weekly') {
        updateData.weekly_goal_value = newGoalValue;
        updateData.weekly_goal_operator = operator;
      } else if (timePeriod === 'monthly') {
        updateData.monthly_goal_value = newGoalValue;
        updateData.monthly_goal_operator = operator;
      } else if (timePeriod === 'quarterly') {
        updateData.quarterly_goal_value = newGoalValue;
        updateData.quarterly_goal_operator = operator;
      }
      
      const response = await fetch('/api/scorecard/metrics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        // Update local state
        setMetrics(prevMetrics => 
          prevMetrics.map(metric => 
            metric.id === metricId 
              ? { ...metric, goal_value: newGoalValue, goal_operator: operator }
              : metric
          )
        );
        setEditingGoal(null);
        setGoalValue('');
        setGoalOperator('gte');
      } else {
        console.error('Failed to update goal');
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const handleGoalEdit = (metric: ScorecardMetric) => {
    setEditingGoal(metric.id);
    
    // Get goal value and operator based on current time period
    let value: number | undefined;
    let operator: 'gte' | 'lte' = 'gte';
    
    if (timePeriod === 'weekly') {
      value = metric.weekly_goal_value ?? metric.goal_value;
      operator = (metric.weekly_goal_operator ?? metric.goal_operator ?? 'gte') as 'gte' | 'lte';
    } else if (timePeriod === 'monthly') {
      value = metric.monthly_goal_value ?? metric.goal_value;
      operator = (metric.monthly_goal_operator ?? metric.goal_operator ?? 'gte') as 'gte' | 'lte';
    } else if (timePeriod === 'quarterly') {
      value = metric.quarterly_goal_value ?? metric.goal_value;
      operator = (metric.quarterly_goal_operator ?? metric.goal_operator ?? 'gte') as 'gte' | 'lte';
    }
    
    setGoalValue(value?.toString() || '');
    setGoalOperator(operator);
  };

  const handleGoalSave = (metricId: string) => {
    const numValue = parseFloat(goalValue);
    updateMetricGoal(metricId, isNaN(numValue) ? null : numValue, goalOperator);
  };

  const handleGoalCancel = () => {
    setEditingGoal(null);
    setGoalValue('');
    setGoalOperator('gte');
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'On Track';
      case 'at-risk':
        return 'At Risk';
      case 'off-track':
        return 'Off Track';
      default:
        return 'No Goal';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track':
        return 'text-green-700 bg-green-100';
      case 'at-risk':
        return 'text-yellow-700 bg-yellow-100';
      case 'off-track':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Open issue creation modal
  const openIssueModal = (metric: ScorecardMetric) => {
    setIssueModalMetric(metric);
  };

  // Handle successful issue creation
  const handleIssueCreated = () => {
    // You could refresh issues here or show a success message
    alert('Issue created successfully!');
  };



  // Sort metrics in the requested order
  const sortMetrics = (metrics: ScorecardMetric[]): ScorecardMetric[] => {
    const order = [
      'meta_account_revenue',        // Meta account Revenue
      'meta_account_roas',           // Meta account ROAS
      'meta_account_spend',          // Meta account spend
      'creative_testing_revenue',    // Creative testing revenue
      'creative_testing_roas',       // Creative testing ROAS
      'creative_testing_spend',      // Creative testing spend
      'click_through_rate',          // Click through Rate (link)
      'click_to_purchase_rate',      // Click to purchase rate
      'cost_per_unique_link_click'   // Cost per unique link click
    ];
    
    return [...metrics].sort((a, b) => {
      const aIndex = order.indexOf(a.metric_key);
      const bIndex = order.indexOf(b.metric_key);
      
      // If both are in the order list, sort by their position
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one is in the order list, it comes first
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // Otherwise, sort alphabetically
      return a.display_name.localeCompare(b.display_name);
    });
  };

  useEffect(() => {
    initializeMetrics();
  }, [brandId, teamId]);

  useEffect(() => {
    if (metrics.length > 0) {
      fetchMetricsData();
    }
  }, [metrics, selectedDateRange, timePeriod]);

  const dateRanges = getDateRanges();

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

      {/* Legend */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-2">Performance Status Legend</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-green-700 bg-green-100 text-xs font-medium">
                  On Track
                </span>
                <span className="text-gray-700">Meeting or exceeding your goal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-yellow-700 bg-yellow-100 text-xs font-medium">
                  At Risk
                </span>
                <span className="text-gray-700">Within 20% of your goal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-red-700 bg-red-100 text-xs font-medium">
                  Off Track
                </span>
                <span className="text-gray-700">More than 20% away from goal</span>
              </div>
            </div>
          </div>
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
                  // Reset date range when changing time period
                  if (value === 'weekly') {
                    setSelectedDateRange('last_13_weeks');
                  } else if (value === 'monthly') {
                    setSelectedDateRange('this_year_to_date');
                  } else if (value === 'quarterly') {
                    setSelectedDateRange('this_year_to_date');
                  }
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
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  {timePeriod === 'weekly' && (
                    <>
                      <SelectItem value="last_4_weeks">Last 4 Weeks</SelectItem>
                      <SelectItem value="last_13_weeks">Last 13 Weeks</SelectItem>
                      <SelectItem value="last_26_weeks">Last 26 Weeks</SelectItem>
                      <SelectItem value="last_52_weeks">Last 52 Weeks</SelectItem>
                    </>
                  )}
                  {timePeriod === 'monthly' && (
                    <>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="quarter_to_date">Quarter to Date</SelectItem>
                      <SelectItem value="year_to_date">Year to Date</SelectItem>
                      <SelectItem value="last_year">Last Year</SelectItem>
                      <SelectItem value="this_year_to_date">This Year to Date</SelectItem>
                    </>
                  )}
                  {timePeriod === 'quarterly' && (
                    <>
                      <SelectItem value="quarter_to_date">Quarter to Date</SelectItem>
                      <SelectItem value="year_to_date">Year to Date</SelectItem>
                      <SelectItem value="last_year">Last Year</SelectItem>
                      <SelectItem value="this_year_to_date">This Year to Date</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Showing: {dateRanges[0]?.label} - {dateRanges[dateRanges.length - 1]?.label}</span>
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
        <div className="relative">
          {/* Scrollable container */}
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white border-b">
                <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 font-medium text-sm text-gray-600">
                  <div className="w-20">Status</div>
                  <div className="w-12">Chart</div>
                  <div className="w-12">Issue</div>
                  <div className="w-64">Metric</div>
                  <div className="w-24 text-right">Current</div>
                  <div className="w-24 text-right">Average</div>
                  <div className="w-40 text-center">Goal</div>
                  <div className="flex-1">
                    <div className="flex gap-4">
                      {dateRanges.map((range, index) => (
                        <div key={index} className="w-24 text-center text-xs">
                          {range.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rows */}
              <div className="divide-y">
                {sortMetrics(metrics)
                  .filter((metric) => {
                    // Temporarily hide video and image ads ROAS metrics
                    return !metric.metric_key.includes('video_ads_roas') && 
                           !metric.metric_key.includes('image_ads_roas');
                  })
                  .map((metric) => {
                                      const data = metricsData[metric.id];
                  
                  // Get goal value and operator based on current time period
                  let goalValue = metric.goal_value;
                  let goalOperator = metric.goal_operator;
                  
                  if (timePeriod === 'weekly') {
                    goalValue = metric.weekly_goal_value ?? metric.goal_value;
                    goalOperator = metric.weekly_goal_operator ?? metric.goal_operator;
                  } else if (timePeriod === 'monthly') {
                    goalValue = metric.monthly_goal_value ?? metric.goal_value;
                    goalOperator = metric.monthly_goal_operator ?? metric.goal_operator;
                  } else if (timePeriod === 'quarterly') {
                    goalValue = metric.quarterly_goal_value ?? metric.goal_value;
                    goalOperator = metric.quarterly_goal_operator ?? metric.goal_operator;
                  }
                  
                  const status = getMetricStatus(data?.current || 0, goalValue, goalOperator);
                  
                  return (
                    <div key={metric.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                      {/* Status */}
                      <div className="w-20 flex justify-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </div>

                      {/* Chart Button */}
                      <div className="w-12 flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMetric(metric);
                            setShowChartModal(true);
                          }}
                          title="View Chart"
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Issue Button */}
                      <div className="w-12 flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openIssueModal(metric)}
                          title="Create Issue"
                          className={
                            status === 'off-track' ? 'text-red-600 hover:text-red-700' :
                            status === 'at-risk' ? 'text-yellow-600 hover:text-yellow-700' :
                            'text-gray-400 hover:text-gray-600'
                          }
                        >
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      </div>


                      
                      {/* Metric Name */}
                      <div className="w-64">
                        <div className="font-medium text-gray-900">{metric.display_name}</div>
                        <div className="text-xs text-gray-500">{metric.description}</div>
                      </div>
                      
                      {/* Current */}
                      <div className="w-24 text-right font-medium">
                        {formatMetricValue(data?.current, metric)}
                      </div>
                      
                      {/* Average */}
                      <div className="w-24 text-right text-gray-600">
                        {formatMetricValue(data?.average, metric)}
                      </div>
                      
                      {/* Goal */}
                      <div className="w-40 text-center">
                        {editingGoal === metric.id ? (
                          <div className="flex items-center gap-1 justify-center">
                            <select
                              value={goalOperator || 'gte'}
                              onChange={(e) => setGoalOperator(e.target.value as 'gte' | 'lte')}
                              className="text-xs border rounded px-1 py-1"
                              title="Goal comparison operator"
                            >
                              <option value="gte">≥</option>
                              <option value="lte">≤</option>
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              value={goalValue}
                              onChange={(e) => setGoalValue(e.target.value)}
                              className="w-16 px-1 py-1 text-xs border rounded text-center"
                              placeholder="Goal"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleGoalSave(metric.id);
                                } else if (e.key === 'Escape') {
                                  handleGoalCancel();
                                }
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGoalSave(metric.id)}
                              className="h-6 w-6 p-0"
                            >
                              ✓
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleGoalCancel}
                              className="h-6 w-6 p-0"
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                        {goalValue ? (
                              <span 
                                className={`font-medium cursor-pointer hover:bg-gray-100 px-2 py-1 rounded ${
                            status === 'on-track' ? 'text-green-600' :
                            status === 'at-risk' ? 'text-yellow-600' :
                            status === 'off-track' ? 'text-red-600' :
                            'text-gray-600'
                                }`}
                                onClick={() => handleGoalEdit(metric)}
                                title="Click to edit goal"
                              >
                                {goalOperator === 'lte' ? '≤ ' : '≥ '}
                            {formatMetricValue(goalValue, metric)}
                          </span>
                        ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGoalEdit(metric)}
                                className="h-6 text-xs text-gray-400 hover:text-gray-600"
                                title="Set goal"
                              >
                                <Target className="h-3 w-3 mr-1" />
                                Set Goal
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Period Values */}
                      <div className="flex-1">
                        <div className="flex gap-4">
                          {dateRanges.map((range, index) => {
                          const periodData = data?.periods.find(p => p.period === range.label);
                          return (
                              <div key={index} className="w-24 text-right text-sm">
                              {periodData ? formatMetricValue(periodData.value, metric) : '--'}
                            </div>
                          );
                        })}
                      </div>
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

      {issueModalMetric && (
        <CreateIssueModal
          open={!!issueModalMetric}
          onOpenChange={(open) => !open && setIssueModalMetric(null)}
          metric={issueModalMetric}
          data={metricsData[issueModalMetric.id]}
          brandId={brandId}
          teamId={teamId}
          onIssueCreated={handleIssueCreated}
        />
      )}
    </div>
  );
}