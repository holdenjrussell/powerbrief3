'use client';

import React, { useState, useCallback, useMemo } from 'react';
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
  Input
} from '@/components/ui';
import { 
  Plus, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  BarChart3,
  Settings
} from 'lucide-react';

// Import the types from the original scorecard page
import { 
  CampaignFilter,
  AdSetFilter,
  AdFilter,
  TimePeriod,
  ScorecardViewOptions
} from '@/lib/types/scorecard';

// Copy the types from the original scorecard page
export interface NewMetric {
  id: string;
  title: string;
  description?: string;
  periodInterval: TimePeriod;
  showTotal: boolean;
  showAverage: boolean;
  showGoal: boolean;
  goalUnit: 'number' | 'percentage' | 'currency' | 'yes/no' | 'time';
  goalOrientation: 'inside_min_max' | 'outside_min_max' | 'ge_goal' | 'gt_goal' | 'eq_goal' | 'lt_goal' | 'le_goal';
  goalValue: number | null;
  goalMinValue?: number | null;
  goalMaxValue?: number | null;
  trailingCalculation: 'total' | 'average';
  dataSource: 'live_meta' | 'manual_input';
  formula?: FormulaItem[];
  allowManualOverride: boolean;
  campaignNameFilters: CampaignFilter[];
  adSetNameFilters: AdSetFilter[];
  adNameFilters: AdFilter[];
  liveData?: unknown[];
  manualData?: { period: string; value: number | string }[];
}

export interface FormulaItem {
  type: 'metric' | 'number' | 'operator' | 'group';
  value: string;
  displayValue?: string;
}

interface ScorecardTabProps {
  brandId: string;
}

export default function ScorecardTab({ brandId }: ScorecardTabProps) {
  // brandId will be used when scorecard functionality is implemented
  console.log('ScorecardTab loaded for brand:', brandId);
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
    const numberOfPeriods = getNumberOfPeriods();
    
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
          const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 3, 0);
          ranges.push({
            start: startDate,
            end: endDate,
            label: `Q${Math.floor(startDate.getMonth() / 3) + 1} ${startDate.getFullYear()}`
          });
        }
        break;
      case 'annual':
        for (let i = 0; i < Math.min(numberOfPeriods / 52, 3); i++) {
          const yearOffset = i + currentWeekOffset;
          const startDate = new Date(now.getFullYear() - yearOffset, 0, 1);
          const endDate = new Date(now.getFullYear() - yearOffset, 11, 31);
          ranges.push({
            start: startDate,
            end: endDate,
            label: startDate.getFullYear().toString()
          });
        }
        break;
    }
    return ranges;
  }, [viewOptions.time_period, currentWeekOffset, getNumberOfPeriods]);

  const currentPeriodInfo = useMemo(() => {
    if (dateRanges.length === 0) return { label: '', range: '' };
    const currentPeriod = dateRanges[0];
    return {
      label: viewOptions.time_period.charAt(0).toUpperCase() + viewOptions.time_period.slice(1),
      range: currentPeriod.label
    };
  }, [dateRanges, viewOptions.time_period]);

  return (
    <div className="space-y-6">
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
          <h2 className="text-xl font-semibold text-gray-900">Scorecard Metrics</h2>
          <p className="text-gray-600">Track your key performance indicators and goals</p>
        </div>
        <Button
          onClick={() => {
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
            setIsAddMetricSheetOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Metric
        </Button>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Tabs 
                value={viewOptions.time_period} 
                onValueChange={(value) => {
                  setViewOptions({...viewOptions, time_period: value as TimePeriod});
                  setCurrentWeekOffset(0);
                }}
              >
                <TabsList>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                  <TabsTrigger value="annual">Annual</TabsTrigger>
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

      {/* Metrics List */}
      {metrics.length > 0 ? (
        <div className="space-y-4">
          {/* Metrics Header */}
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

          {/* Metrics */}
          {metrics.map((metric) => (
            <Card key={metric.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-1 flex justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-gray-400" />
                  </div>

                  <div className="col-span-2">
                    <div className="font-medium text-gray-900">{metric.title}</div>
                    {metric.description && <div className="text-sm text-gray-500">{metric.description}</div>}
                    <div className="text-xs text-gray-400 mt-1">
                      {metric.dataSource === 'live_meta' ? 'Live Meta Data' : 'Manual Input'}
                      {metric.dataSource === 'live_meta' && metric.allowManualOverride && ' (Override Enabled)'}
                    </div>
                  </div>

                  <div className="col-span-1">--</div>
                  <div className="col-span-1">--</div>
                  <div className="col-span-1">
                    {metric.showGoal && metric.goalValue !== null ? 
                      `${metric.goalValue} (${metric.goalUnit})` : '--'}
                  </div>

                  <div className="col-span-5">
                    <div className="overflow-x-auto">
                      <div className="flex gap-4 min-w-max px-2">
                        {dateRanges.map((range, index) => (
                          <div key={index} className="text-center min-w-[120px]">
                            <div className="text-sm">N/A</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-1">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingMetric(metric);
                          setIsAddMetricSheetOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMetrics(metrics.filter(m => m.id !== metric.id));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No metrics yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new metric.</p>
          <div className="mt-6">
            <Button
              onClick={() => {
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
                setIsAddMetricSheetOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Metric
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Metric Sheet - Simplified for now */}
      <Sheet open={isAddMetricSheetOpen} onOpenChange={setIsAddMetricSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>{editingMetric?.id ? 'Edit Metric' : 'Add New Metric'}</SheetTitle>
            <SheetDescription>
              Configure your metric settings and data source.
            </SheetDescription>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={editingMetric?.title || ''}
                onChange={(e) => setEditingMetric(prev => ({...prev!, title: e.target.value}))}
                placeholder="Enter metric title"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editingMetric?.description || ''}
                onChange={(e) => setEditingMetric(prev => ({...prev!, description: e.target.value}))}
                placeholder="Enter metric description"
              />
            </div>
          </div>
          
          <SheetFooter>
            <Button variant="outline" onClick={() => setIsAddMetricSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              if (editingMetric) {
                const newMetric = { ...editingMetric, id: editingMetric.id || Date.now().toString() };
                if (editingMetric.id) {
                  setMetrics(metrics.map(m => m.id === editingMetric.id ? newMetric : m));
                } else {
                  setMetrics([...metrics, newMetric]);
                }
              }
              setIsAddMetricSheetOpen(false);
              setEditingMetric(null);
            }}>
              Save Metric
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
} 