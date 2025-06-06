import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Play, Square, Brain, Zap, Eye, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';

interface StreamEventData {
  message: string;
  promptPreview?: string;
  responsePreview?: string;
  recommendations?: Array<{
    type: string;
    priority: string;
    description: string;
  }>;
  stats?: {
    totalCreators: number;
    analyzedCreators: number;
    actionableItems: number;
    highPriorityItems: number;
  };
  creatorName?: string;
  attempt?: number;
  waitTime?: number;
  batchIndex?: number;
  totalBatches?: number;
  count?: number;
  timestamp?: string;
}

interface StreamEvent {
  id: string;
  type: string;
  data: StreamEventData;
  timestamp: string;
}

interface LiveAnalysisStreamProps {
  brandId: string;
  triggerElement?: React.ReactNode;
}

export default function LiveAnalysisStream({ brandId, triggerElement }: LiveAnalysisStreamProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const eventIdCounter = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [events]);

  // Cleanup on unmount or when dialog closes
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Cleanup when dialog closes
  useEffect(() => {
    if (!isOpen && isStreaming) {
      stopStream();
    }
  }, [isOpen, isStreaming]);

  const startStream = async () => {
    try {
      setIsStreaming(true);
      setEvents([]);

      // Create abort controller for cleanup
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Start the streaming analysis with proper SSE handling
      const response = await fetch('/api/ugc/ai-coordinator/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to start analysis stream: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      // Read the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      addEvent('connection', { message: 'Connected to analysis stream' });

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            addEvent('connection', { message: 'Stream ended' });
            break;
          }

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          
          // Parse SSE events from the chunk
          const events = chunk.split('\n\n').filter(event => event.trim());
          
          for (const eventData of events) {
            if (eventData.trim()) {
              try {
                // Parse SSE format: "event: type\ndata: {...}"
                const lines = eventData.trim().split('\n');
                let eventType = 'message';
                let data = '';
                
                for (const line of lines) {
                  if (line.startsWith('event: ')) {
                    eventType = line.substring(7);
                  } else if (line.startsWith('data: ')) {
                    data = line.substring(6);
                  }
                }
                
                if (data) {
                  const parsedData = JSON.parse(data);
                  addEvent(eventType, parsedData);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE event:', eventData, parseError);
              }
            }
          }
        }
      } catch (streamError) {
        console.error('Stream reading error:', streamError);
        
        // Don't show error if the stream was aborted
        if (streamError instanceof Error && streamError.name === 'AbortError') {
          addEvent('connection', { message: 'Stream reading cancelled' });
        } else {
          addEvent('error', { message: `Stream error: ${streamError instanceof Error ? streamError.message : 'Unknown error'}` });
        }
      } finally {
        reader.releaseLock();
        setIsStreaming(false);
      }

    } catch (error) {
      console.error('Failed to start stream:', error);
      
      // Don't show error if the request was aborted (user stopped the stream)
      if (error instanceof Error && error.name === 'AbortError') {
        addEvent('connection', { message: 'Stream cancelled by user' });
      } else {
        addEvent('error', { message: `Failed to start stream: ${error instanceof Error ? error.message : 'Unknown error'}` });
      }
      
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    addEvent('stopped', { message: 'Stream stopped by user' });
  };

  const addEvent = (type: string, data: StreamEventData) => {
    const event: StreamEvent = {
      id: `event-${eventIdCounter.current++}`,
      type,
      data,
      timestamp: new Date().toISOString()
    };
    setEvents(prev => [...prev, event]);
  };

  const getEventIcon = (type: string) => {
    const iconProps = { className: "h-4 w-4" };
    
    switch (type) {
      case 'started':
      case 'step':
        return <Play {...iconProps} className="h-4 w-4 text-blue-500" />;
      case 'batch_start':
      case 'creator_start':
      case 'analysis_start':
        return <Zap {...iconProps} className="h-4 w-4 text-purple-500" />;
      case 'batch_complete':
      case 'creator_complete':
      case 'completed':
        return <CheckCircle {...iconProps} className="h-4 w-4 text-green-500" />;
      case 'error':
      case 'creator_error':
      case 'analysis_error':
      case 'parse_error':
        return <AlertCircle {...iconProps} className="h-4 w-4 text-red-500" />;
      case 'gemini_call':
      case 'api_attempt':
        return <Brain {...iconProps} className="h-4 w-4 text-indigo-500" />;
      case 'rate_limit_wait':
      case 'delay':
        return <Clock {...iconProps} className="h-4 w-4 text-yellow-500" />;
      case 'api_success':
      case 'parse_success':
        return <CheckCircle {...iconProps} className="h-4 w-4 text-green-500" />;
      case 'api_retry':
        return <Loader2 {...iconProps} className="h-4 w-4 text-orange-500 animate-spin" />;
      default:
        return <Eye {...iconProps} className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case 'error':
      case 'creator_error':
      case 'analysis_error':
      case 'parse_error':
        return 'bg-red-100 text-red-800';
      case 'completed':
      case 'creator_complete':
      case 'api_success':
      case 'parse_success':
        return 'bg-green-100 text-green-800';
      case 'rate_limit_wait':
      case 'delay':
        return 'bg-yellow-100 text-yellow-800';
      case 'api_retry':
        return 'bg-orange-100 text-orange-800';
      case 'gemini_call':
      case 'analysis_start':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const formatEventData = (event: StreamEvent) => {
    const { data } = event;
    
    // Show key information based on event type
    if (data.promptPreview) {
      return (
        <div className="mt-2 text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
          <div className="font-semibold mb-1">Prompt Preview:</div>
          {data.promptPreview}
        </div>
      );
    }
    
    if (data.responsePreview) {
      return (
        <div className="mt-2 text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
          <div className="font-semibold mb-1">Response Preview:</div>
          {data.responsePreview}
        </div>
      );
    }
    
    if (data.recommendations && data.recommendations.length > 0) {
      return (
        <div className="mt-2 text-xs text-gray-600">
          <div className="font-semibold mb-1">Recommendations:</div>
          {data.recommendations.map((rec, index) => (
            <div key={index} className="ml-2">
              • [{rec.priority?.toUpperCase()}] {rec.type}: {rec.description}
            </div>
          ))}
        </div>
      );
    }
    
    if (data.stats) {
      return (
        <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-2">
          <div>Total Creators: {data.stats.totalCreators}</div>
          <div>AI Analyzed: {data.stats.analyzedCreators}</div>
          <div>Action Items: {data.stats.actionableItems}</div>
          <div>High Priority: {data.stats.highPriorityItems}</div>
        </div>
      );
    }
    
    // Show additional data if available
    const additionalInfo = [];
    if (data.creatorName) additionalInfo.push(`Creator: ${data.creatorName}`);
    if (data.attempt) additionalInfo.push(`Attempt: ${data.attempt}`);
    if (data.waitTime) additionalInfo.push(`Wait: ${data.waitTime}ms`);
    if (data.batchIndex) additionalInfo.push(`Batch: ${data.batchIndex}/${data.totalBatches || '?'}`);
    if (data.count !== undefined) additionalInfo.push(`Count: ${data.count}`);
    
    return additionalInfo.length > 0 ? (
      <div className="mt-1 text-xs text-gray-500">
        {additionalInfo.join(' • ')}
      </div>
    ) : null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerElement || (
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Live Stream
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>AI Coordinator Live Analysis Stream</DialogTitle>
          <DialogDescription>
            Watch the AI coordinator analyze creators in real-time
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isStreaming ? (
                <Button onClick={stopStream} variant="destructive" size="sm">
                  <Square className="h-4 w-4 mr-2" />
                  Stop Stream
                </Button>
              ) : (
                <Button onClick={startStream} size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Start Analysis Stream
                </Button>
              )}
              
              <Badge variant={isStreaming ? "default" : "secondary"}>
                {isStreaming ? "Streaming" : "Stopped"}
              </Badge>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setEvents([])}
              disabled={isStreaming}
            >
              Clear Log
            </Button>
          </div>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Analysis Log</CardTitle>
              <CardDescription>
                Real-time events from the AI coordinator ({events.length} events)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px] w-full overflow-y-auto">
                <div className="p-4 space-y-2">
                  {events.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No events yet. Start the analysis stream to see live updates.</p>
                    </div>
                  ) : (
                    events.map((event) => (
                      <div key={event.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
                        <div className="flex-shrink-0 mt-0.5">
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <Badge className={`text-xs px-2 py-0.5 ${getEventBadgeColor(event.type)}`}>
                              {event.type}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{event.data.message}</p>
                          {formatEventData(event)}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={eventsEndRef} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
} 