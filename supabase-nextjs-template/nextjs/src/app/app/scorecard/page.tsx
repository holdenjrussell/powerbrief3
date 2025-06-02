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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  Label,
  Input,
  Switch,
  Checkbox
} from '@/components/ui';
import { 
  Plus, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Trash2,
  BarChart3,
  Settings
} from 'lucide-react';
// import { useAuth } from '@/hooks/useAuth';
import { 
  CampaignFilter,
  AdSetFilter,
  AdFilter,
  TimePeriod,
  ScorecardViewOptions
} from '@/lib/types/scorecard';
import { fetchMetaInsights, FetchMetaInsightsResult } from '@/lib/metaService';
import { useScorecardBrandConfig } from '@/lib/hooks/useBrandConfig'; // Import the real hook
// import AddMetricModal from '@/components/scorecard/AddMetricModal';
// import ConfigureMetricModal from '@/components/scorecard/ConfigureMetricModal';
// import CustomMetricModal from '@/components/scorecard/CustomMetricModal';
// import MetricChartModal from '@/components/scorecard/MetricChartModal';

// Define new types for the scorecard metric configuration
export interface NewMetric {
  id: string; // or number, generated on save
  title: string;
  description?: string;
  periodInterval: TimePeriod; // weekly, monthly, quarterly, annual

  // Columns
  showTotal: boolean;
  showAverage: boolean;
  showGoal: boolean;

  // Goal
  goalUnit: 'number' | 'percentage' | 'currency' | 'yes/no' | 'time'; // currency was 'number' in image, clarifying
  goalOrientation: 'inside_min_max' | 'outside_min_max' | 'ge_goal' | 'gt_goal' | 'eq_goal' | 'lt_goal' | 'le_goal';
  goalValue: number | null;
  goalMinValue?: number | null; // For inside/outside min_max
  goalMaxValue?: number | null; // For inside/outside min_max

  // Trailing Calculation
  trailingCalculation: 'total' | 'average'; // Default Total

  // Data Source & Formula
  dataSource: 'live_meta' | 'manual_input';
  formula?: FormulaItem[]; // For live_meta if formula_builder is used
  allowManualOverride: boolean; // For live_meta

  // Filters
  campaignNameFilters: CampaignFilter[];
  adSetNameFilters: AdSetFilter[];
  adNameFilters: AdFilter[];

  // Data for display (fetched or manually entered)
  // This part will need to be fleshed out based on actual data structure
  liveData?: unknown[]; // Changed any to unknown
  manualData?: { period: string; value: number | string }[]; // Placeholder for manual entries
}

export interface FormulaItem {
  type: 'metric' | 'number' | 'operator' | 'group'; // group for parentheses
  value: string; // metric_id, number, operator symbol, or '(' or ')'
  displayValue?: string; // For displaying metric names nicely
}

// Placeholder for Meta Marketing API metrics
// In a real app, this would be fetched or defined elsewhere
const AVAILABLE_META_METRICS = [
  // Meta Platform Metrics
  { id: 'spend', name: 'Spend', platform: 'meta' },
  { id: 'impressions', name: 'Impressions', platform: 'meta' },
  { id: 'link_clicks', name: 'Link Clicks', platform: 'meta' }, // Updated from 'clicks'
  { id: 'cpc', name: 'Cost Per Link Click', platform: 'meta' }, // Updated name
  { id: 'cpm', name: 'Cost Per Mille (CPM)', platform: 'meta' },
  { id: 'ctr', name: 'Link Click Through Rate', platform: 'meta' }, // Updated name
  { id: 'purchase_roas', name: 'Purchase ROAS', platform: 'meta' }, // Updated from 'roas'
  { id: 'revenue', name: 'Revenue', platform: 'meta' }, // Added
  { id: 'purchases', name: 'Purchases', platform: 'meta' }, // Added
  { id: 'video_thruplay_watched_actions', name: 'ThruPlays', platform: 'meta' }, // Added
  { id: 'video_3s_watched_actions', name: '3 Second Video Views', platform: 'meta' }, // Added
  { id: 'reach', name: 'Reach', platform: 'meta' },
  { id: 'frequency', name: 'Frequency', platform: 'meta' },
  { id: 'cpp', name: 'Cost Per Purchase', platform: 'meta' },
  // Future platforms can be added here
  // { id: 'google_spend', name: 'Spend', platform: 'google' },
  // { id: 'tiktok_spend', name: 'Spend', platform: 'tiktok' },
];

