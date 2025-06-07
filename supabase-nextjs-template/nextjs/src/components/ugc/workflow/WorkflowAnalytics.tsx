'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  BarChart3,
  Timer,
  Zap
} from 'lucide-react';
import {
  UgcWorkflowExecution,
  UgcWorkflowTemplate,
  ExecutionStatus
} from '@/lib/types/ugcWorkflow';
import {
  getWorkflowExecutions,
  getWorkflowTemplates
} from '@/lib/services/ugcWorkflowService';

interface WorkflowAnalyticsProps {
  brandId: string;
}

interface WorkflowMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  activeExecutions: number;
  humanInterventionsRequired: number;
}

interface WorkflowStats {
  workflowId: string;
  workflowName: string;
  metrics: WorkflowMetrics;
}

const STATUS_COLORS: Record<ExecutionStatus, string> = {
  running: 'blue',
  paused: 'yellow',
  completed: 'green',
  failed: 'red',
  waiting_human: 'purple'
};

const STATUS_ICONS: Record<ExecutionStatus, React.ReactNode> = {
  running: <Activity className="h-4 w-4" />,
  paused: <Clock className="h-4 w-4" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
  waiting_human: <Users className="h-4 w-4" />
};

export default function WorkflowAnalytics({ brandId }: WorkflowAnalyticsProps) {
  const [executions, setExecutions] = useState<UgcWorkflowExecution[]>([]);
  const [workflows, setWorkflows] = useState<UgcWorkflowTemplate[]>([]);
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats[]>([]);
  const [overallMetrics, setOverallMetrics] = useState<WorkflowMetrics>({
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    averageExecutionTime: 0,
    activeExecutions: 0,
    humanInterventionsRequired: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  useEffect(() => {
    loadAnalyticsData();
  }, [brandId, selectedTimeRange]);

  const loadAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Load workflows and executions
      const [workflowsData, executionsData] = await Promise.all([
        getWorkflowTemplates(brandId),
        getWorkflowExecutions(brandId)
      ]);

      setWorkflows(workflowsData);
      setExecutions(executionsData);

      // Calculate metrics
      calculateMetrics(workflowsData, executionsData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMetrics = (workflows: UgcWorkflowTemplate[], executions: UgcWorkflowExecution[]) => {
    // Filter executions by time range
    const now = new Date();
    const timeRangeMs = getTimeRangeMs(selectedTimeRange);
    const filteredExecutions = executions.filter(exec => {
      const execDate = new Date(exec.created_at);
      return now.getTime() - execDate.getTime() <= timeRangeMs;
    });

    // Overall metrics
    const overall: WorkflowMetrics = {
      totalExecutions: filteredExecutions.length,
      successfulExecutions: filteredExecutions.filter(e => e.status === 'completed').length,
      failedExecutions: filteredExecutions.filter(e => e.status === 'failed').length,
      activeExecutions: filteredExecutions.filter(e => ['running', 'paused', 'waiting_human'].includes(e.status)).length,
      humanInterventionsRequired: filteredExecutions.filter(e => e.status === 'waiting_human').length,
      averageExecutionTime: calculateAverageExecutionTime(filteredExecutions)
    };

    setOverallMetrics(overall);

    // Per-workflow stats
    const stats: WorkflowStats[] = workflows.map(workflow => {
      const workflowExecutions = filteredExecutions.filter(e => e.workflow_id === workflow.id);
      
      return {
        workflowId: workflow.id,
        workflowName: workflow.name,
        metrics: {
          totalExecutions: workflowExecutions.length,
          successfulExecutions: workflowExecutions.filter(e => e.status === 'completed').length,
          failedExecutions: workflowExecutions.filter(e => e.status === 'failed').length,
          activeExecutions: workflowExecutions.filter(e => ['running', 'paused', 'waiting_human'].includes(e.status)).length,
          humanInterventionsRequired: workflowExecutions.filter(e => e.status === 'waiting_human').length,
          averageExecutionTime: calculateAverageExecutionTime(workflowExecutions)
        }
      };
    });

    setWorkflowStats(stats);
  };

  const getTimeRangeMs = (range: string): number => {
    switch (range) {
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
      case '30d': return 30 * 24 * 60 * 60 * 1000;
      case '90d': return 90 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  };

  const calculateAverageExecutionTime = (executions: UgcWorkflowExecution[]): number => {
    const completedExecutions = executions.filter(e => e.status === 'completed' && e.completed_at);
    
    if (completedExecutions.length === 0) return 0;

    const totalTime = completedExecutions.reduce((sum, exec) => {
      const start = new Date(exec.started_at).getTime();
      const end = new Date(exec.completed_at!).getTime();
      return sum + (end - start);
    }, 0);

    return totalTime / completedExecutions.length;
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getSuccessRate = (successful: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((successful / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Analytics</h2>
          <p className="text-gray-600">Monitor workflow performance and execution metrics</p>
        </div>
        <Tabs value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
          <TabsList>
            <TabsTrigger value="24h">24 Hours</TabsTrigger>
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallMetrics.totalExecutions}</div>
            <p className="text-xs text-muted-foreground">
              {overallMetrics.activeExecutions} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getSuccessRate(overallMetrics.successfulExecutions, overallMetrics.totalExecutions)}%
            </div>
            <Progress 
              value={getSuccessRate(overallMetrics.successfulExecutions, overallMetrics.totalExecutions)} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(overallMetrics.averageExecutionTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per workflow execution
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Human Interventions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallMetrics.humanInterventionsRequired}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting manual action
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Workflow Performance</CardTitle>
          <CardDescription>
            Individual workflow execution metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflowStats.map((stat) => (
              <div key={stat.workflowId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{stat.workflowName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {stat.metrics.totalExecutions} runs
                    </Badge>
                    <Badge 
                      variant={stat.metrics.failedExecutions > 0 ? 'destructive' : 'default'}
                    >
                      {getSuccessRate(stat.metrics.successfulExecutions, stat.metrics.totalExecutions)}% success
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={getSuccessRate(stat.metrics.successfulExecutions, stat.metrics.totalExecutions)} 
                  className="h-2"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{stat.metrics.successfulExecutions} successful</span>
                  <span>{stat.metrics.failedExecutions} failed</span>
                  <span>{stat.metrics.activeExecutions} active</span>
                  <span>Avg: {formatDuration(stat.metrics.averageExecutionTime)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
          <CardDescription>
            Latest workflow execution history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {executions.slice(0, 10).map((execution) => {
              const workflow = workflows.find(w => w.id === execution.workflow_id);
              return (
                <div key={execution.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {STATUS_ICONS[execution.status]}
                    <div>
                      <p className="font-medium">{workflow?.name || 'Unknown Workflow'}</p>
                      <p className="text-sm text-gray-500">
                        Started {new Date(execution.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_COLORS[execution.status] as any}>
                      {execution.status}
                    </Badge>
                    {execution.completed_at && (
                      <span className="text-sm text-gray-500">
                        {formatDuration(
                          new Date(execution.completed_at).getTime() - 
                          new Date(execution.started_at).getTime()
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 