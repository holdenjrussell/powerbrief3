"use client";

import React, { useState, useEffect } from 'react';
import { createSPAClient } from '@/lib/supabase/client';
import { BriefConcept, Scene } from '@/lib/types/powerbrief';
import { Loader2, ArrowLeft, Link as LinkIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SharedSingleConceptPage({ params }: { params: { shareId: string, conceptId: string } }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [concept, setConcept] = useState<BriefConcept | null>(null);
  const [brand, setBrand] = useState<any>(null);
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params as any) as { shareId: string, conceptId: string };
  const { shareId, conceptId } = unwrappedParams;

  useEffect(() => {
    const fetchSharedConcept = async () => {
      try {
        setLoading(true);
        const supabase = createSPAClient();

        // Find the batch with this shareId in its share_settings
        const { data: batchData, error: batchError } = await supabase
          .from('brief_batches')
          .select('*, brands(*)')
          .contains('share_settings', { [shareId]: {} });

        if (batchError) {
          throw batchError;
        }

        if (!batchData || batchData.length === 0) {
          setError('Shared content not found or has expired');
          setLoading(false);
          return;
        }

        // Set the brand from the batch
        if (batchData[0].brands) {
          setBrand(batchData[0].brands);
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

        setConcept(conceptData as BriefConcept);
      } catch (err: any) {
        console.error('Error fetching shared concept:', err);
        setError(err.message || 'Failed to load shared content');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedConcept();
  }, [shareId, conceptId]);

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

      {/* Metadata display */}
      <div className="flex flex-wrap gap-2">
        {concept.status && (
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
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
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            Strategist: {concept.strategist}
          </div>
        )}
        {concept.video_editor && (
          <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            {concept.media_type === 'video' ? 'Video Editor' : 'Designer'}: {concept.video_editor}
          </div>
        )}
      </div>

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
    </div>
  );
} 