"use client";
// latest updates
import React, { useState, useEffect } from 'react';
import { createSPAClient } from '@/lib/supabase/client';
import { getProductsByBrand } from '@/lib/services/productService';
import { BriefConcept, Scene, UploadedAssetGroup, Hook, Product } from '@/lib/types/powerbrief';
import { Loader2, ArrowLeft, Link as LinkIcon, CheckCircle, AlertTriangle, UploadCloud, X, ExternalLink, MessageCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SharedVoiceGenerator from '@/components/SharedVoiceGenerator';
import PowerBriefAssetUpload from '@/components/PowerBriefAssetUpload';

// Extended BriefConcept interface to include the properties we need
interface ExtendedBriefConcept extends Omit<BriefConcept, 'review_status'> {
  review_status?: 'pending' | 'ready_for_review' | 'approved' | 'needs_revisions' | string;
  review_link?: string;
  reviewer_notes?: string;
  share_settings?: Record<string, any>;
  uploaded_assets?: UploadedAssetGroup[];
  asset_upload_status?: string;
  product_id?: string;
}

// Extend the batch type to include share_settings
interface BatchWithShare {
  id: string;
  brand_id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  brands: any;
  share_settings?: Record<string, any>;
}

// Helper to unwrap params safely
type ParamsType = { shareId: string, conceptId: string };

interface TimelineComment {
  id: string;
  timestamp: number;
  comment: string;
  author: string;
  created_at: string;
  updated_at?: string;
  parent_id?: string | null;
  user_id?: string | null;
  replies?: TimelineComment[];
}

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  mediaName: string;
  conceptId?: string;
  shareId?: string;
  onAddComment?: (timestamp: number, comment: string, parentId?: string) => void;
  onEditComment?: (commentId: string, comment: string) => void;
  onDeleteComment?: (commentId: string) => void;
  existingComments?: TimelineComment[];
  commenterName: string;
  commenterEmail: string;
  setCommenterName: React.Dispatch<React.SetStateAction<string>>;
  setCommenterEmail: React.Dispatch<React.SetStateAction<string>>;
}

