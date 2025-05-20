"use client";

import React, { useState, useEffect } from 'react';
import { createSPAClient } from '@/lib/supabase/client';
import { BriefConcept, Scene } from '@/lib/types/powerbrief';
import { Loader2, ArrowLeft, ChevronDown, ChevronUp, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

export default function SharedConceptPage({ params }: { params: { shareId: string } }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [concept, setConcept] = useState<BriefConcept | null>(null);
  const [showVideoInstructions, setShowVideoInstructions] = useState<boolean>(false);
  const [showDesignerInstructions, setShowDesignerInstructions] = useState<boolean>(false);
  const [isEditable, setIsEditable] = useState<boolean>(false);
  const [reviewLink, setReviewLink] = useState<string>('');
  const [updatingReview, setUpdatingReview] = useState<boolean>(false);
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params as any) as { shareId: string };
  const { shareId } = unwrappedParams;

  useEffect(() => {
    const fetchSharedConcept = async () => {
      try {
        setLoading(true);
        const supabase = createSPAClient();

        // Find the concept with this shareId in its share_settings
        const { data: conceptData, error: conceptError } = await supabase
          .from('brief_concepts')
          .select('*')
          .contains('share_settings', { [shareId]: {} });

        if (conceptError) {
          throw conceptError;
        }

        if (!conceptData || conceptData.length === 0) {
          setError('Shared concept not found or has expired');
          setLoading(false);
          return;
        }

        const conceptWithShare = conceptData[0];
        const shareSettings = conceptWithShare.share_settings?.[shareId];
        
        if (!shareSettings) {
          setError('Share settings not found');
          setLoading(false);
          return;
        }

        // Check if share has expired
        if (shareSettings.expires_at && new Date(shareSettings.expires_at) < new Date()) {
          setError('This shared link has expired');
          setLoading(false);
          return;
        }

        // Set editability based on share settings
        setIsEditable(!!shareSettings.is_editable);
        
        // Initialize review link from concept if it exists
        if (conceptWithShare.review_link) {
          setReviewLink(conceptWithShare.review_link);
        }

        setConcept(conceptWithShare);
      } catch (err: any) {
        console.error('Error fetching shared concept:', err);
        setError(err.message || 'Failed to load shared content');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedConcept();
  }, [shareId]);

  const handleMarkReadyForReview = async () => {
    if (!concept) return;
    
    try {
      setUpdatingReview(true);
      const supabase = createSPAClient();
      
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
      
      if (error) throw error;
      
      setConcept(data);
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
    } finally {
      setUpdatingReview(false);
    }
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
          <AlertDescription>{error || 'Concept not found'}</AlertDescription>
        </Alert>
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

      {/* Status display */}
      {concept.status && (
        <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
          Status: {concept.status}
        </div>
      )}

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

      {/* Editor Review Section */}
      {isEditable && !concept?.review_status && (
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="text-lg">Mark Ready for Review</CardTitle>
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
              disabled={updatingReview || !reviewLink.trim()} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updatingReview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Mark as Ready for Review
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Read-only review section */}
      {isEditable && concept?.review_status === 'ready_for_review' && (
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="text-lg">Awaiting Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This concept has been marked as ready for review with the following review link:</p>
            <a 
              href={concept.review_link || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              {concept.review_link}
            </a>
          </CardContent>
        </Card>
      )}

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
                  className="max-h-[400px] object-contain rounded"
                />
              ) : (
                <img
                  src={concept.media_url}
                  alt="Concept media"
                  className="max-h-[400px] object-contain rounded"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions Accordions */}
      {concept.videoInstructions && (
        <Card>
          <CardHeader 
            className="flex flex-row items-center justify-between cursor-pointer" 
            onClick={() => setShowVideoInstructions(!showVideoInstructions)}
          >
            <CardTitle className="text-lg">Editor Instructions for Video</CardTitle>
            {showVideoInstructions ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </CardHeader>
          {showVideoInstructions && (
            <CardContent>
              <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded">{concept.videoInstructions}</div>
            </CardContent>
          )}
        </Card>
      )}

      {concept.designerInstructions && concept.media_type === 'image' && (
        <Card>
          <CardHeader 
            className="flex flex-row items-center justify-between cursor-pointer" 
            onClick={() => setShowDesignerInstructions(!showDesignerInstructions)}
          >
            <CardTitle className="text-lg">Designer Instructions for Image</CardTitle>
            {showDesignerInstructions ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </CardHeader>
          {showDesignerInstructions && (
            <CardContent>
              <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded">{concept.designerInstructions}</div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Caption hooks */}
      {concept.caption_hook_options && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Caption Hook Options</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{concept.caption_hook_options}</p>
          </CardContent>
        </Card>
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

      {/* Attribution */}
      <div className="border-t pt-4 text-sm text-gray-500">
        {concept.strategist && <p>Strategist: {concept.strategist}</p>}
        {concept.video_editor && <p>Video Editor: {concept.video_editor}</p>}
      </div>
    </div>
  );
} 