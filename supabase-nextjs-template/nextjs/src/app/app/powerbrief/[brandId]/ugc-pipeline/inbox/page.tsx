'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  Label
} from "@/components/ui";
import { 
  ArrowLeft, 
  Mail, 
  Send, 
  Clock, 
  Search, 
  User,
  MessageSquare,
  Plus
} from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { getBrandById } from '@/lib/services/powerbriefService';
import { Brand } from '@/lib/types/powerbrief';
import AiChatAssistant from '@/components/ugc/AiChatAssistant';

// Helper to unwrap params safely
type ParamsType = { brandId: string };

interface EmailThread {
  id: string;
  creator_id: string;
  creator_name: string;
  creator_email: string;
  thread_subject: string;
  status: string;
  message_count: number;
  last_message_at: string;
  last_message_from: string;
  last_message_preview: string;
  unread_count: number;
}

interface EmailMessage {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  html_content: string;
  text_content: string;
  created_at: string;
  status: string;
}

interface Creator {
  id: string;
  name: string;
  email: string;
}

type FilterType = 'all' | 'unread' | 'active' | 'closed';

export default function EmailInboxPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const { user } = useAuth();
  const [brand, setBrand] = useState<Brand | null>(null);
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
  
  // New Message Modal State
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [newMessageCreatorId, setNewMessageCreatorId] = useState('');
  const [newMessageSubject, setNewMessageSubject] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Unwrap params using React.use()
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const { brandId } = unwrappedParams;

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch brand data
        const brandData = await getBrandById(brandId);
        setBrand(brandData);
        
        // Fetch email threads and creators
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

    fetchData();
  }, [user?.id, brandId]);

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
          subject: selectedThreadData.thread_subject,
          htmlContent: replyMessage.trim(),
          textContent: replyMessage.trim().replace(/<[^>]*>/g, ''), // Strip HTML for text version
          threadId: selectedThread,
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send reply');
      }

      // Clear reply input and refresh messages
      setReplyMessage('');
      await fetchThreadMessages(selectedThread);
      await fetchEmailThreads(); // Refresh thread list
      
    } catch (err) {
      console.error('Failed to send reply:', err);
      setError('Failed to send reply. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleSendNewMessage = async () => {
    if (!newMessageCreatorId || !newMessageSubject.trim() || !newMessageContent.trim()) {
      return;
    }

    setSendingMessage(true);
    try {
      const selectedCreator = creators.find(c => c.id === newMessageCreatorId);
      if (!selectedCreator) {
        throw new Error('Creator not found');
      }

      const response = await fetch('/api/ugc/email/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brandId,
          creatorId: newMessageCreatorId,
          subject: newMessageSubject.trim(),
          htmlContent: newMessageContent.trim(),
          textContent: newMessageContent.trim().replace(/<[^>]*>/g, ''), // Strip HTML for text version
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Reset form and close modal
      setNewMessageCreatorId('');
      setNewMessageSubject('');
      setNewMessageContent('');
      setShowNewMessageModal(false);
      
      // Refresh threads
      await fetchEmailThreads();
      
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredThreads = threads.filter(thread => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!thread.creator_name.toLowerCase().includes(query) &&
          !thread.thread_subject.toLowerCase().includes(query) &&
          !thread.creator_email.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Apply status filter
    switch (activeFilter) {
      case 'unread':
        return thread.unread_count > 0;
      case 'active':
        return thread.status === 'active';
      case 'closed':
        return thread.status === 'closed';
      default:
        return true;
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getUnreadCount = (filter: string) => {
    return threads.filter(thread => {
      switch (filter) {
        case 'unread':
          return thread.unread_count > 0;
        case 'active':
          return thread.status === 'active';
        case 'closed':
          return thread.status === 'closed';
        default:
          return true;
      }
    }).length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Brand not found.</p>
        </div>
        <Link href={`/app/powerbrief/${brandId}/ugc-pipeline`}>
          <Button className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to UGC Pipeline
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link href={`/app/powerbrief/${brandId}/ugc-pipeline`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="ml-4">
            <h1 className="text-2xl font-bold">Creator Inbox</h1>
            <p className="text-gray-600">{brand.name} • {threads.length} conversations</p>
          </div>
        </div>
        
        <Button 
          className="flex items-center gap-2"
          onClick={() => setShowNewMessageModal(true)}
        >
          <Plus className="w-4 h-4" />
          New Message
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as FilterType)}>
            <TabsList>
              <TabsTrigger value="all">
                All ({getUnreadCount('all')})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread ({threads.filter(t => t.unread_count > 0).length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({getUnreadCount('active')})
              </TabsTrigger>
              <TabsTrigger value="closed">
                Closed ({getUnreadCount('closed')})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchEmailThreads}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Email Inbox Layout */}
      <div className="flex-1 flex bg-white rounded-lg border overflow-hidden">
        {/* Thread List */}
        <div className="w-1/3 border-r">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-medium">Conversations</h3>
          </div>
          
          <div className="overflow-y-auto h-full">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No conversations found</p>
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
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedThread === thread.id ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
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
                  
                  <div className="text-sm font-medium mb-1 truncate">
                    {thread.thread_subject}
                  </div>
                  
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      thread.last_message_from.includes('@mail.powerbrief.ai') 
                        ? 'bg-blue-400' 
                        : 'bg-green-400'
                    }`}></span>
                    <span className="truncate">
                      {thread.last_message_preview}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="text-xs">
                      {thread.status}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {thread.message_count} message{thread.message_count !== 1 ? 's' : ''}
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
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {filteredThreads.find(t => t.id === selectedThread)?.thread_subject}
                    </h3>
                    <p className="text-sm text-gray-600">
                      with {filteredThreads.find(t => t.id === selectedThread)?.creator_name}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Link href={`/app/powerbrief/${brandId}/ugc-pipeline/creators/${
                        filteredThreads.find(t => t.id === selectedThread)?.creator_id
                      }`}>
                        View Creator
                      </Link>
                    </Button>
                    <Button size="sm">
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto">
                {loadingMessages ? (
                  <div className="text-center text-gray-500 py-8">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300 animate-spin" />
                    <p>Loading messages...</p>
                  </div>
                ) : threadMessages.length > 0 ? (
                  <div className="space-y-4">
                    {threadMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-4 rounded-lg max-w-[80%] ${
                          message.from_email.includes('@mail.powerbrief.ai')
                            ? 'bg-blue-100 ml-auto text-right'
                            : 'bg-gray-100 mr-auto'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
                          <span className={`inline-block w-2 h-2 rounded-full ${
                            message.from_email.includes('@mail.powerbrief.ai') 
                              ? 'bg-blue-400' 
                              : 'bg-green-400'
                          }`}></span>
                          <span>
                            {message.from_email.includes('@mail.powerbrief.ai') ? 'You' : 'Creator'}
                          </span>
                          <span>•</span>
                          <span>{formatDate(message.created_at)}</span>
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
                        
                        {/* Debug info - temporarily show what's in the message */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                            <strong>Debug:</strong><br/>
                            <strong>Subject:</strong> {message.subject}<br/>
                            <strong>HTML:</strong> {message.html_content?.substring(0, 100)}...<br/>
                            <strong>Text:</strong> {message.text_content?.substring(0, 100)}...
                          </div>
                        )}
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
              <div className="p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Type your message..." 
                    className="flex-1"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={handleReplyKeyDown}
                    disabled={sendingReply}
                  />
                  <Button 
                    onClick={handleSendReply}
                    disabled={!replyMessage.trim() || sendingReply}
                  >
                    {sendingReply ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p>Choose a conversation from the left to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      <Dialog open={showNewMessageModal} onOpenChange={setShowNewMessageModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Send a new message to a creator
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="creator-select">Creator</Label>
              <Select value={newMessageCreatorId} onValueChange={setNewMessageCreatorId}>
                <SelectTrigger className="mt-1">
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
              <Label htmlFor="subject-input">Subject</Label>
              <Input
                id="subject-input"
                value={newMessageSubject}
                onChange={(e) => setNewMessageSubject(e.target.value)}
                placeholder="Enter email subject"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="content-input">Message</Label>
              <Textarea
                id="content-input"
                value={newMessageContent}
                onChange={(e) => setNewMessageContent(e.target.value)}
                placeholder="Enter your message"
                className="mt-1"
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowNewMessageModal(false)}
              disabled={sendingMessage}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendNewMessage}
              disabled={!newMessageCreatorId || !newMessageSubject.trim() || !newMessageContent.trim() || sendingMessage}
            >
              {sendingMessage ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating AI Chat Assistant */}
      {brand && (
        <AiChatAssistant 
          brandId={brand.id}
          brandName={brand.name}
          creators={creators.map(c => ({ id: c.id, name: c.name || c.email || 'Unknown', status: 'active' }))}
        />
      )}
    </div>
  );
} 