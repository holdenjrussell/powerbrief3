'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown,
  Activity,
  Users,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Loader2
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  status?: 'active' | 'paused' | 'draft';
  usage_stats?: {
    total_calls: number;
    total_tokens: number;
    avg_response_time: number;
    success_rate: number;
  };
}

interface OverallMetrics {
  total_agents: number;
  active_agents: number;
  total_calls: number;
  total_tokens: number;
  avg_response_time: number;
  success_rate: number;
  most_used_agent?: string;
  least_used_agent?: string;
}

export function AgentMetrics({ agents }: { agents: Agent[] }) {
  const [metrics, setMetrics] = useState<OverallMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    calculateMetrics();
  }, [agents, timeRange]);

  const calculateMetrics = async () => {
    try {
      setLoading(true);
      
      // Calculate basic metrics from agent data
      const total_agents = agents.length;
      const active_agents = agents.filter(a => a.status === 'active').length;
      
      let total_calls = 0;
      let total_tokens = 0;
      let total_response_time = 0;
      let total_success_calls = 0;
      let agents_with_stats = 0;
      
      let most_used_calls = 0;
      let least_used_calls = Infinity;
      let most_used_agent = '';
      let least_used_agent = '';

      agents.forEach(agent => {
        if (agent.usage_stats) {
          agents_with_stats++;
          total_calls += agent.usage_stats.total_calls;
          total_tokens += agent.usage_stats.total_tokens;
          total_response_time += agent.usage_stats.avg_response_time;
          total_success_calls += (agent.usage_stats.total_calls * agent.usage_stats.success_rate / 100);
          
          // Track most/least used
          if (agent.usage_stats.total_calls > most_used_calls) {
            most_used_calls = agent.usage_stats.total_calls;
            most_used_agent = agent.name;
          }
          if (agent.usage_stats.total_calls < least_used_calls && agent.usage_stats.total_calls > 0) {
            least_used_calls = agent.usage_stats.total_calls;
            least_used_agent = agent.name;
          }
        }
      });

      const calculated_metrics: OverallMetrics = {
        total_agents,
        active_agents,
        total_calls,
        total_tokens,
        avg_response_time: agents_with_stats > 0 ? total_response_time / agents_with_stats : 0,
        success_rate: total_calls > 0 ? (total_success_calls / total_calls) * 100 : 0,
        most_used_agent: most_used_agent || undefined,
        least_used_agent: least_used_agent !== '' ? least_used_agent : undefined
      };

      setMetrics(calculated_metrics);
    } catch (error) {
      console.error('Error calculating metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading analytics...</span>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="mb-6 space-y-4">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Analytics Overview</h3>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Total Agents */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Agents</p>
                <p className="text-2xl font-bold">{metrics.total_agents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Active Agents */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{metrics.active_agents}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Calls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">{formatNumber(metrics.total_calls)}</p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {metrics.success_rate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Avg Response Time */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{formatTime(metrics.avg_response_time)}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        {/* Total Tokens */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tokens</p>
                <p className="text-2xl font-bold">{formatNumber(metrics.total_tokens)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most Active Agent */}
        {metrics.most_used_agent && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Most Active Agent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{metrics.most_used_agent}</p>
                  <p className="text-sm text-muted-foreground">
                    Highest usage in selected period
                  </p>
                </div>
                <Badge className="bg-green-500 text-white">Top Performer</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Least Active Agent */}
        {metrics.least_used_agent && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-orange-500" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{metrics.least_used_agent}</p>
                  <p className="text-sm text-muted-foreground">
                    Lowest usage in selected period
                  </p>
                </div>
                <Badge variant="outline">Low Usage</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Health</CardTitle>
          <CardDescription>
            Overall health and performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              {metrics.success_rate >= 95 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : metrics.success_rate >= 80 ? (
                <Activity className="h-5 w-5 text-yellow-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="font-medium">Success Rate</p>
                <p className="text-sm text-muted-foreground">
                  {metrics.success_rate >= 95 ? 'Excellent' : metrics.success_rate >= 80 ? 'Good' : 'Needs Improvement'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {metrics.avg_response_time <= 2000 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : metrics.avg_response_time <= 5000 ? (
                <Activity className="h-5 w-5 text-yellow-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="font-medium">Response Time</p>
                <p className="text-sm text-muted-foreground">
                  {metrics.avg_response_time <= 2000 ? 'Fast' : metrics.avg_response_time <= 5000 ? 'Moderate' : 'Slow'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {metrics.active_agents / metrics.total_agents >= 0.8 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : metrics.active_agents / metrics.total_agents >= 0.5 ? (
                <Activity className="h-5 w-5 text-yellow-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="font-medium">Agent Utilization</p>
                <p className="text-sm text-muted-foreground">
                  {Math.round((metrics.active_agents / metrics.total_agents) * 100)}% active
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 