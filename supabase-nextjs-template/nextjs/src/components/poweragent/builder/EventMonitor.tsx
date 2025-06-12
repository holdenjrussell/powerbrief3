'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Activity, Trash2, Download, Search, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Event {
  id: string;
  type: 'start' | 'end' | 'tool_start' | 'tool_end' | 'handoff' | 'error';
  timestamp: Date;
  agentName: string;
  details: Record<string, unknown>;
  duration?: number;
  status?: 'success' | 'error' | 'running';
}

interface EventMonitorProps {
  events?: Event[];
  onClear?: () => void;
  isLive?: boolean;
}

export function EventMonitor({ events = [], onClear, isLive = false }: EventMonitorProps) {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const displayEvents = events;

  const filteredEvents = displayEvents.filter(event => {
    const matchesFilter = filter === 'all' || event.type === filter || event.status === filter;
    const matchesSearch = searchTerm === '' || 
      event.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(event.details).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getEventIcon = (type: string, status?: string) => {
    if (status === 'error') return <XCircle className="h-4 w-4 text-red-500" />;
    if (status === 'running') return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
    if (status === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-gray-500" />;
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'start': return 'bg-blue-100 text-blue-800';
      case 'end': return 'bg-green-100 text-green-800';
      case 'tool_start': return 'bg-purple-100 text-purple-800';
      case 'tool_end': return 'bg-purple-100 text-purple-800';
      case 'handoff': return 'bg-orange-100 text-orange-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `agent-events-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Event Monitor
              {isLive && (
                <Badge variant="secondary" className="animate-pulse">
                  LIVE
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Track your agent&apos;s execution in real-time. View events, tool calls, and performance metrics to debug issues and optimize behavior.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={exportEvents}
              disabled={filteredEvents.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onClear}
              disabled={filteredEvents.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="filter">Filter</Label>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger id="filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="start">Start Events</SelectItem>
                  <SelectItem value="end">End Events</SelectItem>
                  <SelectItem value="tool_start">Tool Start</SelectItem>
                  <SelectItem value="tool_end">Tool End</SelectItem>
                  <SelectItem value="handoff">Handoffs</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-2">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                {filteredEvents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No events to display
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="mt-1">
                          {getEventIcon(event.type, event.status)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={getEventColor(event.type)}>
                              {event.type.replace('_', ' ')}
                            </Badge>
                            <span className="font-medium">{event.agentName}</span>
                            {event.duration && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {event.duration}ms
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {event.timestamp.toLocaleTimeString()}
                          </div>
                          <div className="text-sm">
                            {event.type === 'tool_start' && event.details.toolName && (
                              <span>Tool: {event.details.toolName as string}</span>
                            )}
                            {event.type === 'end' && event.details.usage && (
                              <span>Tokens: {(event.details.usage as { totalTokens: number }).totalTokens}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="details" className="space-y-2">
              {selectedEvent ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Event Details</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedEvent(null)}
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Event Type</Label>
                        <Badge className={getEventColor(selectedEvent.type)}>
                          {selectedEvent.type}
                        </Badge>
                      </div>
                      <div>
                        <Label>Agent</Label>
                        <p className="text-sm">{selectedEvent.agentName}</p>
                      </div>
                      <div>
                        <Label>Timestamp</Label>
                        <p className="text-sm">{selectedEvent.timestamp.toLocaleString()}</p>
                      </div>
                      {selectedEvent.duration && (
                        <div>
                          <Label>Duration</Label>
                          <p className="text-sm">{selectedEvent.duration}ms</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Details</Label>
                      <pre className="mt-2 p-4 bg-muted rounded-lg text-sm overflow-auto">
                        {JSON.stringify(selectedEvent.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Select an event from the timeline to view details
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
} 