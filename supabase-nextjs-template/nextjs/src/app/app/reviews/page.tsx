"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useBrand } from '@/lib/context/BrandContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ExternalLink, CheckCircle, Upload, AlertTriangle, ChevronDown, ChevronUp, Filter, SortAsc, MessageCircle, Plus, Building2, Zap, Mail, MessageSquare, Share2, PenTool } from 'lucide-react';
import { createSPAClient } from '@/lib/supabase/client';
import { UploadedAssetGroup } from '@/lib/types/powerbrief';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import AssetGroupingPreview from '@/components/PowerBriefAssetGroupingPreview';
import { TimelineComment, CommentModal } from '@/components/CommentModal';

interface ConceptForReview {
    id: string;
    concept_title: string;
    brief_batch_id: string;
    video_editor?: string;
    review_link?: string;
    review_status?: string;
    uploaded_assets?: UploadedAssetGroup[];
    asset_upload_status?: string;
    updated_at: string;
    revision_count?: number;
    content_type?: string;
    brief_batches?: {
        id: string;
        name: string;
        brand_id: string;
        content_type?: string;
        brands: {
            id: string;
            name: string;
        };
    };
}

export default function ReviewsPage() {
    const { user } = useGlobal();
    const { selectedBrand, isLoading: brandsLoading } = useBrand();
    const [pendingReviews, setPendingReviews] = useState<ConceptForReview[]>([]);
    const [approvedConcepts, setApprovedConcepts] = useState<ConceptForReview[]>([]);
    const [uploadedAssetsConcepts, setUploadedAssetsConcepts] = useState<ConceptForReview[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingAssets, setLoadingAssets] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [reviewing, setReviewing] = useState<Record<string, boolean>>({});
    const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
    const [showUploadedAssets, setShowUploadedAssets] = useState<boolean>(false);
    
    // Content type filter state
    const [activeContentType, setActiveContentType] = useState<string>('all');
    
    // Filter and sort states for uploaded assets
    const [assetFilter, setAssetFilter] = useState<string>('all');
    const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
    const [assetSort, setAssetSort] = useState<string>('newest');
    
    // Sending to ad uploader state
    const [sendingToAds, setSendingToAds] = useState<Record<string, boolean>>({});
    
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
    
    // Asset grouping preview state
    const [showGroupingPreview, setShowGroupingPreview] = useState<boolean>(false);
    const [previewAssetGroups, setPreviewAssetGroups] = useState<UploadedAssetGroup[]>([]);
    const [previewConceptTitle, setPreviewConceptTitle] = useState<string>('');
    const [previewConceptId, setPreviewConceptId] = useState<string>('');
    
    const supabase = createSPAClient();

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

    // Function to get comment count for video assets
    const getCommentCount = (conceptId: string): number => {
        const comments = conceptComments[conceptId] || [];
        return comments.length;
    };

    // Function to fetch comments for a concept
    const fetchConceptComments = async (conceptId: string) => {
        try {
            const response = await fetch(`/api/concept-comments?conceptId=${conceptId}`);
            if (response.ok) {
                const data = await response.json();
                const comments: TimelineComment[] = data.comments.map((comment: any) => ({
                    id: comment.id,
                    timestamp: comment.timestamp_seconds,
                    comment: comment.comment_text,
                    author: comment.author_name,
                    created_at: comment.created_at,
                    updated_at: comment.updated_at,
                    parent_id: comment.parent_id,
                    user_id: comment.user_id,
                    revision_version: comment.revision_version || 1,
                    is_resolved: comment.is_resolved || false,
                    resolved_at: comment.resolved_at,
                    resolved_by: comment.resolved_by
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
                    parentId
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
                    user_id: data.comment.user_id,
                    revision_version: data.comment.revision_version || 1,
                    is_resolved: data.comment.is_resolved || false,
                    resolved_at: data.comment.resolved_at,
                    resolved_by: data.comment.resolved_by
                };

                setConceptComments(prev => {
                    const updated = { ...prev };
                    if (updated[conceptId]) {
                        updated[conceptId] = [...updated[conceptId], newComment];
                    } else {
                        updated[conceptId] = [newComment];
                    }
                    return updated;
                });
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
                    comment
                }),
            });

            if (response.ok) {
                const data = await response.json();
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

    // Function to resolve/unresolve a comment
    const handleResolveComment = async (commentId: string, isResolved: boolean) => {
        try {
            const response = await fetch('/api/concept-comments/resolve', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    commentId,
                    isResolved
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setConceptComments(prev => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach(conceptId => {
                        updated[conceptId] = updated[conceptId].map(c => 
                            c.id === commentId 
                                ? { 
                                    ...c, 
                                    is_resolved: data.comment.is_resolved,
                                    resolved_at: data.comment.resolved_at,
                                    resolved_by: data.comment.resolved_by,
                                    updated_at: data.comment.updated_at
                                }
                                : c
                        );
                    });
                    return updated;
                });
                
                toast({
                    title: isResolved ? "Comment Resolved" : "Comment Reopened",
                    description: isResolved ? "Comment has been marked as resolved." : "Comment has been reopened.",
                    duration: 3000,
                });
            } else {
                console.error('Failed to resolve comment');
                toast({
                    title: 'Error',
                    description: 'Failed to update comment status. Please try again.',
                    variant: 'destructive',
                    duration: 3000,
                });
            }
        } catch (error) {
            console.error('Error resolving comment:', error);
            toast({
                title: 'Error',
                description: 'Failed to update comment status. Please try again.',
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
            const response = await fetch(`/api/concept-comments?commentId=${commentId}`, {
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

    useEffect(() => {
        const fetchReviews = async () => {
            if (!user?.id || !selectedBrand) return;
            
            try {
                setLoading(true);
                
                // Get all concepts that are ready for review for the selected brand
                // Remove user_id filter to allow shared users to see all concepts for brands they have access to
                const pendingQuery = supabase
                    .from('brief_concepts' as any)
                    .select(`
                        *,
                        brief_batches:brief_batch_id (
                            id,
                            name,
                            brand_id,
                            content_type,
                            brands:brand_id (
                                id,
                                name
                            )
                        )
                    `)
                    .eq('review_status', 'ready_for_review');
                
                // Filter by brand through the brief_batches relationship
                const { data: pendingConcepts, error: pendingError } = await pendingQuery
                    .order('updated_at', { ascending: false });
                
                if (pendingError) throw pendingError;
                
                // Filter by selected brand in memory since we can't filter nested relations directly
                const filteredPendingConcepts = (pendingConcepts || []).filter((concept: any) => 
                    concept.brief_batches?.brand_id === selectedBrand.id
                );
                
                // Get approved concepts with uploaded assets that haven't been sent to ad batches yet
                // Remove user_id filter here as well
                const approvedQuery = supabase
                    .from('brief_concepts' as any)
                    .select(`
                        *,
                        brief_batches:brief_batch_id (
                            id,
                            name,
                            brand_id,
                            content_type,
                            brands:brand_id (
                                id,
                                name
                            )
                        )
                    `)
                    .eq('review_status', 'approved')
                    .not('uploaded_assets', 'is', null)
                    .neq('asset_upload_status', 'sent_to_ad_upload');
                
                const { data: approvedConceptsData, error: approvedError } = await approvedQuery
                    .order('updated_at', { ascending: false });
                
                if (approvedError) throw approvedError;
                
                // Filter by selected brand in memory
                const filteredApprovedConcepts = (approvedConceptsData || []).filter((concept: any) => 
                    concept.brief_batches?.brand_id === selectedBrand.id
                );
                
                setPendingReviews(filteredPendingConcepts as unknown as ConceptForReview[]);
                setApprovedConcepts(filteredApprovedConcepts as unknown as ConceptForReview[]);
                
                // Initialize reviewer notes
                const notesObj: Record<string, string> = {};
                filteredPendingConcepts?.forEach((concept: any) => {
                    notesObj[concept.id] = '';
                });
                setReviewerNotes(notesObj);
                
                setError(null);
            } catch (err) {
                console.error('Failed to fetch reviews:', err);
                setError('Failed to load reviews. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, [user?.id, selectedBrand]);

    // Load comments for all concepts when they're fetched
    useEffect(() => {
        const allConcepts = [...pendingReviews, ...approvedConcepts];
        allConcepts.forEach(concept => {
            fetchConceptComments(concept.id);
        });
    }, [pendingReviews, approvedConcepts]);

    const fetchUploadedAssets = async () => {
        if (!user?.id || !selectedBrand) return;
        
        try {
            setLoadingAssets(true);
            
            // Get all concepts with uploaded assets for the selected brand
            // Remove user_id filter to allow shared users to see all concepts for brands they have access to
            const { data: conceptsWithAssets, error: assetsError } = await supabase
                .from('brief_concepts' as any)
                .select(`
                    *,
                    brief_batches:brief_batch_id (
                        id,
                        name,
                        brand_id,
                        brands:brand_id (
                            id,
                            name
                        )
                    )
                `)
                .not('uploaded_assets', 'is', null)
                .order('updated_at', { ascending: false });
            
            if (assetsError) throw assetsError;
            
            // Filter by selected brand in memory
            const filteredConcepts = (conceptsWithAssets || []).filter((concept: any) => 
                concept.brief_batches?.brand_id === selectedBrand.id
            );
            
            setUploadedAssetsConcepts(filteredConcepts as unknown as ConceptForReview[]);
        } catch (err) {
            console.error('Failed to fetch uploaded assets:', err);
        } finally {
            setLoadingAssets(false);
        }
    };

    const handleApprove = async (conceptId: string) => {
        try {
            setReviewing(prev => ({ ...prev, [conceptId]: true }));
            
            const { data, error } = await supabase
                .from('brief_concepts')
                .update({
                    review_status: 'approved',
                    status: 'APPROVED',
                    reviewer_notes: reviewerNotes[conceptId] || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', conceptId)
                .select()
                .single();
            
            if (error) throw error;
            
            // Find the concept to get additional data for Slack notification
            const concept = pendingReviews.find(c => c.id === conceptId);
            
            // Send Slack notification for concept approval
            if (concept) {
                try {
                    await fetch('/api/slack/concept-approval', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            conceptId: conceptId,
                            conceptTitle: concept.concept_title,
                            batchName: concept.brief_batches.name,
                            brandId: concept.brief_batches.brand_id,
                            videoEditor: concept.video_editor,
                            reviewerNotes: reviewerNotes[conceptId] || null
                        }),
                    });
                } catch (slackError) {
                    console.error('Failed to send Slack notification for concept approval:', slackError);
                    // Don't fail the approval if Slack notification fails
                }
            }
            
            // Remove from pending reviews
            setPendingReviews(prev => prev.filter(item => item.id !== conceptId));
            
            // Add to approved concepts if it has uploaded assets and hasn't been sent to ads yet
            if (concept && concept.uploaded_assets && concept.uploaded_assets.length > 0) {
                const updatedConcept = {
                    ...concept,
                    review_status: 'approved' as const,
                    status: 'APPROVED',
                    reviewer_notes: reviewerNotes[conceptId] || null,
                    updated_at: new Date().toISOString()
                };
                setApprovedConcepts(prev => [...prev, updatedConcept]);
            }
            
            toast({
                title: "Approved",
                description: "The concept has been approved successfully.",
                duration: 3000,
            });
            
        } catch (err) {
            console.error('Error approving concept:', err);
            toast({
                title: "Error",
                description: "Failed to approve concept. Please try again.",
                variant: "destructive",
                duration: 3000,
            });
        } finally {
            setReviewing(prev => ({ ...prev, [conceptId]: false }));
        }
    };

    const handleRequestRevisions = async (conceptId: string) => {
        if (!reviewerNotes[conceptId]?.trim()) {
            toast({
                title: "Notes Required",
                description: "Please provide feedback when requesting revisions.",
                variant: "destructive",
                duration: 3000,
            });
            return;
        }
        
        try {
            setReviewing(prev => ({ ...prev, [conceptId]: true }));
            
            const { data, error } = await supabase
                .from('brief_concepts')
                .update({
                    review_status: 'needs_revisions',
                    status: 'REVISIONS REQUESTED',
                    reviewer_notes: reviewerNotes[conceptId],
                    updated_at: new Date().toISOString()
                })
                .eq('id', conceptId)
                .select()
                .single();
            
            if (error) throw error;
            
            // Find the concept to get additional data for Slack notification
            const concept = pendingReviews.find(c => c.id === conceptId);
            
            // Send Slack notification for concept revision request
            if (concept) {
                try {
                    await fetch('/api/slack/concept-revision', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            conceptId: conceptId,
                            conceptTitle: concept.concept_title,
                            batchName: concept.brief_batches.name,
                            brandId: concept.brief_batches.brand_id,
                            videoEditor: concept.video_editor,
                            feedback: reviewerNotes[conceptId]
                        }),
                    });
                } catch (slackError) {
                    console.error('Failed to send Slack notification for concept revision:', slackError);
                    // Don't fail the revision request if Slack notification fails
                }
            }
            
            // Remove from pending reviews
            setPendingReviews(prev => prev.filter(item => item.id !== conceptId));
            
            toast({
                title: "Revisions Requested",
                description: "The concept has been marked as needing revisions.",
                duration: 3000,
            });
            
        } catch (err) {
            console.error('Error requesting revisions:', err);
            toast({
                title: "Error",
                description: "Failed to request revisions. Please try again.",
                variant: "destructive",
                duration: 3000,
            });
        } finally {
            setReviewing(prev => ({ ...prev, [conceptId]: false }));
        }
    };

    const handleSendToAdBatch = async (conceptId: string) => {
        // Find the concept to get its assets and title
        const concept = approvedConcepts.find(c => c.id === conceptId);
        if (!concept || !concept.uploaded_assets) {
            toast({
                title: "Error",
                description: "No assets found for this concept.",
                variant: "destructive",
                duration: 3000,
            });
            return;
        }

        // Show the grouping preview
        setPreviewAssetGroups(concept.uploaded_assets as UploadedAssetGroup[]);
        setPreviewConceptTitle(concept.concept_title);
        setPreviewConceptId(conceptId);
        setShowGroupingPreview(true);
    };

    const handleConfirmSendToAdBatch = async (conceptId: string, assetGroups: UploadedAssetGroup[]) => {
        setSendingToAds(prev => ({ ...prev, [conceptId]: true }));
        
        try {
            // First, update the concept with the new asset grouping using the API
            const updateResponse = await fetch('/api/powerbrief/update-asset-grouping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ conceptId, assetGroups }),
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(errorData.message || 'Failed to update asset grouping');
            }

            const updateResult = await updateResponse.json();
            console.log('Asset grouping updated successfully:', updateResult);

            // Update the local state with the new grouping
            setUploadedAssetsConcepts(prev => 
                prev.map(concept => 
                    concept.id === conceptId 
                        ? { ...concept, uploaded_assets: assetGroups }
                        : concept
                )
            );

            // Reset the asset upload status
            const supabase = createSPAClient();
            const { error: resetError } = await supabase
                .from('brief_concepts' as any)
                .update({ asset_upload_status: 'uploaded' })
                .eq('id', conceptId);

            if (resetError) {
                console.warn('Failed to reset concept status, but continuing:', resetError);
            }

            // Then send to ad batch with the updated grouping
            const response = await fetch('/api/powerbrief/send-to-ad-batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ conceptId }),
            });

            if (response.ok) {
                const result = await response.json();
                
                // Refresh the uploaded assets list to reflect the status change
                fetchUploadedAssets();

                // Close the modal after successful operation
                setShowGroupingPreview(false);

                toast({
                    title: "Success",
                    description: `Assets have been sent to the Ad Upload Tool with your custom grouping. ${result.totalDrafts} ad drafts created.`,
                    duration: 3000,
                });
            } else {
                throw new Error('Failed to send to ad uploader');
            }
        } catch (error) {
            console.error('Error sending to ad uploader:', error);
            toast({
                title: "Error",
                description: "Failed to send assets to Ad Upload Tool. Please try again.",
                variant: "destructive",
                duration: 3000,
            });
        } finally {
            setSendingToAds(prev => ({ ...prev, [conceptId]: false }));
        }
    };

    const handleResendToAdBatch = async (conceptId: string) => {
        // Find the concept to get its assets and title
        const concept = uploadedAssetsConcepts.find(c => c.id === conceptId);
        if (!concept || !concept.uploaded_assets) {
            toast({
                title: "Error",
                description: "No assets found for this concept.",
                variant: "destructive",
                duration: 3000,
            });
            return;
        }

        // Show the grouping preview
        setPreviewAssetGroups(concept.uploaded_assets as UploadedAssetGroup[]);
        setPreviewConceptTitle(concept.concept_title);
        setPreviewConceptId(conceptId);
        setShowGroupingPreview(true);
    };

    const handleConfirmResendToAdBatch = async (conceptId: string, assetGroups: UploadedAssetGroup[]) => {
        setSendingToAds(prev => ({ ...prev, [conceptId]: true }));
        
        try {
            // First, update the concept with the new asset grouping using the API
            const updateResponse = await fetch('/api/powerbrief/update-asset-grouping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ conceptId, assetGroups }),
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(errorData.message || 'Failed to update asset grouping');
            }

            const updateResult = await updateResponse.json();
            console.log('Asset grouping updated successfully:', updateResult);

            // Update the local state with the new grouping
            setUploadedAssetsConcepts(prev => 
                prev.map(concept => 
                    concept.id === conceptId 
                        ? { ...concept, uploaded_assets: assetGroups }
                        : concept
                )
            );

            // Reset the asset upload status
            const supabase = createSPAClient();
            const { error: resetError } = await supabase
                .from('brief_concepts' as any)
                .update({ asset_upload_status: 'uploaded' })
                .eq('id', conceptId);

            if (resetError) {
                console.warn('Failed to reset concept status, but continuing:', resetError);
            }

            // Then send to ad batch with the updated grouping
            const response = await fetch('/api/powerbrief/send-to-ad-batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ conceptId }),
            });

            if (response.ok) {
                const result = await response.json();
                
                // Refresh the uploaded assets list to reflect the status change
                fetchUploadedAssets();

                // Close the modal after successful operation
                setShowGroupingPreview(false);

                toast({
                    title: "Success",
                    description: `Assets have been resent to the Ad Upload Tool with your custom grouping. ${result.totalDrafts} ad drafts created.`,
                    duration: 3000,
                });
            } else {
                throw new Error('Failed to resend to ad uploader');
            }
        } catch (error) {
            console.error('Error resending to ad uploader:', error);
            toast({
                title: "Error",
                description: "Failed to resend assets to Ad Upload Tool. Please try again.",
                variant: "destructive",
                duration: 3000,
            });
        } finally {
            setSendingToAds(prev => ({ ...prev, [conceptId]: false }));
        }
    };

    const handleRequestAdditionalRevisions = async (conceptId: string) => {
        const revisionNotes = prompt('Please provide feedback for the additional revisions needed:');
        
        if (!revisionNotes?.trim()) {
            toast({
                title: "Notes Required",
                description: "Please provide feedback when requesting additional revisions.",
                variant: "destructive",
                duration: 3000,
            });
            return;
        }
        
        try {
            setSendingToAds(prev => ({ ...prev, [conceptId]: true }));
            
            const { error } = await supabase
                .from('brief_concepts' as any)
                .update({
                    review_status: 'needs_revisions',
                    status: 'ADDITIONAL REVISIONS REQUESTED',
                    reviewer_notes: revisionNotes,
                    asset_upload_status: null, // Reset upload status
                    updated_at: new Date().toISOString()
                })
                .eq('id', conceptId);
            
            if (error) throw error;
            
            // Find the concept to get additional data for Slack notification
            const concept = [...approvedConcepts, ...uploadedAssetsConcepts].find(c => c.id === conceptId);
            
            // Send Slack notification for additional revision request
            if (concept) {
                try {
                    await fetch('/api/slack/concept-revision', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            conceptId: conceptId,
                            conceptTitle: concept.concept_title,
                            batchName: concept.brief_batches?.name,
                            brandId: concept.brief_batches?.brand_id,
                            videoEditor: concept.video_editor,
                            feedback: revisionNotes
                        }),
                    });
                } catch (slackError) {
                    console.error('Failed to send Slack notification for additional revision:', slackError);
                    // Don't fail the revision request if Slack notification fails
                }
            }
            
            // Remove from approved concepts and uploaded assets lists
            setApprovedConcepts(prev => prev.filter(item => item.id !== conceptId));
            setUploadedAssetsConcepts(prev => prev.filter(item => item.id !== conceptId));
            
            toast({
                title: "Additional Revisions Requested",
                description: "The concept has been sent back for additional revisions.",
                duration: 3000,
            });
            
        } catch (err) {
            console.error('Error requesting additional revisions:', err);
            toast({
                title: "Error",
                description: "Failed to request additional revisions. Please try again.",
                variant: "destructive",
                duration: 3000,
            });
        } finally {
            setSendingToAds(prev => ({ ...prev, [conceptId]: false }));
        }
    };

    const handleRequestAdditionalSizes = async (conceptId: string) => {
        const additionalSizesNotes = prompt('Please specify what additional sizes or variations are needed:');
        
        if (!additionalSizesNotes?.trim()) {
            toast({
                title: "Notes Required",
                description: "Please specify what additional sizes are needed.",
                variant: "destructive",
                duration: 3000,
            });
            return;
        }
        
        try {
            setSendingToAds(prev => ({ ...prev, [conceptId]: true }));
            
            // Update concept to needs_additional_sizes status
            const { error } = await supabase
                .from('brief_concepts' as any)
                .update({
                    review_status: 'needs_additional_sizes',
                    status: 'ADDITIONAL SIZES REQUESTED',
                    reviewer_notes: additionalSizesNotes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', conceptId);
            
            if (error) throw error;
            
            // Find the concept to get additional data for Slack notification
            const concept = [...approvedConcepts, ...uploadedAssetsConcepts].find(c => c.id === conceptId);
            
            // Send Slack notification for additional sizes request
            if (concept) {
                try {
                    await fetch('/api/slack/additional-sizes-request', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            conceptId: conceptId,
                            conceptTitle: concept.concept_title,
                            batchName: concept.brief_batches?.name,
                            brandId: concept.brief_batches?.brand_id,
                            videoEditor: concept.video_editor,
                            additionalSizesNotes: additionalSizesNotes
                        }),
                    });
                } catch (slackError) {
                    console.error('Failed to send Slack notification for additional sizes request:', slackError);
                    // Don't fail the request if Slack notification fails
                }
            }
            
            // Remove from approved concepts and uploaded assets lists
            setApprovedConcepts(prev => prev.filter(item => item.id !== conceptId));
            setUploadedAssetsConcepts(prev => prev.filter(item => item.id !== conceptId));
            
            toast({
                title: "Additional Sizes Requested",
                description: "The editor has been notified to upload additional sizes while keeping existing assets.",
                duration: 3000,
            });
            
        } catch (err) {
            console.error('Error requesting additional sizes:', err);
            toast({
                title: "Error",
                description: "Failed to request additional sizes. Please try again.",
                variant: "destructive",
                duration: 3000,
            });
        } finally {
            setSendingToAds(prev => ({ ...prev, [conceptId]: false }));
        }
    };

    // Filter and sort uploaded assets
    const getFilteredAndSortedAssets = () => {
        let filtered = [...uploadedAssetsConcepts];

        // Filter by status
        if (assetFilter !== 'all') {
            filtered = filtered.filter(concept => {
                switch (assetFilter) {
                    case 'pending':
                        return concept.review_status === 'ready_for_review';
                    case 'approved':
                        return concept.review_status === 'approved' && concept.asset_upload_status !== 'sent_to_ad_upload';
                    case 'sent':
                        return concept.asset_upload_status === 'sent_to_ad_upload';
                    default:
                        return true;
                }
            });
        }

        // Filter by brand
        if (selectedBrandFilter !== 'all') {
            filtered = filtered.filter(concept => 
                concept.brief_batches?.brand_id === selectedBrandFilter
            );
        }

        // Sort
        filtered.sort((a, b) => {
            switch (assetSort) {
                case 'oldest':
                    return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
                case 'batch':
                    return (a.brief_batches?.name || '').localeCompare(b.brief_batches?.name || '');
                case 'newest':
                default:
                    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            }
        });

        return filtered;
    };

    // Get unique brands for filter dropdown
    const getUniqueBrands = () => {
        const brands = uploadedAssetsConcepts
            .map(concept => concept.brief_batches?.brands)
            .filter(Boolean)
            .reduce((acc: any[], brand: any) => {
                if (!acc.find(b => b.id === brand.id)) {
                    acc.push(brand);
                }
                return acc;
            }, []);
        return brands;
    };

    // Function to handle concept resubmission after revisions
    const handleConceptResubmission = async (conceptId: string) => {
        try {
            const response = await fetch('/api/concept-revision', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ conceptId }),
            });

            if (response.ok) {
                const data = await response.json();
                toast({
                    title: "Concept Resubmitted",
                    description: data.message,
                    duration: 3000,
                });
                
                // Refresh the concepts to get updated revision count
                // This would typically be called when a user resubmits assets
                
            } else {
                console.error('Failed to increment revision count');
            }
        } catch (error) {
            console.error('Error incrementing revision count:', error);
        }
    };

    // Get current revision for a concept
    const getCurrentRevision = (conceptId: string): number => {
        const comments = conceptComments[conceptId] || [];
        return Math.max(...comments.map(c => c.revision_version || 1), 1);
    };

    // Content type filtering helpers
    const getContentTypeConfig = (contentType: string) => {
        const configs = {
            ads: { title: 'Ads', icon: Zap, color: 'text-orange-600' },
            'web-assets': { title: 'Web Assets', icon: Share2, color: 'text-blue-600' },
            email: { title: 'Email', icon: Mail, color: 'text-green-600' },
            sms: { title: 'SMS', icon: MessageSquare, color: 'text-purple-600' },
            'organic-social': { title: 'Organic Social', icon: Share2, color: 'text-pink-600' },
            blog: { title: 'Blog', icon: PenTool, color: 'text-indigo-600' }
        };
        return configs[contentType as keyof typeof configs] || configs.ads;
    };
    
    const filterConceptsByContentType = (concepts: ConceptForReview[]) => {
        if (activeContentType === 'all') {
            return concepts;
        }
        return concepts.filter(concept => {
            const contentType = concept.brief_batches?.content_type || 'ads';
            return contentType === activeContentType;
        });
    };
    
    const getContentTypeAction = (contentType: string) => {
        switch (contentType) {
            case 'ads':
                return 'Send to Ad Uploader';
            case 'web-assets':
                return 'Export for Web';
            case 'email':
                return 'Export for Email';
            case 'sms':
                return 'Export for SMS';
            case 'organic-social':
                return 'Export for Social';
            case 'blog':
                return 'Export for Blog';
            default:
                return 'Export Assets';
        }
    };

    if (loading || brandsLoading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!selectedBrand) {
        return (
            <div className="space-y-6 p-6">
                <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                        <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No brand selected</h3>
                        <p className="max-w-md mx-auto">
                            Please select a brand from the dropdown above to view ad reviews.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Asset Review Queue - {selectedBrand.name}</h1>
            </div>
            
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            {/* Content Type Tabs */}
            <Tabs value={activeContentType} onValueChange={setActiveContentType} className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                    <TabsTrigger value="all" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        All Assets
                    </TabsTrigger>
                    <TabsTrigger value="ads" className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Ads
                    </TabsTrigger>
                    <TabsTrigger value="web-assets" className="flex items-center gap-2">
                        <Share2 className="h-4 w-4" />
                        Web Assets
                    </TabsTrigger>
                    <TabsTrigger value="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                    </TabsTrigger>
                    <TabsTrigger value="sms" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        SMS
                    </TabsTrigger>
                    <TabsTrigger value="organic-social" className="flex items-center gap-2">
                        <Share2 className="h-4 w-4" />
                        Organic Social
                    </TabsTrigger>
                    <TabsTrigger value="blog" className="flex items-center gap-2">
                        <PenTool className="h-4 w-4" />
                        Blog
                    </TabsTrigger>
                </TabsList>

                <TabsContent value={activeContentType} className="mt-6">
                    {filterConceptsByContentType(pendingReviews).length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center text-gray-500">
                                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    No {activeContentType === 'all' ? 'assets' : getContentTypeConfig(activeContentType).title.toLowerCase()} pending review
                                </h3>
                                <p className="max-w-md mx-auto">
                                    All content has been reviewed. Check back later for new submissions.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {filterConceptsByContentType(pendingReviews).map((concept) => (
                                <Card key={concept.id} className="overflow-hidden">
                                    <CardHeader>
                                        <CardTitle>
                                            {concept.concept_title} 
                                            <span className="ml-2 text-sm font-normal text-gray-500">
                                                (Brand: {concept.brief_batches.brands.name} - Batch: {concept.brief_batches.name})
                                            </span>
                                        </CardTitle>
                                        <CardDescription>
                                            Submitted for review: {new Date(concept.updated_at).toLocaleString()}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Video Editor */}
                                        {concept.video_editor && (
                                            <div>
                                                <span className="text-sm font-medium">Editor: </span>
                                                <span className="text-sm">{concept.video_editor}</span>
                                            </div>
                                        )}
                                        
                                        {/* Display uploaded assets if available */}
                                        {concept.uploaded_assets && concept.uploaded_assets.length > 0 && (
                                            <div>
                                                <span className="text-sm font-medium mb-2 block">Uploaded Assets:</span>
                                                <div className="space-y-3">
                                                    {(concept.uploaded_assets as UploadedAssetGroup[]).map((group, groupIndex) => (
                                                        <div key={groupIndex} className="border rounded-lg p-3">
                                                            <h4 className="font-medium text-gray-900 mb-2 text-sm">{group.baseName}</h4>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                {group.assets.slice(0, 4).map((asset, assetIndex) => (
                                                                    <div key={assetIndex} className="relative">
                                                                        {asset.type === 'image' ? (
                                                                            <img
                                                                                src={asset.supabaseUrl}
                                                                                alt={asset.name}
                                                                                className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                                                                onClick={() => openMediaModal(asset.supabaseUrl, 'image', asset.name, concept.id)}
                                                                            />
                                                                        ) : (
                                                                            <video
                                                                                src={asset.supabaseUrl}
                                                                                className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                                                                onClick={() => openMediaModal(asset.supabaseUrl, 'video', asset.name, concept.id)}
                                                                            />
                                                                        )}
                                                                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                                                                            {asset.aspectRatio}
                                                                        </div>
                                                                        {/* Comment count badge for videos */}
                                                                        {asset.type === 'video' && (
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
                                                            {group.assets.length > 4 && (
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    +{group.assets.length - 4} more files
                                                                </p>
                                                            )}
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                Aspect ratios: {group.aspectRatios.join(', ')}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Frame.io Link - only show if no uploaded assets */}
                                        {concept.review_link && !concept.uploaded_assets && (
                                            <div>
                                                <span className="text-sm font-medium">Review Link: </span>
                                                <a 
                                                    href={concept.review_link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline inline-flex items-center"
                                                >
                                                    {concept.review_link.substring(0, 50)}
                                                    {concept.review_link.length > 50 ? '...' : ''}
                                                    <ExternalLink className="h-3 w-3 ml-1" />
                                                </a>
                                            </div>
                                        )}
                                        
                                        {/* Reviewer Notes */}
                                        <div className="mt-4">
                                            <Label htmlFor={`notes-${concept.id}`}>Review Notes</Label>
                                            <Textarea
                                                id={`notes-${concept.id}`}
                                                placeholder="Add your feedback or notes for the video editor..."
                                                value={reviewerNotes[concept.id] || ''}
                                                onChange={(e) => setReviewerNotes(prev => ({ ...prev, [concept.id]: e.target.value }))}
                                                className="mt-1"
                                            />
                                        </div>
                                        
                                        {/* Review Buttons */}
                                        <div className="flex space-x-2">
                                            <Button
                                                onClick={() => handleApprove(concept.id)}
                                                disabled={reviewing[concept.id]}
                                                className="bg-green-600 hover:bg-green-700 text-white flex-1"
                                            >
                                                {reviewing[concept.id] ? (
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                )}
                                                Approve
                                            </Button>
                                            
                                            <Button
                                                onClick={() => handleRequestRevisions(concept.id)}
                                                disabled={reviewing[concept.id]}
                                                variant="outline"
                                                className="border-amber-300 text-amber-700 hover:bg-amber-50 flex-1"
                                            >
                                                {reviewing[concept.id] ? (
                                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                ) : (
                                                    <AlertTriangle className="h-4 w-4 mr-2" />
                                                )}
                                                Request Revisions
                                            </Button>
                                        </div>
                                        
                                        {/* Link to view full concept */}
                                        <div className="mt-2">
                                            <Link
                                                href={`/app/powerbrief/${concept.brief_batches.brand_id}/${concept.brief_batch_id}`}
                                                className="text-sm text-blue-600 hover:underline"
                                            >
                                                View in PowerBrief →
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
            
            {/* Approved Concepts Section */}
            {approvedConcepts.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-green-700">Approved Concepts Ready for Ad Upload</h2>
                    <div className="space-y-6">
                        {approvedConcepts.map((concept) => (
                            <Card key={concept.id} className="overflow-hidden border-green-300 bg-green-50">
                                <CardHeader>
                                    <CardTitle className="text-green-800">
                                        {concept.concept_title} 
                                        <span className="ml-2 text-sm font-normal text-green-600">
                                            (Brand: {concept.brief_batches.brands.name} - Batch: {concept.brief_batches.name})
                                        </span>
                                    </CardTitle>
                                    <CardDescription className="text-green-700">
                                        Approved: {new Date(concept.updated_at).toLocaleString()}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Video Editor */}
                                    {concept.video_editor && (
                                        <div>
                                            <span className="text-sm font-medium">Editor: </span>
                                            <span className="text-sm">{concept.video_editor}</span>
                                        </div>
                                    )}
                                    
                                    {/* Display uploaded assets */}
                                    {concept.uploaded_assets && concept.uploaded_assets.length > 0 && (
                                        <div>
                                            <span className="text-sm font-medium mb-2 block">Approved Assets:</span>
                                            <div className="space-y-3">
                                                {(concept.uploaded_assets as UploadedAssetGroup[]).map((group, groupIndex) => (
                                                    <div key={groupIndex} className="border border-green-200 rounded-lg p-3 bg-white">
                                                        <h4 className="font-medium text-gray-900 mb-2 text-sm">{group.baseName}</h4>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                            {group.assets.slice(0, 4).map((asset, assetIndex) => (
                                                                <div key={assetIndex} className="relative">
                                                                    {asset.type === 'image' ? (
                                                                        <img
                                                                            src={asset.supabaseUrl}
                                                                            alt={asset.name}
                                                                            className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                                                            onClick={() => openMediaModal(asset.supabaseUrl, 'image', asset.name, concept.id)}
                                                                        />
                                                                    ) : (
                                                                        <video
                                                                            src={asset.supabaseUrl}
                                                                            className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                                                            onClick={() => openMediaModal(asset.supabaseUrl, 'video', asset.name, concept.id)}
                                                                        />
                                                                    )}
                                                                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                                                                        {asset.aspectRatio}
                                                                    </div>
                                                                    {/* Comment count badge for videos */}
                                                                    {asset.type === 'video' && (
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
                                                        {group.assets.length > 4 && (
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                +{group.assets.length - 4} more files
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Aspect ratios: {group.aspectRatios.join(', ')}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Send to Ad Batch button */}
                                    <div className="flex space-x-2">
                                        <Button
                                            onClick={() => handleSendToAdBatch(concept.id)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                            title={concept.asset_upload_status === 'sent_to_ad_upload' ? `Resend approved assets to ${getContentTypeAction(concept.brief_batches?.content_type || 'ads')}` : `${getContentTypeAction(concept.brief_batches?.content_type || 'ads')}`}
                                            disabled={sendingToAds[concept.id]}
                                        >
                                            {sendingToAds[concept.id] ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Upload className="h-4 w-4 mr-2" />
                                            )}
                                            {concept.asset_upload_status === 'sent_to_ad_upload' ? 'Resend' : getContentTypeAction(concept.brief_batches?.content_type || 'ads')}
                                        </Button>
                                        
                                        <Button
                                            onClick={() => handleRequestAdditionalRevisions(concept.id)}
                                            variant="outline"
                                            className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                            title="Request additional revisions from the editor"
                                            disabled={sendingToAds[concept.id]}
                                        >
                                            {sendingToAds[concept.id] ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <AlertTriangle className="h-4 w-4 mr-2" />
                                            )}
                                            Request More Revisions
                                        </Button>
                                        
                                        <Button
                                            onClick={() => handleRequestAdditionalSizes(concept.id)}
                                            variant="outline"
                                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                            title="Request additional sizes while keeping existing assets"
                                            disabled={sendingToAds[concept.id]}
                                        >
                                            {sendingToAds[concept.id] ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Plus className="h-4 w-4 mr-2" />
                                            )}
                                            Request Additional Sizes
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Uploaded Assets Section */}
            <div className="space-y-4">
                <Card className="border-2 border-blue-200">
                    <CardHeader 
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => {
                            setShowUploadedAssets(!showUploadedAssets);
                            if (!showUploadedAssets && uploadedAssetsConcepts.length === 0) {
                                fetchUploadedAssets();
                            }
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg text-blue-800">
                                    All Uploaded Assets ({uploadedAssetsConcepts.length})
                                </CardTitle>
                                <CardDescription className="text-blue-600">
                                    View and manage all concepts with uploaded creative assets
                                </CardDescription>
                            </div>
                            {showUploadedAssets ? (
                                <ChevronUp className="h-5 w-5 text-blue-600" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-blue-600" />
                            )}
                        </div>
                    </CardHeader>
                    
                    {showUploadedAssets && (
                        <CardContent className="space-y-4">
                            {loadingAssets ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                    <span className="ml-2 text-blue-600">Loading uploaded assets...</span>
                                </div>
                            ) : (
                                <>
                                    {/* Filters and Sorting */}
                                    <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                            <Filter className="h-4 w-4 text-gray-600" />
                                            <Label className="text-sm font-medium">Status:</Label>
                                            <select
                                                value={assetFilter}
                                                onChange={(e) => setAssetFilter(e.target.value)}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                title="Filter by status"
                                            >
                                                <option value="all">All</option>
                                                <option value="pending">Pending Review</option>
                                                <option value="approved">Approved</option>
                                                <option value="sent">Sent to Ads</option>
                                            </select>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                            <Label className="text-sm font-medium">Brand:</Label>
                                            <select
                                                value={selectedBrandFilter}
                                                onChange={(e) => setSelectedBrandFilter(e.target.value)}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                title="Filter by brand"
                                            >
                                                <option value="all">All Brands</option>
                                                {getUniqueBrands().map((brand: any) => (
                                                    <option key={brand.id} value={brand.id}>
                                                        {brand.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                            <SortAsc className="h-4 w-4 text-gray-600" />
                                            <Label className="text-sm font-medium">Sort:</Label>
                                            <select
                                                value={assetSort}
                                                onChange={(e) => setAssetSort(e.target.value)}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                title="Sort by"
                                            >
                                                <option value="newest">Newest First</option>
                                                <option value="oldest">Oldest First</option>
                                                <option value="batch">By Batch Name</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    {/* Assets List */}
                                    {getFilteredAndSortedAssets().length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                            <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
                                            <p>No concepts match the current filters.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {getFilteredAndSortedAssets().map((concept: any) => (
                                                <Card key={concept.id} className="border border-gray-200">
                                                    <CardHeader className="pb-2">
                                                        <div className="flex items-center justify-between">
                                                            <CardTitle className="text-base">
                                                                {concept.concept_title}
                                                                <span className="ml-2 text-sm font-normal text-gray-500">
                                                                    ({concept.brief_batches?.brands?.name} - {concept.brief_batches?.name})
                                                                </span>
                                                            </CardTitle>
                                                            <div className="flex items-center space-x-2">
                                                                {concept.review_status === 'ready_for_review' && (
                                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                                                        Pending Review
                                                                    </span>
                                                                )}
                                                                {concept.review_status === 'approved' && concept.asset_upload_status !== 'sent_to_ad_upload' && (
                                                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                                        Approved
                                                                    </span>
                                                                )}
                                                                {concept.asset_upload_status === 'sent_to_ad_upload' && (
                                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                                                        Sent to Ads
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <CardDescription>
                                                            Updated: {new Date(concept.updated_at).toLocaleString()}
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent>
                                                        {/* Display uploaded assets */}
                                                        {concept.uploaded_assets && concept.uploaded_assets.length > 0 && (
                                                            <div>
                                                                <span className="text-sm font-medium mb-2 block">Assets:</span>
                                                                <div className="space-y-2">
                                                                    {(concept.uploaded_assets as UploadedAssetGroup[]).map((group, groupIndex) => (
                                                                        <div key={groupIndex} className="border rounded-lg p-2 bg-gray-50">
                                                                            <h4 className="font-medium text-gray-900 mb-1 text-sm">{group.baseName}</h4>
                                                                            <div className="grid grid-cols-4 md:grid-cols-6 gap-1">
                                                                                {group.assets.slice(0, 6).map((asset, assetIndex) => (
                                                                                    <div key={assetIndex} className="relative">
                                                                                        {asset.type === 'image' ? (
                                                                                            <img
                                                                                                src={asset.supabaseUrl}
                                                                                                alt={asset.name}
                                                                                                className="w-full h-12 object-cover rounded border cursor-pointer hover:opacity-80"
                                                                                                onClick={() => openMediaModal(asset.supabaseUrl, 'image', asset.name, concept.id)}
                                                                                            />
                                                                                        ) : (
                                                                                            <video
                                                                                                src={asset.supabaseUrl}
                                                                                                className="w-full h-12 object-cover rounded border cursor-pointer hover:opacity-80"
                                                                                                onClick={() => openMediaModal(asset.supabaseUrl, 'video', asset.name, concept.id)}
                                                                                            />
                                                                                        )}
                                                                                        <div className="absolute bottom-0 left-0 bg-black bg-opacity-75 text-white text-xs px-1 rounded-br">
                                                                                            {asset.aspectRatio}
                                                                                        </div>
                                                                                        {/* Comment count badge for videos */}
                                                                                        {asset.type === 'video' && (
                                                                                            <div 
                                                                                                className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-1 py-0.5 rounded-bl flex items-center space-x-1 shadow-lg"
                                                                                                title={`${getCommentCount(concept.id)} comments`}
                                                                                            >
                                                                                                <MessageCircle className="h-2 w-2" />
                                                                                                <span>{getCommentCount(concept.id)}</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            {group.assets.length > 6 && (
                                                                                <p className="text-xs text-gray-500 mt-1">
                                                                                    +{group.assets.length - 6} more files
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        <div className="mt-3 flex justify-between items-center">
                                                            <Link
                                                                href={`/app/powerbrief/${concept.brief_batches?.brand_id}/${concept.brief_batch_id}`}
                                                                className="text-sm text-blue-600 hover:underline"
                                                            >
                                                                View in PowerBrief →
                                                            </Link>
                                                            
                                                            {concept.review_status === 'approved' && concept.asset_upload_status !== 'sent_to_ad_upload' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleSendToAdBatch(concept.id)}
                                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                                >
                                                                    <Upload className="h-3 w-3 mr-1" />
                                                                    Send to Ad Uploader
                                                                </Button>
                                                            )}
                                                            
                                                            {concept.asset_upload_status === 'sent_to_ad_upload' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleResendToAdBatch(concept.id)}
                                                                    className="bg-orange-600 hover:bg-orange-700 text-white"
                                                                    disabled={sendingToAds[concept.id]}
                                                                >
                                                                    {sendingToAds[concept.id] ? (
                                                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                    ) : (
                                                                        <Upload className="h-3 w-3 mr-1" />
                                                                    )}
                                                                    Resend to Ad Uploader
                                                                </Button>
                                                            )}
                                                            
                                                            {(concept.review_status === 'approved' || concept.asset_upload_status === 'sent_to_ad_upload') && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleRequestAdditionalRevisions(concept.id)}
                                                                    variant="outline"
                                                                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                                                    disabled={sendingToAds[concept.id]}
                                                                >
                                                                    {sendingToAds[concept.id] ? (
                                                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                    ) : (
                                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                                    )}
                                                                    Request More Revisions
                                                                </Button>
                                                            )}

                                                            {(concept.review_status === 'approved' || concept.asset_upload_status === 'sent_to_ad_upload') && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleRequestAdditionalSizes(concept.id)}
                                                                    variant="outline"
                                                                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                                                    title="Request additional sizes while keeping existing assets"
                                                                    disabled={sendingToAds[concept.id]}
                                                                >
                                                                    {sendingToAds[concept.id] ? (
                                                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                    ) : (
                                                                        <Plus className="h-3 w-3 mr-1" />
                                                                    )}
                                                                    Request Additional Sizes
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    )}
                </Card>
            </div>

            {/* Asset Grouping Preview Modal */}
            <AssetGroupingPreview
                isOpen={showGroupingPreview}
                onClose={() => setShowGroupingPreview(false)}
                assetGroups={previewAssetGroups}
                conceptTitle={previewConceptTitle}
                onConfirmSend={(groups) => {
                    // Determine if this is a send or resend based on the concept's current status
                    const concept = [...approvedConcepts, ...uploadedAssetsConcepts].find(c => c.id === previewConceptId);
                    if (concept?.asset_upload_status === 'sent_to_ad_upload') {
                        handleConfirmResendToAdBatch(previewConceptId, groups);
                    } else {
                        handleConfirmSendToAdBatch(previewConceptId, groups);
                    }
                }}
            />

            {/* Enhanced Media Modal with Interactive Timeline */}
            {modalOpen && modalMedia && (
                <CommentModal
                    isOpen={modalOpen}
                    onClose={closeModal}
                    mediaUrl={modalMedia.url}
                    mediaType={modalMedia.type}
                    mediaName={modalMedia.name}
                    conceptId={modalMedia.conceptId}
                    existingComments={modalMedia.conceptId ? conceptComments[modalMedia.conceptId] || [] : []}
                    onAddComment={modalMedia.conceptId ? (timestamp, comment, parentId) => 
                        handleAddComment(modalMedia.conceptId!, timestamp, comment, parentId) : undefined}
                    onEditComment={handleEditComment}
                    onDeleteComment={handleDeleteComment}
                    onResolveComment={handleResolveComment}
                    currentRevision={modalMedia.conceptId ? getCurrentRevision(modalMedia.conceptId) : 1}
                    canResolveComments={true}
                />
            )}
        </div>
    );
} 