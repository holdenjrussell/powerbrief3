import React, { useState, useEffect } from 'react';
import { 
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui";
import { 
  ArrowLeft, 
  Mail, 
  Send, 
  Clock, 
  Search, 
  User,
  MessageSquare,
  Plus,
  MoreVertical,
  Archive,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Settings,
  Zap
} from "lucide-react";

interface EmailThread {
  id: string;
  creator_id: string;
  creator_name: string;
  creator_email: string;
  thread_subject: string;
  status: string;
  phase: string;
  is_primary: boolean;
  message_count: number;
  last_message_at: string;
  last_message_from: string;
  last_message_preview: string;
  unread_count: number;
  created_at: string;
  closed_at?: string;
  closed_reason?: string;
}

interface EmailMessage {
  id: string;
  thread_id: string;
  from_email: string;
  to_email: string;
  subject: string;
  html_content: string;
  text_content: string;
  created_at: string;
  status: string;
  is_deleted: boolean;
  deleted_at?: string;
}

interface Creator {
  id: string;
  name: string;
  email: string;
}

type FilterType = 'all' | 'unread' | 'active' | 'closed' | 'primary';

interface AdvancedEmailInboxProps {
  brandId: string;
  brandName: string;
}

const CONVERSATION_PHASES = [
  'cold_outreach',
  'negotiation', 
  'onboarding',
  'script_assignment',
  'production',
  'review',
  'payment',
  'completed',
  'rejected'
];

const PHASE_COLORS = {
  cold_outreach: 'bg-blue-100 text-blue-800',
  negotiation: 'bg-yellow-100 text-yellow-800',
  onboarding: 'bg-green-100 text-green-800',
  script_assignment: 'bg-purple-100 text-purple-800',
  production: 'bg-orange-100 text-orange-800',
  review: 'bg-indigo-100 text-indigo-800',
  payment: 'bg-pink-100 text-pink-800',
  completed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800'
};

export default function AdvancedEmailInbox({ brandId, brandName }: AdvancedEmailInboxProps) {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<EmailMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  
  // Thread Management State
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [showThreadActions, setShowThreadActions] = useState(false);
  const [showMessageActions, setShowMessageActions] = useState<string | null>(null);
  
  // New Message Modal State
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessageCreatorId, setNewMessageCreatorId] = useState('');
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchData();
  }, [brandId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchEmailThreads(),
        fetchCreators()
      ]);
    } catch (err: unknown) {
      console.error('Failed to fetch data:', err);
      setError('Failed to fetch inbox data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailThreads = async () => {
    try {
      const response = await fetch(`/api/ugc/inbox?brandId=${brandId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch email threads');
      }
      
      const data = await response.json();
      setThreads(data.threads || []);
    } catch (err) {
      console.error('Failed to fetch email threads:', err);
      setError('Failed to load email threads');
    }
  };

  const fetchCreators = async () => {
    try {
      const response = await fetch(`/api/ugc/creators?brandId=${brandId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch creators');
      }
      
      const data = await response.json();
      setCreators(data.creators || []);
    } catch (err) {
      console.error('Failed to fetch creators:', err);
    }
  };

  const fetchThreadMessages = async (threadId: string) => {
    try {
      setLoadingMessages(true);
      const response = await fetch(`/api/ugc/inbox/messages?threadId=${threadId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch thread messages');
      }
      
      const data = await response.json();
      setThreadMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to fetch thread messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleThreadSelect = (threadId: string) => {
    setSelectedThread(threadId);
    fetchThreadMessages(threadId);
  };

  const handleCloseThread = async () => {
    if (!selectedThread || !closeReason.trim()) return;

    try {
      const response = await fetch(`/api/ugc/inbox/threads/${selectedThread}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'close',
          reason: closeReason,
          brandId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to close thread');
      }

      setShowCloseDialog(false);
      setCloseReason('');
      fetchEmailThreads();
    } catch (err) {
      console.error('Failed to close thread:', err);
      setError('Failed to close thread');
    }
  };

  const handleArchiveThread = async (threadId: string) => {
    try {
      const response = await fetch(`/api/ugc/inbox/threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'archive',
          brandId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive thread');
      }

      fetchEmailThreads();
    } catch (err) {
      console.error('Failed to archive thread:', err);
      setError('Failed to archive thread');
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    try {
      const response = await fetch(`/api/ugc/inbox/messages/${messageToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      setShowDeleteDialog(false);
      setMessageToDelete(null);
      if (selectedThread) {
        fetchThreadMessages(selectedThread);
      }
      fetchEmailThreads();
    } catch (err) {
      console.error('Failed to delete message:', err);
      setError('Failed to delete message');
    }
  };

  const handleSendReply = async () => {
    if (!selectedThread || !replyMessage.trim()) return;

    const selectedThreadData = filteredThreads.find(t => t.id === selectedThread);
    if (!selectedThreadData) return;

    setSendingReply(true);
    try {
      const response = await fetch('/api/ugc/email/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          creatorId: selectedThreadData.creator_id,
          threadId: selectedThread,
          subject: `Re: ${selectedThreadData.thread_subject}`,
          htmlContent: replyMessage.replace(/\n/g, '<br>'),
          textContent: replyMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send reply');
      }

      setReplyMessage('');
      fetchThreadMessages(selectedThread);
      fetchEmailThreads();
    } catch (err) {
      console.error('Failed to send reply:', err);
      setError('Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleSendNewMessage = async () => {
    if (!newMessageCreatorId || !newMessageSubject.trim() || !newMessageContent.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setSendingMessage(true);
    try {
      const response = await fetch('/api/ugc/email/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          creatorId: newMessageCreatorId,
          subject: newMessageSubject,
          htmlContent: newMessageContent.replace(/\n/g, '<br>'),
          textContent: newMessageContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setShowNewMessageModal(false);
      setNewMessageCreatorId('');
      setNewMessageSubject('');
      setNewMessageContent('');
      fetchEmailThreads();
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getPhaseLabel = (phase: string) => {
    return phase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredThreads = threads.filter(thread => {
    const matchesSearch = !searchQuery || 
      thread.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.thread_subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.creator_email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || 
      (activeFilter === 'unread' && thread.unread_count > 0) ||
      (activeFilter === 'active' && thread.status === 'active') ||
      (activeFilter === 'closed' && thread.status === 'closed') ||
      (activeFilter === 'primary' && thread.is_primary);
    
    return matchesSearch && matchesFilter;
  });

  const getFilterCount = (filter: FilterType) => {
    switch (filter) {
      case 'unread':
        return threads.filter(t => t.unread_count > 0).length;
      case 'active':
        return threads.filter(t => t.status === 'active').length;
      case 'closed':
        return threads.filter(t => t.status === 'closed').length;
      case 'primary':
        return threads.filter(t => t.is_primary).length;
      default:
        return threads.length;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Creator Inbox</h1>
            <p className="text-gray-600">Advanced email threading for {brandName}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowNewMessageModal(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={activeFilter} onValueChange={(value: string) => setActiveFilter(value as FilterType)}>
            <TabsList>
              <TabsTrigger value="all">
                All ({getFilterCount('all')})
              </TabsTrigger>
              <TabsTrigger value="primary">
                Primary ({getFilterCount('primary')})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread ({getFilterCount('unread')})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({getFilterCount('active')})
              </TabsTrigger>
              <TabsTrigger value="closed">
                Closed ({getFilterCount('closed')})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-600">{error}</p>
          </div>
          <button 
            onClick={fetchData}
            className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
          >
            Try again
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex bg-white overflow-hidden">
        {/* Thread List */}
        <div className="w-1/3 border-r bg-gray-50">
          <div className="p-4 border-b bg-white">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Conversations</h3>
              <Badge variant="secondary" className="text-xs">
                {filteredThreads.length}
              </Badge>
            </div>
          </div>
          
          <div className="overflow-y-auto h-full">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">No conversations found</p>
                <p className="text-sm">
                  {searchQuery || activeFilter !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Start a conversation with a creator'
                  }
                </p>
              </div>
            ) : (
              filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  onClick={() => handleThreadSelect(thread.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-white transition-colors ${
                    selectedThread === thread.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4 text-gray-400" />
                        {thread.is_primary && (
                          <Zap className="w-3 h-3 text-yellow-500" title="Primary Thread" />
                        )}
                      </div>
                      <span className="font-medium text-sm">{thread.creator_name}</span>
                      {thread.unread_count > 0 && (
                        <Badge variant="destructive" className="text-xs px-1 py-0">
                          {thread.unread_count}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(thread.last_message_at)}
                    </span>
                  </div>
                  
                  <div className="text-sm font-medium mb-2 truncate">
                    {thread.thread_subject}
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2 line-clamp-2">
                    {thread.last_message_preview}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${PHASE_COLORS[thread.phase as keyof typeof PHASE_COLORS] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {getPhaseLabel(thread.phase)}
                      </Badge>
                      <Badge 
                        variant={thread.status === 'active' ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {thread.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-400">
                      {thread.message_count} msg{thread.message_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Thread Detail */}
        <div className="flex-1 flex flex-col">
          {selectedThread ? (
            <div className="flex-1 flex flex-col">
              {/* Thread Header */}
              <div className="p-4 border-b bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">
                        {filteredThreads.find(t => t.id === selectedThread)?.thread_subject}
                      </h3>
                      {filteredThreads.find(t => t.id === selectedThread)?.is_primary && (
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                          <Zap className="w-3 h-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      with {filteredThreads.find(t => t.id === selectedThread)?.creator_name}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge 
                        className={`text-xs ${PHASE_COLORS[filteredThreads.find(t => t.id === selectedThread)?.phase as keyof typeof PHASE_COLORS] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {getPhaseLabel(filteredThreads.find(t => t.id === selectedThread)?.phase || '')}
                      </Badge>
                      <Badge 
                        variant={filteredThreads.find(t => t.id === selectedThread)?.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {filteredThreads.find(t => t.id === selectedThread)?.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowThreadActions(!showThreadActions)}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                    {showThreadActions && (
                      <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[150px]">
                        <button
                          onClick={() => {
                            setShowCloseDialog(true);
                            setShowThreadActions(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Close Thread
                        </button>
                        <button
                          onClick={() => {
                            handleArchiveThread(selectedThread);
                            setShowThreadActions(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Archive className="w-4 h-4" />
                          Archive
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                {loadingMessages ? (
                  <div className="text-center text-gray-500 py-8">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300 animate-spin" />
                    <p>Loading messages...</p>
                  </div>
                ) : threadMessages.filter(m => !m.is_deleted).length > 0 ? (
                  <div className="space-y-4">
                    {threadMessages.filter(m => !m.is_deleted).map((message) => (
                      <div
                        key={message.id}
                        className={`group relative p-4 rounded-lg max-w-[80%] ${
                          message.from_email.includes('@mail.powerbrief.ai')
                            ? 'bg-blue-100 ml-auto'
                            : 'bg-white mr-auto shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className={`inline-block w-2 h-2 rounded-full ${
                              message.from_email.includes('@mail.powerbrief.ai') 
                                ? 'bg-blue-400' 
                                : 'bg-green-400'
                            }`}></span>
                            <span className="font-medium">
                              {message.from_email.includes('@mail.powerbrief.ai') ? 'You' : 'Creator'}
                            </span>
                            <span>•</span>
                            <span>{formatDate(message.created_at)}</span>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                            onClick={() => setShowMessageActions(showMessageActions === message.id ? null : message.id)}
                          >
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                          {showMessageActions === message.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[120px]">
                              <button
                                onClick={() => {
                                  setMessageToDelete(message.id);
                                  setShowDeleteDialog(true);
                                  setShowMessageActions(null);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Message
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {message.subject && (
                          <div className="font-medium text-sm mb-2">
                            {message.subject}
                          </div>
                        )}
                        
                        <div className="text-sm">
                          {message.html_content ? (
                            <div dangerouslySetInnerHTML={{ __html: message.html_content }} />
                          ) : (
                            <p className="whitespace-pre-wrap">{message.text_content}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No messages in this conversation</p>
                    <p className="text-sm">Start the conversation by sending a message</p>
                  </div>
                )}
              </div>
              
              {/* Reply Box */}
              <div className="p-4 border-t bg-white">
                <div className="flex gap-3">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReplyMessage(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        handleSendReply();
                      }
                    }}
                    className="flex-1 min-h-[80px] resize-none"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || sendingReply}
                    className="self-end"
                  >
                    {sendingReply ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Press Cmd+Enter to send
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a thread from the left to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      <Dialog open={showNewMessageModal} onOpenChange={setShowNewMessageModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Compose New Message</DialogTitle>
            <DialogDescription>
              Send a new message to a creator. This will create a new thread.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="creator-select">Creator</Label>
              <Select value={newMessageCreatorId} onValueChange={setNewMessageCreatorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a creator" />
                </SelectTrigger>
                <SelectContent>
                  {creators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      {creator.name} ({creator.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={newMessageSubject}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessageSubject(e.target.value)}
                placeholder="Enter message subject"
              />
            </div>
            
            <div>
              <Label htmlFor="content">Message</Label>
              <Textarea
                id="content"
                value={newMessageContent}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessageContent(e.target.value)}
                placeholder="Type your message here..."
                className="min-h-[120px]"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewMessageModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendNewMessage}
              disabled={!newMessageCreatorId || !newMessageSubject.trim() || !newMessageContent.trim() || sendingMessage}
            >
              {sendingMessage ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Thread Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Thread</DialogTitle>
            <DialogDescription>
              This will close the conversation thread. You can provide a reason for closing.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="close-reason">Reason for closing (optional)</Label>
            <Textarea
              id="close-reason"
              value={closeReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCloseReason(e.target.value)}
              placeholder="e.g., Project completed, Creator unresponsive, etc."
              className="mt-2"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloseThread}>
              Close Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Message Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              This will permanently delete this message. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteDialog(false);
              setMessageToDelete(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteMessage}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 