export default function ScorecardPage() {
  // const { user } = useAuth();
  const [metrics, setMetrics] = useState<NewMetric[]>([]);
  const [viewOptions, setViewOptions] = useState<ScorecardViewOptions>({
    time_period: 'weekly',
    show_goals: true,
    sort_by: 'name'
  });
  const [selectedDateRange, setSelectedDateRange] = useState('last_13_weeks');
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [isAddMetricSheetOpen, setIsAddMetricSheetOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<NewMetric | null>(null);
  const [currentFormula, setCurrentFormula] = useState<FormulaItem[]>([]);
  const [currentDataSource, setCurrentDataSource] = useState<'live_meta' | 'manual_input'>('live_meta');

  // State for live data, loading, and errors
  const [liveData, setLiveData] = useState<Record<string, FetchMetaInsightsResult>>({}); // { [metricId]: FetchMetaInsightsResult }
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({}); // { [metricId]: isLoading }
  const [errorStates, setErrorStates] = useState<Record<string, string | null>>({}); // { [metricId]: errorMessage }

  const brandConfig = useScorecardBrandConfig(); // Use the real brand config hook

  const getNumberOfPeriods = useCallback(() => {
    switch (selectedDateRange) {
      case 'last_4_weeks': return 4;
      case 'last_13_weeks': return 13;
      case 'last_26_weeks': return 26;
      case 'last_52_weeks': return 52;
      default: return 13;
    }
  }, [selectedDateRange]);

  // Memoize dateRanges to prevent re-creating it on every render unless dependencies change
  const dateRanges = useMemo(() => {
    const now = new Date();
    const ranges = [];
    const numberOfPeriods = getNumberOfPeriods(); // getNumberOfPeriods is already memoized with useCallback
    
    let adjustedOffset = currentWeekOffset;
    if (viewOptions.time_period === 'weekly' && numberOfPeriods <= currentWeekOffset) {
        adjustedOffset = Math.max(0, numberOfPeriods - 1);
    }
    
    switch (viewOptions.time_period) {
      case 'weekly':
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay());
        currentWeekStart.setHours(0, 0, 0, 0);
        for (let i = 0; i < numberOfPeriods; i++) {
          const weekOffset = i + adjustedOffset;
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
  }, [getNumberOfPeriods, currentWeekOffset, viewOptions.time_period]); // Dependencies for useMemo

  useEffect(() => {
    const fetchInitialMetrics = async () => {
      if (!brandConfig.isConfigured) {
        // If brand is not configured, we might not want to fetch user-specific metrics yet,
        // or fetch them without brand filtering if that's intended.
        // For now, let's assume we wait for brand config if it's essential.
        // console.warn("Brand not configured, skipping initial metric fetch.");
        // setMetrics([]); // Optionally clear metrics or set a specific state
        return;
      }
      try {
        // Example: Add a loading state for initial fetch if desired
        // setLoadingStates(prev => ({ ...prev, initialLoad: true })); 
        const response = await fetch('/api/scorecard/metrics'); // Adjust if brandId is needed: `/api/scorecard/metrics?brandId=${brandConfig.brandId}`
        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`);
        }
        const fetchedMetrics: NewMetric[] = await response.json();
        setMetrics(fetchedMetrics);
      } catch (error) {
        console.error("Error fetching initial metrics:", error);
        // setErrorStates(prev => ({ ...prev, initialLoad: error.message }));
        setMetrics([]); // Clear metrics or handle error appropriately
      }
      // finally {
      //   setLoadingStates(prev => ({ ...prev, initialLoad: false }));
      // }
    };

    fetchInitialMetrics();
  }, [brandConfig.isConfigured, brandConfig.brandId]); // Add brandConfig.brandId if it's used in fetch URL

  // Effect to fetch live data for metrics
  useEffect(() => {
    if (!brandConfig.isConfigured && metrics.some(m => m.dataSource === 'live_meta')) {
      console.warn("Meta API credentials are not configured. Live data will not be fetched.", brandConfig.error);
      metrics.forEach(metric => {
        if (metric.dataSource === 'live_meta' && metric.id) {
          setErrorStates(prev => ({ ...prev, [metric.id]: brandConfig.error || "Meta API not configured." }));
        }
      });
      return;
    }

    metrics.forEach(async (metric) => {
      if (metric.dataSource === 'live_meta' && metric.id && brandConfig.brandId && brandConfig.isConfigured) {
        setLoadingStates(prev => ({ ...prev, [metric.id]: true }));
        setErrorStates(prev => ({ ...prev, [metric.id]: null }));
        try {
          const fetchedData = await fetchMetaInsights(
            metric,
            dateRanges,
            brandConfig.brandId // Use brandId instead of access token and ad account ID
          );
          setLiveData(prev => ({ ...prev, [metric.id]: fetchedData }));
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
          console.error(`Error fetching live data for metric ${metric.id}:`, errorMessage);
          setErrorStates(prev => ({ ...prev, [metric.id]: errorMessage }));
          setLiveData(prev => {
            const updatedLiveData = { ...prev };
            delete updatedLiveData[metric.id];
            return updatedLiveData;
          });
        } finally {
          setLoadingStates(prev => ({ ...prev, [metric.id]: false }));
        }
      }
    });
  }, [metrics, dateRanges, brandConfig.brandId, brandConfig.isConfigured, brandConfig.error]);

  const getCurrentPeriodInfo = useCallback(() => {
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
  }, [viewOptions.time_period]);

  const currentPeriodInfo = getCurrentPeriodInfo();

  const handleSaveMetric = async (metricToSave: NewMetric) => {
    // Optimistically update UI or show loading state
    // For example, add a temporary version of the metric or set a global loading flag

    try {
      const isEditing = !!editingMetric?.id; // Check if we are editing an existing metric
      const metricToSubmit = { ...metricToSave };

      // If it's a new metric and ID is not set (or is empty string from default), 
      // backend will generate one. If you generate it client-side (like Date.now().toString()),
      // ensure it's passed. The backend currently expects an ID for upsert if present.
      if (!isEditing && !metricToSubmit.id) {
        // Backend will generate ID, or you can generate one here if preferred for optimistic update
        // For now, let's assume backend handles ID generation if not provided for new metrics
        // Or, ensure your defaultMetric for creation has a temporary or null id that backend expects
      }

      const response = await fetch('/api/scorecard/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metricToSubmit),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save metric: ${response.statusText}`);
      }

      const savedMetric: NewMetric = await response.json();

      // Update local state with the metric returned from the server (which includes the final ID)
      if (isEditing) {
        setMetrics(metrics.map(m => m.id === savedMetric.id ? savedMetric : m));
      } else {
        setMetrics(prevMetrics => [...prevMetrics, savedMetric]);
      }

      // Clear out any existing live data for this metric to trigger a fresh fetch if needed
      setLiveData(prev => {
        const updated = { ...prev };
        delete updated[savedMetric.id];
        return updated;
      });
      setLoadingStates(prev => {
        const updated = { ...prev };
        delete updated[savedMetric.id];
        return updated;
      });
      setErrorStates(prev => {
        const updated = { ...prev };
        delete updated[savedMetric.id];
        return updated;
      });

      setEditingMetric(null);
      setIsAddMetricSheetOpen(false);
      setCurrentFormula([]);

    } catch (error) {
      console.error("Error saving metric:", error);
      // Show error to user, e.g., using a toast notification
      // alert(`Error: ${error.message}`); // Simple alert, replace with better UI
      // Optionally, revert optimistic update here if you implemented one
    }
  };

  const handleEditMetric = (metric: NewMetric) => {
    setEditingMetric(metric);
    setCurrentFormula(metric.formula || []);
    setCurrentDataSource(metric.dataSource); // Set the current data source
    setIsAddMetricSheetOpen(true);
  };

  const handleDeleteMetric = (metricId: string) => {
    setMetrics(metrics.filter(m => m.id !== metricId));
  };

  const handleAddToFormula = (item: FormulaItem) => {
    setCurrentFormula([...currentFormula, item]);
  };

  const handleRemoveLastFormulaItem = () => {
    setCurrentFormula(currentFormula.slice(0, -1));
  };

  const handleClearFormula = () => {
    setCurrentFormula([]);
  };
  
  // Function to render the formula as a string for display
  const renderFormulaDisplay = (formula: FormulaItem[]): string => {
    return formula.map(item => {
        if (item.type === 'metric') {
            const metricDetail = AVAILABLE_META_METRICS.find(m => m.id === item.value);
            return metricDetail ? metricDetail.name : item.value;
        }
        return item.value;
    }).join(' ');
  };

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
        <Button
            onClick={() => {
                // Initialize with a default NewMetric object instead of null
                const defaultMetric: NewMetric = {
                    id: '', // Will be set when saving
                    title: '',
                    description: '',
                    periodInterval: 'weekly',
                    showTotal: true,
                    showAverage: true,
                    showGoal: true,
                    goalUnit: 'number',
                    goalOrientation: 'ge_goal',
                    goalValue: null,
                    goalMinValue: null,
                    goalMaxValue: null,
                    trailingCalculation: 'total',
                    dataSource: 'live_meta',
                    formula: [],
                    allowManualOverride: false,
                    campaignNameFilters: [],
                    adSetNameFilters: [],
                    adNameFilters: [],
                    liveData: [],
                    manualData: []
                };
                setEditingMetric(defaultMetric);
                setCurrentFormula([]);
                setCurrentDataSource('live_meta');
                setIsAddMetricSheetOpen(true);
            }}
            size="sm"
            className="flex items-center gap-2"
        >
            <Plus className="h-4 w-4" />
            Create New Metric
        </Button>
      </div>

      {/* Configuration Alert */}
      {/* {hasUnconfiguredMetrics && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <span className="font-medium text-yellow-800">Some metrics need configuration.</span>
            <span className="text-yellow-700 ml-1">Click the settings icon next to each metric to customize campaign filters and goals.</span>
          </AlertDescription>
        </Alert>
      )} */}

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
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{currentPeriodInfo.label}: {currentPeriodInfo.range}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meta Section */}
      <div className="space-y-4">
        {/* Removed old "Meta" heading and Add Metric button here, moved to main header */}

        {/* Metrics Header */}
        {metrics.length > 0 && (
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-lg font-medium text-sm text-gray-600">
            <div className="col-span-1">Status</div>
          <div className="col-span-2">Title</div>
            <div className="col-span-1">Current</div>
            <div className="col-span-1">Avg</div>
          <div className="col-span-1">Goal</div>
            <div className="col-span-5">
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
            <div className="col-span-1">Actions</div>
        </div>
        )}

        {/* Metrics List */}
        {metrics.length > 0 ? (
            metrics.map((metric) => (
          <Card key={metric.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Status Icon */}
                <div className="col-span-1 flex justify-center gap-2">
                      <CheckCircle className="h-4 w-4 text-gray-400" />
                </div>

                    {/* Title and Description */}
                <div className="col-span-2">
                      <div className="font-medium text-gray-900">{metric.title}</div>
                      {metric.description && <div className="text-sm text-gray-500">{metric.description}</div>}
                      <div className="text-xs text-gray-400 mt-1">
                        {metric.dataSource === 'live_meta' ? 'Live Meta Data' : 'Manual Input'}
                        {metric.dataSource === 'live_meta' && metric.allowManualOverride && ' (Override Enabled)'}
                  </div>
                </div>

                    {/* Current Value */}
                <div className="col-span-1">
                      --
                  </div>
                    
                    {/* Average Value */}
                    <div className="col-span-1">
                      --
                </div>

                    {/* Goal Value */}
                <div className="col-span-1">
                      {metric.showGoal && metric.goalValue !== null ? 
                        `${metric.goalValue} (${metric.goalUnit})` : '--'}
                </div>

                    {/* Period Data */}
                    <div className="col-span-5">
                  <div className="overflow-x-auto">
                    <div className="flex gap-4 min-w-max px-2">
                          {dateRanges.map((range, index) => {
                            const metricLiveDataForPeriod = liveData[metric.id]?.[range.label];
                            let displayValue: string | number = 'N/A';
                            let titleForError: string | undefined = undefined;

                            if (loadingStates[metric.id]) {
                              displayValue = 'Loading...';
                            } else if (errorStates[metric.id] && (!liveData[metric.id] || Object.keys(liveData[metric.id]).length === 0)){
                                displayValue = 'Error';
                                titleForError = errorStates[metric.id] || 'Unknown error';
                            } else if (metricLiveDataForPeriod) {
                              if ('error' in metricLiveDataForPeriod) {
                                displayValue = 'Error'; 
                                titleForError = String(metricLiveDataForPeriod.details || metricLiveDataForPeriod.error);
                                console.error(`Error for metric ${metric.id}, period ${range.label}:`, titleForError);
                              } else if (metric.formula && metric.formula.length > 0) {
                                // TODO: Implement full formula calculation client-side.
                                // For now, attempt to display the first metric value found in the formula.
                                let calculatedValue: number | null = null;
                                const firstMetaMetricId = metric.formula.find(item => item.type === 'metric')?.value;

                                if (firstMetaMetricId && typeof metricLiveDataForPeriod[firstMetaMetricId] === 'number') {
                                  calculatedValue = metricLiveDataForPeriod[firstMetaMetricId];
                                }
                                
                                if (calculatedValue !== null) {
                                   displayValue = calculatedValue;
                                   // Basic formatting (can be expanded based on metric.goalUnit or a new displayFormat prop)
                                   if (metric.goalUnit === 'currency') displayValue = `$${displayValue.toFixed(2)}`;
                                   else if (metric.goalUnit === 'percentage') displayValue = `${(displayValue * 100).toFixed(1)}%`; // Assuming raw value is like 0.25 for 25%
                                   else if (metric.goalUnit === 'number') displayValue = displayValue.toFixed(metric.trailingCalculation === 'average' ? 2 : 0); // Example: more precision for averages
                                } else {
                                    displayValue = 'N/A'; // Data for the specific field in formula not found or no metric in formula
                                }
                              } else {
                                displayValue = 'N/A'; // No formula to guide display
                              }
                            } else if (metric.dataSource === 'manual_input' && metric.manualData?.find(d => d.period === range.label)?.value !== undefined) {
                                const manualEntry = metric.manualData.find(d => d.period === range.label)!;
                                displayValue = manualEntry.value;
                            } else if (metric.dataSource === 'live_meta' && !errorStates[metric.id]) {
                              // If it's live_meta, no data for period, and no general error, show N/A (might still be loading for other periods)
                              displayValue = 'N/A';
                            }

                            return (
                              <div 
                                key={index} 
                                className={`text-center min-w-[120px] py-2 border-r last:border-r-0 ${titleForError ? 'text-red-500' : 'text-gray-600'}`}
                                title={titleForError ? String(titleForError) : undefined}
                              >
                                <div className="font-medium">
                                  {String(displayValue)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-1 flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEditMetric(metric)}>
                            <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteMetric(metric.id)} className="text-red-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                </div>
              </div>
            </CardContent>
          </Card>
            ))
        ) : (
           <div className="text-center py-12">
                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No metrics yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new metric.</p>
                <div className="mt-6">
                    <Button
                        onClick={() => {
                            // Initialize with the same default object for the empty state button
                            const defaultMetric: NewMetric = {
                                id: '',
                                title: '',
                                description: '',
                                periodInterval: 'weekly',
                                showTotal: true,
                                showAverage: true,
                                showGoal: true,
                                goalUnit: 'number',
                                goalOrientation: 'ge_goal',
                                goalValue: null,
                                goalMinValue: null,
                                goalMaxValue: null,
                                trailingCalculation: 'total',
                                dataSource: 'live_meta',
                                formula: [],
                                allowManualOverride: false,
                                campaignNameFilters: [],
                                adSetNameFilters: [],
                                adNameFilters: [],
                                liveData: [],
                                manualData: []
                            };
                            setEditingMetric(defaultMetric);
                            setCurrentFormula([]);
                            setCurrentDataSource('live_meta');
                            setIsAddMetricSheetOpen(true);
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Metric
                    </Button>
                </div>
            </div>
        )}
      </div>

      {/* Modals */}
      <Sheet open={isAddMetricSheetOpen} onOpenChange={setIsAddMetricSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingMetric ? 'Edit Metric' : 'Create New Metric'}</SheetTitle>
            <SheetDescription>
              {editingMetric ? 'Update the details of your metric.' : 'Define a new metric to track your performance.'}
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="metricTitle">Title</Label>
              <Input id="metricTitle" defaultValue={editingMetric?.title} 
                     onChange={e => setEditingMetric(prev => ({...prev!, title: e.target.value} as NewMetric))}
              />
            </div>
            <div>
              <Label htmlFor="metricDescription">Description (Optional)</Label>
              <Input id="metricDescription" defaultValue={editingMetric?.description} 
                     onChange={e => setEditingMetric(prev => ({...prev!, description: e.target.value} as NewMetric))}
              />
            </div>
            <div>
                <Label htmlFor="periodInterval">Period Interval</Label>
                <Select 
                    defaultValue={editingMetric?.periodInterval || 'weekly'}
                    onValueChange={value => setEditingMetric(prev => ({...prev!, periodInterval: value as TimePeriod} as NewMetric))}
                >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2 pt-2">
                <Label className="text-base font-medium">Columns</Label>
                <div className="flex items-center space-x-2">
                    <Checkbox id="showTotal" defaultChecked={editingMetric?.showTotal !== undefined ? editingMetric.showTotal : true} 
                              onCheckedChange={checked => setEditingMetric(prev => ({...prev!, showTotal: !!checked} as NewMetric))} />
                    <Label htmlFor="showTotal">Show Total</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="showAverage" defaultChecked={editingMetric?.showAverage !== undefined ? editingMetric.showAverage : true} 
                              onCheckedChange={checked => setEditingMetric(prev => ({...prev!, showAverage: !!checked} as NewMetric))} />
                    <Label htmlFor="showAverage">Show Average</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="showGoal" defaultChecked={editingMetric?.showGoal !== undefined ? editingMetric.showGoal : true} 
                              onCheckedChange={checked => setEditingMetric(prev => ({...prev!, showGoal: !!checked} as NewMetric))} />
                    <Label htmlFor="showGoal">Show Goal</Label>
                </div>
            </div>

            <div className="space-y-2 pt-2">
                <Label className="text-base font-medium">Goal</Label>
                <div>
                    <Label htmlFor="goalUnit">Unit</Label>
                    <Select 
                        defaultValue={editingMetric?.goalUnit || 'number'}
                        onValueChange={value => setEditingMetric(prev => ({...prev!, goalUnit: value as NewMetric['goalUnit']} as NewMetric))}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="currency">Currency</SelectItem>
                            <SelectItem value="yes/no">Yes/No</SelectItem>
                            <SelectItem value="time">Time</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="goalOrientation">Orientation Rule</Label>
                     <Select 
                        defaultValue={editingMetric?.goalOrientation || 'ge_goal'}
                        onValueChange={value => setEditingMetric(prev => ({...prev!, goalOrientation: value as NewMetric['goalOrientation']} as NewMetric))}
                    >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="inside_min_max">Inside Min and Max</SelectItem>
                            <SelectItem value="outside_min_max">Outside Min and Max</SelectItem>
                            <SelectItem value="ge_goal">Greater than or equal to goal</SelectItem>
                            <SelectItem value="gt_goal">Greater than goal</SelectItem>
                            <SelectItem value="eq_goal">Equal to goal</SelectItem>
                            <SelectItem value="lt_goal">Less than goal</SelectItem>
                            <SelectItem value="le_goal">Less than or equal to goal</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                {/* Conditional inputs for Min/Max if orientation is inside/outside */}
                {(editingMetric?.goalOrientation === 'inside_min_max' || editingMetric?.goalOrientation === 'outside_min_max') && (
                    <>
                        <div>
                            <Label htmlFor="goalMinValue">Min Value</Label>
                            <Input id="goalMinValue" type="number" defaultValue={editingMetric?.goalMinValue || ''} 
                                   onChange={e => setEditingMetric(prev => ({...prev!, goalMinValue: parseFloat(e.target.value)} as NewMetric))} />
                        </div>
                        <div>
                            <Label htmlFor="goalMaxValue">Max Value</Label>
                            <Input id="goalMaxValue" type="number" defaultValue={editingMetric?.goalMaxValue || ''}
                                   onChange={e => setEditingMetric(prev => ({...prev!, goalMaxValue: parseFloat(e.target.value)} as NewMetric))} />
                        </div>
                    </>
                )}
                <div>
                    <Label htmlFor="goalValue">Goal Value</Label>
                    <Input id="goalValue" type="number" defaultValue={editingMetric?.goalValue || ''} 
                           onChange={e => setEditingMetric(prev => ({...prev!, goalValue: parseFloat(e.target.value)} as NewMetric))}
                    />
                </div>
            </div>
            
            <div>
                <Label htmlFor="trailingCalculation">Trailing 4 & 13 week calculation</Label>
                 <Select 
                    defaultValue={editingMetric?.trailingCalculation || 'total'}
                    onValueChange={value => setEditingMetric(prev => ({...prev!, trailingCalculation: value as 'total' | 'average'} as NewMetric))}
                >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="total">Total (Default)</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2 pt-2">
                <Label className="text-base font-medium">Data Source</Label>
                 <Select 
                    defaultValue={editingMetric?.dataSource || 'live_meta'}
                    onValueChange={value => {
                        setCurrentDataSource(value as 'live_meta' | 'manual_input');
                        setEditingMetric(prev => ({...prev!, dataSource: value as 'live_meta' | 'manual_input'} as NewMetric));
                    }}
                >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="live_meta">Live Meta Marketing API</SelectItem>
                        <SelectItem value="manual_input">Manual Input</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {currentDataSource === 'live_meta' && (
                <>
                    <div className="space-y-3 pt-3 border-t mt-3">
                        <Label className="text-base font-medium">Formula Builder</Label>
                        <div className="p-3 border rounded-md bg-gray-50 min-h-[60px]">
                            {currentFormula.length > 0 ? renderFormulaDisplay(currentFormula) : 
                            <span className="text-gray-400">Add metrics or numbers...</span>}
                        </div>
                        
                        {/* Grouped by Platform */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium text-gray-700">Meta Platform Metrics</Label>
                            <div className="flex flex-wrap gap-2">
                                {AVAILABLE_META_METRICS.filter(metric => metric.platform === 'meta').map(metaMetric => (
                                    <Button key={metaMetric.id} variant="outline" size="sm" onClick={() => handleAddToFormula({type: 'metric', value: metaMetric.id, displayValue: metaMetric.name})}>
                                        {metaMetric.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        
                        {/* Numbers and Operators */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Numbers & Operators</Label>
                            <div className="space-y-2">
                                <Button variant="outline" size="sm" onClick={() => {
                                    const num = prompt("Enter number:");
                                    if (num && !isNaN(parseFloat(num))) {
                                        handleAddToFormula({type: 'number', value: num});
                                    }
                                }}>Add Number</Button>
                                
                                <div className="flex flex-wrap gap-2">
                                    {['+', '-', '*', '/', '(', ')'].map(op => (
                                        <Button key={op} variant="outline" size="sm" onClick={() => handleAddToFormula({type: 'operator', value: op})}>{op}</Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {/* Formula Controls */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t">
                            <Button variant="outline" size="sm" onClick={handleRemoveLastFormulaItem} disabled={currentFormula.length === 0}>
                                <XCircle className="h-4 w-4 mr-1" /> Backspace
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleClearFormula} disabled={currentFormula.length === 0}>
                               Clear All
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                        <Switch id="allowManualOverride" defaultChecked={editingMetric?.allowManualOverride} 
                                onCheckedChange={checked => setEditingMetric(prev => ({...prev!, allowManualOverride: !!checked} as NewMetric))} />
                        <Label htmlFor="allowManualOverride">Allow manual override for this live metric</Label>
                    </div>
                </>
            )}
            
            {/* Filters */}
            <div className="space-y-2 pt-3 border-t mt-3">
                 <Label className="text-base font-medium">Campaign Name Filters</Label>
                 <Button variant="outline" size="sm" onClick={() => alert('Add Campaign Filter UI coming soon!')}>Add Campaign Filter</Button>
            </div>
             <div className="space-y-2 pt-2">
                 <Label className="text-base font-medium">Ad Set Name Filters</Label>
                 <Button variant="outline" size="sm" onClick={() => alert('Add Ad Set Filter UI coming soon!')}>Add Ad Set Filter</Button>
            </div>
             <div className="space-y-2 pt-2">
                 <Label className="text-base font-medium">Ad Name Filters</Label>
                 <Button variant="outline" size="sm" onClick={() => alert('Add Ad Name Filter UI coming soon!')}>Add Ad Filter</Button>
            </div>

          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsAddMetricSheetOpen(false)}>Cancel</Button>
            <Button 
                onClick={() => {
                    if (editingMetric) {
                        // Ensure the formula is set from currentFormula
                        const metricToSave = {
                            ...editingMetric,
                            formula: currentFormula
                        };
                        handleSaveMetric(metricToSave);
                    }
                }}
                disabled={!editingMetric?.title} // Disable if no title
            >
                {editingMetric?.id ? 'Save Changes' : 'Create Metric'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
} 