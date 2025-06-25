'use client';

import React from 'react';
import { 
  Card, 
  CardContent, 
  Button,
  Badge
} from '@/components/ui';
import { 
  CheckCircle,
  AlertTriangle,
  X,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { Metric } from './ScorecardMetrics';

interface MetricRowProps {
  metric: Metric;
  data: any;
  dateRanges: any[];
  onEdit: () => void;
  onDelete: () => void;
  onViewChart: () => void;
}

export default function MetricRow({ 
  metric, 
  data, 
  dateRanges, 
  onEdit, 
  onDelete, 
  onViewChart 
}: MetricRowProps) {
  const getStatus = () => {
    if (!data || !metric.goal_value) {
      return 'none';
    }

    const current = data.current || 0;
    const goal = metric.goal_value;
    let isOnTrack = false;

    switch (metric.goal_operator) {
      case 'gte':
      case 'ge_goal':
        isOnTrack = current >= goal;
        break;
      case 'gt':
      case 'gt_goal':
        isOnTrack = current > goal;
        break;
      case 'lte':
      case 'le_goal':
        isOnTrack = current <= goal;
        break;
      case 'lt':
      case 'lt_goal':
        isOnTrack = current < goal;
        break;
      case 'eq':
      case 'eq_goal':
        isOnTrack = current === goal;
        break;
      default:
        isOnTrack = current >= goal;
    }

    if (isOnTrack) {
      return 'on-track';
    } else {
      const percentageOff = Math.abs((current - goal) / goal) * 100;
      if (percentageOff > 20) {
        return 'off-track';
      } else {
        return 'at-risk';
      }
    }
  };

  const getStatusIcon = () => {
    const status = getStatus();
    switch (status) {
      case 'on-track':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'at-risk':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'off-track':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendIcon = () => {
    if (!data || !data.trend) return null;
    
    if (data.trend === 'up') {
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    } else if (data.trend === 'down') {
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    }
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const formatValue = (value: number | undefined) => {
    if (value === undefined || value === null) return '--';
    
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

  const getGoalBadgeColor = () => {
    const status = getStatus();
    switch (status) {
      case 'on-track':
        return 'bg-green-100 text-green-800';
      case 'at-risk':
        return 'bg-yellow-100 text-yellow-800';
      case 'off-track':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="grid grid-cols-12 gap-4 items-center">
          {/* Status */}
          <div className="col-span-1 flex justify-center">
            {getStatusIcon()}
          </div>

          {/* Metric Name */}
          <div className="col-span-2">
            <div className="font-medium text-gray-900">{metric.display_name}</div>
            <div className="text-xs text-gray-500 mt-1">
              {metric.metric_key}
            </div>
          </div>

          {/* Current Value */}
          <div className="col-span-1">
            <div className="flex items-center gap-1">
              <span className="font-medium">{formatValue(data?.current)}</span>
              {getTrendIcon()}
            </div>
          </div>

          {/* Average */}
          <div className="col-span-1">
            <span className="text-gray-600">{formatValue(data?.average)}</span>
          </div>

          {/* Goal */}
          <div className="col-span-1">
            {metric.goal_value ? (
              <Badge className={getGoalBadgeColor()}>
                {formatValue(metric.goal_value)}
              </Badge>
            ) : (
              <span className="text-gray-400">--</span>
            )}
          </div>

          {/* Period Values */}
          <div className="col-span-5">
            <div className="flex gap-4 min-w-max px-2">
              {dateRanges.map((range, index) => (
                <div key={index} className="text-center min-w-[80px]">
                  <div className="text-sm">
                    {data?.periods?.[index] 
                      ? formatValue(data.periods[index].value) 
                      : '--'
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="col-span-1">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewChart}
                title="View Chart"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                title="Edit Metric"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                title="Delete Metric"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}