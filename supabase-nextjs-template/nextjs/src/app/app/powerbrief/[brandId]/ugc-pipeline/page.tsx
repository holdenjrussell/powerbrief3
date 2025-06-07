'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Alert,
  AlertDescription,
  Textarea,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Input
} from "@/components/ui";
import { Plus, Loader2, Save, Settings2, Sparkles, Bot, Mail, FileText, Eye, CheckCircle, AlertCircle, Video, Mic, BookOpen, Zap, Heart, Coffee, Edit, Package, Users, Upload, X, Bug, Trash2 } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { getBrandById } from '@/lib/services/powerbriefService';
import { 
  getUgcCreators, 
  createUgcCreator, 
  getUgcCreatorScriptsByConceptStatus,
  getBrandUgcFields,
  updateBrandUgcFields 
} from '@/lib/services/ugcCreatorService';
import { UgcCreator, UgcCreatorScript, UGC_CREATOR_SCRIPT_CONCEPT_STATUSES, UGC_CREATOR_ONBOARDING_STATUSES } from '@/lib/types/ugcCreator';
import { CreatorCard, ScriptCard, CreatorForm } from '@/components/ugc-creator';
import UgcAiCoordinatorPanel from '@/components/ugc-coordinator/UgcAiCoordinatorPanel';
import EmailTemplateGenerator from '@/components/ugc/EmailTemplateGenerator';
import AiChatAssistant from '@/components/ugc/AiChatAssistant';
import { Brand } from '@/lib/types/powerbrief';
import { useRouter } from 'next/navigation';
import { Badge } from "@/components/ui";

// Helper to unwrap params safely
type ParamsType = { brandId: string };

