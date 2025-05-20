"use client";

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createSPAClient } from '@/lib/supabase/client';
import { BriefConcept } from '@/lib/types/powerbrief';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

export default function ReviewsPage() {
    const { user } = useGlobal();
    const [loading, setLoading] = useState<boolean>(true);
    const [pendingReviews, setPendingReviews] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [reviewerNotes, setReviewerNotes] = useState<Record<string, string>>({});
    const [reviewing, setReviewing] = useState<Record<string, boolean>>({});
    const router = useRouter();
    const supabase = createSPAClient();

    useEffect(() => {
        const fetchPendingReviews = async () => {
            if (!user?.id) return;
            
            try {
                setLoading(true);
                
                // Get all concepts that are ready for review
                const { data: concepts, error: conceptsError } = await supabase
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
                
                if (conceptsError) throw conceptsError;
                
                setPendingReviews(concepts || []);
                
                // Initialize reviewer notes
                const notesObj: Record<string, string> = {};
                concepts?.forEach(concept => {
                    notesObj[concept.id] = '';
                });
                setReviewerNotes(notesObj);
                
                setError(null);
            } catch (err) {
                console.error('Failed to fetch pending reviews:', err);
                setError('Failed to load pending reviews. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchPendingReviews();
    }, [user?.id]);

    const handleApprove = async (conceptId: string) => {
        try {
            setReviewing(prev => ({ ...prev, [conceptId]: true }));
            
            const { data, error } = await supabase
                .from('brief_concepts')
                .update({
                    review_status: 'approved',
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
                                
                                {/* Frame.io Link */}
                                {concept.review_link && (
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
                                <div className="flex space-x-2 mt-4">
                                    <Button
                                        variant="outline"
                                        className="border-green-500 text-green-600 hover:bg-green-50"
                                        onClick={() => handleApprove(concept.id)}
                                        disabled={reviewing[concept.id]}
                                    >
                                        {reviewing[concept.id] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-amber-500 text-amber-600 hover:bg-amber-50"
                                        onClick={() => handleRequestRevisions(concept.id)}
                                        disabled={reviewing[concept.id]}
                                    >
                                        {reviewing[concept.id] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
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
        </div>
    );
} 