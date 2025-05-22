"use client";
// latest updates
import React, { useState, useEffect } from 'react';
import { createSPAClient } from '@/lib/supabase/client';
import { BriefConcept, Scene } from '@/lib/types/powerbrief';
import { Loader2, ArrowLeft, Link as LinkIcon, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SharedVoiceGenerator from '@/components/SharedVoiceGenerator';

// Extended BriefConcept interface to include the properties we need
interface ExtendedBriefConcept extends Omit<BriefConcept, 'review_status'> {
  review_status?: 'pending' | 'ready_for_review' | 'approved' | 'needs_revisions' | string;
  review_link?: string;
  reviewer_notes?: string;
  share_settings?: Record<string, any>;
}

// Extend the batch type to include share_settings
interface BatchWithShare {
  id: string;
  brand_id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  brands: any;
  share_settings?: Record<string, any>;
}

// Helper to unwrap params safely
type ParamsType = { shareId: string, conceptId: string };

export default function SharedSingleConceptPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false);
  const [concept, setConcept] = useState<ExtendedBriefConcept | null>(null);
  const [brand, setBrand] = useState<any>(null);
  const [isEditable, setIsEditable] = useState<boolean>(false);
  const [reviewLink, setReviewLink] = useState<string>('');
  const [updatingReview, setUpdatingReview] = useState<boolean>(false);
  const [updatingResubmission, setUpdatingResubmission] = useState<boolean>(false);
  
  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const router = useRouter();

  // Unwrap params using React.use()
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const { shareId, conceptId } = unwrappedParams;

  useEffect(() => {
    const fetchSharedConcept = async () => {
      try {
        setLoading(true);
        const supabase = createSPAClient();

        // Find the batch with this shareId in its share_settings
        const { data: batchDataResult, error: batchError } = await supabase
          .from('brief_batches')
          .select('*, brands(*)')
          .contains('share_settings', { [shareId]: {} });

        if (batchError) {
          throw batchError;
        }

        if (!batchDataResult || batchDataResult.length === 0) {
          setError('Shared content not found or has expired. You might need to log in to view this content.');
          setShowLoginPrompt(true);
          setLoading(false);
          return;
        }

        const batchData = batchDataResult as BatchWithShare[]; // Cast to BatchWithShare array

        // Set the brand from the batch
        if (batchData[0].brands) {
          setBrand(batchData[0].brands);
        }

        // Get the specific concept
        const { data: conceptDataResult, error: conceptError } = await supabase
          .from('brief_concepts')
          .select('*')
          .eq('id', conceptId)
          .single();

        if (conceptError) {
          throw conceptError;
        }

        const conceptData = conceptDataResult as ExtendedBriefConcept; // Cast to ExtendedBriefConcept

        setConcept(conceptData);
        
        // Initialize review link from concept if it exists
        if (conceptData.review_link) {
          setReviewLink(conceptData.review_link);
        }

        // Set editability based on share settings from batch
        const shareSettings = batchData[0].share_settings?.[shareId];
        setIsEditable(!!shareSettings?.is_editable);
        
        // Check if the concept status is appropriate for sharing
        const statusLowerCase = conceptData?.status?.toLowerCase();
        if (conceptData && 
            statusLowerCase !== "ready for designer" && 
            statusLowerCase !== "ready for editor" && 
            statusLowerCase !== "ready for review" && 
            statusLowerCase !== "approved" && 
            statusLowerCase !== "revisions requested") {
          setError('This concept is not available for viewing. Only concepts with status "ready for designer", "ready for editor", "ready for review", "approved", or "revisions requested" can be viewed.');
          setConcept(null);
        }
      } catch (err: any) {
        console.error('Error fetching shared concept:', err);
        setError(err.message || 'Failed to load shared content');
        // Show login prompt if content not found (RLS) or specific auth-related errors
        if (
          (err.message?.toLowerCase().includes('not found') && 
           !err.message?.toLowerCase().includes('share settings not found') && 
           !err.message?.toLowerCase().includes('concept not found')) || // Avoid triggering for explicit "concept not found"
          err.message?.includes('FetchError') || 
          err.message?.includes('User not found') // Added "User not found"
        ) {
            setShowLoginPrompt(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSharedConcept();
  }, [shareId, conceptId]);

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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const supabase = createSPAClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }
      
      // Reload the page to re-fetch data with the new auth state
      window.location.reload();
      
      // Optionally, reset form and hide prompt, though page refresh might handle this
      setShowLoginPrompt(false);
      setEmail('');
      setPassword('');

    } catch (err: any) {
      console.error('Login failed:', err);
      setLoginError(err.message || 'An unknown error occurred during login.');
    } finally {
      setLoginLoading(false);
    }
  };

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
        setConcept(updatedConcept);
      } else {
        setConcept(data as ExtendedBriefConcept);
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
        setConcept(updatedConcept);
      } else {
        setConcept(data as ExtendedBriefConcept);
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
          <AlertDescription>{error || 'Concept not found. Please ensure the link is correct.'}</AlertDescription>
        </Alert>
        {showLoginPrompt && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Log In to View Content</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                {loginError && (
                  <Alert variant="destructive">
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" disabled={loginLoading} className="w-full">
                  {loginLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Log In
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
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
      <div className="flex flex-wrap gap-2 mb-4">
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
            {concept.review_link && (
              <a 
                href={concept.review_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-600 hover:underline text-sm mt-1 inline-block"
              >
                View on Frame.io →
              </a>
            )}
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
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleResubmitForReview} 
              disabled={updatingResubmission || !reviewLink.trim()} 
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {updatingResubmission ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Submit Revised Version
            </Button>
          </CardFooter>
        </Card>
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

          {/* Description */}
          {concept.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{concept.description}</p>
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

          {/* Spoken hooks */}
          {concept.spoken_hook_options && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Spoken Hook Options</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{concept.spoken_hook_options}</p>
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
                />
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