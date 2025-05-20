"use client";
import React, { useState, useEffect } from 'react';
import { createSPAClient } from '@/lib/supabase/client';
import { Loader2, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
export default function SharedConceptPage({ params }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [concept, setConcept] = useState(null);
    const [showVideoInstructions, setShowVideoInstructions] = useState(false);
    const [showDesignerInstructions, setShowDesignerInstructions] = useState(false);
    // Unwrap params using React.use()
    const unwrappedParams = React.use(params);
    const { shareId } = unwrappedParams;
    useEffect(() => {
        const fetchSharedConcept = async () => {
            var _a;
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
                const shareSettings = (_a = conceptWithShare.share_settings) === null || _a === void 0 ? void 0 : _a[shareId];
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
                setConcept(conceptWithShare);
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
    }, [shareId]);
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

      {/* Status display */}
      {concept.status && (<div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
          Status: {concept.status}
        </div>)}

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

      {/* Instructions Accordions - only for video media type */}
      {concept.videoInstructions && concept.media_type === 'video' && (<Card>
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setShowVideoInstructions(!showVideoInstructions)}>
            <CardTitle className="text-lg">Editor Instructions for Video</CardTitle>
            {showVideoInstructions ? (<ChevronUp className="h-5 w-5"/>) : (<ChevronDown className="h-5 w-5"/>)}
          </CardHeader>
          {showVideoInstructions && (<CardContent>
              <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded">{concept.videoInstructions}</div>
            </CardContent>)}
        </Card>)}

      {concept.designerInstructions && concept.media_type === 'image' && (<Card>
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setShowDesignerInstructions(!showDesignerInstructions)}>
            <CardTitle className="text-lg">Designer Instructions for Image</CardTitle>
            {showDesignerInstructions ? (<ChevronUp className="h-5 w-5"/>) : (<ChevronDown className="h-5 w-5"/>)}
          </CardHeader>
          {showDesignerInstructions && (<CardContent>
              <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded">{concept.designerInstructions}</div>
            </CardContent>)}
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

      {/* Attribution */}
      <div className="border-t pt-4 text-sm text-gray-500">
        {concept.strategist && <p>Strategist: {concept.strategist}</p>}
        {concept.video_editor && <p>Video Editor: {concept.video_editor}</p>}
      </div>
    </div>);
}
