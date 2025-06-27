"use client";

import React, { useState, useEffect } from 'react';
import { createSPAClient } from '@/lib/supabase/client';
import { createClient } from '@supabase/supabase-js';
import { getProductsByBrand } from '@/lib/services/productService';
import { Hook, Product } from '@/lib/types/powerbrief';
import { Loader2, Eye, EyeOff, X, MessageCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimelineComment, CommentModal } from '@/components/CommentModal';
import { toast } from '@/components/ui/use-toast';
import { GeneratedVideo } from '@/lib/types/powerbrief';
import { useSearchParams } from 'next/navigation';

interface BrandData {
  id: string;
  user_id: string;
  name: string;
  brand_info_data: Record<string, unknown>;
  target_audience_data: Record<string, unknown>;
  competition_data: Record<string, unknown>;
  editing_resources?: Array<{ name: string; url: string }>;
  resource_logins?: Array<{ resourceName: string; username: string; password: string }>;
  dos_and_donts?: {
    imagesDos: string[];
    imagesDonts: string[];
    videosDos: string[];
    videosDonts: string[];
  };
  created_at: string;
  updated_at: string;
}

interface BatchData {
  id: string;
  name: string;
  brand_id: string;
  user_id: string;
  brands: BrandData;
  share_settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface ConceptData {
  id: string;
  concept_title: string;
  status?: string;
  strategist?: string;
  video_editor?: string;
  editor_id?: string;
  custom_editor_name?: string;
  media_url?: string;
  media_type?: string;
  videoInstructions?: string;
  designerInstructions?: string;
  text_hook_options?: Hook[];
  product_id?: string;
  order_in_batch: number;
  generated_broll?: GeneratedVideo[];
}

interface PageProps {
    params: {
        shareId: string; // Keep the param name for backward compatibility but it's actually batchId now
    };
}

export default function SharedBriefPage({ params }: PageProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [batch, setBatch] = useState<BatchData | null>(null);
  const [concepts, setConcepts] = useState<ConceptData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditable, setIsEditable] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('default');
  const [filterByEditor, setFilterByEditor] = useState<string>('all');
  
  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Modal state for media viewing with comments
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMedia, setModalMedia] = useState<{
    url: string;
    type: 'image' | 'video';
    name: string;
    conceptId?: string;
  } | null>(null);
  
  // Comments state
  const [conceptComments, setConceptComments] = useState<Record<string, TimelineComment[]>>({});
  
  // Debug mode state
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params) as any;
  const { shareId } = unwrappedParams;
  
  // Check for debug mode on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
      setDebugMode(true);
      
      // Fetch debug info
      fetch(`/api/debug-share?shareId=${shareId}`)
        .then(res => res.json())
        .then(data => setDebugInfo(data))
        .catch(err => console.error('Failed to fetch debug info:', err));
    }
  }, [shareId]);

  // Get product name from product ID
  const getProductName = (productId: string | null): string | null => {
    if (!productId) return null;
    const product = products.find(p => p.id === productId);
    return product ? product.name : null;
  };

  // Function to get editor display name from concept (handles all editor field types)
  const getConceptEditorName = (concept: ConceptData): string | null => {
    // Priority: saved editor > custom editor > legacy video_editor
    if (concept.custom_editor_name) {
      return concept.custom_editor_name;
    }
    return concept.video_editor || null;
  };

  // Get unique editors from concepts for filter dropdown
  const getUniqueEditors = (conceptList: ConceptData[]): string[] => {
    const editors = new Set<string>();
    conceptList.forEach(concept => {
      const editorName = getConceptEditorName(concept);
      if (editorName && editorName.trim()) {
        editors.add(editorName.trim());
      }
    });
    return Array.from(editors).sort();
  };

  // Filter concepts by editor
  const filterConcepts = (conceptsToFilter: ConceptData[], editorFilter: string): ConceptData[] => {
    if (editorFilter === 'all') {
      return conceptsToFilter;
    }
    
    if (editorFilter === 'unassigned') {
      return conceptsToFilter.filter(concept => !getConceptEditorName(concept));
    }
    
    return conceptsToFilter.filter(concept => {
      const editorName = getConceptEditorName(concept);
      return editorName === editorFilter;
    });
  };

  // Sort concepts based on criteria
  const sortConcepts = (conceptsToSort: ConceptData[], sortCriteria: string) => {
    const sorted = [...conceptsToSort];
    
    switch (sortCriteria) {
      case 'editor-asc':
        return sorted.sort((a, b) => {
          const editorA = getConceptEditorName(a) || '';
          const editorB = getConceptEditorName(b) || '';
          return editorA.localeCompare(editorB);
        });
      case 'editor-desc':
        return sorted.sort((a, b) => {
          const editorA = getConceptEditorName(a) || '';
          const editorB = getConceptEditorName(b) || '';
          return editorB.localeCompare(editorA);
        });
      case 'status':
        return sorted.sort((a, b) => {
          const statusA = a.status || '';
          const statusB = b.status || '';
          return statusA.localeCompare(statusB);
        });
      case 'title':
        return sorted.sort((a, b) => a.concept_title.localeCompare(b.concept_title));
      default: // 'default' - status priority order
        const statusPriority: Record<string, number> = {
          'REVISIONS REQUESTED': 1,
          'READY FOR EDITOR': 2,
          'READY FOR DESIGNER': 3,
          'APPROVED': 4
        };
        return sorted.sort((a, b) => {
          const priorityA = statusPriority[a.status || ''] || 99;
          const priorityB = statusPriority[b.status || ''] || 99;
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          return a.order_in_batch - b.order_in_batch;
        });
    }
  };

  // Get filtered and sorted concepts
  const filteredConcepts = filterConcepts(concepts, filterByEditor);
  const sortedAndFilteredConcepts = sortConcepts(filteredConcepts, sortBy);
  const uniqueEditors = getUniqueEditors(concepts);

  // Function to reset all filters and sorting
  const resetFilters = () => {
    setSortBy('default');
    setFilterByEditor('all');
  };

  // Check if any filters are active
  const hasActiveFilters = sortBy !== 'default' || filterByEditor !== 'all';

  // Function to open media in modal
  const openMediaModal = (url: string, type: 'image' | 'video', name: string, conceptId?: string) => {
    setModalMedia({ url, type, name, conceptId });
    setModalOpen(true);
    
    // Load comments for this concept if it's a video
    if (type === 'video' && conceptId) {
      fetchConceptComments(conceptId);
    }
  };

  // Function to close modal
  const closeModal = () => {
    setModalOpen(false);
    setModalMedia(null);
  };

  // Function to get comment count for video assets
  const getCommentCount = (conceptId: string): number => {
    const comments = conceptComments[conceptId] || [];
    return comments.length;
  };

  // Function to fetch comments for a concept
  const fetchConceptComments = async (conceptId: string) => {
    try {
      const response = await fetch(`/api/concept-comments?conceptId=${conceptId}`);
      if (response.ok) {
        const data = await response.json();
        const comments: TimelineComment[] = data.comments.map((comment: any) => ({
          id: comment.id,
          timestamp: comment.timestamp_seconds,
          comment: comment.comment_text,
          author: comment.author_name,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          parent_id: comment.parent_id,
          user_id: comment.user_id,
          revision_version: comment.revision_version || 1,
          is_resolved: comment.is_resolved || false,
          resolved_at: comment.resolved_at,
          resolved_by: comment.resolved_by
        }));
        setConceptComments(prev => ({ ...prev, [conceptId]: comments }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  // Function to add a comment
  const handleAddComment = async (conceptId: string, timestamp: number, comment: string, parentId?: string) => {
    try {
      const response = await fetch('/api/concept-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conceptId,
          timestamp,
          comment,
          parentId
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newComment: TimelineComment = {
          id: data.comment.id,
          timestamp: data.comment.timestamp_seconds,
          comment: data.comment.comment_text,
          author: data.comment.author_name,
          created_at: data.comment.created_at,
          updated_at: data.comment.updated_at,
          parent_id: data.comment.parent_id,
          user_id: data.comment.user_id,
          revision_version: data.comment.revision_version || 1,
          is_resolved: data.comment.is_resolved || false,
          resolved_at: data.comment.resolved_at,
          resolved_by: data.comment.resolved_by
        };

        setConceptComments(prev => {
          const updated = { ...prev };
          if (updated[conceptId]) {
            updated[conceptId] = [...updated[conceptId], newComment];
          } else {
            updated[conceptId] = [newComment];
          }
          return updated;
        });
      } else {
        console.error('Failed to add comment');
        toast({
          title: 'Error',
          description: 'Failed to add comment. Please try again.',
          variant: 'destructive',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  // Function to edit a comment
  const handleEditComment = async (commentId: string, comment: string) => {
    try {
      const response = await fetch('/api/concept-comments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          comment
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const updatedComment: TimelineComment = {
          id: data.comment.id,
          timestamp: data.comment.timestamp_seconds,
          comment: data.comment.comment_text,
          author: data.comment.author_name,
          created_at: data.comment.created_at,
          updated_at: data.comment.updated_at,
          parent_id: data.comment.parent_id,
          user_id: data.comment.user_id,
          revision_version: data.comment.revision_version || 1,
          is_resolved: data.comment.is_resolved || false,
          resolved_at: data.comment.resolved_at,
          resolved_by: data.comment.resolved_by
        };

        setConceptComments(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(conceptId => {
            updated[conceptId] = updated[conceptId].map(c => 
              c.id === commentId ? updatedComment : c
            );
          });
          return updated;
        });
      } else {
        console.error('Failed to edit comment');
        toast({
          title: 'Error',
          description: 'Failed to edit comment. Please try again.',
          variant: 'destructive',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to edit comment. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  // Function to resolve a comment
  const handleResolveComment = async (commentId: string, isResolved: boolean) => {
    try {
      const response = await fetch('/api/concept-comments/resolve', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          isResolved
        }),
      });

      if (response.ok) {
        // Instead of trying to update local state with potentially incomplete data,
        // just refetch all comments for all concepts to ensure UI is up to date
        const currentConceptIds = Object.keys(conceptComments);
        for (const conceptId of currentConceptIds) {
          await fetchConceptComments(conceptId);
        }

        toast({
          title: isResolved ? "Comment Resolved" : "Comment Reopened",
          description: isResolved ? "Comment has been marked as resolved." : "Comment has been reopened.",
          duration: 3000,
        });
      } else {
        console.error('Failed to resolve comment');
        toast({
          title: 'Error',
          description: 'Failed to update comment status. Please try again.',
          variant: 'destructive',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error resolving comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update comment status. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  // Function to delete a comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch('/api/concept-comments', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId
        }),
      });

      if (response.ok) {
        setConceptComments(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(conceptId => {
            updated[conceptId] = updated[conceptId].filter(c => c.id !== commentId);
          });
          return updated;
        });
      } else {
        console.error('Failed to delete comment');
        toast({
          title: 'Error',
          description: 'Failed to delete comment. Please try again.',
          variant: 'destructive',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comment. Please try again.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    const fetchSharedBatch = async () => {
      try {
        setLoading(true);
        // Create an anonymous client for public access to bypass user auth checks
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            }
          }
        );

        // Enhanced logging for debugging
        console.log('=== PUBLIC SHARE DEBUGGING ===');
        console.log('Share ID:', shareId);
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

        // First, let's check if we can access ANY batches with share_settings
        console.log('Testing basic access to brief_batches with share_settings...');
        const { data: testData, error: testError } = await supabase
          .from('brief_batches')
          .select('id, name, share_settings')
          .not('share_settings', 'is', null)
          .limit(5);
        
        console.log('Test query result:', { 
          success: !testError, 
          error: testError,
          dataCount: testData?.length || 0,
          sampleData: testData?.map(b => ({
            id: b.id,
            name: b.name,
            shareSettingsKeys: Object.keys(b.share_settings || {})
          }))
        });
        
        // Since we're now using batch IDs directly, just fetch the batch by ID
        console.log('Looking for batch with ID:', shareId);
        const { data: batchData, error: batchError } = await supabase
          .from('brief_batches')
          .select('*, brands(*)')
          .eq('id', shareId)
          .single();

        if (batchError) {
          console.error('Batch query error:', batchError);
          throw batchError;
        }

        console.log('Batch found:', batchData ? 'Yes' : 'No');

        if (!batchData) {
          console.log('No batch found with ID:', shareId);
          
          // Also check if the user is logged in and show their batches
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            console.log('Current user:', user.email);
            console.log('Checking user-specific batches...');
            
            // Get batches for this user specifically
            const { data: userBatches } = await supabase
              .from('brief_batches')
              .select('id, name, brand_id')
              .or(`user_id.eq.${user.id},brand_id.in.(select brand_id from brand_shares where shared_with_user_id='${user.id}' and status='accepted')`);
            
            console.log('User has access to batches:', userBatches?.length || 0);
            userBatches?.forEach(batch => {
              console.log(`User's batch: ${batch.name} (ID: ${batch.id})`);
            });
          }
          
          setError('Shared content not found. The batch may have been deleted or you may not have permission to view it.');
          setShowLoginPrompt(true);
          setLoading(false);
          return;
        }

        const batchWithShare = batchData as unknown as BatchData;
        
        // Since we're using batch IDs directly now, we don't need to check share settings
        // All batches are shareable by their ID
        setIsEditable(true); // Make public shares editable so anyone can submit assets

        // Get the brand data
        const brandData = batchWithShare.brands;
        if (brandData) {
          setBrand(brandData);
          
          // Fetch products for the brand
          try {
            const productsData = await getProductsByBrand(brandData.id);
            setProducts(productsData);
          } catch (productsError) {
            console.error('Error fetching products:', productsError);
            // Continue without products if there's an error
          }
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
        ) as unknown as ConceptData[];

        // Sort concepts to move APPROVED to the end
        const sortedConcepts = [...filteredConcepts].sort((a, b) => {
          if (a.status === "APPROVED" && b.status !== "APPROVED") return 1;
          if (a.status !== "APPROVED" && b.status === "APPROVED") return -1;
          return a.order_in_batch - b.order_in_batch;
        });

        setConcepts(sortedConcepts);
      } catch (err: unknown) {
        console.error('Error fetching shared batch:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load shared content';
        console.log('Detailed error analysis:', {
          errorMessage,
          shareId,
          errorType: err instanceof Error ? err.constructor.name : typeof err
        });
        
        setError(errorMessage);
        
        // More specific error handling for public sharing issues
        const errorLower = errorMessage.toLowerCase();
        
        // Show login prompt only for authentication-related errors, not RLS policy issues
        if (
          errorLower.includes('permission denied') ||
          errorLower.includes('unauthorized') ||
          errorLower.includes('authentication required') ||
          (errorLower.includes('not found') && 
           !errorLower.includes('share settings not found') &&
           !errorLower.includes('batch') && 
           !errorLower.includes('concept'))
        ) {
            console.log('Showing login prompt due to auth error');
            setShowLoginPrompt(true);
        } else {
            console.log('Not showing login prompt - appears to be a data/sharing issue');
            // For RLS or sharing issues, provide more helpful error message
            if (errorLower.includes('not found') || errorLower.includes('no rows')) {
              setError('This shared link may have expired or been removed. Please contact the person who shared it with you.');
            }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSharedBatch();
  }, [shareId]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const supabase = createSPAClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Redirect to the original shared URL after successful login
      window.location.reload();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during login.';
      setLoginError(errorMessage);
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
              <p className="text-gray-500">No concepts with status &quot;ready for designer&quot;, &quot;ready for editor&quot;, &quot;revisions requested&quot;, or &quot;approved&quot; available in this batch.</p>
            </div>
          ) : (
            <>
              {/* Sorting and Filtering Controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {/* Sort Controls */}
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="sort-select" className="text-sm font-medium whitespace-nowrap">
                      Sort by:
                    </Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sort-select" className="w-48">
                        <SelectValue placeholder="Select sorting option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default (Status Priority)</SelectItem>
                        <SelectItem value="editor-asc">Editor (A-Z)</SelectItem>
                        <SelectItem value="editor-desc">Editor (Z-A)</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Filter Controls */}
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="filter-select" className="text-sm font-medium whitespace-nowrap">
                      Filter by Editor:
                    </Label>
                    <Select value={filterByEditor} onValueChange={setFilterByEditor}>
                      <SelectTrigger id="filter-select" className="w-48">
                        <SelectValue placeholder="All editors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Editors</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {uniqueEditors.map((editor) => (
                          <SelectItem key={editor} value={editor}>
                            {editor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Reset Filters Button */}
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetFilters}
                      className="flex items-center space-x-1"
                    >
                      <X className="h-4 w-4" />
                      <span>Reset</span>
                    </Button>
                  )}
                </div>
                
                {/* Results Count */}
                <div className="text-sm text-gray-500">
                  Showing {sortedAndFilteredConcepts.length} of {concepts.length} concepts
                  {filterByEditor !== 'all' && (
                    <span className="ml-1">
                      (filtered by {filterByEditor === 'unassigned' ? 'unassigned' : `editor: ${filterByEditor}`})
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedAndFilteredConcepts.map((concept) => {
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
                      {getConceptEditorName(concept) && (
                        <CardDescription>Video Editor/Designer: {getConceptEditorName(concept)}</CardDescription>
                      )}
                      {concept.product_id && (
                        <CardDescription>Product: {getProductName(concept.product_id) || concept.product_id}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Media Preview */}
                      {concept.media_url && (
                        <div className="h-[150px] bg-gray-100 rounded flex items-center justify-center">
                          {concept.media_type === 'video' ? (
                            <div className="relative w-full h-full">
                              <div
                                className="w-full h-full cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center"
                                onClick={() => openMediaModal(concept.media_url!, 'video', concept.concept_title, concept.id)}
                              >
                                <video
                                  src={concept.media_url}
                                  crossOrigin="anonymous"
                                  className="h-full w-full object-contain pointer-events-none"
                                  muted
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded">
                                  <div className="text-center text-white">
                                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mb-2 mx-auto">
                                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <p className="text-xs">Click to view with comments</p>
                                    {getCommentCount(concept.id) > 0 && (
                                      <div className="flex items-center justify-center mt-1">
                                        <MessageCircle className="h-3 w-3 mr-1" />
                                        <span className="text-xs">{getCommentCount(concept.id)} comments</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <img
                              src={concept.media_url}
                              alt="Concept media"
                              crossOrigin="anonymous"
                              className="h-full w-full object-contain cursor-pointer"
                              onClick={() => openMediaModal(concept.media_url!, 'image', concept.concept_title, concept.id)}
                            />
                          )}
                        </div>
                      )}
                      
                      {/* Video Instructions - only for video media type */}
                      {concept.videoInstructions && concept.media_type === 'video' && (
                        <div>
                          <h3 className="font-medium text-sm mb-1">Video Instructions</h3>
                          <p className="text-sm bg-gray-50 p-3 rounded line-clamp-3 break-words">
                            {concept.videoInstructions}
                          </p>
                        </div>
                      )}
                      
                      {/* Designer Instructions - only for image media type */}
                      {concept.designerInstructions && concept.media_type === 'image' && (
                        <div>
                          <h3 className="font-medium text-sm mb-1">Designer Instructions</h3>
                          <p className="text-sm bg-gray-50 p-3 rounded line-clamp-3 break-words">
                            {concept.designerInstructions}
                          </p>
                        </div>
                      )}
                      
                      {/* Text Hooks */}
                      {concept.text_hook_options && Array.isArray(concept.text_hook_options) && concept.text_hook_options.length > 0 && (
                        <div className="mt-4">
                          <h3 className="font-medium text-sm mb-1">Text Hook options</h3>
                          <div className="space-y-1 text-sm bg-gray-50 p-2 rounded break-words">
                            {concept.text_hook_options.map((hook: Hook, index: number) => (
                              <p key={hook.id || index} className="whitespace-pre-wrap">{hook.content}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      

                      
                      {/* View full concept link */}
                      <div className="pt-2">
                        <Link
                          href={`/public/concept/${concept.id}`}
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
            </>
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
                                  <span className="break-words">{String(value)}</span>
                                </div>
                              )) : 
                            <p className="whitespace-pre-wrap break-words">{String(brand.brand_info_data)}</p>
                          }
                        </div>
                      </div>
                    )}
                    
                    {/* Video Instructions */}
                    {brand.brand_info_data && brand.brand_info_data.videoInstructions && (
                      <div>
                        <h3 className="font-medium">Video Instructions</h3>
                        <div className="bg-gray-50 p-3 rounded mt-2">
                          <p className="whitespace-pre-wrap break-words">{brand.brand_info_data.videoInstructions}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Designer Instructions */}
                    {brand.brand_info_data && brand.brand_info_data.designerInstructions && (
                      <div>
                        <h3 className="font-medium">Designer Instructions</h3>
                        <div className="bg-gray-50 p-3 rounded mt-2">
                          <p className="whitespace-pre-wrap break-words">{brand.brand_info_data.designerInstructions}</p>
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
                                <span className="break-words">{String(value)}</span>
                              </div>
                            )) : 
                            <p className="whitespace-pre-wrap break-words">{String(brand.target_audience_data)}</p>
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
                                <span className="break-words">{String(value)}</span>
                              </div>
                            )) : 
                            <p className="whitespace-pre-wrap break-words">{String(brand.competition_data)}</p>
                          }
                        </div>
                      </div>
                    )}
                    
                    {/* Editing Resources */}
                    {brand.editing_resources && brand.editing_resources.length > 0 && (
                      <div>
                        <h3 className="font-medium">Editing Resources</h3>
                        <div className="space-y-2 mt-2">
                          {brand.editing_resources.map((resource: { name: string; url: string }, index: number) => (
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
                          {brand.resource_logins.map((login: { resourceName: string; username: string; password: string }, index: number) => (
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
                                      <div key={index} className="bg-green-50 border border-green-200 p-2 rounded text-sm break-words">
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
                                      <div key={index} className="bg-red-50 border border-red-200 p-2 rounded text-sm break-words">
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
                              
                              {/* Video Do&apos;s */}
                              {brand.dos_and_donts.videosDos?.length > 0 && (
                                <div className="mb-2">
                                  <h5 className="text-sm font-medium text-green-600 mb-1">Do&apos;s</h5>
                                  <div className="space-y-1">
                                    {brand.dos_and_donts.videosDos.map((item: string, index: number) => (
                                      <div key={index} className="bg-green-50 border border-green-200 p-2 rounded text-sm break-words">
                                        {item}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Video Don&apos;ts */}
                              {brand.dos_and_donts.videosDonts?.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium text-red-600 mb-1">Don&apos;ts</h5>
                                  <div className="space-y-1">
                                    {brand.dos_and_donts.videosDonts.map((item: string, index: number) => (
                                      <div key={index} className="bg-red-50 border border-red-200 p-2 rounded text-sm break-words">
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
      
      {/* Debug Panel - Only show when debug mode is active */}
      {debugMode && debugInfo && (
        <Card className="mt-8 border-2 border-orange-400">
          <CardHeader className="bg-orange-50">
            <CardTitle className="text-orange-800">🔍 Debug Information</CardTitle>
            <CardDescription>Share ID: {shareId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 mt-4">
            {debugInfo.currentUser && (
              <div>
                <h3 className="font-medium">Current User</h3>
                <p className="text-sm text-gray-600">ID: {debugInfo.currentUser.id}</p>
                <p className="text-sm text-gray-600">Email: {debugInfo.currentUser.email}</p>
              </div>
            )}
            
            <div>
              <h3 className="font-medium">Search Results</h3>
              <p className="text-sm text-gray-600">Total batches with shares: {debugInfo.totalBatchesFound}</p>
              <p className="text-sm text-gray-600">
                Matching batch found: {debugInfo.matchingBatch ? 'Yes' : 'No'}
              </p>
            </div>
            
            {debugInfo.matchingBatch && (
              <div className="bg-green-50 p-3 rounded">
                <h3 className="font-medium text-green-800">✅ Matching Batch Found</h3>
                <p className="text-sm">Name: {debugInfo.matchingBatch.batchName}</p>
                <p className="text-sm">ID: {debugInfo.matchingBatch.batchId}</p>
                <p className="text-sm">Brand ID: {debugInfo.matchingBatch.brandId}</p>
                {debugInfo.matchingBatch.targetShareDetails && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Share Details:</p>
                    <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                      {JSON.stringify(debugInfo.matchingBatch.targetShareDetails, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            {!debugInfo.matchingBatch && debugInfo.allBatches && (
              <div className="bg-red-50 p-3 rounded">
                <h3 className="font-medium text-red-800">❌ No Matching Batch</h3>
                <p className="text-sm mb-2">The share ID was not found in any batch. Available shares:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {debugInfo.allBatches.map((batch: any, index: number) => (
                    <div key={index} className="bg-white p-2 rounded text-xs">
                      <p className="font-medium">{batch.batchName}</p>
                      <p>Share IDs: {batch.shareIds.join(', ') || 'None'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-500 mt-4">
              <p>To hide this debug panel, remove ?debug=true from the URL</p>
              <p>API endpoint: /api/debug-share</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Comment Modal */}
      {modalMedia && (
        <CommentModal
          isOpen={modalOpen}
          onClose={closeModal}
          mediaUrl={modalMedia.url}
          mediaType={modalMedia.type}
          mediaName={modalMedia.name}
          conceptId={modalMedia.conceptId}
          existingComments={modalMedia.conceptId ? conceptComments[modalMedia.conceptId] || [] : []}
          onAddComment={modalMedia.conceptId ? (timestamp, comment, parentId) => handleAddComment(modalMedia.conceptId!, timestamp, comment, parentId) : undefined}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onResolveComment={handleResolveComment}
          currentRevision={1}
          canResolveComments={true}
        />
      )}
    </div>
  );
} 