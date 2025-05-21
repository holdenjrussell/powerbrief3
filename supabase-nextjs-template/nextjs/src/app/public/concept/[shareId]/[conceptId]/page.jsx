"use client";
import React, { useState, useEffect } from 'react';
import { createSPAClient } from '@/lib/supabase/client';
import { Loader2, ArrowLeft, LinkIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
export default function SharedSingleConceptPage({ params }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [concept, setConcept] = useState(null);
    // Unwrap params using React.use()
    const unwrappedParams = React.use(params);
    const { shareId, conceptId } = unwrappedParams;
    useEffect(() => {
        const fetchSharedConcept = async () => {
            try {
                setLoading(true);
                const supabase = createSPAClient();
                // Find the batch with this shareId in its share_settings
                const { data: batchData, error: batchError } = await supabase
                    .from('brief_batches')
                    .select('*')
                    .contains('share_settings', { [shareId]: {} });
                if (batchError) {
                    throw batchError;
                }
                if (!batchData || batchData.length === 0) {
                    setError('Shared content not found or has expired');
                    setLoading(false);
                    return;
                }
                // Get the specific concept
                const { data: conceptData, error: conceptError } = await supabase
                    .from('brief_concepts')
                    .select('*')
                    .eq('id', conceptId)
                    .single();
                if (conceptError) {
                    throw conceptError;
                }
                setConcept(conceptData);
                
                // Check if the concept status is appropriate for sharing
                if (conceptData && 
                    conceptData.status.toLowerCase() !== "ready for designer" && 
                    conceptData.status.toLowerCase() !== "ready for editor" && 
                    conceptData.status.toLowerCase() !== "ready for review" && 
                    conceptData.status.toLowerCase() !== "approved" && 
                    conceptData.status.toLowerCase() !== "revisions requested") {
                  setError('This concept is not available for viewing. Only concepts with status "ready for designer", "ready for editor", "ready for review", "approved", or "revisions requested" can be viewed.');
                  setConcept(null);
                }
            }
            catch (err) {
                console.error('Error fetching shared concept:', err);
                setError(err.message || 'Failed to load shared content');
            }
            finally {
                setLoading(false);
            }
        };
        fetchSharedConcept();
    }, [shareId, conceptId]);
    if (loading) {
        return (<div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600"/>
      </div>);
    }
    if (error || !concept) {
        return (<div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertDescription>{error || 'Concept not found'}</AlertDescription>
        </Alert>
      </div>);
    }
    return (<div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{concept.concept_title}</h1>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2"/>
          Back
        </Button>
      </div>

      {/* Metadata display */}
      <div className="flex flex-wrap gap-2 mb-4">
        {concept.status && (
          <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${
            concept.status.toLowerCase() === "revisions requested" 
              ? "bg-amber-100 text-amber-800 border border-amber-300" 
              : concept.status.toLowerCase() === "approved" 
                ? "bg-green-100 text-green-800 border border-green-300" 
                : "bg-blue-100 text-blue-800 border border-blue-300"
          }`}>
            Status: {concept.status}
          </div>
        )}
        {concept.clickup_id && (
          <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium border border-blue-300">
            Clickup ID: {concept.clickup_id}
          </div>
        )}
        {concept.clickup_link && (
          <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium border border-blue-300">
            <a href={concept.clickup_link} target="_blank" rel="noopener noreferrer" className="flex items-center">
              <LinkIcon className="h-3 w-3 mr-2" />
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
      </div>

      {/* Review Status Banner */}
      {concept.review_status === 'ready_for_review' && (
        <div className="bg-blue-50 border border-blue-200 p-4 mb-4 rounded-lg flex items-center space-x-3">
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

      {concept.review_status === 'approved' && (
        <div className="bg-green-50 border border-green-200 p-4 mb-4 rounded-lg flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <h3 className="font-medium text-green-800">Approved</h3>
            <p className="text-sm text-green-700">This concept has been approved.</p>
          </div>
        </div>
      )}

      {concept.review_status === 'needs_revisions' && (
        <div className="bg-amber-50 border border-amber-200 p-4 mb-4 rounded-lg flex items-center space-x-3">
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

      {/* Media display */}
      {concept.media_url && (<Card>
          <CardHeader>
            <CardTitle className="text-lg">Media</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              {concept.media_type === 'video' ? (<video src={concept.media_url} controls className="max-h-[400px] object-contain rounded"/>) : (<img src={concept.media_url} alt="Concept media" className="max-h-[400px] object-contain rounded"/>)}
            </div>
          </CardContent>
        </Card>)}

      {/* Caption hooks */}
      {concept.caption_hook_options && (<Card>
          <CardHeader>
            <CardTitle className="text-lg">Caption Hook Options</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{concept.caption_hook_options}</p>
          </CardContent>
        </Card>)}

      {/* Body content - scenes */}
      {concept.body_content_structured && concept.body_content_structured.length > 0 && (<Card>
          <CardHeader>
            <CardTitle className="text-lg">Body Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {concept.body_content_structured.map((scene, index) => (<div key={index} className="p-4 border rounded space-y-3">
                  <h3 className="font-medium">{scene.scene_title || `Scene ${index + 1}`}</h3>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Script:</h4>
                    <p className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">{scene.script}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Visuals:</h4>
                    <p className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">{scene.visuals}</p>
                  </div>
                </div>))}
            </div>
          </CardContent>
        </Card>)}

      {/* CTA */}
      {(concept.cta_script || concept.cta_text_overlay) && (<Card>
          <CardHeader>
            <CardTitle className="text-lg">Call to Action</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {concept.cta_script && (<div>
                  <h4 className="text-sm font-medium mb-1">CTA Script:</h4>
                  <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded">{concept.cta_script}</p>
                </div>)}
              
              {concept.cta_text_overlay && (<div>
                  <h4 className="text-sm font-medium mb-1">CTA Text Overlay:</h4>
                  <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded">{concept.cta_text_overlay}</p>
                </div>)}
            </div>
          </CardContent>
        </Card>)}

      {/* Video Instructions - only for video media type */}
      {concept.videoInstructions && concept.media_type === 'video' && (<Card>
          <CardHeader>
            <CardTitle className="text-lg">Video Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{concept.videoInstructions}</p>
          </CardContent>
        </Card>)}

      {/* Designer Instructions - only for image media type */}
      {concept.designerInstructions && concept.media_type === 'image' && (<Card>
          <CardHeader>
            <CardTitle className="text-lg">Designer Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{concept.designerInstructions}</p>
          </CardContent>
        </Card>)}

      {/* Attribution */}
      <div className="border-t pt-4 text-sm text-gray-500">
        {concept.strategist && <p>Strategist: {concept.strategist}</p>}
        {concept.video_editor && <p>Video Editor: {concept.video_editor}</p>}
      </div>
    </div>);
}
