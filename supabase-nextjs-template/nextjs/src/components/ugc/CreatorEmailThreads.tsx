'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Send, Clock, CheckCircle, XCircle, MessageSquare, Plus, Reply } from 'lucide-react';

interface EmailMessage {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  html_content: string;
  text_content: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  template_id: string | null;
  variables_used: Record<string, unknown> | null;
}

interface EmailThread {
  id: string;
  thread_subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  messages: EmailMessage[];
}

interface CreatorEmailThreadsProps {
  creatorId: string;
  brandId: string;
}

interface ComposeEmailData {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export default function CreatorEmailThreads({ creatorId, brandId }: CreatorEmailThreadsProps) {
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [showCompose, setShowCompose] = useState(false);
  const [composing, setComposing] = useState(false);
  const [composeData, setComposeData] = useState<ComposeEmailData>({
    subject: '',
    htmlContent: '',
    textContent: ''
  });

  useEffect(() => {
    fetchEmailThreads();
  }, [creatorId, brandId]);

  const fetchEmailThreads = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ugc/creators/${creatorId}/email-threads?brandId=${brandId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch email threads');
      }
      
      const data = await response.json();
      setThreads(data.threads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email threads');
    } finally {
      setLoading(false);
    }
  };

  const toggleThread = (threadId: string) => {
    const newExpanded = new Set(expandedThreads);
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId);
    } else {
      newExpanded.add(threadId);
    }
    setExpandedThreads(newExpanded);
  };

  const handleCompose = async () => {
    if (!composeData.subject || !composeData.htmlContent) {
      alert('Please fill in subject and content');
      return;
    }

    try {
      setComposing(true);
      
      const response = await fetch('/api/ugc/email/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creatorId,
          brandId,
          subject: composeData.subject,
          htmlContent: composeData.htmlContent,
          textContent: composeData.textContent || composeData.htmlContent.replace(/<[^>]*>/g, ''),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      // Reset compose form
      setComposeData({
        subject: '',
        htmlContent: '',
        textContent: ''
      });
      setShowCompose(false);
      
      // Refresh threads
      fetchEmailThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setComposing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Mail className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchEmailThreads}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with compose button */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Email Communications</h3>
          <span className="text-sm text-gray-500">({threads.length} threads)</span>
        </div>
        
        <button
          onClick={() => setShowCompose(!showCompose)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Compose Email
        </button>
      </div>

      {/* Compose Email Form */}
      {showCompose && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium mb-4">Compose New Email</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={composeData.subject}
                onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                placeholder="Email subject..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Content (HTML)
              </label>
              <textarea
                value={composeData.htmlContent}
                onChange={(e) => setComposeData({...composeData, htmlContent: e.target.value})}
                placeholder="Email content (HTML supported)..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text Content (Optional)
              </label>
              <textarea
                value={composeData.textContent}
                onChange={(e) => setComposeData({...composeData, textContent: e.target.value})}
                placeholder="Plain text version (auto-generated if empty)..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleCompose}
                disabled={composing || !composeData.subject || !composeData.htmlContent}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {composing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {composing ? 'Sending...' : 'Send Email'}
              </button>
              
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Threads */}
      {threads.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No email communications yet</p>
          <p className="text-sm">Start by composing an email to this creator</p>
        </div>
      ) : (
        <div className="space-y-4">
          {threads.map((thread) => (
            <div key={thread.id} className="border border-gray-200 rounded-lg">
              {/* Thread Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                onClick={() => toggleThread(thread.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{thread.thread_subject}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      thread.status === 'active' ? 'bg-green-100 text-green-800' :
                      thread.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {thread.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {(thread.messages || []).length} message{(thread.messages || []).length !== 1 ? 's' : ''} • 
                    Last updated {formatDate(thread.updated_at)}
                  </div>
                </div>
                
                <div className="text-2xl text-gray-400">
                  {expandedThreads.has(thread.id) ? '−' : '+'}
                </div>
              </div>

              {/* Thread Messages */}
              {expandedThreads.has(thread.id) && (
                <div className="border-t border-gray-200">
                  {(thread.messages || []).map((message) => (
                    <div key={message.id} className="p-4 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(message.status)}
                          <span className="text-sm font-medium">
                            {message.from_email === message.to_email ? 'System' : 
                             message.from_email.includes('@mail.powerbrief.ai') ? 'You' : 'Creator'}
                          </span>
                          <span className="text-sm text-gray-500">
                            {message.sent_at ? formatDate(message.sent_at) : formatDate(message.created_at)}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-500">
                          {message.from_email} → {message.to_email}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-900 mb-2">
                        <strong>Subject:</strong> {message.subject}
                      </div>
                      
                      <div className="bg-gray-50 rounded-md p-3">
                        <div 
                          dangerouslySetInnerHTML={{ __html: message.html_content }} 
                          className="prose prose-sm max-w-none"
                        />
                      </div>
                    </div>
                  ))}
                  
                  {/* Quick Reply Button */}
                  <div className="p-4 bg-gray-50">
                    <button
                      onClick={() => {
                        setComposeData({
                          subject: `Re: ${thread.thread_subject}`,
                          htmlContent: '',
                          textContent: ''
                        });
                        setShowCompose(true);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Reply className="w-4 h-4" />
                      Reply to Thread
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 