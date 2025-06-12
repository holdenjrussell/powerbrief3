import React, { useState, useRef, useEffect } from 'react';
import { X, MessageSquare, Check, CheckCircle, Edit, Trash2, Reply, ChevronDown, ChevronUp } from 'lucide-react';

export interface TimelineComment {
    id: string;
    timestamp: number;
    comment: string;
    author: string;
    created_at: string;
    updated_at: string;
    parent_id: string | null;
    user_id: string | null;
    revision_version: number;
    is_resolved: boolean;
    resolved_at: string | null;
    resolved_by: string | null;
    replies?: TimelineComment[];
}

interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    mediaName: string;
    conceptId?: string;
    existingComments: TimelineComment[];
    onAddComment?: (timestamp: number, comment: string, parentId?: string) => Promise<void>;
    onEditComment?: (commentId: string, comment: string) => Promise<void>;
    onDeleteComment?: (commentId: string) => Promise<void>;
    onResolveComment?: (commentId: string, isResolved: boolean) => Promise<void>;
    currentRevision?: number;
    canResolveComments?: boolean;
}

export function CommentModal({
    isOpen,
    onClose,
    mediaUrl,
    mediaType,
    mediaName,
    conceptId,
    existingComments,
    onAddComment,
    onEditComment,
    onDeleteComment,
    onResolveComment,
    currentRevision = 1,
    canResolveComments = false
}: CommentModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showCommentForm, setShowCommentForm] = useState(false);
    const [commentTimestamp, setCommentTimestamp] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [showResolvedComments, setShowResolvedComments] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [cursorPosition, setCursorPosition] = useState<number>(0);

    // Add mouse event handlers for timeline scrubbing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !timelineRef.current || !videoRef.current || duration === 0) return;
            e.preventDefault();
            const newTime = getTimeFromPosition(e.clientX);
            seekToTime(newTime);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, duration]);

    // Format time in MM:SS format
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Get time from mouse position
    const getTimeFromPosition = (clientX: number) => {
        const timeline = timelineRef.current;
        if (!timeline || duration === 0) return 0;

        const rect = timeline.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return percent * duration;
    };

    // Seek to specific time
    const seekToTime = (time: number) => {
        if (!videoRef.current) return;
        const clampedTime = Math.max(0, Math.min(duration, time));
        videoRef.current.currentTime = clampedTime;
        setCurrentTime(clampedTime);
    };

    // Handle timeline click
    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        const newTime = getTimeFromPosition(e.clientX);
        seekToTime(newTime);
    };

    // Handle mouse down on timeline
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
        const newTime = getTimeFromPosition(e.clientX);
        seekToTime(newTime);
    };

    // Handle video play/pause
    const togglePlayPause = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Handle video time update
    const handleTimeUpdate = () => {
        if (videoRef.current && !isDragging) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    // Handle video load
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    // Handle video play/pause events
    const handleVideoPlay = () => setIsPlaying(true);
    const handleVideoPause = () => setIsPlaying(false);

    // Add comment at current timestamp
    const handleAddCommentAtTime = () => {
        if (mediaType === 'video' && videoRef.current) {
            setCommentTimestamp(videoRef.current.currentTime);
            setShowCommentForm(true);
            videoRef.current.pause();
            setIsPlaying(false);
        }
    };

    // Submit new comment
    const handleSubmitComment = async () => {
        if (newComment.trim() && onAddComment && conceptId) {
            await onAddComment(commentTimestamp, newComment.trim());
            setNewComment('');
            setShowCommentForm(false);
        }
    };

    // Cancel comment form
    const handleCancelComment = () => {
        setNewComment('');
        setShowCommentForm(false);
    };

    // Edit comment
    const handleEditComment = (commentId: string, currentText: string) => {
        setEditingCommentId(commentId);
        setEditingCommentText(currentText);
    };

    // Submit edited comment
    const handleSubmitEdit = async () => {
        if (editingCommentId && editingCommentText.trim() && onEditComment) {
            await onEditComment(editingCommentId, editingCommentText.trim());
            setEditingCommentId(null);
            setEditingCommentText('');
        }
    };

    // Cancel edit
    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditingCommentText('');
    };

    // Reply to comment
    const handleReplyToComment = (commentId: string, timestamp: number) => {
        setReplyingToId(commentId);
        setCommentTimestamp(timestamp);
        setReplyText('');
        if (videoRef.current) {
            videoRef.current.currentTime = timestamp;
            videoRef.current.pause();
        }
    };

    // Submit reply
    const handleSubmitReply = async () => {
        if (replyText.trim() && onAddComment && conceptId && replyingToId) {
            await onAddComment(commentTimestamp, replyText.trim(), replyingToId);
            setReplyText('');
            setReplyingToId(null);
        }
    };

    // Handle reply text change with cursor position preservation
    const handleReplyTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newCursorPosition = e.target.selectionStart;
        
        setReplyText(newValue);
        setCursorPosition(newCursorPosition);
    };

    // Restore cursor position after re-render
    useEffect(() => {
        if (replyTextareaRef.current && replyingToId) {
            replyTextareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
        }
    }, [replyText, cursorPosition, replyingToId]);

    // Jump to timestamp
    const jumpToTimestamp = (timestamp: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = timestamp;
            setCurrentTime(timestamp);
        }
    };

    // Resolve/unresolve comment
    const handleToggleResolve = async (commentId: string, isCurrentlyResolved: boolean) => {
        if (onResolveComment) {
            await onResolveComment(commentId, !isCurrentlyResolved);
        }
    };

    // Organize comments into threads and separate by resolution status
    const organizeComments = (comments: TimelineComment[]) => {
        const parentComments = comments.filter(c => !c.parent_id);
        const replies = comments.filter(c => c.parent_id);
        
        const organizedComments = parentComments.map(parent => ({
            ...parent,
            replies: replies.filter(reply => reply.parent_id === parent.id)
        }));

        // Separate resolved and unresolved comments
        const unresolvedComments = organizedComments.filter(c => !c.is_resolved);
        const resolvedComments = organizedComments.filter(c => c.is_resolved);

        return { unresolvedComments, resolvedComments };
    };

    const { unresolvedComments, resolvedComments } = organizeComments(existingComments);

    // Comment revision badge
    const getRevisionBadge = (commentRevision: number) => {
        if (commentRevision < currentRevision) {
            return (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    v{commentRevision} (Prior)
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                v{commentRevision}
            </span>
        );
    };

    // Comment item component
    const CommentItem = ({ comment, isReply = false }: { comment: TimelineComment; isReply?: boolean }) => (
        <div 
            className={`border rounded-lg p-3 ${
                comment.revision_version < currentRevision 
                    ? 'bg-orange-50 border-orange-200' 
                    : comment.is_resolved 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50'
            } ${isReply ? 'ml-6 mt-2' : ''}`}
        >
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => jumpToTimestamp(comment.timestamp)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                        {formatTime(comment.timestamp)}
                    </button>
                    {getRevisionBadge(comment.revision_version)}
                    {comment.is_resolved && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    {mediaType === 'video' && !isReply && (
                        <button
                            onClick={() => handleReplyToComment(comment.id, comment.timestamp)}
                            className="text-gray-500 hover:text-blue-600"
                            title="Reply"
                        >
                            <Reply className="h-4 w-4" />
                        </button>
                    )}
                    {canResolveComments && !isReply && (
                        <button
                            onClick={() => handleToggleResolve(comment.id, comment.is_resolved)}
                            className={`${
                                comment.is_resolved 
                                    ? 'text-green-600 hover:text-green-800' 
                                    : 'text-gray-500 hover:text-green-600'
                            }`}
                            title={comment.is_resolved ? 'Mark as unresolved' : 'Mark as resolved'}
                        >
                            <Check className="h-4 w-4" />
                        </button>
                    )}
                    <button
                        onClick={() => handleEditComment(comment.id, comment.comment)}
                        className="text-gray-500 hover:text-blue-600"
                        title="Edit"
                    >
                        <Edit className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onDeleteComment && onDeleteComment(comment.id)}
                        className="text-gray-500 hover:text-red-600"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
            
            {editingCommentId === comment.id ? (
                <div className="space-y-2">
                    <textarea
                        value={editingCommentText}
                        onChange={(e) => {
                            e.preventDefault();
                            const value = e.target.value;
                            setEditingCommentText(value);
                        }}
                        aria-label="Edit comment"
                        className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                        rows={2}
                        autoFocus
                        dir="ltr"
                        style={{ direction: 'ltr', textAlign: 'left' }}
                    />
                    <div className="flex space-x-2">
                        <button
                            onClick={handleSubmitEdit}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                            Save
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="mb-2">
                        <div className="text-sm font-medium text-gray-700">
                            {comment.author}
                        </div>
                        <div className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleString()}
                            {comment.updated_at !== comment.created_at && (
                                <span> (edited)</span>
                            )}
                        </div>
                    </div>
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">
                        {comment.comment}
                    </div>
                    
                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {comment.replies.map((reply) => (
                                <CommentItem key={reply.id} comment={reply} isReply={true} />
                            ))}
                        </div>
                    )}
                    
                    {/* Reply form */}
                    {replyingToId === comment.id && (
                        <div className="mt-3 ml-6 border-t pt-3">
                            <div className="mb-2">
                                <div className="text-sm font-medium text-gray-700">
                                    Reply at {formatTime(commentTimestamp)}
                                </div>
                            </div>
                            <textarea
                                ref={replyTextareaRef}
                                value={replyText}
                                onChange={handleReplyTextChange}
                                placeholder="Add your reply..."
                                aria-label="Reply comment"
                                className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                                rows={3}
                                autoFocus
                                dir="ltr"
                                style={{ direction: 'ltr', textAlign: 'left' }}
                            />
                            <div className="flex space-x-2 mt-2">
                                <button
                                    onClick={handleSubmitReply}
                                    disabled={!replyText.trim()}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
                                >
                                    Reply
                                </button>
                                <button
                                    onClick={() => setReplyingToId(null)}
                                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );

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

                {/* Media container */}
                <div className="flex-1 bg-black rounded-lg overflow-hidden relative">
                    {mediaType === 'video' ? (
                        <>
                            <video
                                ref={videoRef}
                                src={mediaUrl}
                                className="w-full h-full object-contain"
                                onTimeUpdate={handleTimeUpdate}
                                onLoadedMetadata={handleLoadedMetadata}
                                onPlay={handleVideoPlay}
                                onPause={handleVideoPause}
                                controls={false}
                            />
                            
                            {/* Video controls overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                                {/* Timeline scrubber */}
                                <div className="mb-3">
                                    <div 
                                        ref={timelineRef}
                                        className="relative h-3 bg-white/30 rounded-full cursor-pointer hover:h-4 transition-all duration-200"
                                        onClick={handleTimelineClick}
                                        onMouseDown={handleMouseDown}
                                    >
                                        {/* Progress bar */}
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-75"
                                            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                        />
                                        
                                        {/* Draggable handle */}
                                        <div 
                                            className={`absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-grab ${isDragging ? 'cursor-grabbing scale-125' : ''} transition-transform hover:scale-110`}
                                            style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                        />
                                    </div>
                                    
                                    {/* Time labels */}
                                    <div className="flex justify-between mt-1 text-xs text-white/80">
                                        <span>0:00</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>
                                
                                {/* Control buttons */}
                                <div className="flex items-center justify-between text-white">
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={togglePlayPause}
                                            className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
                                        >
                                            {isPlaying ? (
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                                                </svg>
                                            ) : (
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z"/>
                                                </svg>
                                            )}
                                        </button>
                                        
                                        <span className="text-sm font-medium">
                                            {formatTime(currentTime)} / {formatTime(duration)}
                                        </span>
                                    </div>
                                    
                                    <button
                                        onClick={handleAddCommentAtTime}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors flex items-center space-x-2"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        <span>Add Comment at {formatTime(currentTime)}</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <img
                            src={mediaUrl}
                            alt={mediaName}
                            className="w-full h-full object-contain"
                        />
                    )}
                </div>

                {/* Comments sidebar for videos */}
                {mediaType === 'video' && conceptId && (
                    <div className="w-80 bg-white rounded-lg overflow-hidden flex flex-col">
                        <div className="p-4 border-b bg-gray-50">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900">
                                    Comments ({unresolvedComments.length + resolvedComments.length})
                                </h4>
                                <div className="text-xs text-gray-500">
                                    v{currentRevision}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[60vh]">
                            {/* Unresolved Comments */}
                            {unresolvedComments.length === 0 && resolvedComments.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    <div className="text-sm">No comments yet</div>
                                    <div className="text-xs mt-1">Add a comment to start the conversation</div>
                                </div>
                            ) : (
                                <>
                                    {/* Active Comments */}
                                    {unresolvedComments.length > 0 && (
                                        <div className="space-y-4">
                                            {unresolvedComments.map((comment) => (
                                                <CommentItem key={comment.id} comment={comment} />
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* Resolved Comments Section */}
                                    {resolvedComments.length > 0 && (
                                        <div className="border-t pt-4">
                                            <button
                                                onClick={() => setShowResolvedComments(!showResolvedComments)}
                                                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 mb-3"
                                            >
                                                {showResolvedComments ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                                <CheckCircle className="h-4 w-4 text-green-600" />
                                                <span>Resolved ({resolvedComments.length})</span>
                                            </button>
                                            
                                            {showResolvedComments && (
                                                <div className="space-y-4">
                                                    {resolvedComments.map((comment) => (
                                                        <CommentItem key={comment.id} comment={comment} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

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
                                    onChange={(e) => {
                                        e.preventDefault();
                                        const value = e.target.value;
                                        setNewComment(value);
                                    }}
                                    placeholder="Add your feedback..."
                                    aria-label="New comment"
                                    className="w-full p-2 border border-gray-300 rounded text-sm resize-none"
                                    rows={3}
                                    autoFocus
                                    dir="ltr"
                                    style={{ direction: 'ltr', textAlign: 'left' }}
                                />
                                <div className="flex space-x-2 mt-2">
                                    <button
                                        onClick={handleSubmitComment}
                                        disabled={!newComment.trim()}
                                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
                                    >
                                        Add Comment
                                    </button>
                                    <button
                                        onClick={handleCancelComment}
                                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
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