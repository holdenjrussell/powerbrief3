'use client';

import React, { useState, useEffect } from 'react';
import { Mail, MessageSquare, Settings, Bot, User, Clock, ArrowRight, ExternalLink, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface CommunicationLogEntry {
  id: string;
  log_type: string;
  source: string;
  subject: string | null;
  content: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  performed_by: string | null;
  email_thread_id: string | null;
  email_message_id: string | null;
  sequence_enrollment_id: string | null;
  ai_coordinator_action_id: string | null;
}

interface CreatorCommunicationLogProps {
  creatorId: string;
  brandId: string;
}

export default function CreatorCommunicationLog({ creatorId, brandId }: CreatorCommunicationLogProps) {
  const [logs, setLogs] = useState<CommunicationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCommunicationLogs();
  }, [creatorId, brandId]);

  const fetchCommunicationLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ugc/creators/${creatorId}/communication-log?brandId=${brandId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch communication logs');
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load communication logs');
    } finally {
      setLoading(false);
    }
  };

  const getLogIcon = (logType: string) => {
    switch (logType) {
      case 'email_sent':
      case 'email_received':
        return <Mail className="w-4 h-4 text-blue-500" />;
      case 'status_change':
        return <Settings className="w-4 h-4 text-orange-500" />;
      case 'ai_analysis':
        return <Bot className="w-4 h-4 text-purple-500" />;
      case 'sequence_enrollment':
        return <ArrowRight className="w-4 h-4 text-green-500" />;
      case 'note':
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getLogTypeColor = (logType: string) => {
    switch (logType) {
      case 'email_sent':
        return 'bg-blue-100 text-blue-800';
      case 'email_received':
        return 'bg-green-100 text-green-800';
      case 'status_change':
        return 'bg-orange-100 text-orange-800';
      case 'ai_analysis':
        return 'bg-purple-100 text-purple-800';
      case 'sequence_enrollment':
        return 'bg-teal-100 text-teal-800';
      case 'note':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatLogType = (logType: string) => {
    return logType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
    }
  };

  const filteredLogs = logs.filter(log => {
    // Type filter
    if (filterType !== 'all' && log.log_type !== filterType) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.subject?.toLowerCase().includes(query) ||
        log.content?.toLowerCase().includes(query) ||
        log.log_type.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const renderMetadata = (metadata: Record<string, any> | null) => {
    if (!metadata) return null;

    return (
      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key} className="flex justify-between">
            <span className="font-medium">{key}:</span>
            <span className="text-gray-600">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchCommunicationLogs}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Communication Log
            <Badge variant="outline">{filteredLogs.length} entries</Badge>
          </CardTitle>
          
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-48"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="email_sent">Email Sent</SelectItem>
                <SelectItem value="email_received">Email Received</SelectItem>
                <SelectItem value="status_change">Status Change</SelectItem>
                <SelectItem value="ai_analysis">AI Analysis</SelectItem>
                <SelectItem value="sequence_enrollment">Sequence Enrollment</SelectItem>
                <SelectItem value="note">Note</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No communication logs found</p>
            <p className="text-sm">
              {filterType !== 'all' || searchQuery 
                ? 'Try adjusting your filters or search' 
                : 'Communication activity will appear here'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getLogIcon(log.log_type)}
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${getLogTypeColor(log.log_type)}`}>
                          {formatLogType(log.log_type)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          via {log.source}
                        </span>
                      </div>
                      {log.subject && (
                        <h4 className="font-medium text-sm mt-1">{log.subject}</h4>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {formatDate(log.created_at)}
                    </span>
                    
                    {/* Action buttons for related items */}
                    {log.email_thread_id && (
                      <Button size="sm" variant="ghost" className="h-6 px-2">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {log.content && (
                  <div className="text-sm text-gray-700 mb-2">
                    {log.content.length > 200 
                      ? `${log.content.substring(0, 200)}...` 
                      : log.content
                    }
                  </div>
                )}
                
                {renderMetadata(log.metadata)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 