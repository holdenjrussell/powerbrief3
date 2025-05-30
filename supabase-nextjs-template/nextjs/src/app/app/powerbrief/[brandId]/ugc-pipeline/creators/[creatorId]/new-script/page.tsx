'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Alert,
  AlertDescription,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui";
import { ArrowLeft, Loader2, Save, Sparkles, AlertTriangle, Upload, X, RefreshCw } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { getBrandById } from '@/lib/services/powerbriefService';
import { getUgcCreatorById, createUgcCreatorScript } from '@/lib/services/ugcCreatorService';
import { UgcCreator, UgcCreatorScript, UGC_CREATOR_SCRIPT_STATUSES, ScriptSegment, UgcBrandFields } from '@/lib/types/ugcCreator';
import { Brand } from '@/lib/types/powerbrief';
import { createClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Helper to unwrap params safely
type ParamsType = { brandId: string; creatorId: string };

// Extend Brand type with UGC fields
type UgcBrand = Brand & UgcBrandFields;

// Default script segment
const DEFAULT_SEGMENT: ScriptSegment = {
  segment: 'Initial Approach',
  script: '',
  visuals: ''
};

// Default script content
const DEFAULT_SCRIPT_CONTENT = {
  scene_start: '',
  segments: [DEFAULT_SEGMENT],
  scene_end: ''
};

// Default system instructions - will be loaded from API, this is just a fallback
const DEFAULT_SYSTEM_INSTRUCTIONS = '';

export default function NewScriptPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const { user } = useAuth();
  const router = useRouter();
  const [brand, setBrand] = useState<UgcBrand | null>(null);
  const [creator, setCreator] = useState<UgcCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('script');
  
  // Script data state
  const [title, setTitle] = useState<string>('');
  const [scriptContent, setScriptContent] = useState(DEFAULT_SCRIPT_CONTENT);
  const [status] = useState<string>(UGC_CREATOR_SCRIPT_STATUSES[0]); // Default to first status
  const [bRollShotList, setBRollShotList] = useState<string[]>([]);
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>('');
  const [systemInstructions, setSystemInstructions] = useState<string>(DEFAULT_SYSTEM_INSTRUCTIONS);
  const [loadingSystemInstructions, setLoadingSystemInstructions] = useState<boolean>(false);
  const [hookType, setHookType] = useState<string>('verbal');
  const [hookCount, setHookCount] = useState<number>(1);
  const [hookBody, setHookBody] = useState<string>('');
  const [cta, setCta] = useState<string>('');
  const [companyDescription, setCompanyDescription] = useState<string>('');
  const [guideDescription, setGuideDescription] = useState<string>('');
  const [filmingInstructions, setFilmingInstructions] = useState<string>('');
  const [generatingScript, setGeneratingScript] = useState<boolean>(false);
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string>('');
  const [referenceVideoNotes, setReferenceVideoNotes] = useState<string>('');
  const [uploadingVideo, setUploadingVideo] = useState<boolean>(false);
  const [creativeStrategist, setCreativeStrategist] = useState<string>('');
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Unwrap params using React.use()
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const { brandId, creatorId } = unwrappedParams;

  // Fetch system instructions from the backend
  const fetchSystemInstructions = async () => {
    try {
      setLoadingSystemInstructions(true);
      console.log('Fetching system instructions from API...');
      
      // Fetch the default system instructions from the API
      const response = await fetch('/api/ai/system-instructions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        next: { revalidate: 0 }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch system instructions (HTTP ${response.status})`);
      }
      
      const data = await response.json();
      console.log('Received system instructions:', data);
      
      // Update the state with the fetched instructions
      setSystemInstructions(data.systemInstructions || '');
      console.log('Updated system instructions state');
    } catch (err) {
      console.error('Failed to fetch system instructions:', err);
      // If there's an error, we'll keep the current value
    } finally {
      setLoadingSystemInstructions(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log('Starting to fetch data...');

        // First, try to fetch system instructions from API
        try {
          console.log('Attempting to fetch system instructions first...');
          await fetchSystemInstructions();
          console.log('Successfully fetched system instructions from API');
        } catch (instructionsError) {
          console.error('Failed to fetch system instructions:', instructionsError);
          // Don't fall back yet, wait for brand data
        }
        
        // Then fetch brand and creator data
        const brandData = await getBrandById(brandId);
        setBrand(brandData as UgcBrand);
        console.log('Brand data loaded:', { 
          hasDefaultInstructions: !!brandData.default_video_instructions,
          defaultInstructionsLength: brandData.default_video_instructions?.length || 0 
        });
        
        // Fetch creator data
        const creatorData = await getUgcCreatorById(creatorId);
        setCreator(creatorData);
        console.log('Creator data loaded');
        
        // If we failed to get system instructions from API and brand has default, use that
        if (!systemInstructions && brandData.default_video_instructions) {
          console.log('Using brand default instructions as fallback');
          setSystemInstructions(brandData.default_video_instructions);
        }

        // Load brand UGC defaults if available
        const ugcBrand = brandData as UgcBrand;
        if (ugcBrand.ugc_company_description) {
          setCompanyDescription(ugcBrand.ugc_company_description);
        }
        
        if (ugcBrand.ugc_guide_description) {
          setGuideDescription(ugcBrand.ugc_guide_description);
        }
        
        if (ugcBrand.ugc_filming_instructions) {
          setFilmingInstructions(ugcBrand.ugc_filming_instructions);
        }
        
        if (ugcBrand.ugc_default_system_instructions && !systemInstructions) {
          setSystemInstructions(ugcBrand.ugc_default_system_instructions);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch data:', err);
        setError('Failed to fetch data. Please try again.');
      } finally {
        setLoading(false);
        console.log('Finished loading data');
      }
    };

    fetchData();
  }, [user?.id, brandId, creatorId, systemInstructions]);

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
    if (referenceVideoUrl) {
      URL.revokeObjectURL(referenceVideoUrl);
    }
    setReferenceVideo(null);
    setReferenceVideoUrl('');
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  // Upload video to storage for AI processing
  const uploadVideoForAI = async (file: File): Promise<string> => {
    try {
      setUploadingVideo(true);
      
      // Create Supabase client for direct upload
      const supabase = createClient();
      
      // Generate a unique filename to avoid collisions
      const fileExtension = file.name.split('.').pop();
      const fileName = `temp-videos/${uuidv4()}.${fileExtension}`;
      
      console.log(`Direct uploading video: ${file.name} (${file.size} bytes) to ${fileName}`);
      
      // Direct upload to Supabase Storage (bypasses Next.js API entirely)
      const { data, error } = await supabase.storage
        .from('powerbrief-media')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Direct Supabase upload error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No data returned from upload');
      }
      
      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('powerbrief-media')
        .getPublicUrl(fileName);
      
      if (!publicUrl) {
        throw new Error('No public URL generated for uploaded file');
      }
      
      console.log('Direct video upload successful:', publicUrl);
      return publicUrl;
      
    } catch (error) {
      console.error('Error in direct video upload:', error);
      throw error;
    } finally {
      setUploadingVideo(false);
    }
  };

  // Handle generating script with AI
  const handleGenerateScript = async (): Promise<void> => {
    if (!user?.id || !brand) return;
    
    try {
      setGeneratingScript(true);
      setError(null);
      
      // Format reference video data if it exists
      let referenceVideoData: { url: string; type: string } | undefined;
      if (referenceVideo) {
        // Upload the video first
        const uploadedUrl = await uploadVideoForAI(referenceVideo);
        referenceVideoData = {
          url: uploadedUrl,
          type: referenceVideo.type
        };
      }
      
      // Send generation request to AI endpoint
      const response = await fetch('/api/ai/generate-ugc-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandContext: {
            brand_info_data: brand.brand_info_data || {},
            target_audience_data: brand.target_audience_data || {},
            competition_data: brand.competition_data || {},
            ugc_company_description: brand.ugc_company_description || companyDescription,
            ugc_filming_instructions: brand.ugc_filming_instructions || filmingInstructions
          },
          customPrompt: aiCustomPrompt,
          systemInstructions,
          referenceVideo: referenceVideoData,
          hookOptions: {
            type: hookType,
            count: hookCount
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate script (HTTP ${response.status})`);
      }
      
      const data = await response.json();
      
      // Update state with generated script content
      setScriptContent(data.script_content);
      setBRollShotList(data.b_roll_shot_list || []);
      
      if (data.hook_body) {
        setHookBody(data.hook_body);
      }
      
      if (data.cta) {
        setCta(data.cta);
      }
      
      // Set the AI generated flag to true
      setIsAiGenerated(true);
      
      // Switch to script tab to see the results
      setActiveTab('script');
    } catch (err: unknown) {
      console.error('Failed to generate script:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to generate script: ${errMsg}`);
    } finally {
      setGeneratingScript(false);
    }
  };

  // Handle saving the script
  const handleSaveScript = async () => {
    if (!user?.id || !title) return;
    
    if (!creativeStrategist || creativeStrategist.trim() === '') {
      setError('Please provide a creative strategist for the script.');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Prepare script object with required fields
      const scriptData: Omit<UgcCreatorScript, 'id' | 'created_at' | 'updated_at'> = {
        creator_id: creatorId,
        user_id: user.id,
        brand_id: brandId,
        title,
        script_content: scriptContent,
        status,
        b_roll_shot_list: bRollShotList,
        hook_type: hookType,
        hook_count: hookCount,
        hook_body: hookBody || null,
        cta: cta || null,
        company_description: companyDescription || null,
        guide_description: guideDescription || null,
        filming_instructions: filmingInstructions || null,
        ai_custom_prompt: aiCustomPrompt || null,
        system_instructions: systemInstructions || null,
        media_type: 'video',
        inspiration_video_url: null,
        inspiration_video_notes: null,
        is_ai_generated: isAiGenerated,
        creative_strategist: creativeStrategist || null
      };
      
      // If we have a reference video, upload it and add the URL to the metadata
      if (referenceVideo) {
        const uploadedUrl = await uploadVideoForAI(referenceVideo);
        scriptData.creator_footage = uploadedUrl;
        
        // Use the reference video as the inspiration video
        scriptData.inspiration_video_url = uploadedUrl;
        scriptData.inspiration_video_notes = referenceVideoNotes || null;
      }
      
      // Save script to database
      await createUgcCreatorScript(scriptData);
      
      // Navigate back to creator detail page
      router.push(`/app/powerbrief/${brandId}/ugc-pipeline/creators/${creatorId}`);
    } catch (err: unknown) {
      console.error('Failed to save script:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to save script: ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!brand || !creator) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>Creator or brand not found.</AlertDescription>
        </Alert>
        <Link href={`/app/powerbrief/${brandId}/ugc-pipeline`}>
          <Button className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to UGC Pipeline
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="flex items-center mb-6">
        <Link href={`/app/powerbrief/${brandId}/ugc-pipeline/creators/${creatorId}`} className="mr-4">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">
          New Script for {creator?.name || 'Creator'}
        </h1>
      </div>
      
      {error && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="mb-6">
        <Label htmlFor="title">Script Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a descriptive title for this script"
          className="w-full mt-1"
          aria-label="Script Title"
        />
      </div>
      
      <div className="mb-6">
        <Label htmlFor="creative-strategist">Creative Strategist</Label>
        <Input
          id="creative-strategist"
          value={creativeStrategist}
          onChange={(e) => setCreativeStrategist(e.target.value)}
          placeholder="Enter the name of the creative strategist"
          className="w-full mt-1"
          aria-label="Creative Strategist"
        />
      </div>
      
      <Tabs
        defaultValue="script"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="mb-6">
          <TabsTrigger value="script">Script Content</TabsTrigger>
          <TabsTrigger value="aiSettings">AI Settings</TabsTrigger>
          <TabsTrigger value="companyTab">About the Company</TabsTrigger>
          <TabsTrigger value="guideTab">About this Guide</TabsTrigger>
          <TabsTrigger value="filmingTab">Filming Instructions</TabsTrigger>
          <TabsTrigger value="bRoll">B-Roll Shot List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="script">
          <Card>
            <CardHeader>
              <CardTitle>Script Content</CardTitle>
              <CardDescription>
                Create the script content with scene descriptions, dialogue, and visual instructions
              </CardDescription>
              <div className="mt-2">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    {!referenceVideoUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => videoInputRef.current?.click()}
                        className="flex items-center space-x-2"
                      >
                        <Upload className="h-4 w-4" />
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
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={handleRemoveVideo}
                        >
                          <X className="h-4 w-4 mr-1" />
                          <span>Remove Video</span>
                        </Button>
                        <span className="text-sm text-gray-500 truncate max-w-[200px]">
                          {referenceVideo?.name}
                        </span>
                      </div>
                    )}
                  
                    <Button
                      onClick={handleGenerateScript}
                      disabled={generatingScript || !title || uploadingVideo}
                      variant="outline"
                    >
                      {generatingScript || uploadingVideo ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {uploadingVideo ? 'Uploading Video...' : 'Generating...'}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Script
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {referenceVideoUrl && (
                    <div className="max-w-lg">
                      <Label>Reference Video Preview</Label>
                      <video 
                        src={referenceVideoUrl} 
                        controls 
                        className="w-full h-auto rounded-md mt-1"
                      />
                      <div className="mt-4">
                        <Label htmlFor="reference-video-notes">Reference Video Notes (shown on public view)</Label>
                        <textarea
                          id="reference-video-notes"
                          value={referenceVideoNotes}
                          onChange={(e) => setReferenceVideoNotes(e.target.value)}
                          placeholder="Add notes about this reference video that the creator should know. These notes will appear below the video in italics."
                          className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                          rows={3}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="scene-start">Scene Start</Label>
                  <textarea
                    id="scene-start"
                    value={scriptContent.scene_start || ''}
                    onChange={(e) => setScriptContent(prev => ({ ...prev, scene_start: e.target.value }))}
                    placeholder="Describe how the scene starts"
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
                
                {scriptContent.segments?.map((segment, index) => (
                  <Card key={index} className="border p-4">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="font-medium">Segment {index + 1}</Label>
                      <Button
                        onClick={() => handleRemoveSegment(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                        disabled={scriptContent.segments?.length === 1}
                      >
                        Remove
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`segment-name-${index}`}>Segment Name</Label>
                        <Input
                          id={`segment-name-${index}`}
                          value={segment.segment || ''}
                          onChange={(e) => handleUpdateSegment(index, 'segment', e.target.value)}
                          placeholder="Name this segment"
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`script-${index}`}>Dialogue / Action</Label>
                        <textarea
                          id={`script-${index}`}
                          value={segment.script || ''}
                          onChange={(e) => handleUpdateSegment(index, 'script', e.target.value)}
                          placeholder="Enter dialogue or describe actions"
                          className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                          rows={3}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`visuals-${index}`}>Visuals / Filming Instructions</Label>
                        <textarea
                          id={`visuals-${index}`}
                          value={segment.visuals || ''}
                          onChange={(e) => handleUpdateSegment(index, 'visuals', e.target.value)}
                          placeholder="Describe visuals or filming instructions"
                          className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                          rows={3}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
                
                <Button
                  onClick={handleAddSegment}
                  variant="outline"
                  className="w-full mt-2"
                >
                  Add Segment
                </Button>
                
                <div>
                  <Label htmlFor="scene-end">Scene End</Label>
                  <textarea
                    id="scene-end"
                    value={scriptContent.scene_end || ''}
                    onChange={(e) => setScriptContent(prev => ({ ...prev, scene_end: e.target.value }))}
                    placeholder="Describe how the scene ends"
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="aiSettings">
          <Card>
            <CardHeader>
              <CardTitle>AI Script Generation Settings</CardTitle>
              <CardDescription>
                Configure settings for AI-generated scripts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="hook-type">Hook Type</Label>
                  <select
                    id="hook-type"
                    value={hookType}
                    onChange={(e) => setHookType(e.target.value)}
                    className="block w-full mt-1 p-2 border border-gray-300 rounded-md"
                    aria-label="Select hook type"
                    title="Hook type"
                  >
                    <option value="verbal">Verbal</option>
                    <option value="visual">Visual</option>
                    <option value="both">Both Verbal & Visual</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="hook-count">Number of Hooks</Label>
                  <Input
                    id="hook-count"
                    type="number"
                    min={1}
                    max={5}
                    value={hookCount}
                    onChange={(e) => setHookCount(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="hook-body">Hook Body Text</Label>
                  <textarea
                    id="hook-body"
                    value={hookBody}
                    onChange={(e) => setHookBody(e.target.value)}
                    placeholder="Main body message that follows the hook"
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="cta-text">Call to Action (CTA)</Label>
                  <textarea
                    id="cta-text"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="Call to action for the end of the video"
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="system-instructions">System Instructions</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchSystemInstructions}
                      disabled={loadingSystemInstructions}
                      title="Restore default system instructions from backend"
                    >
                      <RefreshCw className={`h-4 w-4 ${loadingSystemInstructions ? 'animate-spin' : ''}`} />
                      <span className="ml-1 text-xs">Reset to Default</span>
                    </Button>
                  </div>
                  <textarea
                    id="system-instructions"
                    value={systemInstructions}
                    onChange={(e) => setSystemInstructions(e.target.value)}
                    placeholder="Enter system instructions for the AI"
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md font-mono text-sm"
                    rows={10}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    These instructions define how the AI generates the script. Modifications will affect the output quality and format.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="ai-custom-prompt">Custom AI Prompt</Label>
                  <textarea
                    id="ai-custom-prompt"
                    value={aiCustomPrompt}
                    onChange={(e) => setAiCustomPrompt(e.target.value)}
                    placeholder="Enter custom prompt to guide the AI"
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    rows={5}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="companyTab">
          <Card>
            <CardHeader>
              <CardTitle>About the Company</CardTitle>
              <CardDescription>
                Provide information about the company, products, and brand for the creator
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company-description">Company Description</Label>
                  <textarea
                    id="company-description"
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    placeholder="Describe the company, its products, and key selling points"
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    rows={10}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="guideTab">
          <Card>
            <CardHeader>
              <CardTitle>About this Guide</CardTitle>
              <CardDescription>
                Explain the purpose of this guide and what the creator will be filming
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="guide-description">Guide Description</Label>
                  <textarea
                    id="guide-description"
                    value={guideDescription}
                    onChange={(e) => setGuideDescription(e.target.value)}
                    placeholder="Explain what this guide is for and what the creator will be filming"
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    rows={10}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="filmingTab">
          <Card>
            <CardHeader>
              <CardTitle>Filming Instructions</CardTitle>
              <CardDescription>
                Provide detailed instructions for filming, including technical requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="filming-instructions">Filming Instructions</Label>
                  <textarea
                    id="filming-instructions"
                    value={filmingInstructions}
                    onChange={(e) => setFilmingInstructions(e.target.value)}
                    placeholder="Provide technical requirements, video specifications, audio guidelines, etc."
                    className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                    rows={10}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="bRoll">
          <Card>
            <CardHeader>
              <CardTitle>B-Roll Shot List</CardTitle>
              <CardDescription>
                Add instructions for supplementary footage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bRollShotList.map((shot, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={shot}
                      onChange={(e) => handleUpdateBRollShot(index, e.target.value)}
                      placeholder={`B-Roll Shot ${index + 1}`}
                      className="flex-grow"
                      aria-label={`B-Roll Shot ${index + 1}`}
                    />
                    <Button
                      onClick={() => handleRemoveBRollShot(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                
                <Button
                  onClick={handleAddBRollShot}
                  variant="outline"
                  className="w-full mt-2"
                >
                  Add B-Roll Shot
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSaveScript}
          disabled={saving || !title || !creativeStrategist || creativeStrategist.trim() === ''}
          className="ml-auto"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Script
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 