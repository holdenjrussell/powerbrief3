'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Badge
} from '@/components/ui';
import { ArrowLeft, Pencil, Trash2, CheckCircle, AlertCircle, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UgcCreatorScript } from '@/lib/types/ugcCreator';
import { getUgcCreatorById } from '@/lib/services/ugcCreatorService';

// Add a constant for the TBD creator ID (this is a reliable UUID that won't change)
const TBD_CREATOR_ID = '00000000-0000-0000-0000-000000000000';

export default function ScriptDetailPage({ params }: { params: { brandId: string; scriptId: string } | Promise<{ brandId: string; scriptId: string }> }) {
  // Unwrap params using React.use()
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const { brandId, scriptId } = unwrappedParams;
  const { user } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<UgcCreatorScript | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [creatorName, setCreatorName] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchScript = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch script data
        const response = await fetch(`/api/ugc/scripts/${scriptId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch script: ${response.statusText}`);
        }
        
        const scriptData = await response.json();
        setScript(scriptData);
        
        // If the script has a creator and it's not the TBD creator, fetch creator details
        if (scriptData.creator_id && scriptData.creator_id !== TBD_CREATOR_ID) {
          try {
            const creatorData = await getUgcCreatorById(scriptData.creator_id);
            if (creatorData) {
              setCreatorName(creatorData.name);
            }
          } catch (creatorErr) {
            console.error('Failed to fetch creator details:', creatorErr);
            // Continue without creator name
          }
        }
        
      } catch (err) {
        console.error('Failed to fetch script:', err);
        setError('Failed to load script. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchScript();
  }, [user?.id, scriptId]);

  const handleDeleteScript = async () => {
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/ugc/scripts/${scriptId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete script');
      }
      
      // Navigate back to the ugc pipeline page
      router.push(`/app/powerbrief/${brandId}/ugc-pipeline`);
      
    } catch (error) {
      console.error('Error deleting script:', error);
      setError(`Failed to delete script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleApproveScript = async () => {
    try {
      const response = await fetch(`/api/ugc/scripts/${scriptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'APPROVED',
          concept_status: 'Creator Assignment' 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      // Refresh script data
      const updatedScript = await response.json();
      setScript(updatedScript);
      
    } catch (err) {
      console.error('Failed to approve script:', err);
      setError(`Failed to approve script: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) {
      setError('Please provide revision notes.');
      return;
    }
    
    try {
      const response = await fetch(`/api/ugc/scripts/${scriptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'REVISION_REQUESTED',
          concept_status: 'Script Approval',
          revision_notes: revisionNotes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      // Refresh script data
      const updatedScript = await response.json();
      setScript(updatedScript);
      
      // Close dialog
      setShowRevisionDialog(false);
      setRevisionNotes('');
      
    } catch (err) {
      console.error('Failed to request revision:', err);
      setError(`Failed to request revision: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!script) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Script not found.</AlertDescription>
        </Alert>
        <Button 
          className="mt-4"
          onClick={() => router.push(`/app/powerbrief/${brandId}/ugc-pipeline`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to UGC Pipeline
        </Button>
      </div>
    );
  }

  // Function to get badge variant based on status
  const getStatusVariant = (status: string | undefined) => {
    if (!status) return "default";
    
    if (['COMPLETED', 'CONTENT UPLOADED', 'READY FOR PAYMENT', 'APPROVED'].includes(status)) {
      return "success";
    }
    
    if (['SCRIPT ASSIGNED', 'CREATOR FILMING', 'FINAL CONTENT UPLOAD'].includes(status)) {
      return "default";
    }
    
    if (['BACKLOG', 'COLD OUTREACH', 'PRIMARY SCREEN', 'PENDING_APPROVAL'].includes(status)) {
      return "secondary";
    }
    
    if (['CREATOR_REASSIGNMENT'].includes(status)) {
      return "warning";
    }
    
    if (['INACTIVE/REJECTED', 'REVISION_REQUESTED'].includes(status)) {
      return "destructive";
    }
    
    return "outline";
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
        <div>
          <Button 
            variant="outline" 
            className="mb-2"
            onClick={() => router.push(`/app/powerbrief/${brandId}/ugc-pipeline`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to UGC Pipeline
          </Button>
          <h1 className="text-2xl font-bold">{script.title}</h1>
          <div className="flex flex-wrap gap-2 mt-1">
            <Badge variant={getStatusVariant(script.status)}>
              {script.status || 'NEW'}
            </Badge>
            <Badge variant="outline">
              {script.concept_status || 'Creator Script'}
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={() => router.push(`/app/powerbrief/${brandId}/ugc-pipeline/scripts/${script.id}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit Script
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {script.status === 'REVISION_REQUESTED' && script.revision_notes && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertDescription className="text-amber-800">
            <strong>Revision Requested:</strong> {script.revision_notes}
          </AlertDescription>
        </Alert>
      )}
      
      {script.status === 'CREATOR_REASSIGNMENT' && script.revision_notes && (
        <Alert className="mb-6 bg-amber-50 border-amber-200">
          <AlertDescription className="text-amber-800">
            <strong>Creator Rejection Notes:</strong> {script.revision_notes}
          </AlertDescription>
        </Alert>
      )}
      
      {script.status === 'PENDING_APPROVAL' && (
        <div className="flex gap-2 mb-6">
          <Button 
            variant="outline" 
            className="text-green-600 border-green-600 hover:bg-green-50"
            onClick={handleApproveScript}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Approve Script
          </Button>
          
          <Button 
            variant="outline" 
            className="text-red-600 border-red-600 hover:bg-red-50"
            onClick={() => setShowRevisionDialog(true)}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Request Revision
          </Button>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Script Details</CardTitle>
          <CardDescription>
            Created on {new Date(script.created_at).toLocaleDateString()}
            {script.creator_id && (
              <div className="mt-2 flex items-center">
                <User className="h-4 w-4 mr-2 text-gray-500" />
                {script.status === 'CREATOR_REASSIGNMENT' ? (
                  <span className="text-amber-600 font-medium">TBD (Needs Reassignment)</span>
                ) : script.creator_id === TBD_CREATOR_ID ? (
                  <span className="text-amber-600">TBD (To Be Determined)</span>
                ) : (
                  <span>{creatorName || `Creator ID: ${script.creator_id.slice(0, 8)}...`}</span>
                )}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="script" className="space-y-6">
            <TabsList>
              <TabsTrigger value="script">Script Content</TabsTrigger>
              <TabsTrigger value="metadata">Additional Info</TabsTrigger>
            </TabsList>
            
            <TabsContent value="script" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Hook Body</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-md border">
                    {script.hook_body || 'No hook body provided.'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Scene Start</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-md border">
                    {script.script_content.scene_start || 'No scene start description provided.'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Segments</h3>
                  <div className="space-y-4">
                    {script.script_content.segments?.map((segment, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-gray-50">
                          <CardTitle className="text-lg">{segment.segment}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 grid gap-4">
                          <div>
                            <h4 className="font-medium mb-1">Script</h4>
                            <p className="text-gray-700 whitespace-pre-line">{segment.script}</p>
                          </div>
                          <div>
                            <h4 className="font-medium mb-1">Visuals</h4>
                            <p className="text-gray-700 whitespace-pre-line">{segment.visuals}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {(!script.script_content.segments || script.script_content.segments.length === 0) && (
                      <p className="text-gray-500">No script segments available.</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Scene End</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-md border">
                    {script.script_content.scene_end || 'No scene end description provided.'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Call to Action</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-md border">
                    {script.cta || 'No call to action provided.'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">B-Roll Shot List</h3>
                  {script.b_roll_shot_list && script.b_roll_shot_list.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-gray-700">
                      {script.b_roll_shot_list.map((shot, index) => (
                        <li key={index}>{shot}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No B-roll shots provided.</p>
                  )}
                </div>
                
                {script.inspiration_video_url && (
                  <div>
                    <h3 className="font-medium mb-1">Reference Video</h3>
                    <div className="max-w-md">
                      <video 
                        src={script.inspiration_video_url} 
                        controls 
                        preload="metadata"
                        className="w-full h-auto rounded-md mt-1 border bg-gray-100"
                        controlsList="nodownload" 
                        style={{ minHeight: "200px" }}
                      />
                      {script.inspiration_video_notes && (
                        <div className="mt-2">
                          <h4 className="font-medium text-sm mb-1">Video Notes</h4>
                          <p className="text-gray-700 text-sm whitespace-pre-line">{script.inspiration_video_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="metadata" className="space-y-6">
              <div>
                <h3 className="font-medium mb-1">About the Company</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-md border whitespace-pre-line">
                  {script.company_description || 'No company description provided.'}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">About the Guide</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-md border whitespace-pre-line">
                  {script.guide_description || 'No guide description provided.'}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Filming Instructions</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-md border whitespace-pre-line">
                  {script.filming_instructions || 'No filming instructions provided.'}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Script</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this script? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertDescription>
                This will permanently delete the script and all associated data.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteScript}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Script'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Revision Request Dialog */}
      <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Script Revision</DialogTitle>
            <DialogDescription>
              Provide detailed notes on what needs to be revised.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Enter revision notes..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRevisionDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRequestRevision}
              disabled={!revisionNotes.trim()}
            >
              Submit Revision Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 