"use client";

import React, { useState, useEffect } from 'react';
import { createSPAClient } from '@/lib/supabase/client';
import { BriefConcept, Scene } from '@/lib/types/powerbrief';
import { Loader2, ArrowLeft, ChevronDown, ChevronUp, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SharedConceptPage({ params }: { params: { shareId: string } }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [concept, setConcept] = useState<BriefConcept | null>(null);
  const [showVideoInstructions, setShowVideoInstructions] = useState<boolean>(false);
  const [showDesignerInstructions, setShowDesignerInstructions] = useState<boolean>(false);
  const [isEditable, setIsEditable] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // New states for editor inputs
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [frameioLink, setFrameioLink] = useState<string | null>(null);
  
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

        // Set if editable
        setIsEditable(!!shareSettings.is_editable);
        
        // Set concept and form states
        setConcept(conceptWithShare);
        setReviewStatus(conceptWithShare.review_status || null);
        setFrameioLink(conceptWithShare.frameio_link || null);
      } catch (err: any) {
        console.error('Error fetching shared concept:', err);
        setError(err.message || 'Failed to load shared content');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedConcept();
  }, [shareId]);

  const handleSaveChanges = async () => {
    if (!concept || !isEditable) return;
    
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setSaveError(null);
      
      const supabase = createSPAClient();
      
      const { error } = await supabase
        .from('brief_concepts')
        .update({
          review_status: reviewStatus,
          frameio_link: frameioLink,
          updated_at: new Date().toISOString()
        })
        .eq('id', concept.id);
      
      if (error) throw error;
      
      // Update local state
      setConcept(prev => prev ? {
        ...prev,
        review_status: reviewStatus,
        frameio_link: frameioLink
      } : null);
      
      setSaveSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error saving changes:', err);
      setSaveError(err.message || "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
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
      <div className="flex flex-wrap gap-2">
        {concept.status && (
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            Status: {concept.status}
          </div>
        )}
        
        {concept.review_status && (
          <div className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            Review: {concept.review_status === 'ready_for_review' ? 'Ready for Review' :
                    concept.review_status === 'revisions_needed' ? 'Needs Revisions' :
                    concept.review_status === 'approved' ? 'Approved' : concept.review_status}
          </div>
        )}
      </div>

      {/* Editor form for review status and frame.io link */}
      {isEditable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Review Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="review-status" className="text-sm font-medium">Review Status</label>
                <select 
                  id="review-status"
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={reviewStatus || ''}
                  onChange={(e) => setReviewStatus(e.target.value === '' ? null : e.target.value)}
                >
                  <option value="">Not set</option>
                  <option value="ready_for_review">Ready for Review</option>
                  <option value="revisions_needed">Revisions Needed</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="frameio-link" className="text-sm font-medium">Frame.io Link</label>
                <Input
                  id="frameio-link"
                  placeholder="Paste your Frame.io link here"
                  value={frameioLink || ''}
                  onChange={(e) => setFrameioLink(e.target.value === '' ? null : e.target.value)}
                />
              </div>
              
              <Button 
                onClick={handleSaveChanges} 
                disabled={isSaving}
                className="w-full mt-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              
              {saveSuccess && (
                <div className="bg-green-100 text-green-800 px-3 py-2 rounded text-sm mt-2">
                  Changes saved successfully!
                </div>
              )}
              
              {saveError && (
                <div className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm mt-2">
                  {saveError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frame.io link display */}
      {concept.frameio_link && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Frame.io Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <LinkIcon className="h-4 w-4 text-blue-500" />
              <a 
                href={concept.frameio_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {concept.frameio_link}
              </a>
            </div>
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