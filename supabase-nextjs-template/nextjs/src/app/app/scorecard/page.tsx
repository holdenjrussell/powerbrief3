'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription
} from '@/components/ui';
import { 
  Plus, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Settings,
  Info
} from 'lucide-react';
// import { useAuth } from '@/hooks/useAuth';
import { 
  MetricWithData, 
  TimePeriod, 
  MetricStatus, 
  ScorecardViewOptions 
} from '@/lib/types/scorecard';
import AddMetricModal from '@/components/scorecard/AddMetricModal';
import ConfigureMetricModal from '@/components/scorecard/ConfigureMetricModal';
// import CustomMetricModal from '@/components/scorecard/CustomMetricModal';
// import MetricChartModal from '@/components/scorecard/MetricChartModal';

const MOCK_DATA: MetricWithData[] = [
  {
    id: '1',
    user_id: 'user1',
    name: 'Channel Spend',
    type: 'meta_api',
    meta_metric_name: 'spend',
    requires_configuration: true,
    is_default_metric: true,
    campaign_name_filters: undefined, // Not configured yet
    weekly_goal: 10000,
    monthly_goal: 40000,
    quarterly_goal: 120000,
    annual_goal: 480000,
    status_calculation_method: 'average_based',
    display_format: 'currency',
    decimal_places: 2,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    current_value: 8500,
    average_value: 9200,
    status: 'at_risk',
    goal_for_period: 10000,
    data_points: []
  },
  {
    id: '2',
    user_id: 'user1',
    name: 'Website Purchase ROAS',
    type: 'meta_api',
    meta_metric_name: 'website_purchase_roas',
    requires_configuration: true,
    is_default_metric: true,
    campaign_name_filters: undefined, // Not configured yet
    weekly_goal: 2,
    monthly_goal: 2,
    quarterly_goal: 2,
    annual_goal: 2,
    status_calculation_method: 'average_based',
    display_format: 'number',
    decimal_places: 2,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    current_value: 1.63,
    average_value: 1.59,
    status: 'off_track',
    goal_for_period: 2,
    data_points: []
  },
  {
    id: '3',
    user_id: 'user1',
    name: 'Prospecting ROAS',
    type: 'meta_api',
    meta_metric_name: 'website_purchase_roas',
    requires_configuration: false, // Already configured
    is_default_metric: true,
    campaign_name_filters: [
      { operator: 'contains', value: 'prospecting', case_sensitive: false }
    ],
    weekly_goal: 1.80,
    monthly_goal: 1.80,
    quarterly_goal: 1.80,
    annual_goal: 1.80,
    status_calculation_method: 'average_based',
    display_format: 'number',
    decimal_places: 2,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    current_value: 1.59,
    average_value: 1.56,
    status: 'off_track',
    goal_for_period: 1.80,
    data_points: []
  },
  {
    id: '4',
    user_id: 'user1',
    name: 'Retargeting ROAS',
    type: 'meta_api',
    meta_metric_name: 'website_purchase_roas',
    requires_configuration: false, // Already configured
    is_default_metric: true,
    campaign_name_filters: [
      { operator: 'contains', value: 'retargeting', case_sensitive: false }
    ],
    weekly_goal: 2.5,
    monthly_goal: 2.5,
    quarterly_goal: 2.5,
    annual_goal: 2.5,
    status_calculation_method: 'average_based',
    display_format: 'number',
    decimal_places: 2,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    current_value: 2.76,
    average_value: 2.73,
    status: 'on_track',
    goal_for_period: 2.5,
    data_points: []
  },
  {
    id: '5',
    user_id: 'user1',
    name: 'CTR (Link Clicks)',
    type: 'meta_api',
    meta_metric_name: 'ctr',
    requires_configuration: true,
    is_default_metric: true,
    campaign_name_filters: undefined, // Not configured yet
    weekly_goal: 1.25,
    monthly_goal: 1.25,
    quarterly_goal: 1.25,
    annual_goal: 1.25,
    status_calculation_method: 'average_based',
    display_format: 'percentage',
    decimal_places: 2,
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    current_value: 1.36,
    average_value: 1.42,
    status: 'on_track',
    goal_for_period: 1.25,
    data_points: []
  }
];

