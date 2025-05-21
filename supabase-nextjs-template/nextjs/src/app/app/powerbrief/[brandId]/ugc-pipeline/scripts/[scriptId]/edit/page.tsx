'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Textarea,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription
} from '@/components/ui';
import { Loader2, Save, Trash2, ArrowLeft, Plus, Upload, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UgcCreatorScript } from '@/lib/types/ugcCreator';

export default function EditScriptPage({ params }: { params: { brandId: string; scriptId: string } | Promise<{ brandId: string; scriptId: string }> }) {
  // Unwrap params using React.use()
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const { brandId, scriptId } = unwrappedParams;
  const { user } = useAuth();
  const router = useRouter();
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<UgcCreatorScript | null>(null);
  
  // Script content state
  const [title, setTitle] = useState<string>('');
  const [scriptContent, setScriptContent] = useState({
    scene_start: '',
    segments: [{ segment: 'Initial Approach', script: '', visuals: '' }],
    scene_end: ''
  });
  const [bRollShotList, setBRollShotList] = useState<string[]>([]);
  const [hookBody, setHookBody] = useState<string>('');
  const [cta, setCta] = useState<string>('');
  const [companyDescription, setCompanyDescription] = useState<string>('');
  const [guideDescription, setGuideDescription] = useState<string>('');
  const [filmingInstructions, setFilmingInstructions] = useState<string>('');
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string>('');
  const [referenceVideoNotes, setReferenceVideoNotes] = useState<string>('');
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null);
  
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
        
        // Populate form fields
        setTitle(scriptData.title || '');
        setScriptContent(scriptData.script_content || {
          scene_start: '',
          segments: [{ segment: 'Initial Approach', script: '', visuals: '' }],
          scene_end: ''
        });
        setBRollShotList(scriptData.b_roll_shot_list || []);
        setHookBody(scriptData.hook_body || '');
        setCta(scriptData.cta || '');
        setCompanyDescription(scriptData.company_description || '');
        setGuideDescription(scriptData.guide_description || '');
        setFilmingInstructions(scriptData.filming_instructions || '');
        setReferenceVideoUrl(scriptData.inspiration_video_url || '');
        setReferenceVideoNotes(scriptData.inspiration_video_notes || '');
        
      } catch (err) {
        console.error('Failed to fetch script:', err);
        setError('Failed to load script. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchScript();
  }, [user?.id, scriptId]);

  // Handle adding a new segment
  const handleAddSegment = () => {
    setScriptContent(prev => ({
      ...prev,
      segments: [...(prev.segments || []), { 
        segment: `Segment ${(prev.segments?.length || 0) + 1}`,
        script: '',
        visuals: ''
      }]
    }));
  };

  // Handle updating a segment
  const handleUpdateSegment = (index: number, field: string, value: string) => {
    setScriptContent(prev => {
      const newSegments = [...(prev.segments || [])];
      newSegments[index] = {
        ...newSegments[index],
        [field]: value
      };
      return {
        ...prev,
        segments: newSegments
      };
    });
  };

  // Handle removing a segment
  const handleRemoveSegment = (index: number) => {
    setScriptContent(prev => {
      const newSegments = [...(prev.segments || [])];
      newSegments.splice(index, 1);
      return {
        ...prev,
        segments: newSegments
      };
    });
  };

  // Handle adding a B-roll shot
  const handleAddBRollShot = () => {
    setBRollShotList(prev => [...prev, '']);
  };

  // Handle updating a B-roll shot
  const handleUpdateBRollShot = (index: number, value: string) => {
    setBRollShotList(prev => {
      const newList = [...prev];
      newList[index] = value;
      return newList;
    });
  };

  // Handle removing a B-roll shot
  const handleRemoveBRollShot = (index: number) => {
    setBRollShotList(prev => {
      const newList = [...prev];
      newList.splice(index, 1);
      return newList;
    });
  };

  // Handle file upload for reference video
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if the file is a video
      if (!file.type.startsWith('video/')) {
        setError('Please upload a video file');
        return;
      }
      
      // Store the file for later upload
      setReferenceVideo(file);
      
      // Create a temporary URL for preview
      const tempUrl = URL.createObjectURL(file);
      setReferenceVideoUrl(tempUrl);
    }
  };

  // Handle removing the reference video
  const handleRemoveVideo = () => {
    if (referenceVideoUrl && referenceVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(referenceVideoUrl);
    }
    setReferenceVideo(null);
    setReferenceVideoUrl('');
    setReferenceVideoNotes('');
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  // Upload video to storage
  const uploadVideoForStorage = async (file: File): Promise<string> => {
    try {
      setUploadingVideo(true);
      setError(null);
      
      // Create a form data object
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload the file
      const response = await fetch('/api/uploads/temp-video', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Video upload failed with status:', response.status, errorData);
        throw new Error(errorData.error || `Failed to upload video (HTTP ${response.status})`);
      }
      
      const data = await response.json();
      console.log('Video upload successful:', data);
      
      if (!data.url) {
        throw new Error('No URL returned from upload service');
      }
      
      return data.url;
    } catch (error) {
      console.error('Error uploading reference video:', error);
      setError(`Failed to upload reference video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      setUploadingVideo(false);
    }
  };

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!script) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Handle video upload if there's a new video
      let videoUrl = script.inspiration_video_url;
      if (referenceVideo) {
        try {
          videoUrl = await uploadVideoForStorage(referenceVideo);
        } catch (uploadError) {
          console.error("Failed to upload video:", uploadError);
          throw new Error(`Failed to upload video: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      } else if (referenceVideoUrl === '' && script.inspiration_video_url) {
        // If video was removed
        videoUrl = null;
      }
      
      // Update the script
      const scriptData = {
        ...script,
        title,
        hook_body: hookBody,
        cta,
        script_content: scriptContent,
        b_roll_shot_list: bRollShotList.filter(shot => shot.trim() !== ''),
        // After revision, set status back to PENDING_APPROVAL
        status: script.status === 'REVISION_REQUESTED' ? 'PENDING_APPROVAL' : script.status,
        concept_status: script.status === 'REVISION_REQUESTED' ? 'Script Approval' : script.concept_status,
        // Clear revision notes for REVISION_REQUESTED, but keep them for CREATOR_REASSIGNMENT
        revision_notes: script.status === 'REVISION_REQUESTED' ? null : script.revision_notes,
        // Update video fields
        inspiration_video_url: videoUrl,
        inspiration_video_notes: referenceVideoNotes,
        // Make sure to preserve the AI generated flag
        is_ai_generated: script.is_ai_generated
      };
      
      const response = await fetch(`/api/ugc/scripts/${scriptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scriptData)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update script');
      }
      
      // Navigate back to script detail view
      router.push(`/app/powerbrief/${brandId}/ugc-pipeline/scripts/${scriptId}`);
      
    } catch (error) {
      console.error('Error updating script:', error);
      setError(`Failed to update script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Button 
            variant="outline" 
            className="mb-2"
            onClick={() => router.push(`/app/powerbrief/${brandId}/ugc-pipeline`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to UGC Pipeline
          </Button>
          <h1 className="text-2xl font-bold">Edit Script</h1>
          {script.status === 'REVISION_REQUESTED' && script.revision_notes && (
            <Alert className="mt-4 bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800">
                <strong>Revision Requested:</strong> {script.revision_notes}
              </AlertDescription>
            </Alert>
          )}
          
          {script.status === 'CREATOR_REASSIGNMENT' && script.revision_notes && (
            <Alert className="mt-4 bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800">
                <strong>Creator Rejection Notes:</strong> {script.revision_notes}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Edit UGC Script</CardTitle>
          <CardDescription>Make changes to the script content and information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <Label htmlFor="title">Script Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter script title"
                className="mt-1"
              />
            </div>
            
            <Tabs defaultValue="script" className="space-y-6">
              <TabsList>
                <TabsTrigger value="script">Script Content</TabsTrigger>
                <TabsTrigger value="metadata">Additional Info</TabsTrigger>
              </TabsList>
              
              <TabsContent value="script" className="space-y-6">
                <div>
                  <Label htmlFor="hook-body">Hook Body</Label>
                  <Textarea
                    id="hook-body"
                    value={hookBody}
                    onChange={(e) => setHookBody(e.target.value)}
                    placeholder="The main message that follows the hook"
                    className="mt-1"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="scene-start">Scene Start</Label>
                  <Textarea
                    id="scene-start"
                    value={scriptContent.scene_start}
                    onChange={(e) => setScriptContent(prev => ({ ...prev, scene_start: e.target.value }))}
                    placeholder="Describe how the scene starts"
                    className="mt-1"
                    rows={2}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Script Segments</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddSegment}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Segment
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {scriptContent.segments?.map((segment, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardHeader className="py-3 px-4 bg-gray-50 flex flex-row items-center justify-between">
                          <div className="flex-1">
                            <Input
                              value={segment.segment}
                              onChange={(e) => handleUpdateSegment(index, 'segment', e.target.value)}
                              placeholder="Segment title"
                              className="border-0 bg-transparent p-0 focus-visible:ring-0 text-md font-semibold"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveSegment(index)}
                            disabled={scriptContent.segments.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardHeader>
                        <CardContent className="p-4 grid gap-4">
                          <div>
                            <Label htmlFor={`script-${index}`}>Script</Label>
                            <Textarea
                              id={`script-${index}`}
                              value={segment.script}
                              onChange={(e) => handleUpdateSegment(index, 'script', e.target.value)}
                              placeholder="What the creator should say or do"
                              className="mt-1"
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`visuals-${index}`}>Visuals</Label>
                            <Textarea
                              id={`visuals-${index}`}
                              value={segment.visuals}
                              onChange={(e) => handleUpdateSegment(index, 'visuals', e.target.value)}
                              placeholder="Describe how this segment should look visually"
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="scene-end">Scene End</Label>
                  <Textarea
                    id="scene-end"
                    value={scriptContent.scene_end}
                    onChange={(e) => setScriptContent(prev => ({ ...prev, scene_end: e.target.value }))}
                    placeholder="Describe how the scene ends"
                    className="mt-1"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="cta">Call to Action</Label>
                  <Textarea
                    id="cta"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="The call to action for the end of the video"
                    className="mt-1"
                    rows={2}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>B-Roll Shot List</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddBRollShot}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Shot
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {bRollShotList.map((shot, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={shot}
                          onChange={(e) => handleUpdateBRollShot(index, e.target.value)}
                          placeholder={`B-roll shot ${index + 1}`}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveBRollShot(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    {bRollShotList.length === 0 && (
                      <p className="text-sm text-gray-500">
                        No B-roll shots added yet. Click &quot;Add Shot&quot; to create a list of supplementary footage to capture.
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Reference Video</Label>
                  <div className="mt-1 space-y-4">
                    {!referenceVideoUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => videoInputRef.current?.click()}
                        className="flex items-center space-x-2"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        <span>Upload Reference Video</span>
                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/*"
                          onChange={handleFileChange}
                          className="hidden"
                          title="Upload reference video"
                          aria-label="Upload reference video"
                        />
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleRemoveVideo}
                          >
                            <X className="h-4 w-4 mr-1" />
                            <span>Remove Video</span>
                          </Button>
                          {referenceVideo && (
                            <span className="ml-2 text-sm text-gray-500 truncate max-w-[200px]">
                              {referenceVideo.name}
                            </span>
                          )}
                        </div>
                        
                        <div className="max-w-md">
                          <video 
                            src={referenceVideoUrl} 
                            controls 
                            preload="metadata"
                            className="w-full h-auto rounded-md mt-1 border bg-gray-100"
                            controlsList="nodownload" 
                            style={{ minHeight: "200px" }}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="reference-video-notes">Reference Video Notes</Label>
                          <Textarea
                            id="reference-video-notes"
                            value={referenceVideoNotes}
                            onChange={(e) => setReferenceVideoNotes(e.target.value)}
                            placeholder="Add notes about this reference video"
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="metadata" className="space-y-6">
                <div>
                  <Label htmlFor="company-description">About the Company</Label>
                  <Textarea
                    id="company-description"
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    placeholder="Describe the company, products, and brand identity"
                    className="mt-1"
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="guide-description">About the Guide</Label>
                  <Textarea
                    id="guide-description"
                    value={guideDescription}
                    onChange={(e) => setGuideDescription(e.target.value)}
                    placeholder="Overview of what the creator will be filming and the goals of the content"
                    className="mt-1"
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="filming-instructions">Filming Instructions</Label>
                  <Textarea
                    id="filming-instructions"
                    value={filmingInstructions}
                    onChange={(e) => setFilmingInstructions(e.target.value)}
                    placeholder="Detailed technical and performance guidance for filming"
                    className="mt-1"
                    rows={5}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            variant="outline"
            className="mr-2"
            onClick={() => router.push(`/app/powerbrief/${brandId}/ugc-pipeline`)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title || saving || uploadingVideo}
          >
            {saving || uploadingVideo ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploadingVideo ? 'Uploading Video...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 