"use client";

import React, { useState, useEffect } from 'react';
import { createSPAClient } from '@/lib/supabase/client';
import { Scene, Brand, BriefBatch, BriefConcept, Hook } from '@/lib/types/powerbrief';
import { Loader2, ArrowLeft, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Link as LinkIcon, UploadCloud } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SharedVoiceGenerator from '@/components/SharedVoiceGenerator';
import PowerBriefAssetUpload from '@/components/PowerBriefAssetUpload';
import { UploadedAssetGroup } from '@/lib/types/powerbrief';

// Add these types above export default function SharedConceptPage
interface BrandWithResources {
  id: string;
  name: string;
  brand_info_data: Record<string, unknown>;
  target_audience_data: Record<string, unknown>;
  competition_data: Record<string, unknown>;
  editing_resources?: Array<{ name: string; url: string }>;
  resource_logins?: Array<{ resourceName: string; username: string; password: string }>;
  stock_resources?: Array<{ name: string; url: string }>;
  dos_and_donts?: {
    imagesDos: string[];
    imagesDonts: string[];
    videosDos: string[];
    videosDonts: string[];
  };
}

// Use this more flexible type instead of extending from BriefConcept
interface ConceptWithShareSettings {
  id: string;
  brief_batch_id: string;
  user_id: string;
  concept_title: string;
  clickup_id?: string;
  strategist?: string;
  video_editor?: string;
  status?: string;
  media_url?: string;
  media_type?: string;
  text_hook_options?: string;
  videoInstructions?: string;
  designerInstructions?: string;
  body_content_structured?: Scene[];
  cta_script?: string;
  cta_text_overlay?: string;
  review_status?: string;
  review_link?: string;
  reviewer_notes?: string;
  share_settings?: Record<string, unknown>;
  brief_batches?: {
    brands: BrandWithResources;
  };
  spoken_hook_options?: string;
  uploaded_assets?: UploadedAssetGroup[];
  asset_upload_status?: string;
  description?: string;
  product_id?: string;
  [key: string]: unknown;
}

// Helper to unwrap params safely
type ParamsType = { shareId: string };

