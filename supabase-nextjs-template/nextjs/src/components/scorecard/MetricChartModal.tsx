'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui';
import { X, TrendingUp, TrendingDown, Target, Calendar } from 'lucide-react';
import { MetricWithData, MetricStatus } from '@/lib/types/scorecard';

interface MetricChartModalProps {
  metric: MetricWithData;
  isOpen: boolean;
  onClose: () => void;
}

export default function MetricChartModal({ metric, isOpen, onClose }: MetricChartModalProps) {
  // Mock data for the chart - in real implementation this would come from the metric's data_points
  const mockWeeklyData = [
    { week: 'Apr 28 - May 04', value: 1.61, goal: metric.weekly_goal },
    { week: 'May 05 - May 11', value: 1.52, goal: metric.weekly_goal },
    { week: 'May 12 - May 18', value: 1.62, goal: metric.weekly_goal },
    { week: 'May 19 - May 25', value: 1.64, goal: metric.weekly_goal },
    { week: 'May 26 - Jun 01', value: metric.current_value, goal: metric.weekly_goal }
  ];

  const getStatusBadge = (status: MetricStatus) => {
    switch (status) {
      case 'on_track':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">On Track</Badge>;
      case 'at_risk':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">At Risk</Badge>;
      case 'off_track':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Off Track</Badge>;
    }
  };

  const formatValue = (value: number | undefined) => {
    if (value === undefined) return '--';
    switch (metric.display_format) {
      case 'currency':
        return `$${value.toFixed(metric.decimal_places)}`;
      case 'percentage':
        return `${value.toFixed(metric.decimal_places)}%`;
      default:
        return value.toFixed(metric.decimal_places);
    }
  };

  const getTrendIcon = () => {
    if (!metric.current_value || !metric.average_value) return null;
    
    if (metric.current_value > metric.average_value) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (metric.current_value < metric.average_value) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getMaxValue = () => {
    const values = mockWeeklyData.map(d => d.value).filter(v => v !== undefined) as number[];
    const goals = mockWeeklyData.map(d => d.goal).filter(g => g !== undefined) as number[];
    return Math.max(...values, ...goals) * 1.1; // Add 10% padding
  };

  const maxValue = getMaxValue();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">{metric.name}</DialogTitle>
              {getStatusBadge(metric.status)}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Current Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{formatValue(metric.current_value)}</span>
                  {getTrendIcon()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-2xl font-bold">{formatValue(metric.weekly_goal)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Average</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatValue(metric.average_value)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Simple bar chart representation */}
                <div className="space-y-3">
                  {mockWeeklyData.map((dataPoint, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{dataPoint.week}</span>
                        <div className="flex items-center gap-4">
                          <span className={`font-medium ${
                            dataPoint.goal && dataPoint.value && dataPoint.value >= dataPoint.goal 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {formatValue(dataPoint.value)}
                          </span>
                          {dataPoint.goal && (
                            <span className="text-gray-400 text-xs">
                              Goal: {formatValue(dataPoint.goal)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Bar visualization */}
                      <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                        {/* Goal line */}
                        {dataPoint.goal && (
                          <div 
                            className="absolute top-0 w-0.5 h-full bg-blue-400 z-10"
                            style={{ left: `${(dataPoint.goal / maxValue) * 100}%` }}
                          />
                        )}
                        
                        {/* Actual value bar */}
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            dataPoint.goal && dataPoint.value && dataPoint.value >= dataPoint.goal
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          }`}
                          style={{ 
                            width: `${(dataPoint.value / maxValue) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Legend */}
                <div className="flex items-center gap-6 text-sm text-gray-600 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>On Track</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Below Goal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-0.5 h-3 bg-blue-400"></div>
                    <span>Goal Line</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metric Details */}
          <Card>
            <CardHeader>
              <CardTitle>Metric Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Type:</span>
                  <span className="ml-2">{metric.type === 'meta_api' ? 'Meta API' : 'Custom Formula'}</span>
                </div>
                
                {metric.type === 'meta_api' && (
                  <>
                    <div>
                      <span className="font-medium text-gray-600">Meta Metric:</span>
                      <span className="ml-2">{metric.meta_metric_name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Level:</span>
                      <span className="ml-2 capitalize">{metric.meta_level}</span>
                    </div>
                  </>
                )}
                
                <div>
                  <span className="font-medium text-gray-600">Status Calculation:</span>
                  <span className="ml-2 capitalize">{metric.status_calculation_method.replace('_', ' ')}</span>
                </div>
                
                {metric.description && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-600">Description:</span>
                    <p className="ml-2 text-gray-700">{metric.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 