export default function ScorecardPage() {
  // const { user } = useAuth();
  const [metrics, setMetrics] = useState<MetricWithData[]>(MOCK_DATA);
  const [viewOptions, setViewOptions] = useState<ScorecardViewOptions>({
    time_period: 'weekly',
    show_goals: true,
    sort_by: 'name'
  });
  const [selectedDateRange, setSelectedDateRange] = useState('last_13_weeks');
  const [selectedPeriods, setSelectedPeriods] = useState('1_week');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [isAddMetricOpen, setIsAddMetricOpen] = useState(false);
  const [configureMetric, setConfigureMetric] = useState<MetricWithData | null>(null);
  // const [isCustomMetricOpen, setIsCustomMetricOpen] = useState(false);
  // const [selectedMetricForChart, setSelectedMetricForChart] = useState<MetricWithData | null>(null);

  // Check if any metrics require configuration
  const hasUnconfiguredMetrics = metrics.some(m => m.requires_configuration && !m.campaign_name_filters?.length);

  const getStatusIcon = (status: MetricStatus) => {
    switch (status) {
      case 'on_track':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'at_risk':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'off_track':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const formatValue = (value: number, format: string, decimals: number) => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
      case 'percentage':
        return `${value.toFixed(decimals)}%`;
      default:
        return value.toFixed(decimals);
    }
  };

  // Calculate the number of periods to show based on selected date range
  const getNumberOfPeriods = () => {
    switch (selectedDateRange) {
      case 'last_4_weeks': return 4;
      case 'last_13_weeks': return 13;
      case 'last_26_weeks': return 26;
      case 'last_52_weeks': return 52;
      default: return 13;
    }
  };

  const getDateRangesForPeriod = () => {
    const now = new Date();
    const ranges = [];
    const numberOfPeriods = getNumberOfPeriods();
    
    switch (viewOptions.time_period) {
      case 'weekly':
        // Get the start of the current week (Sunday)
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay());
        currentWeekStart.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < numberOfPeriods; i++) {
          const weekOffset = i + currentWeekOffset;
          const startDate = new Date(currentWeekStart);
          startDate.setDate(currentWeekStart.getDate() - (weekOffset * 7));
          const endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          
          ranges.push({
            start: startDate,
            end: endDate,
            label: `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          });
        }
        break;
        
      case 'monthly':
        for (let i = 0; i < Math.min(numberOfPeriods / 4, 12); i++) {
          const monthOffset = i + currentWeekOffset;
          const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
          const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          ranges.push({
            start: date,
            end: endDate,
            label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          });
        }
        break;
        
      case 'quarterly':
        for (let i = 0; i < Math.min(numberOfPeriods / 13, 4); i++) {
          const quarterOffset = i + currentWeekOffset;
          const quarterStartMonth = Math.floor((now.getMonth()) / 3) * 3 - (quarterOffset * 3);
          const startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
          const endDate = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
          const quarter = Math.floor(quarterStartMonth / 3) + 1;
          ranges.push({
            start: startDate,
            end: endDate,
            label: `Q${quarter > 0 ? quarter : quarter + 4} ${startDate.getFullYear()}`
          });
        }
        break;
        
      case 'annual':
        for (let i = 0; i < Math.min(numberOfPeriods / 52, 4); i++) {
          const year = now.getFullYear() - i - currentWeekOffset;
          const startDate = new Date(year, 0, 1);
          const endDate = new Date(year, 11, 31);
          ranges.push({
            start: startDate,
            end: endDate,
            label: year.toString()
          });
        }
        break;
    }
    
    return ranges;
  };

  const dateRanges = getDateRangesForPeriod();

  const getCurrentPeriodInfo = () => {
    const now = new Date();
    switch (viewOptions.time_period) {
      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return {
          label: 'Current Week',
          range: `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`
        };
      case 'monthly':
        return {
          label: 'Current Month',
          range: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        };
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        return {
          label: 'Current Quarter',
          range: `Q${quarter} ${now.getFullYear()}`
        };
      case 'annual':
        return {
          label: 'Current Year',
          range: now.getFullYear().toString()
        };
    }
  };

  const currentPeriodInfo = getCurrentPeriodInfo();

  return (
    <div className="p-6 space-y-6">
      {/* Development Warning */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription>
          <span className="font-medium text-orange-800">⚠️ This page is not functional yet.</span>
          <span className="text-orange-700 ml-1">Data displayed is not live and this feature is currently in development.</span>
        </AlertDescription>
      </Alert>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Scorecard</h1>
          <p className="text-gray-600">Track your key metrics and performance goals</p>
        </div>
      </div>

      {/* Configuration Alert */}
      {hasUnconfiguredMetrics && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <span className="font-medium text-yellow-800">Some metrics need configuration.</span>
            <span className="text-yellow-700 ml-1">Click the settings icon next to each metric to customize campaign filters and goals.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* View Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Tabs 
                value={viewOptions.time_period} 
                onValueChange={(value) => {
                  setViewOptions({...viewOptions, time_period: value as TimePeriod});
                  setCurrentWeekOffset(0); // Reset offset when changing time period
                }}
              >
                <TabsList>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                  <TabsTrigger value="annual">Annual</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Date Range Selector */}
              <Select 
                value={selectedDateRange} 
                onValueChange={(value) => {
                  setSelectedDateRange(value);
                  setCurrentWeekOffset(0); // Reset offset when changing date range
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
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>

              {/* Periods Selector */}
              <Select value={selectedPeriods} onValueChange={setSelectedPeriods}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Periods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1_week">1-week</SelectItem>
                  <SelectItem value="2_week">2-week</SelectItem>
                  <SelectItem value="4_week">4-week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{currentPeriodInfo.label}: {currentPeriodInfo.range}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Last updated: 2 hours ago</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meta Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Meta</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsAddMetricOpen(true)}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Metric
            </Button>
          </div>
        </div>

        {/* Metrics Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-lg font-medium text-sm text-gray-600">
          <div className="col-span-1"></div>
          <div className="col-span-2">Title</div>
          <div className="col-span-1">Goal</div>
          <div className="col-span-1">Average</div>
          <div className="col-span-7">
            <div className="flex items-center">
              <button
                onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
                className="p-1 hover:bg-gray-200 rounded mr-2 flex-shrink-0"
                aria-label="View previous periods"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {/* Scrollable date ranges container */}
              <div className="flex-1 overflow-x-auto">
                <div className="flex gap-4 min-w-max px-2">
                  {dateRanges.map((range, index) => (
                    <div key={index} className="text-center min-w-[120px]">
                      <span className="text-xs whitespace-nowrap">
                        {range.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <button
                onClick={() => setCurrentWeekOffset(Math.max(currentWeekOffset - 1, 0))}
                className="p-1 hover:bg-gray-200 rounded ml-2 flex-shrink-0"
                aria-label="View next periods"
                disabled={currentWeekOffset === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Metrics List */}
        {metrics.map((metric) => (
          <Card key={metric.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Status Icon */}
                <div className="col-span-1 flex justify-center gap-2">
                  <button 
                    onClick={() => {}}
                    className="p-1 hover:bg-gray-100 rounded"
                    aria-label={`View details for ${metric.name}`}
                  >
                    {getStatusIcon(metric.status)}
                  </button>
                  {metric.requires_configuration && !metric.campaign_name_filters?.length && (
                    <button
                      onClick={() => setConfigureMetric(metric)}
                      className="p-1 hover:bg-gray-100 rounded text-yellow-600"
                      aria-label={`Configure ${metric.name}`}
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Title and Owner */}
                <div className="col-span-2">
                  <div className="font-medium text-gray-900">{metric.name}</div>
                  <div className="text-sm text-gray-500">
                    {metric.requires_configuration && !metric.campaign_name_filters?.length ? (
                      <span className="text-yellow-600">Needs configuration</span>
                    ) : (
                      'System'
                    )}
                  </div>
                </div>

                {/* Goal */}
                <div className="col-span-1">
                  <div className="text-sm text-gray-600">
                    {metric.weekly_goal ? `>= ${formatValue(metric.weekly_goal, metric.display_format, metric.decimal_places)}` : 'No goal set'}
                  </div>
                </div>

                {/* Average */}
                <div className="col-span-1">
                  <div className="font-medium">
                    {metric.average_value ? formatValue(metric.average_value, metric.display_format, metric.decimal_places) : '--'}
                  </div>
                </div>

                {/* Period Data - Scrollable */}
                <div className="col-span-7">
                  <div className="overflow-x-auto">
                    <div className="flex gap-4 min-w-max px-2">
                      {dateRanges.map((_, index) => (
                        <div key={index} className="text-center min-w-[120px]">
                          <div className={`font-medium ${
                            index === 0 && metric.status === 'on_track' ? 'text-green-600' : 
                            index === 0 && metric.status === 'at_risk' ? 'text-yellow-600' : 
                            index === 0 && metric.status === 'off_track' ? 'text-red-600' : 
                            'text-gray-600'
                          }`}>
                            {/* Mock data - in real implementation this would come from metric.data_points */}
                            {index === 0 && metric.current_value ? 
                              formatValue(metric.current_value, metric.display_format, metric.decimal_places) : 
                              '--'
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {metrics.length === 0 && (
        <Card className="p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No metrics yet</h3>
          <p className="text-gray-600 mb-4">Start tracking your performance by adding metrics from Meta Insights API</p>
          <Button onClick={() => setIsAddMetricOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Metric
          </Button>
        </Card>
      )}

      {/* Add Metric Modal */}
      {isAddMetricOpen && (
        <Dialog open={isAddMetricOpen} onOpenChange={setIsAddMetricOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Metric</DialogTitle>
            </DialogHeader>
            <AddMetricModal 
              onClose={() => setIsAddMetricOpen(false)}
              onMetricAdded={(metric) => {
                setMetrics(prev => [...prev, { ...metric, status: 'off_track', data_points: [] } as MetricWithData]);
                setIsAddMetricOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Configure Metric Modal */}
      {configureMetric && (
        <ConfigureMetricModal
          metric={configureMetric}
          onClose={() => setConfigureMetric(null)}
          onSave={(updatedMetric) => {
            setMetrics(prev => prev.map(m => m.id === updatedMetric.id ? updatedMetric : m));
            setConfigureMetric(null);
          }}
        />
      )}
    </div>
  );
} 