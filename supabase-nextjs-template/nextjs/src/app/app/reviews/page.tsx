"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, CheckCircle, XCircle, Upload, AlertTriangle, ChevronDown, ChevronUp, Filter, SortAsc } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createSPAClient } from '@/lib/supabase/client';
import { BriefConcept, UploadedAssetGroup } from '@/lib/types/powerbrief';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

interface ConceptForReview {
    id: string;
    concept_title: string;
    brief_batch_id: string;
    video_editor?: string;
    review_link?: string;
    review_status?: string;
    uploaded_assets?: UploadedAssetGroup[];
    asset_upload_status?: string;
    brief_batches?: {
        id: string;
        name: string;
        brand_id: string;
        brands: {
            id: string;
            name: string;
        };
    };
}

interface AdBatch {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    last_accessed_at: string;
}

export default function ReviewsPage() {
    const { user } = useGlobal();
    const [loading, setLoading] = useState<boolean>(true);
    const [pendingReviews, setPendingReviews] = useState<ConceptForReview[]>([]);
    const [approvedConcepts, setApprovedConcepts] = useState<ConceptForReview[]>([]);
    const [uploadedAssetsConcepts, setUploadedAssetsConcepts] = useState<ConceptForReview[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
    const [reviewing, setReviewing] = useState<Record<string, boolean>>({});
    const [selectedBatches, setSelectedBatches] = useState<Record<string, string>>({});
    const [availableBatches, setAvailableBatches] = useState<Record<string, AdBatch[]>>({});
    const [loadingBatches, setLoadingBatches] = useState<Record<string, boolean>>({});
    
    // Uploaded Assets Section State
    const [showUploadedAssets, setShowUploadedAssets] = useState<boolean>(false);
    const [assetFilter, setAssetFilter] = useState<string>('all'); // 'all', 'pending', 'approved', 'sent'
    const [assetSort, setAssetSort] = useState<string>('newest'); // 'newest', 'oldest', 'batch'
    const [selectedBrand, setSelectedBrand] = useState<string>('all');
    const [loadingAssets, setLoadingAssets] = useState<boolean>(false);
    
    const router = useRouter();
    const supabase = createSPAClient();

    useEffect(() => {
        const fetchReviews = async () => {
            if (!user?.id) return;
            
            try {
                setLoading(true);
                
                // Get all concepts that are ready for review
                const { data: pendingConcepts, error: pendingError } = await supabase
                    .from('brief_concepts')
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
                    .eq('review_status', 'ready_for_review')
                    .order('updated_at', { ascending: false });
                
                if (pendingError) throw pendingError;
                
                // Get approved concepts with uploaded assets that haven't been sent to ad batches yet
                const { data: approvedConceptsData, error: approvedError } = await supabase
                    .from('brief_concepts')
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
                    .eq('review_status', 'approved')
                    .not('uploaded_assets', 'is', null)
                    .neq('asset_upload_status', 'sent_to_ad_batch')
                    .order('updated_at', { ascending: false });
                
                if (approvedError) throw approvedError;
                
                setPendingReviews(pendingConcepts || []);
                setApprovedConcepts(approvedConceptsData || []);
                
                // Initialize reviewer notes
                const notesObj: Record<string, string> = {};
                pendingConcepts?.forEach(concept => {
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
    }, [user?.id]);

    const fetchUploadedAssets = async () => {
        if (!user?.id) return;
        
        try {
            setLoadingAssets(true);
            
            // Get all concepts with uploaded assets
            const { data: conceptsWithAssets, error: assetsError } = await supabase
                .from('brief_concepts')
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
            
            setUploadedAssetsConcepts(conceptsWithAssets || []);
        } catch (err) {
            console.error('Failed to fetch uploaded assets:', err);
        } finally {
            setLoadingAssets(false);
        }
    };

    const fetchBatches = async (brandId: string, conceptId: string) => {
        if (availableBatches[conceptId]) return; // Already loaded
        
        try {
            setLoadingBatches(prev => ({ ...prev, [conceptId]: true }));
            
            const response = await fetch(`/api/ad-batches?brandId=${brandId}`);
            if (response.ok) {
                const data = await response.json();
                setAvailableBatches(prev => ({ ...prev, [conceptId]: data.batches || [] }));
                
                // Set default to newest batch (first in the list) or 'new'
                if (data.batches && data.batches.length > 0) {
                    setSelectedBatches(prev => ({ ...prev, [conceptId]: data.batches[0].id }));
                } else {
                    setSelectedBatches(prev => ({ ...prev, [conceptId]: 'new' }));
                }
            }
        } catch (error) {
            console.error('Error fetching batches:', error);
            setSelectedBatches(prev => ({ ...prev, [conceptId]: 'new' }));
        } finally {
            setLoadingBatches(prev => ({ ...prev, [conceptId]: false }));
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
            
            // Remove from pending reviews
            setPendingReviews(prev => prev.filter(item => item.id !== conceptId));
            
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
        const selectedBatchId = selectedBatches[conceptId] || 'new';
        
        try {
            const response = await fetch('/api/powerbrief/send-to-ad-batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conceptId,
                    adBatchId: selectedBatchId
                }),
            });

            if (response.ok) {
                const result = await response.json();
                
                // Update the concept status to indicate it's been sent to ad batch
                const { error: updateError } = await supabase
                    .from('brief_concepts')
                    .update({
                        asset_upload_status: 'sent_to_ad_batch',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', conceptId);

                if (updateError) {
                    console.error('Error updating concept status:', updateError);
                }

                // Remove from approved concepts list
                setApprovedConcepts(prev => prev.filter(concept => concept.id !== conceptId));

                toast({
                    title: "Success",
                    description: `Assets have been sent to ${result.adBatchName || 'the Ad Upload Tool'} successfully.`,
                    duration: 3000,
                });
            } else {
                throw new Error('Failed to send to ad batch');
            }
        } catch (error) {
            console.error('Error sending to ad batch:', error);
            toast({
                title: "Error",
                description: "Failed to send assets to Ad Upload Tool. Please try again.",
                variant: "destructive",
                duration: 3000,
            });
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
                        return concept.review_status === 'approved' && concept.asset_upload_status !== 'sent_to_ad_batch';
                    case 'sent':
                        return concept.asset_upload_status === 'sent_to_ad_batch';
                    default:
                        return true;
                }
            });
        }

        // Filter by brand
        if (selectedBrand !== 'all') {
            filtered = filtered.filter(concept => 
                concept.brief_batches?.brand_id === selectedBrand
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

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Ad Review Queue</h1>
            </div>
            
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            {pendingReviews.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                        <CheckCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No videos pending review</h3>
                        <p className="max-w-md mx-auto">
                            All videos have been reviewed. Check back later for new submissions.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {pendingReviews.map((concept) => (
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
                                                                        onClick={() => window.open(asset.supabaseUrl, '_blank')}
                                                                    />
                                                                ) : (
                                                                    <video
                                                                        src={asset.supabaseUrl}
                                                                        className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                                                        onClick={() => window.open(asset.supabaseUrl, '_blank')}
                                                                    />
                                                                )}
                                                                <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                                                                    {asset.aspectRatio}
                                                                </div>
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
                                                                            onClick={() => window.open(asset.supabaseUrl, '_blank')}
                                                                        />
                                                                    ) : (
                                                                        <video
                                                                            src={asset.supabaseUrl}
                                                                            className="w-full h-20 object-cover rounded border cursor-pointer hover:opacity-80"
                                                                            onClick={() => window.open(asset.supabaseUrl, '_blank')}
                                                                        />
                                                                    )}
                                                                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                                                                        {asset.aspectRatio}
                                                                    </div>
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
                                        {/* Batch Selection */}
                                        <div className="flex-1">
                                            <Label htmlFor={`batch-${concept.id}`} className="text-sm font-medium mb-1 block">
                                                Select Ad Batch:
                                            </Label>
                                            <div className="flex space-x-2">
                                                <select
                                                    id={`batch-${concept.id}`}
                                                    value={selectedBatches[concept.id] || 'new'}
                                                    onChange={(e) => setSelectedBatches(prev => ({ ...prev, [concept.id]: e.target.value }))}
                                                    onFocus={() => fetchBatches(concept.brief_batches.brand_id, concept.id)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    disabled={loadingBatches[concept.id]}
                                                >
                                                    <option value="new">Create New Batch</option>
                                                    {availableBatches[concept.id]?.map((batch) => (
                                                        <option key={batch.id} value={batch.id}>
                                                            {batch.name} ({new Date(batch.updated_at).toLocaleDateString()})
                                                        </option>
                                                    ))}
                                                </select>
                                                
                                                <Button
                                                    onClick={() => handleSendToAdBatch(concept.id)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    title="Send approved assets to Ad Upload Tool"
                                                    disabled={loadingBatches[concept.id]}
                                                >
                                                    {loadingBatches[concept.id] ? (
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Upload className="h-4 w-4 mr-2" />
                                                    )}
                                                    Send to Ads
                                                </Button>
                                            </div>
                                        </div>
                                        
                                        <Link
                                            href={`/app/powerbrief/${concept.brief_batches.brand_id}/${concept.brief_batch_id}`}
                                            className="text-sm text-blue-600 hover:underline flex items-center mt-6"
                                        >
                                            View in PowerBrief →
                                        </Link>
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
                                                value={selectedBrand}
                                                onChange={(e) => setSelectedBrand(e.target.value)}
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
                                                                {concept.review_status === 'approved' && concept.asset_upload_status !== 'sent_to_ad_batch' && (
                                                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                                                        Approved
                                                                    </span>
                                                                )}
                                                                {concept.asset_upload_status === 'sent_to_ad_batch' && (
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
                                                                                                onClick={() => window.open(asset.supabaseUrl, '_blank')}
                                                                                            />
                                                                                        ) : (
                                                                                            <video
                                                                                                src={asset.supabaseUrl}
                                                                                                className="w-full h-12 object-cover rounded border cursor-pointer hover:opacity-80"
                                                                                                onClick={() => window.open(asset.supabaseUrl, '_blank')}
                                                                                            />
                                                                                        )}
                                                                                        <div className="absolute bottom-0 left-0 bg-black bg-opacity-75 text-white text-xs px-1 rounded-br">
                                                                                            {asset.aspectRatio}
                                                                                        </div>
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
                                                            
                                                            {concept.review_status === 'approved' && concept.asset_upload_status !== 'sent_to_ad_batch' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleSendToAdBatch(concept.id)}
                                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                                >
                                                                    <Upload className="h-3 w-3 mr-1" />
                                                                    Send to Ads
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
        </div>
    );
} 