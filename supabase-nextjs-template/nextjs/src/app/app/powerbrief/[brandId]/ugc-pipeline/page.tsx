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
  SelectValue
} from "@/components/ui";
import { Plus, Loader2, Save, Settings2, X, Sparkles, Upload, Bot, Mail } from "lucide-react";
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
import { Brand } from '@/lib/types/powerbrief';
import { useRouter } from 'next/navigation';

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
  const [activeView, setActiveView] = useState<'concept' | 'script' | 'creator' | 'settings' | 'ai-agent' | 'inbox'>('concept');
  const [activeStatus, setActiveStatus] = useState<string>(UGC_CREATOR_SCRIPT_CONCEPT_STATUSES[0]);
  
  // Dialog state
  const [showNewCreatorDialog, setShowNewCreatorDialog] = useState(false);
  const [creatingCreator, setCreatingCreator] = useState(false);
  
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
  const [systemInstructions, setSystemInstructions] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  
  // Reference video state
  const [referenceVideo, setReferenceVideo] = useState<File | null>(null);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string>('');
  const [referenceVideoNotes, setReferenceVideoNotes] = useState<string>('');
  const videoInputRef = useRef<HTMLInputElement>(null);

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

  const handleViewChange = (view: 'concept' | 'script' | 'creator' | 'settings' | 'ai-agent' | 'inbox') => {
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
      
      <Tabs value={activeView} onValueChange={(v: string) => handleViewChange(v as 'concept' | 'script' | 'creator' | 'settings' | 'ai-agent' | 'inbox')}>
        <TabsList className="mb-4">
          <TabsTrigger value="concept">Concept View</TabsTrigger>
          <TabsTrigger value="script">Script Creation</TabsTrigger>
          <TabsTrigger value="creator">Creator View</TabsTrigger>
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
              <CardTitle>Script Creation Workspace</CardTitle>
              <CardDescription>Create and manage UGC scripts for your creators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Creator System Instructions */}
                <div>
                  <Label htmlFor="system-instructions">Creator System Instructions</Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Provide specific instructions that will guide the AI when creating scripts for this brand.
                  </p>
                  <Textarea
                    id="system-instructions"
                    value={systemInstructions}
                    onChange={(e) => setSystemInstructions(e.target.value)}
                    placeholder={defaultSystemInstructions || "Enter system instructions for script generation..."}
                    className="mt-1"
                    rows={6}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      These instructions will be combined with the default brand instructions when generating scripts.
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

                {/* Reference Video Upload */}
                <div className="border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium">Reference Video</h3>
                      <p className="text-sm text-gray-600">Upload a reference video to guide content creation</p>
                    </div>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="hidden"
                      title="Upload reference video"
                    />
                    <Button
                      variant="outline"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={!!referenceVideo}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Video
                    </Button>
                  </div>
                  
                  {referenceVideo ? (
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
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No reference video uploaded</p>
                      <p className="text-sm">Upload a video to provide visual guidance for script creation</p>
                    </div>
                  )}
                </div>

                {/* Company Description */}
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
                    rows={5}
                  />
                </div>
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
    </div>
  );
} 