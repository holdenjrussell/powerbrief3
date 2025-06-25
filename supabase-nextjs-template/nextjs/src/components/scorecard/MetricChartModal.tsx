'use client';

import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Card,
  CardContent
} from '@/components/ui';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { ScorecardMetric, MetricWithData, DateRange } from '@/lib/types/scorecard';

interface MetricChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metric: ScorecardMetric;
  data: MetricWithData['data'];
  dateRanges: DateRange[];
}

export default function MetricChartModal({ 
  open, 
  onOpenChange, 
  metric, 
  data,
  dateRanges 
}: MetricChartModalProps) {
  // Prepare chart data
  const chartData = dateRanges.map((range, index) => ({
    period: range.label,
    value: data?.periods?.[index]?.value || 0,
    goal: metric.goal_value || 0
  })).reverse(); // Reverse to show oldest to newest

  const formatYAxisValue = (value: number) => {
    // Format based on metric type
    if (metric.metric_key.includes('roas')) {
      return `${value.toFixed(1)}x`;
    } else if (metric.metric_key.includes('ctr') || metric.metric_key.includes('rate')) {
      return `${value.toFixed(1)}%`;
    } else if (metric.metric_key.includes('cost') || metric.metric_key.includes('spend') || metric.metric_key.includes('revenue')) {
      return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    } else {
      return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
  };

  const formatTooltipValue = (value: number) => {
    // Format based on metric type
    if (metric.metric_key.includes('roas')) {
      return `${value.toFixed(2)}x`;
    } else if (metric.metric_key.includes('ctr') || metric.metric_key.includes('rate')) {
      return `${value.toFixed(2)}%`;
    } else if (metric.metric_key.includes('cost') || metric.metric_key.includes('spend') || metric.metric_key.includes('revenue')) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{metric.display_name} Trend</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Current</div>
                <div className="text-xl font-semibold">{formatTooltipValue(data?.current || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Average</div>
                <div className="text-xl font-semibold">{formatTooltipValue(data?.average || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Goal</div>
                <div className="text-xl font-semibold">
                  {metric.goal_value ? formatTooltipValue(metric.goal_value) : '--'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">Status</div>
                <div className="text-xl font-semibold">
                  {getStatusText(data?.current || 0, metric.goal_value, metric.goal_operator)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis 
                    tickFormatter={formatYAxisValue}
                    fontSize={12}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatTooltipValue(value)}
                    labelStyle={{ color: '#000' }}
                  />
                  
                  {metric.goal_value && (
                    <ReferenceLine 
                      y={metric.goal_value} 
                      stroke="#10b981" 
                      strokeDasharray="5 5"
                      label={{ value: "Goal", position: "right" }}
                    />
                  )}
                  
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name={metric.display_name}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Goal Details */}
          {metric.goal_value && (
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-gray-600">
                  Goal: {formatTooltipValue(metric.goal_value)} 
                  {metric.goal_operator && ` (${getOperatorText(metric.goal_operator)})`}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getStatusText(current: number, goalValue?: number, goalOperator?: string): string {
  if (!goalValue) return 'No Goal';
  
  let isOnTrack = false;
  switch (goalOperator) {
    case 'gte':
    case 'ge_goal':
      isOnTrack = current >= goalValue;
      break;
    case 'gt':
    case 'gt_goal':
      isOnTrack = current > goalValue;
      break;
    case 'lte':
    case 'le_goal':
      isOnTrack = current <= goalValue;
      break;
    case 'lt':
    case 'lt_goal':
      isOnTrack = current < goalValue;
      break;
    case 'eq':
    case 'eq_goal':
      isOnTrack = current === goalValue;
      break;
    default:
      isOnTrack = current >= goalValue;
  }
  
  if (isOnTrack) return '✅ On Track';
  
  const percentageOff = Math.abs((current - goalValue) / goalValue) * 100;
  if (percentageOff > 20) return '❌ Off Track';
  return '⚠️ At Risk';
}

function getOperatorText(operator: string): string {
  switch (operator) {
    case 'gte':
    case 'ge_goal':
      return 'Greater than or equal to';
    case 'gt':
    case 'gt_goal':
      return 'Greater than';
    case 'lte':
    case 'le_goal':
      return 'Less than or equal to';
    case 'lt':
    case 'lt_goal':
      return 'Less than';
    case 'eq':
    case 'eq_goal':
      return 'Equal to';
    default:
      return operator;
  }
}