export default function UgcPipelinePage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const { user } = useAuth();
  const router = useRouter();
  
  // Handle params unwrapping for React 19+ compatibility
  const [brandId, setBrandId] = useState<string>('');
  const [paramsPending, setParamsPending] = useState(true);
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [creators, setCreators] = useState<UgcCreator[]>([]);
  const [scripts, setScripts] = useState<UgcCreatorScript[]>([]);
  const [activeView, setActiveView] = useState<'concept' | 'script' | 'creator' | 'settings' | 'ai-agent' | 'inbox' | 'templates'>('concept');
  const [activeStatus, setActiveStatus] = useState<string>(UGC_CREATOR_SCRIPT_CONCEPT_STATUSES[0]);
  
  // Dialog state
  const [showNewCreatorDialog, setShowNewCreatorDialog] = useState(false);
  const [creatingCreator, setCreatingCreator] = useState(false);
  
  // Script creation state variables (from working version)
  const [title, setTitle] = useState<string>('');
  const [scriptContent, setScriptContent] = useState({
    scene_start: '',
    segments: [{ segment: 'Initial Approach', script: '', visuals: '' }],
    scene_end: ''
  });
  const [bRollShotList, setBRollShotList] = useState<string[]>([]);
  const [aiCustomPrompt, setAiCustomPrompt] = useState<string>('');
  const [systemInstructions, setSystemInstructions] = useState<string>('');
  const [hookType, setHookType] = useState<string>('verbal');
  const [hookCount, setHookCount] = useState<number>(1);
  const [hookBody, setHookBody] = useState<string>('');
  const [cta, setCta] = useState<string>('');
  const [generatingScript, setGeneratingScript] = useState<boolean>(false);
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string>('');
  const [uploadingVideo, setUploadingVideo] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [creativeStrategist, setCreativeStrategist] = useState<string>('');
  const [referenceVideoNotes, setReferenceVideoNotes] = useState<string>('');
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugPromptData, setDebugPromptData] = useState<string>('');
  const [selectedCreators, setSelectedCreators] = useState<string[]>(['TBD']);
  
  // New creator form state
  const [newCreator, setNewCreator] = useState<Partial<UgcCreator>>({
    name: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    platforms: [],
    content_types: [],
    products: [],
    status: UGC_CREATOR_ONBOARDING_STATUSES[0],
    contract_status: 'Not Signed',
    per_script_fee: 0,
    product_shipped: false,
    product_shipment_status: '',
    contacted_by: user?.email || ''
  });
  
  // Settings state
  const [companyDescription, setCompanyDescription] = useState('');
  const [guideDescription, setGuideDescription] = useState('');
  const [filmingInstructions, setFilmingInstructions] = useState('');
  const [defaultSystemInstructions, setDefaultSystemInstructions] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setBrandId(resolvedParams.brandId);
      setParamsPending(false);
    };
    
    unwrapParams();
  }, [params]);

  useEffect(() => {
    const fetchBrandData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch brand data
        const brandData = await getBrandById(brandId);
        setBrand(brandData);
        
        // Fetch creators
        const creatorData = await getUgcCreators(brandId);
        setCreators(creatorData);
        
        // Fetch scripts based on view and status
        if (activeView === 'concept') {
          const scriptsData = await getUgcCreatorScriptsByConceptStatus(brandId, activeStatus);
          setScripts(scriptsData);
        }
        
        // Fetch UGC brand settings
        try {
          const ugcFields = await getBrandUgcFields(brandId);
          if (ugcFields) {
            setCompanyDescription(ugcFields.ugc_company_description || '');
            setGuideDescription(ugcFields.ugc_guide_description || '');
            setFilmingInstructions(ugcFields.ugc_filming_instructions || '');
            setDefaultSystemInstructions(ugcFields.ugc_default_system_instructions || '');
            
            // Initialize system instructions with default value if not already set
            if (!systemInstructions && ugcFields.ugc_default_system_instructions) {
              setSystemInstructions('');
            }
          }
        } catch (settingsError) {
          console.error('Error fetching UGC settings:', settingsError);
          // Continue anyway, we can still show the UI
        }
      } catch (err: unknown) {
        console.error('Failed to fetch data:', err);
        setError('Failed to fetch data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (brandId) {
    fetchBrandData();
    }
  }, [user?.id, brandId, activeView, activeStatus, systemInstructions]);

  // Don't render anything until params are resolved
  if (paramsPending || !brandId) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Refresh data function for AI coordinator
  const handleRefresh = () => {
    // Trigger a data refresh
    const fetchData = async () => {
      if (!user?.id) return;
      
      try {
        const creatorData = await getUgcCreators(brandId);
        setCreators(creatorData);
        
        if (activeView === 'concept') {
          const scriptsData = await getUgcCreatorScriptsByConceptStatus(brandId, activeStatus);
          setScripts(scriptsData);
        }
      } catch (err) {
        console.error('Failed to refresh data:', err);
      }
    };
    
    fetchData();
  };

  const getScriptCountByConceptStatus = (status: string) => {
    return scripts.filter(script => script.concept_status === status).length;
  };

  const handleCreateCreator = async (creatorData: Partial<UgcCreator>) => {
    if (!brand) return;
    
    try {
      setCreatingCreator(true);
      setError(null);
      
      await createUgcCreator({
        ...creatorData,
        brand_id: brand.id,
        user_id: user?.id || ''
      } as UgcCreator);
      
      // Reset form and close dialog
      setNewCreator({
        name: '',
        email: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip: '',
        country: 'United States',
        platforms: [],
        content_types: [],
        products: [],
        status: UGC_CREATOR_ONBOARDING_STATUSES[0],
        contract_status: 'Not Signed',
        per_script_fee: 0,
        product_shipped: false,
        product_shipment_status: '',
        contacted_by: user?.email || ''
      });
      setShowNewCreatorDialog(false);
      
      // Refresh creators list
      const updatedCreators = await getUgcCreators(brandId);
      setCreators(updatedCreators);
      
    } catch (err: unknown) {
      console.error('Failed to create creator:', err);
      setError('Failed to create creator. Please try again.');
    } finally {
      setCreatingCreator(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user?.id || !brand) return;
    
    try {
      setSavingSettings(true);
      setError(null);
      
      await updateBrandUgcFields(brand.id, {
        ugc_company_description: companyDescription || null,
        ugc_guide_description: guideDescription || null,
        ugc_filming_instructions: filmingInstructions || null,
        ugc_default_system_instructions: defaultSystemInstructions || null
      });
      
      // Show success message or notification
    } catch (err: unknown) {
      console.error('Failed to save UGC settings:', err);
      setError('Failed to save UGC settings. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleViewChange = (view: 'concept' | 'script' | 'creator' | 'settings' | 'ai-agent' | 'inbox' | 'templates') => {
    if (view === 'inbox') {
      // Redirect to the dedicated inbox page
      router.push(`/app/powerbrief/${brandId}/ugc-pipeline/inbox`);
      return;
    }
    
    setActiveView(view);
    if (view === 'concept') {
      setActiveStatus(UGC_CREATOR_SCRIPT_CONCEPT_STATUSES[0]);
    }
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">UGC Creator Pipeline</h1>
          <p className="text-gray-500">Manage your UGC creators and their assignments</p>
        </div>
        
        <Dialog open={showNewCreatorDialog} onOpenChange={setShowNewCreatorDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Creator
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Creator</DialogTitle>
              <DialogDescription>
                Create a new UGC creator to manage their scripts and content.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <CreatorForm
                creator={newCreator as UgcCreator}
                onSubmit={handleCreateCreator}
                isSubmitting={creatingCreator}
                brandId={brandId}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs value={activeView} onValueChange={(v: string) => handleViewChange(v as 'concept' | 'script' | 'creator' | 'settings' | 'ai-agent' | 'inbox' | 'templates')}>
        <TabsList className="mb-4">
          <TabsTrigger value="concept">Concept View</TabsTrigger>
          <TabsTrigger value="script">Script Creation</TabsTrigger>
          <TabsTrigger value="creator">Creator View</TabsTrigger>
          <TabsTrigger value="templates">
            <Sparkles className="h-4 w-4 mr-2" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="ai-agent">
            <Bot className="h-4 w-4 mr-2" />
            AI UGC Agent
          </TabsTrigger>
          <TabsTrigger value="inbox">
            <Mail className="h-4 w-4 mr-2" />
            Creator Inbox
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="concept">
          <Card>
            <CardHeader>
              <CardTitle>Scripts by Status</CardTitle>
              <CardDescription>Manage UGC scripts by their current status in the workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {UGC_CREATOR_SCRIPT_CONCEPT_STATUSES.map((status) => {
                    const count = getScriptCountByConceptStatus(status);
                    return (
                      <Button
                        key={status}
                        variant={activeStatus === status ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setActiveStatus(status)}
                        className="whitespace-nowrap"
                      >
                        {status}
                        {count > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs">
                            {count}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {scripts
                      .filter(script => script.concept_status === activeStatus)
                      .map((script) => (
                      <ScriptCard 
                        key={script.id} 
                        script={script}
                        brandId={brandId}
                          showActionButtons={false}
                          creators={creators}
                      />
                    ))}
                    
                    {scripts.filter(script => script.concept_status === activeStatus).length === 0 && (
                      <div className="col-span-full text-center py-12 text-gray-500">
                        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No scripts found for this status</p>
                        <p className="text-sm">Scripts will appear here as they progress through the workflow</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="script">
          <Card>
            <CardHeader>
              <CardTitle>Create New UGC Script</CardTitle>
              <CardDescription>Create and generate scripts for UGC creators</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="generator" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="generator">AI Generator</TabsTrigger>
                  <TabsTrigger value="script">Script Editor</TabsTrigger>
                  <TabsTrigger value="metadata">Additional Info</TabsTrigger>
                  <TabsTrigger value="system">System Instructions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="generator" className="space-y-6">
                  <div>
                    <Label htmlFor="title">Script Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter script title"
                    />
                  </div>

                  <div>
                    <Label htmlFor="creative-strategist">Creative Strategist</Label>
                    <Input
                      id="creative-strategist"
                      value={creativeStrategist}
                      onChange={(e) => setCreativeStrategist(e.target.value)}
                      placeholder="Enter creative strategist name"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Name of the creative strategist assigned to this script.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="custom-prompt">Custom Prompt (Optional)</Label>
                    <Textarea
                      id="custom-prompt"
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      placeholder="Provide custom instructions for the AI to follow when generating the script"
                      className="h-32"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hook-type">Hook Type</Label>
                      <Select value={hookType} onValueChange={setHookType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="verbal">Verbal</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="hook-count">Number of Hooks</Label>
                      <Select value={hookCount.toString()} onValueChange={(value) => setHookCount(Number(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="reference-video">Reference Video (Optional)</Label>
                    <div className="mt-2">
                      {!referenceVideo ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              onClick={() => videoInputRef.current?.click()}
                              disabled={uploadingVideo}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Reference Video
                            </Button>
                            <input
                              ref={videoInputRef}
                              type="file"
                              accept="video/*"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </div>
                          <p className="mt-2 text-sm text-gray-500">
                            Upload a video for AI analysis and script inspiration
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Upload className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{referenceVideo.name}</p>
                                <p className="text-sm text-gray-500">
                                  {(referenceVideo.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRemoveVideo}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {referenceVideoUrl && (
                            <div className="space-y-4">
                              <video
                                src={referenceVideoUrl}
                                controls
                                className="w-full max-w-md mx-auto rounded-lg"
                              />
                              
                              <div>
                                <Label htmlFor="video-notes">Video Notes</Label>
                                <Textarea
                                  id="video-notes"
                                  value={referenceVideoNotes}
                                  onChange={(e) => setReferenceVideoNotes(e.target.value)}
                                  placeholder="Add notes about what aspects of this video should be referenced..."
                                  className="mt-1"
                                  rows={3}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={handleGenerateScript}
                      disabled={generatingScript}
                      className="flex-1"
                    >
                      {generatingScript ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate AI Script
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleShowDebugPrompt}
                    >
                      <Bug className="mr-2 h-4 w-4" />
                      Debug
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="script" className="space-y-6">
                  <div>
                    <Label>Scene Start</Label>
                    <Textarea
                      value={scriptContent.scene_start}
                      onChange={(e) => setScriptContent(prev => ({ ...prev, scene_start: e.target.value }))}
                      placeholder="Describe how the video starts..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Label>Script Segments</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddSegment}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Segment
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {scriptContent.segments?.map((segment, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <Input
                              value={segment.segment}
                              onChange={(e) => handleUpdateSegment(index, 'segment', e.target.value)}
                              placeholder="Segment name"
                              className="flex-1 mr-4"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveSegment(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Script</Label>
                              <Textarea
                                value={segment.script}
                                onChange={(e) => handleUpdateSegment(index, 'script', e.target.value)}
                                placeholder="What the creator says..."
                                className="mt-1"
                                rows={4}
                              />
                            </div>
                            
                            <div>
                              <Label>Visuals</Label>
                              <Textarea
                                value={segment.visuals}
                                onChange={(e) => handleUpdateSegment(index, 'visuals', e.target.value)}
                                placeholder="What the creator shows/does..."
                                className="mt-1"
                                rows={4}
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Scene End</Label>
                    <Textarea
                      value={scriptContent.scene_end}
                      onChange={(e) => setScriptContent(prev => ({ ...prev, scene_end: e.target.value }))}
                      placeholder="Describe how the video ends..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Hook Body</Label>
                    <Textarea
                      value={hookBody}
                      onChange={(e) => setHookBody(e.target.value)}
                      placeholder="The main hook content..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Call to Action</Label>
                    <Textarea
                      value={cta}
                      onChange={(e) => setCta(e.target.value)}
                      placeholder="What action should viewers take?"
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Label>B-Roll Shot List</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddBRollShot}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Shot
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {bRollShotList.map((shot, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input
                            value={shot}
                            onChange={(e) => handleUpdateBRollShot(index, e.target.value)}
                            placeholder="Describe the B-roll shot..."
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveBRollShot(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="metadata" className="space-y-6">
                  <div>
                    <Label>Selected Creators</Label>
                    <div className="mt-2 space-y-2">
                      {creators.length > 0 ? (
                        <>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Button
                              variant={selectedCreators.includes('TBD') ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleCreatorSelection('TBD')}
                            >
                              TBD
                            </Button>
                            {creators.map((creator) => (
                              <Button
                                key={creator.id}
                                variant={selectedCreators.includes(creator.id) ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleCreatorSelection(creator.id)}
                              >
                                {creator.name || creator.email}
                              </Button>
                            ))}
                          </div>
                          
                          {selectedCreators.length > 0 && (
                            <div className="text-sm text-gray-600">
                              Selected: {selectedCreators.map(id => {
                                if (id === 'TBD') return 'TBD';
                                const creator = creators.find(c => c.id === id);
                                return creator?.name || creator?.email;
                              }).join(', ')}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-500">No creators available. Create some creators first.</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="system" className="space-y-6">
                  <div>
                    <Label htmlFor="system-instructions">AI System Instructions</Label>
                    <Textarea
                      id="system-instructions"
                      value={systemInstructions}
                      onChange={(e) => setSystemInstructions(e.target.value)}
                      placeholder={defaultSystemInstructions || "Enter system instructions for AI script generation..."}
                      className="mt-1"
                      rows={8}
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        These instructions will be used by the AI when generating scripts.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSystemInstructions(defaultSystemInstructions)}
                        disabled={!defaultSystemInstructions}
                      >
                        Use Default
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="company-description">About the Company</Label>
                    <Textarea
                      id="company-description"
                      value={companyDescription}
                      onChange={(e) => setCompanyDescription(e.target.value)}
                      placeholder="Describe your company, products, and brand identity"
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
                      rows={6}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end mt-6 pt-6 border-t">
                <Button
                  onClick={handleSubmitScript}
                  disabled={saving || !title || selectedCreators.length === 0}
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Script
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="creator">
          <Card>
            <CardHeader>
              <CardTitle>Creator Management</CardTitle>
              <CardDescription>View and manage all UGC creators in your pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : (
              <div className="space-y-6">
                  {/* Creator Filter/Sort Options */}
                  <div className="flex space-x-4 mb-6">
                    <Select>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {UGC_CREATOR_ONBOARDING_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                        {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="name">Name A-Z</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Creators Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {creators.map((creator) => (
                      <CreatorCard
                        key={creator.id}
                        creator={creator}
                        brandId={brandId}
                        onUpdate={(updatedCreator) => {
                          // Update the creator in the list
                          setCreators(prev => 
                            prev.map(c => c.id === updatedCreator.id ? updatedCreator : c)
                          );
                        }}
                      />
                    ))}
                    
                    {creators.length === 0 && (
                      <div className="col-span-full text-center py-12 text-gray-500">
                        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No creators found</p>
                        <p className="text-sm">Add creators to start building your UGC pipeline</p>
                  </div>
                )}
              </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          {brand && (
            <EmailTemplateGenerator 
              brandId={brand.id}
              brandName={brand.name}
            />
          )}
        </TabsContent>

        <TabsContent value="ai-agent">
          {brand && (
            <UgcAiCoordinatorPanel 
              brand={brand} 
              creators={creators} 
              onRefresh={handleRefresh} 
            />
          )}
        </TabsContent>
        
        <TabsContent value="inbox">
          {/* This will redirect to inbox page, so content won't be shown */}
          <div className="text-center py-8">
            <p>Redirecting to Creator Inbox...</p>
          </div>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>UGC Pipeline Settings</CardTitle>
              <CardDescription>Configure default settings for your UGC pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label htmlFor="company-description">Default Company Description</Label>
                  <Textarea
                    id="company-description"
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    placeholder="Describe your company, products, and brand identity"
                    className="mt-1"
                    rows={4}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This description will be pre-filled in the &quot;About the Company&quot; section when creating new UGC scripts.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="guide-description">Default Guide Description</Label>
                  <Textarea
                    id="guide-description"
                    value={guideDescription}
                    onChange={(e) => setGuideDescription(e.target.value)}
                    placeholder="Overview of what the creator will be filming and the goals of the content"
                    className="mt-1"
                    rows={4}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This description will be pre-filled in the &quot;About the Guide&quot; section when creating new UGC scripts.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="filming-instructions">Default Filming Instructions</Label>
                  <Textarea
                    id="filming-instructions"
                    value={filmingInstructions}
                    onChange={(e) => setFilmingInstructions(e.target.value)}
                    placeholder="Detailed technical and performance guidance for filming"
                    className="mt-1"
                    rows={5}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    These instructions will be pre-filled in the &quot;Filming Instructions&quot; section when creating new UGC scripts.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="system-instructions">Default System Instructions</Label>
                  <Textarea
                    id="system-instructions"
                    value={defaultSystemInstructions}
                    onChange={(e) => setDefaultSystemInstructions(e.target.value)}
                    placeholder="Instructions for AI script generation specific to your brand"
                    className="mt-1"
                    rows={6}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    These instructions will be used by AI when generating scripts for your brand. Include tone, style, and content preferences.
                  </p>
                </div>
                
                  <Button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                  className="w-full"
                  >
                    {savingSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Settings
                      </>
                    )}
                  </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Floating AI Chat Assistant */}
      {brand && (
        <AiChatAssistant 
          brandId={brand.id}
          brandName={brand.name}
          creators={creators.map(c => ({ id: c.id, name: c.name || c.email || 'Unknown', status: c.status }))}
        />
      )}
    </div>
  );
} 