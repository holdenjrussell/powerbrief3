"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useBrand } from '@/lib/context/BrandContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, 
  Plus, 
  Bot, 
  Search,
  Filter,
  Edit,
  Trash2,
  Download,
  Upload,
  BarChart3,
  Settings,
  ArrowUpDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AgentCard } from '@/components/poweragent/AgentCard';
import { AgentMetrics } from '@/components/poweragent/AgentMetrics';
import { CreateTestAgentButton } from '@/components/poweragent/CreateTestAgentButton';

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

export default function AgentsPage() {
  const { user } = useGlobal();
  const { selectedBrand } = useBrand();
  const router = useRouter();
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showMetrics, setShowMetrics] = useState(false);

  useEffect(() => {
    if (selectedBrand) {
      fetchAgents();
    }
  }, [selectedBrand]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/poweragent/agents?brandId=${selectedBrand?.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = () => {
    router.push('/app/poweragent/builder');
  };

  const handleEditAgent = (agent: Agent) => {
    router.push(`/app/poweragent/builder?id=${agent.id}`);
  };

  const handleDuplicateAgent = async (agent: Agent) => {
    try {
      const response = await fetch('/api/poweragent/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...agent.config,
          name: `${agent.name} (Copy)`,
          brand_id: selectedBrand?.id,
        }),
      });

      if (response.ok) {
        fetchAgents();
      }
    } catch (error) {
      console.error('Error duplicating agent:', error);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    
    try {
      const response = await fetch(`/api/poweragent/agents/${agentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchAgents();
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
    }
  };

  const handleToggleStatus = async (agent: Agent) => {
    const newStatus = agent.status === 'active' ? 'paused' : 'active';
    
    try {
      const response = await fetch(`/api/poweragent/agents/${agent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        fetchAgents();
      }
    } catch (error) {
      console.error('Error updating agent status:', error);
    }
  };

  const filteredAndSortedAgents = agents
    .filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           agent.purpose.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated_at':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'usage':
          return (b.usage_stats?.total_calls || 0) - (a.usage_stats?.total_calls || 0);
        default:
          return 0;
      }
    });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              PowerAgents
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your AI agents for {selectedBrand?.name}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMetrics(!showMetrics)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {showMetrics ? 'Hide' : 'Show'} Analytics
            </Button>
            <Button onClick={handleCreateAgent}>
              <Plus className="h-4 w-4 mr-2" />
              Create Agent
            </Button>
          </div>
        </div>

        {/* Test Agent Creation */}
        {agents.length === 0 && (
          <div className="mb-6">
            <CreateTestAgentButton />
          </div>
        )}

        {/* Metrics Panel */}
        {showMetrics && (
          <AgentMetrics agents={agents} />
        )}

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_at">Recent</SelectItem>
                <SelectItem value="created_at">Created</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="usage">Usage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredAndSortedAgents.length} of {agents.length} agents
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading agents...</span>
        </div>
      ) : filteredAndSortedAgents.length === 0 ? (
        <div className="text-center py-12">
          {agents.length === 0 ? (
            // No agents at all
            <div>
              <Bot className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-medium mb-2">No Agents Yet</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Create your first AI agent to get started. You can build specialized agents for different tasks and manage them all from here.
              </p>
              <Button onClick={handleCreateAgent} size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Agent
              </Button>
            </div>
          ) : (
            // No search results
            <div>
              <Search className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-medium mb-2">No Agents Found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search or filter criteria
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        // Agent Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={() => handleEditAgent(agent)}
              onDuplicate={() => handleDuplicateAgent(agent)}
              onDelete={() => handleDeleteAgent(agent.id)}
              onToggleStatus={() => handleToggleStatus(agent)}
              onViewMetrics={() => setSelectedAgent(agent)}
            />
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {agents.length > 0 && (
        <div className="mt-8 pt-8 border-t">
          <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export All Agents
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import Agents
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Bulk Settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 