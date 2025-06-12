'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  MoreVertical,
  Play,
  Pause,
  Copy,
  Edit,
  Trash2,
  Wrench,
  Database,
  Mic,
  Zap,
  GitBranch,
  Clock,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Agent {
  id: string;
  name: string;
  purpose: string;
  description?: string;
  provider: string;
  model: string;
  instructions: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  status?: 'active' | 'paused' | 'draft';
  usage_stats?: {
    total_calls: number;
    total_tokens: number;
    avg_response_time: number;
    success_rate: number;
  };
}

interface AgentCardProps {
  agent: Agent;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onViewMetrics: () => void;
}

export function AgentCard({ 
  agent, 
  onEdit, 
  onDuplicate, 
  onDelete, 
  onToggleStatus, 
  onViewMetrics 
}: AgentCardProps) {
  const getProviderBadge = (provider: string) => {
    const providerMap: Record<string, { label: string; color: string }> = {
      'vercel-ai': { label: 'Vercel AI', color: 'bg-blue-500' },
      'google-ai': { label: 'Google AI', color: 'bg-green-500' },
      'groq-ai': { label: 'Groq', color: 'bg-purple-500' },
      'anthropic-ai': { label: 'Anthropic', color: 'bg-orange-500' },
      'xsai': { label: 'xsAI', color: 'bg-pink-500' },
    };
    const config = providerMap[provider] || { label: provider, color: 'bg-gray-500' };
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case 'paused':
        return <Badge variant="secondary">Paused</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getFeatureIcons = (config: Record<string, unknown>) => {
    const features = [];
    
    const configTyped = config as {
      selectedTools?: string[];
      customTools?: unknown[];
      memory?: unknown;
      voice?: unknown;
      hooks?: Record<string, unknown>;
      subAgents?: string[];
    };

    if ((configTyped.selectedTools?.length || 0) > 0 || (configTyped.customTools?.length || 0) > 0) {
      features.push({ icon: <Wrench className="h-4 w-4" />, tooltip: 'Tools enabled' });
    }
    if (configTyped.memory) {
      features.push({ icon: <Database className="h-4 w-4" />, tooltip: 'Memory enabled' });
    }
    if (configTyped.voice) {
      features.push({ icon: <Mic className="h-4 w-4" />, tooltip: 'Voice enabled' });
    }
    if (configTyped.hooks && Object.keys(configTyped.hooks).length > 0) {
      features.push({ icon: <Zap className="h-4 w-4" />, tooltip: 'Hooks configured' });
    }
    if ((configTyped.subAgents?.length || 0) > 0) {
      features.push({ icon: <GitBranch className="h-4 w-4" />, tooltip: 'Sub-agents configured' });
    }
    return features;
  };

  const features = getFeatureIcons(agent.config);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              {getStatusBadge(agent.status)}
            </div>
            <CardDescription className="text-sm">
              {agent.purpose}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewMetrics}>
                <TrendingUp className="h-4 w-4 mr-2" />
                View Metrics
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleStatus}>
                {agent.status === 'active' ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Provider & Model */}
          <div className="flex items-center gap-2">
            {getProviderBadge(agent.provider)}
            <span className="text-sm text-gray-500">{agent.model}</span>
          </div>

          {/* Features */}
          {features.length > 0 && (
            <div className="flex items-center gap-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="text-gray-500"
                  title={feature.tooltip}
                >
                  {feature.icon}
                </div>
              ))}
            </div>
          )}

          {/* Usage Stats */}
          {agent.usage_stats && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium">{agent.usage_stats.total_calls}</div>
                <div className="text-gray-500">Calls</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium">{agent.usage_stats.success_rate}%</div>
                <div className="text-gray-500">Success</div>
              </div>
            </div>
          )}

          {/* Created Date */}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-3 w-3" />
            Updated {new Date(agent.updated_at).toLocaleDateString()}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4 mr-2" />
              Configure
            </Button>
            <Button 
              size="sm" 
              className="flex-1"
              onClick={onToggleStatus}
              disabled={agent.status === 'draft'}
            >
              {agent.status === 'active' ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : agent.status === 'draft' ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Draft
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Activate
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 