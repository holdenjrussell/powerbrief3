"use client";

import React, { useState, useEffect } from 'react';
import { createSPAClient } from '@/lib/supabase/client';
import { Brand, BriefBatch, BriefConcept, Scene } from '@/lib/types/powerbrief';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Extended types to match the actual data shape from Supabase
interface ExtendedBriefBatch extends Omit<BriefBatch, 'brand_id'> {
  brands: {
    id: string;
    user_id: string;
    name: string; // This is the brand_name
    brand_info_data: any;
    target_audience_data: any;
    competition_data: any;
    created_at: string;
    updated_at: string;
  };
  share_settings?: Record<string, any>;
}

export default function SharedBriefPage({ params }: { params: { shareId: string } }) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false);
  const [brand, setBrand] = useState<any>(null);
  const [batch, setBatch] = useState<any>(null);
  const [concepts, setConcepts] = useState<any[]>([]);
  const [isEditable, setIsEditable] = useState<boolean>(false);
  
  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const router = useRouter();
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params as any) as { shareId: string };
  const { shareId } = unwrappedParams;

  useEffect(() => {
    const fetchSharedBatch = async () => {
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
          setError('Shared content not found or has expired. You might need to log in to view this content.');
          setShowLoginPrompt(true);
          setLoading(false);
          return;
        }

        const batchWithShare = batchData[0];
        // Use type assertion to treat the data as having share_settings
        const shareSettings = (batchWithShare as any).share_settings?.[shareId];
        
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

        // Set the editability based on share settings
        setIsEditable(!!shareSettings.is_editable);

        // Get the brand data
        const brandData = batchWithShare.brands;
        if (brandData) {
          setBrand(brandData);
        }

        // Set batch data
        setBatch(batchWithShare);

        // Get concepts for this batch
        const { data: conceptsData, error: conceptsError } = await supabase
          .from('brief_concepts')
          .select('*')
          .eq('brief_batch_id', batchWithShare.id)
          .order('order_in_batch', { ascending: true });

        if (conceptsError) {
          throw conceptsError;
        }

        // Filter concepts to only show those with status "READY FOR DESIGNER" or "READY FOR EDITOR"
        const filteredConcepts = (conceptsData || []).filter(concept => 
          concept.status === "READY FOR DESIGNER" || 
          concept.status === "READY FOR EDITOR" ||
          concept.status === "REVISIONS REQUESTED" ||
          concept.status === "APPROVED"
        );

        // Sort concepts to move APPROVED to the end
        const sortedConcepts = [...filteredConcepts].sort((a, b) => {
          if (a.status === "APPROVED" && b.status !== "APPROVED") return 1;
          if (a.status !== "APPROVED" && b.status === "APPROVED") return -1;
          return a.order_in_batch - b.order_in_batch;
        });

        setConcepts(sortedConcepts);
      } catch (err: any) {
        console.error('Error fetching shared batch:', err);
        setError(err.message || 'Failed to load shared content');
        // Show login prompt if content not found (RLS) or specific auth-related errors
        if (
          (err.message?.toLowerCase().includes('not found') && 
           !err.message?.toLowerCase().includes('share settings not found')) || 
          err.message?.includes('FetchError') || 
          err.message?.includes('User not found') // Added "User not found"
        ) {
            setShowLoginPrompt(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSharedBatch();
  }, [shareId]);

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
      
      window.location.reload();
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertDescription>{error || 'Content not found. Please ensure the link is correct.'}</AlertDescription>
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
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{batch.name}</h1>
          <div className="flex items-center space-x-2">
            {isEditable ? (
              <span className="flex items-center text-green-600 text-sm">
                <Eye className="h-4 w-4 mr-1" />
                You can edit this content
              </span>
            ) : (
              <span className="flex items-center text-gray-600 text-sm">
                <EyeOff className="h-4 w-4 mr-1" />
                View only
              </span>
            )}
          </div>
        </div>
        {brand && (
          <p className="text-gray-500">
            Brand: {brand.name}
          </p>
        )}
      </div>

      <Tabs defaultValue="concepts" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="concepts">Concepts ({concepts.length})</TabsTrigger>
          {brand && <TabsTrigger value="brand">Brand Information</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="concepts" className="space-y-6">
          {concepts.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No concepts with status "ready for designer", "ready for editor", "revisions requested", or "approved" available in this batch.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {concepts.map((concept) => {
                // Determine card styling based on status
                const cardClass = concept.status === "REVISIONS REQUESTED" 
                  ? "overflow-hidden border-amber-300 border-2 bg-amber-50" 
                  : concept.status === "APPROVED" 
                    ? "overflow-hidden border-green-300 border-2 bg-green-50" 
                    : "overflow-hidden";
                
                return (
                <Card key={concept.id} className={cardClass}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{concept.concept_title}</CardTitle>
                    {concept.status && (
                      <CardDescription className={
                        concept.status === "REVISIONS REQUESTED"
                          ? "text-amber-700 font-medium"
                          : concept.status === "APPROVED"
                            ? "text-green-700 font-medium"
                            : ""
                      }>
                        Status: {concept.status}
                      </CardDescription>
                    )}
                    {concept.strategist && (
                      <CardDescription>Strategist: {concept.strategist}</CardDescription>
                    )}
                    {concept.video_editor && (
                      <CardDescription>Video Editor/Designer: {concept.video_editor}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Media Preview */}
                    {concept.media_url && (
                      <div className="h-[150px] bg-gray-100 rounded flex items-center justify-center">
                        {concept.media_type === 'video' ? (
                          <video
                            src={concept.media_url}
                            controls
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <img
                            src={concept.media_url}
                            alt="Concept media"
                            className="h-full w-full object-contain"
                          />
                        )}
                      </div>
                    )}
                    
                    {/* Caption Hooks */}
                    {concept.caption_hook_options && (
                      <div>
                        <h3 className="font-medium text-sm mb-1">Caption Hook options</h3>
                        <p className="text-sm bg-gray-50 p-3 rounded">
                          {concept.caption_hook_options}
                        </p>
                      </div>
                    )}
                    
                    {/* Video Instructions - only for video media type */}
                    {concept.videoInstructions && concept.media_type === 'video' && (
                      <div>
                        <h3 className="font-medium text-sm mb-1">Video Instructions</h3>
                        <p className="text-sm bg-gray-50 p-3 rounded line-clamp-3">
                          {concept.videoInstructions}
                        </p>
                      </div>
                    )}
                    
                    {/* Designer Instructions - only for image media type */}
                    {concept.designerInstructions && concept.media_type === 'image' && (
                      <div>
                        <h3 className="font-medium text-sm mb-1">Designer Instructions</h3>
                        <p className="text-sm bg-gray-50 p-3 rounded line-clamp-3">
                          {concept.designerInstructions}
                        </p>
                      </div>
                    )}
                    
                    {/* View full concept link */}
                    <div className="pt-2">
                      <Link
                        href={`/public/concept/${shareId}/${concept.id}`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View full concept details →
                      </Link>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="brand">
          {brand && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">Brand Name</h3>
                      <p>{brand.name}</p>
                    </div>
                    
                    {brand.brand_info_data && (
                      <div>
                        <h3 className="font-medium">Brand Information</h3>
                        <div className="space-y-2 mt-2">
                          {typeof brand.brand_info_data === 'object' && brand.brand_info_data !== null ? 
                            Object.entries(brand.brand_info_data)
                              .filter(([key]) => key !== 'videoInstructions' && key !== 'designerInstructions')
                              .map(([key, value]) => (
                                <div key={key} className="bg-gray-50 p-3 rounded">
                                  <span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                                  <span>{String(value)}</span>
                                </div>
                              )) : 
                            <p className="whitespace-pre-wrap">{String(brand.brand_info_data)}</p>
                          }
                        </div>
                      </div>
                    )}
                    
                    {/* Video Instructions */}
                    {brand.brand_info_data && brand.brand_info_data.videoInstructions && (
                      <div>
                        <h3 className="font-medium">Video Instructions</h3>
                        <div className="bg-gray-50 p-3 rounded mt-2">
                          <p className="whitespace-pre-wrap">{brand.brand_info_data.videoInstructions}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Designer Instructions */}
                    {brand.brand_info_data && brand.brand_info_data.designerInstructions && (
                      <div>
                        <h3 className="font-medium">Designer Instructions</h3>
                        <div className="bg-gray-50 p-3 rounded mt-2">
                          <p className="whitespace-pre-wrap">{brand.brand_info_data.designerInstructions}</p>
                        </div>
                      </div>
                    )}
                    
                    {brand.target_audience_data && (
                      <div>
                        <h3 className="font-medium">Target Audience</h3>
                        <div className="space-y-2 mt-2">
                          {typeof brand.target_audience_data === 'object' && brand.target_audience_data !== null ? 
                            Object.entries(brand.target_audience_data).map(([key, value]) => (
                              <div key={key} className="bg-gray-50 p-3 rounded">
                                <span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                                <span>{String(value)}</span>
                              </div>
                            )) : 
                            <p className="whitespace-pre-wrap">{String(brand.target_audience_data)}</p>
                          }
                        </div>
                      </div>
                    )}
                    
                    {brand.competition_data && (
                      <div>
                        <h3 className="font-medium">Competition</h3>
                        <div className="space-y-2 mt-2">
                          {typeof brand.competition_data === 'object' && brand.competition_data !== null ? 
                            Object.entries(brand.competition_data).map(([key, value]) => (
                              <div key={key} className="bg-gray-50 p-3 rounded">
                                <span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                                <span>{String(value)}</span>
                              </div>
                            )) : 
                            <p className="whitespace-pre-wrap">{String(brand.competition_data)}</p>
                          }
                        </div>
                      </div>
                    )}
                    
                    {/* Editing Resources */}
                    {brand.editing_resources && brand.editing_resources.length > 0 && (
                      <div>
                        <h3 className="font-medium">Editing Resources</h3>
                        <div className="space-y-2 mt-2">
                          {brand.editing_resources.map((resource: any, index: number) => (
                            <div key={index} className="bg-gray-50 p-3 rounded flex justify-between items-center">
                              <span className="font-semibold">{resource.name}</span>
                              <a 
                                href={resource.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline"
                              >
                                Visit
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Resource Logins */}
                    {brand.resource_logins && brand.resource_logins.length > 0 && (
                      <div>
                        <h3 className="font-medium">Resource Logins</h3>
                        <div className="space-y-2 mt-2">
                          {brand.resource_logins.map((login: any, index: number) => (
                            <div key={index} className="bg-gray-50 p-3 rounded">
                              <p className="font-semibold">{login.resourceName}</p>
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
                      </div>
                    )}
                    
                    {/* Do's and Don'ts */}
                    {brand.dos_and_donts && (
                      <div>
                        <h3 className="font-medium">Guidelines</h3>
                        <div className="space-y-4 mt-2">
                          {/* Image Guidelines */}
                          {(brand.dos_and_donts.imagesDos?.length > 0 || brand.dos_and_donts.imagesDonts?.length > 0) && (
                            <div>
                              <h4 className="font-medium text-sm mb-2">Image Guidelines</h4>
                              
                              {/* Image Do's */}
                              {brand.dos_and_donts.imagesDos?.length > 0 && (
                                <div className="mb-2">
                                  <h5 className="text-sm font-medium text-green-600 mb-1">Do's</h5>
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
                                  <h5 className="text-sm font-medium text-red-600 mb-1">Don'ts</h5>
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
                          )}
                          
                          {/* Video Guidelines */}
                          {(brand.dos_and_donts.videosDos?.length > 0 || brand.dos_and_donts.videosDonts?.length > 0) && (
                            <div>
                              <h4 className="font-medium text-sm mb-2">Video Guidelines</h4>
                              
                              {/* Video Do's */}
                              {brand.dos_and_donts.videosDos?.length > 0 && (
                                <div className="mb-2">
                                  <h5 className="text-sm font-medium text-green-600 mb-1">Do's</h5>
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
                                  <h5 className="text-sm font-medium text-red-600 mb-1">Don'ts</h5>
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
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 