function MediaModal({ isOpen, onClose, mediaUrl, mediaType, mediaName, conceptId, shareId, onAddComment, onEditComment, onDeleteComment, existingComments = [], commenterName, commenterEmail, setCommenterName, setCommenterEmail }: MediaModalProps) {
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentTimestamp, setCommentTimestamp] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  
  // Email state for public commenting
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef) {
      setCurrentTime(videoRef.currentTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef) {
      setDuration(videoRef.duration);
    }
  };

  const handleAddCommentClick = () => {
    if (videoRef) {
      setCommentTimestamp(videoRef.currentTime);
      
      // For public pages with shareId, check if email is provided
      if (shareId && !emailSubmitted) {
        setShowEmailForm(true);
      } else {
        setShowCommentForm(true);
      }
      
      setReplyingToId(null);
      videoRef.pause();
    }
  };

  const handleEmailSubmit = () => {
    if (commenterEmail.trim() && commenterName.trim()) {
      setEmailSubmitted(true);
      setShowEmailForm(false);
      setShowCommentForm(true);
    }
  };

  const handleSubmitComment = () => {
    if (newComment.trim() && onAddComment && conceptId) {
      onAddComment(commentTimestamp, newComment.trim());
      setNewComment('');
      setShowCommentForm(false);
    }
  };

  const handleCancelComment = () => {
    setNewComment('');
    setShowCommentForm(false);
    setReplyingToId(null);
    setReplyText('');
    setShowEmailForm(false);
  };

  const handleEditComment = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditingCommentText(currentText);
  };

  const handleSaveEdit = () => {
    if (editingCommentId && editingCommentText.trim() && onEditComment) {
      onEditComment(editingCommentId, editingCommentText.trim());
      setEditingCommentId(null);
      setEditingCommentText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const handleReplyToComment = (commentId: string, timestamp: number) => {
    setReplyingToId(commentId);
    setCommentTimestamp(timestamp);
    setReplyText('');
    
    // For public pages with shareId, check if email is provided
    if (shareId && !emailSubmitted) {
      setShowEmailForm(true);
    }
    
    if (videoRef) {
      videoRef.currentTime = timestamp;
      videoRef.pause();
    }
  };

  const handleSubmitReply = () => {
    if (replyText.trim() && onAddComment && conceptId && replyingToId) {
      onAddComment(commentTimestamp, replyText.trim(), replyingToId);
      setReplyText('');
      setReplyingToId(null);
    }
  };

  const jumpToTimestamp = (timestamp: number) => {
    if (videoRef) {
      videoRef.currentTime = timestamp;
      setCurrentTime(timestamp);
    }
  };

  // Organize comments into threads (parent comments with their replies)
  const organizeComments = (comments: TimelineComment[]): TimelineComment[] => {
    const parentComments = comments.filter(c => !c.parent_id);
    const replies = comments.filter(c => c.parent_id);
    
    return parentComments.map(parent => ({
      ...parent,
      replies: replies.filter(reply => reply.parent_id === parent.id)
    }));
  };

  const sortedComments = organizeComments([...existingComments].sort((a, b) => a.timestamp - b.timestamp));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={onClose}>
      <div className="relative max-w-7xl max-h-[95vh] w-full mx-4 flex" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          title="Close modal"
          className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-all"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Main content area */}
        <div className="bg-white rounded-lg overflow-hidden flex-1 mr-4">
          <div className="p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">{mediaName}</h3>
            {mediaType === 'video' && (
              <div className="text-sm text-gray-600 mt-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            )}
          </div>
          
          <div className="relative bg-gray-100 flex items-center justify-center min-h-[400px]">
            {mediaType === 'image' ? (
              <img
                src={mediaUrl}
                alt={mediaName}
                crossOrigin="anonymous"
                className="max-w-full max-h-[60vh] object-contain"
              />
            ) : (
              <video
                ref={setVideoRef}
                src={mediaUrl}
                crossOrigin="anonymous"
                className="max-w-full max-h-[60vh] object-contain"
                controls
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={handleVideoLoadedMetadata}
              />
            )}
            
            {/* Add comment button for videos */}
            {mediaType === 'video' && conceptId && (
              <button
                onClick={handleAddCommentClick}
                className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg"
              >
                Add Comment at {formatTime(currentTime)}
              </button>
            )}
          </div>
          
          <div className="p-4 bg-gray-50 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Click outside or press ESC to close
            </div>
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm flex items-center"
            >
              Open in new tab
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        </div>

        {/* Comments sidebar for videos */}
        {mediaType === 'video' && conceptId && (
          <div className="w-80 bg-white rounded-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <h4 className="font-medium text-gray-900">Comments ({sortedComments.length})</h4>
              {shareId && emailSubmitted && (
                <div className="text-xs text-gray-600 mt-1">
                  Commenting as: {commenterName} ({commenterEmail})
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[60vh]">
              {sortedComments.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-sm">No comments yet</div>
                  <div className="text-xs mt-1">Add a comment to start the conversation</div>
                </div>
              ) : (
                sortedComments.map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    {/* Main comment */}
                    <div className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => jumpToTimestamp(comment.timestamp)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          {formatTime(comment.timestamp)}
                        </button>
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                            {comment.updated_at && comment.updated_at !== comment.created_at && (
                              <span className="ml-1">(edited)</span>
                            )}
                          </div>
                          {/* Action buttons */}
                          <div className="flex space-x-1">
                            <button
                              onClick={() => handleReplyToComment(comment.id, comment.timestamp)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Reply
                            </button>
                            {/* Only show edit/delete for comments from the same email on public pages */}
                            {(!shareId || (shareId && comment.author.includes(commenterEmail))) && (
                              <>
                                <button
                                  onClick={() => handleEditComment(comment.id, comment.comment)}
                                  className="text-xs text-gray-600 hover:text-gray-800"
                                >
                                  Edit
                                </button>
                                {onDeleteComment && (
                                  <button
                                    onClick={() => onDeleteComment(comment.id)}
                                    className="text-xs text-red-600 hover:text-red-800"
                                  >
                                    Delete
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Comment text or edit form */}
                      {editingCommentId === comment.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                            rows={2}
                            autoFocus
                            placeholder="Edit your comment..."
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              disabled={!editingCommentText.trim()}
                              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-2 py-1 rounded text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-gray-900 mb-1">{comment.comment}</div>
                          <div className="text-xs text-gray-600">— {comment.author}</div>
                        </>
                      )}
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-6 space-y-2">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="border rounded-lg p-2 bg-blue-50">
                            <div className="flex items-center justify-between mb-1">
                              <button
                                onClick={() => jumpToTimestamp(reply.timestamp)}
                                className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                              >
                                {formatTime(reply.timestamp)}
                              </button>
                              <div className="flex items-center space-x-2">
                                <div className="text-xs text-gray-500">
                                  {new Date(reply.created_at).toLocaleDateString()}
                                  {reply.updated_at && reply.updated_at !== reply.created_at && (
                                    <span className="ml-1">(edited)</span>
                                  )}
                                </div>
                                {/* Only show edit/delete for replies from the same email on public pages */}
                                {(!shareId || (shareId && reply.author.includes(commenterEmail))) && (
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => handleEditComment(reply.id, reply.comment)}
                                      className="text-xs text-gray-600 hover:text-gray-800"
                                    >
                                      Edit
                                    </button>
                                    {onDeleteComment && (
                                      <button
                                        onClick={() => onDeleteComment(reply.id)}
                                        className="text-xs text-red-600 hover:text-red-800"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Reply text or edit form */}
                            {editingCommentId === reply.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                                  rows={2}
                                  autoFocus
                                  placeholder="Edit your reply..."
                                />
                                <div className="flex space-x-2">
                                  <button
                                    onClick={handleSaveEdit}
                                    disabled={!editingCommentText.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-2 py-1 rounded text-xs"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-2 py-1 rounded text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-sm text-gray-900 mb-1">{reply.comment}</div>
                                <div className="text-xs text-gray-600">— {reply.author}</div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply form */}
                    {replyingToId === comment.id && (
                      <div className="ml-6 border rounded-lg p-3 bg-blue-50">
                        <div className="mb-2">
                          <div className="text-sm font-medium text-gray-700">
                            Reply at {formatTime(commentTimestamp)}
                          </div>
                        </div>
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Add your reply..."
                          className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={handleSubmitReply}
                            disabled={!replyText.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
                          >
                            Reply
                          </button>
                          <button
                            onClick={handleCancelComment}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Email form for public commenting */}
            {showEmailForm && (
              <div className="border-t p-4 bg-yellow-50">
                <div className="mb-2">
                  <div className="text-sm font-medium text-gray-700">
                    Please provide your details to comment
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    This helps identify your comments and allows you to edit them later
                  </div>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={commenterName}
                    onChange={(e) => setCommenterName(e.target.value)}
                    placeholder="Your name"
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                    autoFocus
                  />
                  <input
                    type="email"
                    value={commenterEmail}
                    onChange={(e) => setCommenterEmail(e.target.value)}
                    placeholder="Your email address"
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={handleEmailSubmit}
                    disabled={!commenterEmail.trim() || !commenterName.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
                  >
                    Continue
                  </button>
                  <button
                    onClick={handleCancelComment}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Comment form */}
            {showCommentForm && (
              <div className="border-t p-4 bg-gray-50">
                <div className="mb-2">
                  <div className="text-sm font-medium text-gray-700">
                    Comment at {formatTime(commentTimestamp)}
                  </div>
                </div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add your feedback..."
                  className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex space-x-2 mt-2">
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm"
                  >
                    Add Comment
                  </button>
                  <button
                    onClick={handleCancelComment}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to convert Hook[] to string, if not already present
const convertHooksToString = (hooks: Hook[]): string => {
  if (!hooks || !Array.isArray(hooks)) return '';
  return hooks.map(hook => hook.content).join('\n');
};

export default function SharedSingleConceptPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false);
  const [concept, setConcept] = useState<ExtendedBriefConcept | null>(null);
  const [brand, setBrand] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditable, setIsEditable] = useState<boolean>(false);
  const [reviewLink, setReviewLink] = useState<string>('');
  const [updatingResubmission, setUpdatingResubmission] = useState<boolean>(false);
  const [showAssetUpload, setShowAssetUpload] = useState<boolean>(false);
  
  // Modal state for media viewing with comments
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMedia, setModalMedia] = useState<{
    url: string;
    type: 'image' | 'video';
    name: string;
    conceptId?: string;
  } | null>(null);
  
  // Comments state
  const [conceptComments, setConceptComments] = useState<Record<string, TimelineComment[]>>({});
  
  // Commenter info for public pages
  const [commenterName, setCommenterName] = useState('');
  const [commenterEmail, setCommenterEmail] = useState('');
  
  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const router = useRouter();

  // Unwrap params using React.use()
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const { shareId, conceptId } = unwrappedParams;

  // Get product name from product ID
  const getProductName = (productId: string | null): string | null => {
    if (!productId) return null;
    const product = products.find(p => p.id === productId);
    return product ? product.name : null;
  };

  useEffect(() => {
    const fetchSharedConcept = async () => {
      try {
        setLoading(true);
        const supabase = createSPAClient();

        // Find the batch with this shareId in its share_settings
        const { data: batchDataResult, error: batchError } = await supabase
          .from('brief_batches')
          .select('*, brands(*)')
          .contains('share_settings', { [shareId]: {} });

        if (batchError) {
          throw batchError;
        }

        if (!batchDataResult || batchDataResult.length === 0) {
          setError('Shared content not found or has expired. You might need to log in to view this content.');
          setShowLoginPrompt(true);
          setLoading(false);
          return;
        }

        const batchData = batchDataResult as BatchWithShare[]; // Cast to BatchWithShare array

        // Set the brand from the batch
        if (batchData[0].brands) {
          setBrand(batchData[0].brands);
          
          // Fetch products for the brand
          try {
            const productsData = await getProductsByBrand(batchData[0].brands.id);
            setProducts(productsData);
          } catch (productsError) {
            console.error('Error fetching products:', productsError);
            // Continue without products if there's an error
          }
        }

        // Get the specific concept
        const { data: conceptDataResult, error: conceptError } = await supabase
          .from('brief_concepts')
          .select('*')
          .eq('id', conceptId)
          .single();

        if (conceptError) {
          throw conceptError;
        }

        const conceptData = conceptDataResult as ExtendedBriefConcept; // Cast to ExtendedBriefConcept

        setConcept(conceptData);
        
        // Load comments for this concept to show comment counts
        fetchConceptComments(conceptData.id);
        
        // Initialize review link from concept if it exists
        if (conceptData.review_link) {
          setReviewLink(conceptData.review_link);
        }

        // Set editability based on share settings from batch
        const shareSettings = batchData[0].share_settings?.[shareId];
        setIsEditable(!!shareSettings?.is_editable);
        
        // Check if the concept status is appropriate for sharing
        const statusLowerCase = conceptData?.status?.toLowerCase();
        if (statusLowerCase !== 'ready for editor' && 
            statusLowerCase !== 'ready for designer' && 
            statusLowerCase !== 'revisions requested' &&
            statusLowerCase !== 'approved') {
          console.warn('Concept status may not be appropriate for sharing:', conceptData?.status);
        }

        setError(null);
      } catch (err: any) {
        console.error('Error fetching shared concept:', err);
        setError('Failed to load shared concept. Please try again.');
        
        // Show login prompt for authentication-related errors
        if (err.message?.includes('not found') || err.message?.includes('permission denied')) {
          setShowLoginPrompt(true);
        }
      } finally {
        setLoading(false);
      }
    };

    if (shareId && conceptId) {
      fetchSharedConcept();
    }
    fetchSharedConcept();
  }, [shareId, conceptId]);

  // Clear review link when status changes to needs_revisions
  useEffect(() => {
    if (concept?.review_status === 'needs_revisions') {
      // Clear the review link if revisions were requested to prompt for a new link
      setReviewLink('');
    }
  }, [concept?.review_status]);

  // Sync status with review_status
  useEffect(() => {
    if (concept && concept.review_status) {
      // Only update if there's a mismatch between status and review_status
      let newStatus = concept.status;
      
      if (concept.review_status === 'ready_for_review' && concept.status !== 'READY FOR REVIEW') {
        newStatus = 'READY FOR REVIEW';
      } else if (concept.review_status === 'approved' && concept.status !== 'APPROVED') {
        newStatus = 'APPROVED';
      } else if (concept.review_status === 'needs_revisions' && concept.status !== 'REVISIONS REQUESTED') {
        newStatus = 'REVISIONS REQUESTED';
      }
      
      // If status needs to be updated, update it
      if (newStatus !== concept.status) {
        // Update the status locally for immediate UI update
        setConcept(prev => prev ? { ...prev, status: newStatus } : null);
        
        // Also update in database to ensure persistence
        const updateStatus = async () => {
          try {
            const supabase = createSPAClient();
            await supabase
              .from('brief_concepts')
              .update({ status: newStatus })
              .eq('id', concept.id);
          } catch (err) {
            console.error('Error syncing status with review_status:', err);
          }
        };
        
        updateStatus();
      }
    }
  }, [concept?.review_status]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const supabase = createSPAClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }
      
      // Reload the page to re-fetch data with the new auth state
      window.location.reload();
      
      // Optionally, reset form and hide prompt, though page refresh might handle this
      setShowLoginPrompt(false);
      setEmail('');
      setPassword('');

    } catch (err: any) {
      console.error('Login failed:', err);
      setLoginError(err.message || 'An unknown error occurred during login.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleMarkReadyForReview = async () => {
    if (!concept) return;
    
    try {
      const supabase = createSPAClient();
      
      // First, try updating with regular client
      const { data, error } = await supabase
        .from('brief_concepts')
        .update({
          review_status: 'ready_for_review',
          review_link: reviewLink,
          updated_at: new Date().toISOString()
        })
        .eq('id', concept.id)
        .select()
        .single();
      
      if (error) {
        // If error likely due to RLS permissions (non-authenticated users can't update),
        // Use a serverless function or API endpoint instead
        console.log("Using API endpoint for unauthenticated update");
        const response = await fetch('/api/public/update-concept-review', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conceptId: concept.id,
            shareId: shareId,
            reviewLink: reviewLink
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update review status via API endpoint');
        }
        
        const updatedConcept = await response.json();
        setConcept(updatedConcept);
      } else {
        setConcept(data as ExtendedBriefConcept);
      }
      
      toast({
        title: 'Success',
        description: 'The concept has been marked as ready for review.',
        duration: 3000,
      });
    } catch (err: any) {
      console.error('Error updating review status:', err);
      toast({
        title: 'Error',
        description: 'Failed to update review status. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const handleResubmitForReview = async () => {
    if (!concept) return;
    
    try {
      setUpdatingResubmission(true);
      const supabase = createSPAClient();
      
      // First, try updating with regular client
      const { data, error } = await supabase
        .from('brief_concepts')
        .update({
          review_status: 'ready_for_review',
          review_link: reviewLink,
          updated_at: new Date().toISOString()
        })
        .eq('id', concept.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setConcept(prev => prev ? {
        ...prev,
        review_status: 'ready_for_review',
        review_link: reviewLink
      } : null);

      toast({
        title: "Success",
        description: "Revised version submitted successfully!",
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Error resubmitting for review:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit revised version",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setUpdatingResubmission(false);
    }
  };

  const handleAssetsUploaded = async (assetGroups: UploadedAssetGroup[]) => {
    if (!concept) return;

    try {
      // Determine which endpoint to use based on concept status
      const isAppendingAssets = concept.review_status === 'needs_additional_sizes';
      const endpoint = isAppendingAssets ? '/api/powerbrief/append-assets' : '/api/powerbrief/upload-assets';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conceptId: concept.id,
          assetGroups,
          shareId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save uploaded assets');
      }

      const result = await response.json();
      
      // Update the concept with the asset data
      setConcept(prev => prev ? {
        ...prev,
        uploaded_assets: result.assetGroups,
        asset_upload_status: 'uploaded',
        review_status: 'ready_for_review',
        status: 'READY FOR REVIEW'
      } : null);

      const successMessage = isAppendingAssets 
        ? `Additional assets appended successfully! Added ${result.newAssetsCount || assetGroups.length} new asset groups.`
        : 'Assets uploaded successfully and marked ready for review.';

      toast({
        title: 'Success',
        description: successMessage,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error uploading assets:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload assets. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  // Function to open media in modal
  const openMediaModal = (url: string, type: 'image' | 'video', name: string, conceptId?: string) => {
    setModalMedia({ url, type, name, conceptId });
    setModalOpen(true);
    
    // Load comments for this concept if it's a video
    if (type === 'video' && conceptId) {
      fetchConceptComments(conceptId);
    }
  };

  // Function to close modal
  const closeModal = () => {
    setModalOpen(false);
    setModalMedia(null);
  };

  // Function to fetch comments for a concept
  const fetchConceptComments = async (conceptId: string) => {
    try {
      const response = await fetch(`/api/concept-comments?conceptId=${conceptId}`);
      if (response.ok) {
        const data = await response.json();
        const comments = data.comments.map((comment: any) => ({
          id: comment.id,
          timestamp: comment.timestamp_seconds,
          comment: comment.comment_text,
          author: comment.author_name,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          parent_id: comment.parent_id,
          user_id: comment.user_id
        }));
        setConceptComments(prev => ({ ...prev, [conceptId]: comments }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  // Function to add a comment
  const handleAddComment = async (conceptId: string, timestamp: number, comment: string, parentId?: string) => {
    try {
      const response = await fetch('/api/concept-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conceptId,
          timestamp,
          comment,
          shareId,
          parentId,
          commenterName: commenterName,
          commenterEmail: commenterEmail
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newComment: TimelineComment = {
          id: data.comment.id,
          timestamp: data.comment.timestamp_seconds,
          comment: data.comment.comment_text,
          author: data.comment.author_name,
          created_at: data.comment.created_at,
          updated_at: data.comment.updated_at,
          parent_id: data.comment.parent_id,
          user_id: data.comment.user_id
        };

        const updatedComments = [...(conceptComments[conceptId] || []), newComment];
        setConceptComments(prev => ({ ...prev, [conceptId]: updatedComments }));
      } else {
        console.error('Failed to add comment');
        toast({
          title: 'Error',
          description: 'Failed to add comment. Please try again.',
          variant: 'destructive',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  // Function to edit a comment
  const handleEditComment = async (commentId: string, comment: string) => {
    try {
      const response = await fetch('/api/concept-comments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          comment,
          shareId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Update the comment in the local state
        setConceptComments(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(conceptId => {
            updated[conceptId] = updated[conceptId].map(c => 
              c.id === commentId 
                ? { 
                    ...c, 
                    comment: data.comment.comment_text,
                    updated_at: data.comment.updated_at
                  }
                : c
            );
          });
          return updated;
        });
      } else {
        console.error('Failed to edit comment');
        toast({
          title: 'Error',
          description: 'Failed to edit comment. Please try again.',
          variant: 'destructive',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to edit comment. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  // Function to delete a comment
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/concept-comments?commentId=${commentId}&shareId=${shareId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the comment and its replies from local state
        setConceptComments(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(conceptId => {
            updated[conceptId] = updated[conceptId].filter(c => 
              c.id !== commentId && c.parent_id !== commentId
            );
          });
          return updated;
        });
      } else {
        console.error('Failed to delete comment');
        toast({
          title: 'Error',
          description: 'Failed to delete comment. Please try again.',
          variant: 'destructive',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comment. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  // Function to get comment count for video assets
  const getCommentCount = (conceptId: string): number => {
    const comments = conceptComments[conceptId] || [];
    return comments.length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !concept) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertDescription>{error || 'Concept not found. Please ensure the link is correct.'}</AlertDescription>
        </Alert>
        {showLoginPrompt && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Log In to View Content</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {loginError && (
                  <Alert variant="destructive">
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={loginLoading} className="w-full">
                  {loginLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Log In
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{concept.concept_title}</h1>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Metadata display */}
      <div className="flex flex-wrap gap-2 mb-4">
        {concept.status && (
          <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${
            concept.status === "REVISIONS REQUESTED" 
              ? "bg-amber-100 text-amber-800 border border-amber-300" 
              : concept.status === "APPROVED" 
                ? "bg-green-100 text-green-800 border border-green-300" 
                : "bg-blue-100 text-blue-800 border border-blue-300"
          }`}>
            Status: {concept.status}
          </div>
        )}
        {concept.clickup_id && (
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            Clickup ID: {concept.clickup_id}
          </div>
        )}
        {concept.clickup_link && (
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            <a href={concept.clickup_link} target="_blank" rel="noopener noreferrer" className="flex items-center">
              <LinkIcon className="h-3 w-3 mr-1" />
              Clickup Link
            </a>
          </div>
        )}
        {concept.strategist && (
          <div className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium border border-indigo-300">
            Strategist: {concept.strategist}
          </div>
        )}
        {concept.video_editor && (
          <div className="inline-block px-4 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium border border-purple-300">
            {concept.media_type === 'video' ? 'Video Editor' : 'Designer'}: {concept.video_editor}
          </div>
        )}
        {concept.product_id && (
          <div className="inline-block px-4 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium border border-orange-300">
            Product: {getProductName(concept.product_id) || concept.product_id}
          </div>
        )}
      </div>

      {/* Review Status Banner */}
      {concept?.review_status === 'ready_for_review' && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-blue-500" />
          <div>
            <h3 className="font-medium text-blue-800">Ready for Review</h3>
            <p className="text-sm text-blue-700">This concept has been marked as ready for review.</p>
            {concept.review_link && (
              <a 
                href={concept.review_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm mt-1 inline-block"
              >
                View on Frame.io →
              </a>
            )}
          </div>
        </div>
      )}

      {concept?.review_status === 'approved' && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <h3 className="font-medium text-green-800">Approved</h3>
            <p className="text-sm text-green-700">This concept has been approved.</p>
            {concept.review_link && (
              <a 
                href={concept.review_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-600 hover:underline text-sm mt-1 inline-block"
              >
                View on Frame.io →
              </a>
            )}
          </div>
        </div>
      )}

      {concept?.review_status === 'needs_revisions' && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div>
            <h3 className="font-medium text-amber-800">Revisions Requested</h3>
            <p className="text-sm text-amber-700">This concept needs revisions.</p>
            {concept.reviewer_notes && (
              <div className="mt-2 p-2 bg-amber-100 rounded text-sm text-amber-800">
                <strong>Feedback:</strong> {concept.reviewer_notes}
              </div>
            )}
          </div>
        </div>
      )}

      {concept?.review_status === 'needs_additional_sizes' && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center space-x-3">
          <Plus className="h-5 w-5 text-blue-500" />
          <div>
            <h3 className="font-medium text-blue-800">Additional Sizes Requested</h3>
            <p className="text-sm text-blue-700">Please upload additional sizes while keeping existing assets.</p>
            {concept.reviewer_notes && (
              <div className="mt-2 p-2 bg-blue-100 rounded text-sm text-blue-800">
                <strong>Size Requirements:</strong> {concept.reviewer_notes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Asset Upload Section */}
      {isEditable && !concept?.uploaded_assets && !concept?.review_status && (
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="text-lg">Upload Creative Assets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload your creative assets (images and videos) for this concept. 
              Include multiple versions and aspect ratios (4x5, 9x16) as needed.
            </p>
            <Button 
              onClick={() => setShowAssetUpload(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UploadCloud className="h-4 w-4 mr-2" />
              Upload Assets
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Additional Sizes Upload Section */}
      {isEditable && concept?.review_status === 'needs_additional_sizes' && (
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="text-lg">Upload Additional Sizes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload additional sizes or variations for this concept. Your existing assets will be preserved,
              and the new uploads will be added to them.
            </p>
            <Button 
              onClick={() => setShowAssetUpload(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add More Assets
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Display Uploaded Assets */}
      {concept?.uploaded_assets && concept.uploaded_assets.length > 0 && (
        <Card className="border-2 border-green-300">
          <CardHeader>
            <CardTitle className="text-lg">Uploaded Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {concept.uploaded_assets.map((group, groupIndex) => (
                <div key={groupIndex} className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{group.baseName}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {group.assets.map((asset, assetIndex) => (
                      <div key={assetIndex} className="relative">
                        {asset.type === 'image' ? (
                          <img
                            src={asset.supabaseUrl}
                            alt={asset.name}
                            crossOrigin="anonymous"
                            className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => openMediaModal(asset.supabaseUrl, 'image', asset.name, concept.id)}
                          />
                        ) : (
                          <video
                            src={asset.supabaseUrl}
                            crossOrigin="anonymous"
                            className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80"
                            onClick={() => openMediaModal(asset.supabaseUrl, 'video', asset.name, concept.id)}
                          />
                        )}
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                          {asset.aspectRatio}
                        </div>
                        {/* Comment count badge for videos */}
                        {asset.type === 'video' && concept.id && (
                          <div 
                            className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center space-x-1 shadow-lg"
                            title={`${getCommentCount(concept.id)} comments`}
                          >
                            <MessageCircle className="h-3 w-3" />
                            <span>{getCommentCount(concept.id)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Aspect ratios: {group.aspectRatios.join(', ')}
                  </p>
                </div>
              ))}
            </div>
            {concept.asset_upload_status === 'uploaded' && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✓ Assets uploaded successfully and marked ready for review
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Asset Upload Modal */}
      {concept && (
        <PowerBriefAssetUpload
          isOpen={showAssetUpload}
          onClose={() => setShowAssetUpload(false)}
          onAssetsUploaded={handleAssetsUploaded}
          conceptId={concept.id}
          userId={concept.user_id}
        />
      )}

      {/* Resubmission Section after Revisions */}
      {isEditable && concept?.review_status === 'needs_revisions' && (
        <Card className="border-2 border-amber-300">
          <CardHeader>
            <CardTitle className="text-lg">Submit Revised Version</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload your revised creative assets (images and videos) for this concept. 
              Include multiple versions and aspect ratios (4x5, 9x16) as needed.
            </p>
            <Button 
              onClick={() => setShowAssetUpload(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <UploadCloud className="h-4 w-4 mr-2" />
              Upload Revised Assets
            </Button>
            
            {/* Alternative Frame.io option for revisions */}
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500 mb-2">Alternative: Submit Frame.io Link</p>
              <div>
                <Label htmlFor="revisedReviewLink">Updated Frame.io Review Link</Label>
                <Input
                  id="revisedReviewLink"
                  placeholder="Paste your updated Frame.io link here"
                  value={reviewLink}
                  onChange={(e) => setReviewLink(e.target.value)}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Please provide a link to the revised video on Frame.io for review
                </p>
              </div>
              <Button 
                onClick={handleResubmitForReview} 
                disabled={updatingResubmission || !reviewLink.trim()} 
                className="bg-gray-600 hover:bg-gray-700 text-white mt-3"
              >
                {updatingResubmission ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Submit Frame.io Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legacy Frame.io Section - only show if no assets uploaded and not in revision state */}
      {isEditable && !concept?.uploaded_assets && !concept?.review_status && (
        <Card className="border-2 border-gray-300">
          <CardHeader>
            <CardTitle className="text-lg">Alternative: Submit Frame.io Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="reviewLink">Frame.io Review Link</Label>
              <Input
                id="reviewLink"
                placeholder="Paste your Frame.io link here"
                value={reviewLink}
                onChange={(e) => setReviewLink(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Please provide a link to the video on Frame.io for review
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleMarkReadyForReview} 
              disabled={!reviewLink.trim()} 
              className="bg-gray-600 hover:bg-gray-700"
            >
              Mark as Ready for Review
            </Button>
          </CardFooter>
        </Card>
      )}

      <Tabs defaultValue="concept" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="concept">Concept Details</TabsTrigger>
          {brand && <TabsTrigger value="resources">Editing Resources</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="concept" className="space-y-6">
          {/* Media display */}
          {concept.media_url && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Media</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  {concept.media_type === 'video' ? (
                    <video
                      src={concept.media_url}
                      controls
                      crossOrigin="anonymous"
                      className="max-h-[400px] object-contain rounded"
                    />
                  ) : (
                    <img
                      src={concept.media_url}
                      alt="Concept media"
                      crossOrigin="anonymous"
                      className="max-h-[400px] object-contain rounded"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video Instructions - only show for video media type */}
          {concept.videoInstructions && concept.media_type === 'video' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Video Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{concept.videoInstructions}</p>
              </CardContent>
            </Card>
          )}

          {/* Designer Instructions - only show for image media type */}
          {concept.designerInstructions && concept.media_type === 'image' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Designer Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{concept.designerInstructions}</p>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {concept.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{concept.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Text Hooks */}
          {concept.text_hook_options && Array.isArray(concept.text_hook_options) && concept.text_hook_options.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium text-sm mb-1">Text Hook Options</h3>
              <div className="space-y-1 text-sm bg-gray-50 p-3 rounded">
                {concept.text_hook_options.map((hook: Hook, index: number) => (
                  <p key={hook.id || index} className="whitespace-pre-wrap">{hook.content}</p>
                ))}
              </div>
            </div>
          )}

          {/* Spoken Hooks */}
          {concept.spoken_hook_options && Array.isArray(concept.spoken_hook_options) && concept.spoken_hook_options.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium text-sm mb-1">Spoken Hook Options</h3>
              <div className="space-y-1 text-sm bg-gray-50 p-3 rounded">
                {concept.spoken_hook_options.map((hook: Hook, index: number) => (
                  <p key={hook.id || index} className="whitespace-pre-wrap">{hook.content}</p>
                ))}
              </div>
            </div>
          )}

          {/* Body content - scenes */}
          {concept.body_content_structured && concept.body_content_structured.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Body Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {concept.body_content_structured.map((scene: Scene, index: number) => (
                    <div key={index} className="p-4 border rounded space-y-3">
                      <h3 className="font-medium">{scene.scene_title || `Scene ${index + 1}`}</h3>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Script:</h4>
                        <p className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">{scene.script}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Visuals:</h4>
                        <p className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">{scene.visuals}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CTA */}
          {(concept.cta_script || concept.cta_text_overlay) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Call to Action</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {concept.cta_script && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">CTA Script:</h4>
                      <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded">{concept.cta_script}</p>
                    </div>
                  )}
                  
                  {concept.cta_text_overlay && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">CTA Text Overlay:</h4>
                      <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded">{concept.cta_text_overlay}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Voice Generator Section */}
          {concept.media_type === 'video' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Voiceover Generator</CardTitle>
              </CardHeader>
              <CardContent>
                <SharedVoiceGenerator
                  scenes={concept.body_content_structured || []}
                  spokenHooks={
                    Array.isArray(concept.spoken_hook_options) 
                      ? convertHooksToString(concept.spoken_hook_options) 
                      : (typeof concept.spoken_hook_options === 'string' ? concept.spoken_hook_options : '')
                  } 
                  ctaScript={concept.cta_script || ''} 
                  conceptId={concept.id}
                  isEditable={isEditable}
                  brandId={brand?.id || ''}
                />
              </CardContent>
            </Card>
          )}

          {/* Attribution */}
          <div className="border-t pt-4 text-sm text-gray-500">
            {concept.strategist && <p>Strategist: {concept.strategist}</p>}
            {concept.video_editor && <p>Video Editor: {concept.video_editor}</p>}
          </div>
        </TabsContent>
        
        <TabsContent value="resources" className="space-y-6">
          {brand && (
            <>
              {/* Editing Resources */}
              {brand.editing_resources && brand.editing_resources.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Editing Resources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {brand.editing_resources.map((resource: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded flex justify-between items-center">
                          <span className="font-medium">{resource.name}</span>
                          <a 
                            href={resource.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center space-x-1 text-blue-600 hover:underline"
                          >
                            <LinkIcon className="h-4 w-4" />
                            <span>Visit</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Resource Logins */}
              {brand.resource_logins && brand.resource_logins.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resource Logins</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {brand.resource_logins.map((login: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-3 rounded">
                          <p className="font-medium">{login.resourceName}</p>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div>
                              <span className="text-gray-500">Username: </span>
                              <span>{login.username}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Password: </span>
                              <span>{login.password}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Video Do's and Don'ts */}
              {brand.dos_and_donts && concept.media_type === 'video' && 
               (brand.dos_and_donts.videosDos?.length > 0 || brand.dos_and_donts.videosDonts?.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Video Guidelines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Video Do's */}
                      {brand.dos_and_donts.videosDos?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-green-600 mb-2">Do's</h3>
                          <div className="space-y-1">
                            {brand.dos_and_donts.videosDos.map((item: string, index: number) => (
                              <div key={index} className="bg-green-50 border border-green-200 p-2 rounded text-sm">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Video Don'ts */}
                      {brand.dos_and_donts.videosDonts?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-red-600 mb-2">Don'ts</h3>
                          <div className="space-y-1">
                            {brand.dos_and_donts.videosDonts.map((item: string, index: number) => (
                              <div key={index} className="bg-red-50 border border-red-200 p-2 rounded text-sm">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Image Do's and Don'ts */}
              {brand.dos_and_donts && concept.media_type === 'image' && 
               (brand.dos_and_donts.imagesDos?.length > 0 || brand.dos_and_donts.imagesDonts?.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Image Guidelines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Image Do's */}
                      {brand.dos_and_donts.imagesDos?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-green-600 mb-2">Do's</h3>
                          <div className="space-y-1">
                            {brand.dos_and_donts.imagesDos.map((item: string, index: number) => (
                              <div key={index} className="bg-green-50 border border-green-200 p-2 rounded text-sm">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Image Don'ts */}
                      {brand.dos_and_donts.imagesDonts?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-red-600 mb-2">Don'ts</h3>
                          <div className="space-y-1">
                            {brand.dos_and_donts.imagesDonts.map((item: string, index: number) => (
                              <div key={index} className="bg-red-50 border border-red-200 p-2 rounded text-sm">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Media Modal */}
      {modalMedia && (
        <MediaModal
          isOpen={modalOpen}
          onClose={closeModal}
          mediaUrl={modalMedia.url}
          mediaType={modalMedia.type}
          mediaName={modalMedia.name}
          conceptId={modalMedia.conceptId}
          shareId={shareId}
          onAddComment={modalMedia.conceptId ? (timestamp: number, comment: string, parentId?: string) => handleAddComment(modalMedia.conceptId!, timestamp, comment, parentId) : undefined}
          onEditComment={modalMedia.conceptId ? (commentId: string, comment: string) => handleEditComment(commentId, comment) : undefined}
          onDeleteComment={modalMedia.conceptId ? (commentId: string) => handleDeleteComment(commentId) : undefined}
          existingComments={modalMedia.conceptId ? conceptComments[modalMedia.conceptId] || [] : []}
          commenterName={commenterName}
          commenterEmail={commenterEmail}
          setCommenterName={setCommenterName}
          setCommenterEmail={setCommenterEmail}
        />
      )}
    </div>
  );
} 