export default function SharedConceptPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [concept, setConcept] = useState<ConceptWithShareSettings | null>(null);
  const [brand, setBrand] = useState<BrandWithResources | null>(null);
  const [showVideoInstructions, setShowVideoInstructions] = useState<boolean>(false);
  const [showDesignerInstructions, setShowDesignerInstructions] = useState<boolean>(false);
  const [isEditable, setIsEditable] = useState<boolean>(false);
  const [reviewLink, setReviewLink] = useState<string>('');
  const [updatingReview, setUpdatingReview] = useState<boolean>(false);
  const [updatingResubmission, setUpdatingResubmission] = useState<boolean>(false);
  const [showAssetUpload, setShowAssetUpload] = useState<boolean>(false);
  
  // Unwrap params using React.use()
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const { shareId } = unwrappedParams;

  useEffect(() => {
    const fetchSharedConcept = async () => {
      try {
        setLoading(true);
        
        // Use the API endpoint instead of direct Supabase query to avoid RLS issues
        const response = await fetch(`/api/public/concept/${shareId}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load shared content');
        }
        
        const data = await response.json();
        const { concept: conceptWithShare, shareSettings, isEditable } = data;
        
        // Set editability based on share settings
        setIsEditable(isEditable);
        
        // Initialize review link from concept if it exists
        if (conceptWithShare.review_link) {
          setReviewLink(conceptWithShare.review_link);
        }

        // Get brand data if available
        if (conceptWithShare.brief_batches?.brands) {
          setBrand(conceptWithShare.brief_batches.brands);
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

  const handleMarkReadyForReview = async () => {
    if (!concept) return;
    
    try {
      setUpdatingReview(true);
      const supabase = createSPAClient();
      
      // First, try updating with regular client
      const { data, error } = await supabase
        .from('brief_concepts')
        .update({
          review_status: 'ready_for_review',
          status: 'READY FOR REVIEW',
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
        setConcept(updatedConcept as unknown as ConceptWithShareSettings);
      } else {
        setConcept(data as unknown as ConceptWithShareSettings);
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
    } finally {
      setUpdatingReview(false);
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
          status: 'READY FOR REVIEW',
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
          throw new Error('Failed to resubmit for review via API endpoint');
        }
        
        const updatedConcept = await response.json();
        setConcept(updatedConcept as unknown as ConceptWithShareSettings);
      } else {
        setConcept(data as unknown as ConceptWithShareSettings);
      }
      
      toast({
        title: 'Success',
        description: 'The concept has been resubmitted for review.',
        duration: 3000,
      });
    } catch (err: any) {
      console.error('Error resubmitting for review:', err);
      toast({
        title: 'Error',
        description: 'Failed to resubmit for review. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setUpdatingResubmission(false);
    }
  };

  const handleAssetsUploaded = async (assetGroups: UploadedAssetGroup[]) => {
    if (!concept) return;

    try {
      const response = await fetch('/api/powerbrief/upload-assets', {
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
      
      // Update the concept with the new asset data
      setConcept(prev => prev ? {
        ...prev,
        uploaded_assets: result.assetGroups,
        asset_upload_status: 'uploaded',
        review_status: 'ready_for_review',
        status: 'READY FOR REVIEW'
      } : null);

      toast({
        title: 'Success',
        description: 'Assets uploaded successfully and marked ready for review.',
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
        {concept.product_id && (
          <div className="inline-block px-4 py-1.5 bg-orange-100 text-orange-800 rounded-full text-sm font-medium border border-orange-300">
            Product ID: {String(concept.product_id)}
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
                            className="w-full h-32 object-cover rounded border"
                          />
                        ) : (
                          <video
                            src={asset.supabaseUrl}
                            className="w-full h-32 object-cover rounded border"
                            controls
                          />
                        )}
                        <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                          {asset.aspectRatio}
                        </div>
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
          <TabsTrigger value="resources">Editing Resources</TabsTrigger>
        </TabsList>
        
        <TabsContent value="concept">
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
          {concept.videoInstructions && concept.media_type === 'video' && (
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
                  <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded break-words">{concept.videoInstructions}</div>
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
                  <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded break-words">{concept.designerInstructions}</div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Text hooks */}
          {concept.text_hook_options && (
            <div className="mb-4">
              <h4 className="font-semibold mb-1">Text Hook Options</h4>
              {Array.isArray(concept.text_hook_options) ? (
                <div className="space-y-1 whitespace-pre-wrap bg-gray-50 p-3 rounded break-words">
                  {concept.text_hook_options.map((hook: Hook, index: number) => (
                    <p key={hook.id || index}>{hook.content}</p>
                  ))}
                </div>
              ) : (
                <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded break-words">{String(concept.text_hook_options)}</p>
              )}
            </div>
          )}

          {/* Spoken hooks */}
          {concept.spoken_hook_options && (
            <div className="mb-4">
              <h4 className="font-semibold mb-1">Spoken Hook Options</h4>
              {Array.isArray(concept.spoken_hook_options) ? (
                 <div className="space-y-1 whitespace-pre-wrap bg-gray-50 p-3 rounded break-words">
                  {concept.spoken_hook_options.map((hook: Hook, index: number) => (
                    <p key={hook.id || index}>{hook.content}</p>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 bg-gray-50 p-3 rounded break-words">
                  {(String(concept.spoken_hook_options))
                    .split(/\n\s*\n/)
                    .flatMap(section => section.split('\n'))
                    .map(hook => hook.trim())
                    .filter(hook => hook.length > 0)
                    .map((hook, index) => (
                      <div key={index} className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <p className="flex-1 text-sm leading-relaxed">{hook}</p>
                      </div>
                    ))}
                </div>
              )}
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
                        <p className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded break-all">{scene.script}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Visuals:</h4>
                        <p className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded break-all">{scene.visuals}</p>
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
                      <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded break-words">{concept.cta_script}</p>
                    </div>
                  )}
                  
                  {concept.cta_text_overlay && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">CTA Text Overlay:</h4>
                      <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded break-words">{concept.cta_text_overlay}</p>
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
                  spokenHooks={concept.spoken_hook_options || ''}
                  ctaScript={concept.cta_script || ''}
                  conceptId={concept.id}
                  isEditable={isEditable}
                  brandId={brand?.id || ''}
                />
              </CardContent>
            </Card>
          )}

          {/* Concept metadata */}
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
                          <div className="font-medium">{login.resourceName}</div>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                            <div className="text-gray-500">Username:</div>
                            <div>{login.username}</div>
                            <div className="text-gray-500">Password:</div>
                            <div>{login.password}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Stock Resources */}
              {brand.stock_resources && brand.stock_resources.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Stock Resources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {brand.stock_resources.map((resource: any, index: number) => (
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
            </>
          )}
          
          {(!brand || 
            (!brand.editing_resources?.length && 
             !brand.resource_logins?.length && 
             !brand.stock_resources?.length)) && (
            <div className="text-center p-8 text-gray-500">
              <p>No editing resources available for this concept.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 