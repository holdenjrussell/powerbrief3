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
import { Plus, Loader2, Save, Settings2, X, Sparkles, Upload, Bot, Mail, Edit, Users, Zap, FileText, Inbox, Eye, CheckCircle, AlertCircle, Video, Mic, BookOpen, Package, Heart, Coffee } from "lucide-react";
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
              <CardDescription>Create and manage UGC scripts with AI assistance, templates, and detailed instructions</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="generator" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="generator" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Generator
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="instructions" className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    Instructions
                  </TabsTrigger>
                  <TabsTrigger value="review" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Review
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="generator" className="mt-6">
                  <div className="space-y-6">
                    {/* AI Script Generator */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border">
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        AI-Powered Script Generation
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Generate engaging UGC scripts using AI with creator assignment and custom prompts.
                      </p>
                      
                      {creators.length > 0 ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="creator-select">Select Creator</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a creator" />
                                </SelectTrigger>
                                <SelectContent>
                                  {creators.map((creator) => (
                                    <SelectItem key={creator.id} value={creator.id}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        {creator.name || creator.email}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label htmlFor="script-type">Script Type</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select script type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unboxing">Product Unboxing</SelectItem>
                                  <SelectItem value="before-after">Before & After</SelectItem>
                                  <SelectItem value="tutorial">Tutorial Style</SelectItem>
                                  <SelectItem value="testimonial">Testimonial</SelectItem>
                                  <SelectItem value="lifestyle">Lifestyle Integration</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor="custom-prompt">Custom AI Prompt</Label>
                            <Textarea
                              id="custom-prompt"
                              placeholder="Enter specific instructions for the AI to customize the script generation..."
                              rows={3}
                            />
                          </div>
                          
                          <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate AI Script
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                          <p className="text-gray-600 mb-4">No creators available</p>
                          <Button onClick={() => setShowNewCreatorDialog(true)} variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Creator First
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Manual Script Creation */}
                    <div className="border rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-2">Manual Script Creation</h3>
                      <p className="text-gray-600 mb-4">Create a script manually with full control over content and structure.</p>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            if (creators.length > 0) {
                              router.push(`/app/powerbrief/${brandId}/ugc-pipeline/creators/${creators[0].id}/new-script`);
                            }
                          }}
                          disabled={creators.length === 0}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Create Manual Script
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="templates" className="mt-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Pre-Built Script Templates</h3>
                      <p className="text-gray-600 mb-6">Choose from professionally crafted templates to jumpstart your script creation.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-blue-200 hover:border-blue-400">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <Package className="h-8 w-8 text-blue-600" />
                          </div>
                          <h4 className="font-semibold mb-2">Product Unboxing</h4>
                          <p className="text-sm text-gray-600 mb-4">
                            Perfect for showcasing product packaging, first impressions, and initial reactions.
                          </p>
                          <Badge variant="outline" className="mb-3">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Enhanced
                          </Badge>
                          <div className="space-y-2">
                            <Button size="sm" className="w-full">Use Template</Button>
                            <Button size="sm" variant="outline" className="w-full">Preview</Button>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-green-200 hover:border-green-400">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <Zap className="h-8 w-8 text-green-600" />
                          </div>
                          <h4 className="font-semibold mb-2">Before & After</h4>
                          <p className="text-sm text-gray-600 mb-4">
                            Demonstrate transformation and results with compelling before/after storytelling.
                          </p>
                          <Badge variant="outline" className="mb-3">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Enhanced
                          </Badge>
                          <div className="space-y-2">
                            <Button size="sm" className="w-full">Use Template</Button>
                            <Button size="sm" variant="outline" className="w-full">Preview</Button>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-purple-200 hover:border-purple-400">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="h-8 w-8 text-purple-600" />
                          </div>
                          <h4 className="font-semibold mb-2">Tutorial Style</h4>
                          <p className="text-sm text-gray-600 mb-4">
                            Educational content and step-by-step how-to guides for product usage.
                          </p>
                          <Badge variant="outline" className="mb-3">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Enhanced
                          </Badge>
                          <div className="space-y-2">
                            <Button size="sm" className="w-full">Use Template</Button>
                            <Button size="sm" variant="outline" className="w-full">Preview</Button>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-orange-200 hover:border-orange-400">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <Heart className="h-8 w-8 text-orange-600" />
                          </div>
                          <h4 className="font-semibold mb-2">Testimonial</h4>
                          <p className="text-sm text-gray-600 mb-4">
                            Authentic customer experiences and product testimonials that build trust.
                          </p>
                          <Badge variant="outline" className="mb-3">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Enhanced
                          </Badge>
                          <div className="space-y-2">
                            <Button size="sm" className="w-full">Use Template</Button>
                            <Button size="sm" variant="outline" className="w-full">Preview</Button>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-pink-200 hover:border-pink-400">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-pink-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <Coffee className="h-8 w-8 text-pink-600" />
                          </div>
                          <h4 className="font-semibold mb-2">Lifestyle Integration</h4>
                          <p className="text-sm text-gray-600 mb-4">
                            Show how the product fits naturally into daily life and routines.
                          </p>
                          <Badge variant="outline" className="mb-3">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Enhanced
                          </Badge>
                          <div className="space-y-2">
                            <Button size="sm" className="w-full">Use Template</Button>
                            <Button size="sm" variant="outline" className="w-full">Preview</Button>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-gray-200 hover:border-gray-400">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <Plus className="h-8 w-8 text-gray-600" />
                          </div>
                          <h4 className="font-semibold mb-2">Custom Template</h4>
                          <p className="text-sm text-gray-600 mb-4">
                            Create your own template from scratch with full customization.
                          </p>
                          <Badge variant="secondary" className="mb-3">
                            Custom
                          </Badge>
                          <div className="space-y-2">
                            <Button size="sm" variant="outline" className="w-full">Create Template</Button>
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="instructions" className="mt-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Filming Instructions & Guidelines</h3>
                      <p className="text-gray-600 mb-6">Set up comprehensive filming instructions and additional notes for creators.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <Video className="h-5 w-5 text-blue-600" />
                          Technical Specifications
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="video-quality">Video Quality</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select quality" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1080p">1080p HD</SelectItem>
                                <SelectItem value="4k">4K Ultra HD</SelectItem>
                                <SelectItem value="720p">720p HD</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="frame-rate">Frame Rate</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frame rate" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30fps">30 FPS</SelectItem>
                                <SelectItem value="60fps">60 FPS</SelectItem>
                                <SelectItem value="24fps">24 FPS</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label htmlFor="orientation">Video Orientation</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select orientation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="vertical">Vertical (9:16)</SelectItem>
                                <SelectItem value="horizontal">Horizontal (16:9)</SelectItem>
                                <SelectItem value="square">Square (1:1)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </Card>
                      
                      <Card className="p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <Mic className="h-5 w-5 text-green-600" />
                          Audio Guidelines
                        </h4>
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" id="clear-audio" className="rounded" />
                            <Label htmlFor="clear-audio">Clear, crisp audio quality</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" id="no-background-noise" className="rounded" />
                            <Label htmlFor="no-background-noise">Minimal background noise</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" id="voice-over" className="rounded" />
                            <Label htmlFor="voice-over">Natural voice-over preferred</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input type="checkbox" id="music" className="rounded" />
                            <Label htmlFor="music">Background music allowed</Label>
                          </div>
                        </div>
                      </Card>
                    </div>
                    
                    <Card className="p-6">
                      <h4 className="font-semibold mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        Additional Instructions
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="brand-guidelines">Brand Guidelines</Label>
                          <Textarea
                            id="brand-guidelines"
                            placeholder="Enter specific brand guidelines and requirements..."
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="do-donts">Do's and Don'ts</Label>
                          <Textarea
                            id="do-donts"
                            placeholder="List what creators should and shouldn't do..."
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="special-notes">Special Notes</Label>
                          <Textarea
                            id="special-notes"
                            placeholder="Any additional notes or special requirements..."
                            rows={3}
                          />
                        </div>
                      </div>
                    </Card>
                    
                    <div className="flex justify-end">
                      <Button>
                        <Save className="h-4 w-4 mr-2" />
                        Save Instructions
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="review" className="mt-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Script Preview & Review</h3>
                      <p className="text-gray-600 mb-6">Review your script before sending it to creators. Make final adjustments and approve for distribution.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <Card className="p-6">
                          <h4 className="font-semibold mb-4">Script Preview</h4>
                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <p className="text-sm text-gray-600 mb-2">No script selected for preview</p>
                            <p className="text-xs text-gray-500">Create or select a script to see the preview here.</p>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium">Scene Start</Label>
                              <div className="bg-white border rounded p-3 text-sm">
                                <em>Scene start content will appear here...</em>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Main Content</Label>
                              <div className="bg-white border rounded p-3 text-sm">
                                <em>Main script content will appear here...</em>
                              </div>
                            </div>
                            
                            <div>
                              <Label className="text-sm font-medium">Scene End</Label>
                              <div className="bg-white border rounded p-3 text-sm">
                                <em>Scene end content will appear here...</em>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                      
                      <div>
                        <Card className="p-6">
                          <h4 className="font-semibold mb-4">Review Actions</h4>
                          <div className="space-y-4">
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-800">Pending Review</span>
                              </div>
                              <p className="text-xs text-yellow-700">Script is ready for review and approval.</p>
                            </div>
                            
                            <div className="space-y-2">
                              <Button className="w-full bg-green-600 hover:bg-green-700">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve & Send
                              </Button>
                              <Button variant="outline" className="w-full">
                                <Edit className="h-4 w-4 mr-2" />
                                Request Changes
                              </Button>
                              <Button variant="outline" className="w-full">
                                <Eye className="h-4 w-4 mr-2" />
                                Preview Public View
                              </Button>
                            </div>
                            
                            <div className="pt-4 border-t">
                              <Label className="text-sm font-medium">Reviewer Notes</Label>
                              <Textarea
                                placeholder="Add notes for the creator..."
                                rows={3}
                                className="mt-2"
                              />
                            </div>
                          </div>
                        </Card>
                      </div>
                    </div>
                    
                    <Card className="p-6">
                      <h4 className="font-semibold mb-4">Recent Scripts</h4>
                      <div className="space-y-3">
                        {scripts.length > 0 ? (
                          scripts.slice(0, 3).map((script) => (
                            <div key={script.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                              <div>
                                <h5 className="font-medium">{script.title}</h5>
                                <p className="text-sm text-gray-600">
                                  Creator: {creators.find(c => c.id === script.creator_id)?.name || 'Unknown'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={script.status === 'approved' ? 'default' : 'secondary'}>
                                  {script.status}
                                </Badge>
                                <Button size="sm" variant="outline">
                                  Review
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-8">No scripts available for review</p>
                        )}
                      </div>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
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