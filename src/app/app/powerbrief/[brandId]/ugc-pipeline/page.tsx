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
  Badge,
  Input
} from "@/components/ui";
import { Plus, Loader2, Save, Settings2, X, Sparkles, Upload, Bot, Mail, Edit, Users, Zap, FileText, Inbox } from "lucide-react";
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
import AdvancedEmailInbox from '@/components/ugc/AdvancedEmailInbox';
import { Brand } from '@/lib/types/powerbrief';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  const [activeView, setActiveView] = useState<'concept' | 'script' | 'creator' | 'settings' | 'ai-agent' | 'inbox' | 'templates' | 'workflow'>('concept');
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
    try {
      setCreatingCreator(true);
      const newCreatorWithBrand = {
        ...creatorData,
        brand_id: brandId,
      };
      
      const created = await createUgcCreator(newCreatorWithBrand);
      
      setCreators(prev => [...prev, created]);
      setShowNewCreatorDialog(false);
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
    } catch (err) {
      console.error('Error creating creator:', err);
      setError('Failed to create creator. Please try again.');
    } finally {
      setCreatingCreator(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      
      await updateBrandUgcFields(brandId, {
        ugc_company_description: companyDescription,
        ugc_guide_description: guideDescription,
        ugc_filming_instructions: filmingInstructions,
        ugc_default_system_instructions: defaultSystemInstructions
      });
      
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleViewChange = (view: 'concept' | 'script' | 'creator' | 'settings' | 'ai-agent' | 'inbox' | 'templates' | 'workflow') => {
    setActiveView(view);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReferenceVideo(file);
      
      // Optionally create a URL for local preview
      setReferenceVideoUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveVideo = () => {
    setReferenceVideo(null);
    setReferenceVideoUrl('');
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">UGC Creator Pipeline</h1>
          <p className="text-gray-600">{brand?.name}</p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={showNewCreatorDialog} onOpenChange={setShowNewCreatorDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Creator
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Add New UGC Creator</DialogTitle>
                <DialogDescription>
                  Fill in the details to add a new creator to your pipeline
                </DialogDescription>
              </DialogHeader>
              <CreatorForm 
                creator={newCreator}
                onUpdate={setNewCreator}
                onSave={handleCreateCreator}
                isSaving={creatingCreator}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeView} onValueChange={(v) => handleViewChange(v as any)}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="concept" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Concepts
          </TabsTrigger>
          <TabsTrigger value="script" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Scripts
          </TabsTrigger>
          <TabsTrigger value="creator" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Creators
          </TabsTrigger>
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Workflow
          </TabsTrigger>
          <TabsTrigger value="ai-agent" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Agent
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="concept">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>UGC Concepts</CardTitle>
                  <CardDescription>Manage and track concepts from idea to script</CardDescription>
                </div>
                <Select value={activeStatus} onValueChange={setActiveStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UGC_CREATOR_SCRIPT_CONCEPT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status} ({getScriptCountByConceptStatus(status)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : (
                <div className="space-y-6">
                  {scripts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {scripts.map((script) => (
                        <div key={script.id} className="relative">
                          <ScriptCard script={script} brandId={brandId} />
                          <div className="absolute top-2 right-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => router.push(`/app/powerbrief/${brandId}/ugc-pipeline/scripts/${script.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No {activeStatus.toLowerCase()} concepts found</p>
                      <p className="text-sm">Create scripts and concepts will appear here</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="script">
          <Card>
            <CardHeader>
              <CardTitle>Script Creation Tool</CardTitle>
              <CardDescription>Create and manage UGC scripts with advanced features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Tabs defaultValue="generator" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="generator">Script Generator</TabsTrigger>
                    <TabsTrigger value="templates">Templates</TabsTrigger>
                    <TabsTrigger value="instructions">Instructions</TabsTrigger>
                    <TabsTrigger value="review">Review</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="generator" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="script-title">Script Title</Label>
                        <Input id="script-title" placeholder="Enter script title..." />
                      </div>
                      <div>
                        <Label htmlFor="creator-select">Assign to Creator</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select creator" />
                          </SelectTrigger>
                          <SelectContent>
                            {creators.map((creator) => (
                              <SelectItem key={creator.id} value={creator.id}>
                                {creator.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="script-description">Script Description</Label>
                      <Textarea 
                        id="script-description" 
                        placeholder="Describe what this script should accomplish..."
                        rows={4}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate with AI
                      </Button>
                      <Button variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Manually
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="templates" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Template cards would go here */}
                      <Card className="p-4">
                        <h3 className="font-medium mb-2">Product Unboxing</h3>
                        <p className="text-sm text-gray-600 mb-3">Standard unboxing script template</p>
                        <Button size="sm" variant="outline" className="w-full">Use Template</Button>
                      </Card>
                      <Card className="p-4">
                        <h3 className="font-medium mb-2">Before & After</h3>
                        <p className="text-sm text-gray-600 mb-3">Transformation showcase template</p>
                        <Button size="sm" variant="outline" className="w-full">Use Template</Button>
                      </Card>
                      <Card className="p-4">
                        <h3 className="font-medium mb-2">Tutorial Style</h3>
                        <p className="text-sm text-gray-600 mb-3">Educational content template</p>
                        <Button size="sm" variant="outline" className="w-full">Use Template</Button>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="instructions" className="space-y-4">
                    <div>
                      <Label htmlFor="filming-notes">Filming Instructions</Label>
                      <Textarea 
                        id="filming-notes" 
                        placeholder="Specific filming instructions for this script..."
                        rows={6}
                        value={filmingInstructions}
                        onChange={(e) => setFilmingInstructions(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="additional-notes">Additional Notes</Label>
                      <Textarea 
                        id="additional-notes" 
                        placeholder="Any additional notes or requirements..."
                        rows={4}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="review" className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium mb-2">Script Preview</h3>
                      <p className="text-sm text-gray-600">Review your script before sending to creator</p>
                      <div className="mt-4 space-y-2">
                        <Button>Send to Creator</Button>
                        <Button variant="outline">Save as Draft</Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
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
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
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

        <TabsContent value="inbox">
          {brand && (
            <AdvancedEmailInbox 
              brandId={brand.id}
              brandName={brand.name}
            />
          )}
        </TabsContent>

        <TabsContent value="templates">
          {brand && (
            <EmailTemplateGenerator 
              brandId={brand.id}
              brandName={brand.name}
            />
          )}
        </TabsContent>

        <TabsContent value="workflow">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Automation</CardTitle>
              <CardDescription>Configure automated workflows for creator onboarding and management</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Set up automated actions and status updates for your UGC creators.
                  </p>
                  <Link href={`/app/powerbrief/${brandId}/ugc-pipeline/workflow-builder`}>
                    <Button>
                      <Zap className="h-4 w-4 mr-2" />
                      Open Workflow Builder
                    </Button>
                  </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <h3 className="font-medium mb-2">Creator Onboarding</h3>
                    <p className="text-sm text-gray-600 mb-3">Automatically guide new creators through setup</p>
                    <Badge variant="outline">Active</Badge>
                  </Card>
                  <Card className="p-4">
                    <h3 className="font-medium mb-2">Script Assignment</h3>
                    <p className="text-sm text-gray-600 mb-3">Auto-assign scripts based on creator preferences</p>
                    <Badge variant="secondary">Inactive</Badge>
                  </Card>
                  <Card className="p-4">
                    <h3 className="font-medium mb-2">Payment Processing</h3>
                    <p className="text-sm text-gray-600 mb-3">Handle creator payments automatically</p>
                    <Badge variant="outline">Active</Badge>
                  </Card>
                </div>
              </div>
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
                    This description will be pre-filled in the "About the Company" section when creating new UGC scripts.
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
                    This description will be pre-filled in the "About the Guide" section when creating new UGC scripts.
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
                    These instructions will be pre-filled in the "Filming Instructions" section when creating new UGC scripts.
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