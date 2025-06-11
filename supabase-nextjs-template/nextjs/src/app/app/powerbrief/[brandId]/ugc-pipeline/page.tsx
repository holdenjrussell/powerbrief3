'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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
  Input,
  Badge
} from "@/components/ui";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Loader2, Save, Settings2, Sparkles, Bot, Mail, Upload, X, Bug, Trash2, GitBranch, List, MessageSquare, BarChart3, Users, Copy, ExternalLink, CheckCircle2, Shield, Zap, ChevronDown } from "lucide-react";
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
import ContractsTab from '@/components/ugc/ContractsTab';
import { Brand } from '@/lib/types/powerbrief';
import { createClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useBrand } from '@/lib/context/BrandContext';

// Workflow components
import WorkflowBuilder from '@/components/ugc/workflow/WorkflowBuilder';
import CreatorStatusManager from '@/components/ugc/workflow/CreatorStatusManager';
import MessageTemplateManager from '@/components/ugc/workflow/MessageTemplateManager';
import WorkflowAnalytics from '@/components/ugc/workflow/WorkflowAnalytics';
import CreatorFieldManager from '@/components/ugc/CreatorFieldManager';
import {
  getWorkflowTemplates,
  createWorkflowTemplate,
  updateWorkflowTemplate
} from '@/lib/services/ugcWorkflowService';
import { 
  UgcWorkflowTemplate, 
  WorkflowCategory,
  TriggerEvent
} from '@/lib/types/ugcWorkflow';

// Helper to unwrap params safely
type ParamsType = { brandId: string };
type ViewType = 'concept' | 'script' | 'creator' | 'settings' | 'ai-agent' | 'inbox' | 'templates' | 'workflow' | 'fields' | 'contracts';

const navigationItems = [
  {
    group: 'Pipeline',
    icon: Zap,
    items: [
      { view: 'concept' as ViewType, label: 'Concept View', icon: Shield },
      { view: 'script' as ViewType, label: 'Script Creation', icon: Plus },
    ],
  },
  {
    group: 'Creators',
    icon: Users,
    items: [
      { view: 'creator' as ViewType, label: 'Creator Management', icon: Users },
      { view: 'contracts' as ViewType, label: 'Contracts', icon: Shield },
      { view: 'inbox' as ViewType, label: 'Creator Inbox', icon: Mail },
    ],
  },
  {
    group: 'Automation',
    icon: Bot,
    items: [
      { view: 'workflow' as ViewType, label: 'Workflow Builder', icon: GitBranch },
      { view: 'ai-agent' as ViewType, label: 'AI UGC Agent', icon: Bot },
    ],
  },
  {
    group: 'Settings',
    icon: Settings2,
    items: [
      { view: 'settings' as ViewType, label: 'Pipeline Settings', icon: Settings2 },
      { view: 'fields' as ViewType, label: 'Creator Fields', icon: List },
      { view: 'templates' as ViewType, label: 'Email Templates', icon: Sparkles },
    ],
  },
];

export default function UgcPipelinePage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const { user } = useAuth();
  const router = useRouter();
  const { setSelectedBrand, brands } = useBrand();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Handle params unwrapping for React 19+ compatibility
  const [brandId, setBrandId] = useState<string>('');
  const [paramsPending, setParamsPending] = useState(true);
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [creators, setCreators] = useState<UgcCreator[]>([]);
  const [scripts, setScripts] = useState<UgcCreatorScript[]>([]);
  const activeView = (searchParams.get('view') as ViewType) || 'concept';
  const [activeStatus, setActiveStatus] = useState<string>(
    searchParams.get('status') || UGC_CREATOR_SCRIPT_CONCEPT_STATUSES[0]
  );
  
  // Creator view filter and sort state
  const [creatorFilterStatus, setCreatorFilterStatus] = useState<string>('all');
  const [creatorSortBy, setCreatorSortBy] = useState<string>('recent');
  
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
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);
  const [creatorSearchQuery, setCreatorSearchQuery] = useState<string>('');
  
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

  // Workflow state
  const [workflows, setWorkflows] = useState<UgcWorkflowTemplate[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<UgcWorkflowTemplate | null>(null);
  const [isWorkflowLoading, setIsWorkflowLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeWorkflowTab, setActiveWorkflowTab] = useState('workflows');
  
  // Create Workflow Dialog State
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    category: 'onboarding' as WorkflowCategory,
    trigger_event: 'creator_added' as TriggerEvent,
  });

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setBrandId(resolvedParams.brandId);
      setParamsPending(false);
    };
    
    unwrapParams();
  }, [params]);

  // Handle URL status parameter changes
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    if (urlStatus && UGC_CREATOR_SCRIPT_CONCEPT_STATUSES.includes(urlStatus)) {
      setActiveStatus(urlStatus);
    } else if (urlStatus && !UGC_CREATOR_SCRIPT_CONCEPT_STATUSES.includes(urlStatus)) {
      // Invalid status in URL, clean it up
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.delete('status');
      const search = current.toString();
      const query = search ? `?${search}` : "";
      router.replace(`${pathname}${query}`);
      setActiveStatus(UGC_CREATOR_SCRIPT_CONCEPT_STATUSES[0]);
    }
  }, [searchParams, pathname, router]);

  // Sync brand context with URL brandId
  useEffect(() => {
    if (brandId && brands.length > 0) {
      const urlBrand = brands.find(b => b.id === brandId);
      if (urlBrand) {
        console.log('Syncing brand context with URL brand:', urlBrand.name);
        setSelectedBrand(urlBrand);
      }
    }
  }, [brandId, brands, setSelectedBrand]);

  useEffect(() => {
    const fetchBrandData = async () => {
      if (!user?.id || !brandId) return;
      
      console.log('=== BRAND SWITCH DETECTED ===');
      console.log('New brandId:', brandId);
      console.log('User:', user.email);
      
      try {
        setLoading(true);
        setError(null);
        
        // Clear ALL existing data when brand changes
        setCreators([]);
        setScripts([]);
        setBrand(null);
        setTitle('');
        setScriptContent({
          scene_start: '',
          segments: [{ segment: 'Initial Approach', script: '', visuals: '' }],
          scene_end: ''
        });
        setBRollShotList([]);
        setSelectedCreators(['TBD']);
        
        // Reset to URL status or first status when brand changes
        const urlStatus = searchParams.get('status');
        const firstStatus = urlStatus && UGC_CREATOR_SCRIPT_CONCEPT_STATUSES.includes(urlStatus) 
          ? urlStatus 
          : UGC_CREATOR_SCRIPT_CONCEPT_STATUSES[0];
        setActiveStatus(firstStatus);
        
        // Add a small delay to ensure state is cleared
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Fetch brand data
        console.log('Fetching brand data for:', brandId);
        const brandData = await getBrandById(brandId);
        console.log('Brand fetched:', brandData?.name, brandData?.id);
        setBrand(brandData);
        
        // Fetch creators with explicit brand filtering
        console.log('Fetching creators for brand:', brandId);
        const creatorData = await getUgcCreators(brandId);
        console.log(`Fetched ${creatorData.length} creators for brand ${brandId}:`, creatorData.map(c => ({ 
          id: c.id, 
          name: c.name, 
          email: c.email, 
          brand_id: c.brand_id 
        })));
        
        // Verify all creators belong to this brand
        const wrongBrandCreators = creatorData.filter(c => c.brand_id !== brandId);
        if (wrongBrandCreators.length > 0) {
          console.error('ERROR: Found creators from wrong brand:', wrongBrandCreators);
        }
        
        setCreators(creatorData);
        
        // Fetch scripts for the determined status
        console.log('Fetching scripts for brand:', brandId, 'status:', firstStatus);
        const scriptsData = await getUgcCreatorScriptsByConceptStatus(brandId, firstStatus);
        console.log(`Fetched ${scriptsData.length} scripts for brand ${brandId}:`, scriptsData.map(s => ({
          id: s.id,
          title: s.title,
          brand_id: s.brand_id,
          concept_status: s.concept_status
        })));
        
        // Verify all scripts belong to this brand
        const wrongBrandScripts = scriptsData.filter(s => s.brand_id !== brandId);
        if (wrongBrandScripts.length > 0) {
          console.error('ERROR: Found scripts from wrong brand:', wrongBrandScripts);
        }
        
        setScripts(scriptsData);
        
        // Fetch UGC brand settings
        try {
          const ugcFields = await getBrandUgcFields(brandId);
          if (ugcFields) {
            setCompanyDescription(ugcFields.ugc_company_description || '');
            setGuideDescription(ugcFields.ugc_guide_description || '');
            setFilmingInstructions(ugcFields.ugc_filming_instructions || '');
            setDefaultSystemInstructions(ugcFields.ugc_default_system_instructions || '');
          }
        } catch (settingsError) {
          console.error('Error fetching UGC settings:', settingsError);
          // Continue anyway, we can still show the UI
        }
        
        console.log('=== BRAND SWITCH COMPLETE ===');
      } catch (err: unknown) {
        console.error('Failed to fetch data:', err);
        setError('Failed to fetch data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchBrandData();
  }, [user?.id, brandId]); // Remove activeStatus from dependencies

  // Separate useEffect for status changes within the same brand
  useEffect(() => {
    const fetchScriptsForStatus = async () => {
      if (!brandId || !activeStatus) return;
      
      try {
        const scriptsData = await getUgcCreatorScriptsByConceptStatus(brandId, activeStatus);
        setScripts(scriptsData);
      } catch (err) {
        console.error('Failed to fetch scripts for status:', activeStatus, err);
      }
    };

    // Only fetch if we have a brand already loaded (to avoid double fetch on initial load)
    if (brand) {
      fetchScriptsForStatus();
    }
  }, [activeStatus, brandId, brand]);

  useEffect(() => {
    const loadViewData = async () => {
      if (activeView === 'workflow' && brandId) {
        try {
          setIsWorkflowLoading(true);
          const workflowData = await getWorkflowTemplates(brandId);
          setWorkflows(workflowData);
          if (workflowData.length > 0 && !selectedWorkflow) {
            setSelectedWorkflow(workflowData[0]);
          }
        } catch (err) {
          console.error('Failed to load workflows:', err);
        } finally {
          setIsWorkflowLoading(false);
        }
      }
    };
    loadViewData();
  }, [activeView, brandId, selectedWorkflow]);

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
      if (!user?.id || !brandId) return;
      
      try {
        // Refresh creators
        const creatorData = await getUgcCreators(brandId);
        setCreators(creatorData);
        
        // Refresh scripts for current status
        const scriptsData = await getUgcCreatorScriptsByConceptStatus(brandId, activeStatus);
        setScripts(scriptsData);
      } catch (err) {
        console.error('Failed to refresh data:', err);
      }
    };
    
    fetchData();
  };

  const getScriptCountByConceptStatus = (status: string) => {
    return scripts.filter(script => script.concept_status === status).length;
  };

  // Creator filtering and sorting functions
  const filterCreators = (creatorsToFilter: UgcCreator[]): UgcCreator[] => {
    if (creatorFilterStatus === 'all') {
      return creatorsToFilter;
    }
    return creatorsToFilter.filter(creator => creator.status === creatorFilterStatus);
  };

  const sortCreators = (creatorsToSort: UgcCreator[]): UgcCreator[] => {
    const sorted = [...creatorsToSort];
    
    switch (creatorSortBy) {
      case 'name':
        return sorted.sort((a, b) => {
          const nameA = a.name || '';
          const nameB = b.name || '';
          return nameA.localeCompare(nameB);
        });
      case 'status':
        return sorted.sort((a, b) => {
          const statusA = a.status || '';
          const statusB = b.status || '';
          return statusA.localeCompare(statusB);
        });
      case 'recent':
      default:
        return sorted.sort((a, b) => {
          const dateA = new Date(a.created_at || '').getTime();
          const dateB = new Date(b.created_at || '').getTime();
          return dateB - dateA; // Most recent first
        });
    }
  };

  // Get filtered and sorted creators
  const filteredAndSortedCreators = sortCreators(filterCreators(creators));

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

  const handleViewChange = (view: ViewType) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set('view', view);
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
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

  // Script generation handler
  const handleGenerateScript = async () => {
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
            ugc_company_description: companyDescription,
            ugc_filming_instructions: filmingInstructions
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
      
    } catch (err: unknown) {
      console.error('Failed to generate script:', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to generate script: ${errMsg}`);
    } finally {
      setGeneratingScript(false);
    }
  };

  // Upload video for AI analysis
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

  // Script submission handler
  const handleSubmitScript = async () => {
    if (!brand || !title || selectedCreators.length === 0) return;
    
    if (!creativeStrategist || creativeStrategist.trim() === '') {
      setError('Please provide a creative strategist for the script.');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Create script for TBD or each selected creator
      const scriptsToCreate = selectedCreators.includes('TBD') 
        ? [{ creator_id: '00000000-0000-0000-0000-000000000000', name: 'TBD' }]
        : selectedCreators.map(creatorId => {
            const creator = creators.find(c => c.id === creatorId);
            return { creator_id: creatorId, name: creator?.name || creator?.email || 'Unknown' };
          });
      
      for (const creatorInfo of scriptsToCreate) {
        // Prepare script object with required fields - submit for approval
        const scriptData: Omit<UgcCreatorScript, 'id' | 'created_at' | 'updated_at'> = {
          creator_id: creatorInfo.creator_id,
          user_id: user?.id || '',
          brand_id: brand.id,
          title,
          script_content: scriptContent,
          status: 'PENDING_APPROVAL',
          concept_status: 'Script Approval',
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
          creative_strategist: creativeStrategist || null,
          creator_footage: null,
          payment_status: 'Pending',
          deposit_amount: 0,
          final_payment_amount: 0
        };
        
        // If we have a reference video, upload it and add the URL to the metadata
        if (referenceVideo) {
          const uploadedUrl = await uploadVideoForAI(referenceVideo);
          scriptData.creator_footage = uploadedUrl;
          
          // Use the reference video as the inspiration video
          scriptData.inspiration_video_url = uploadedUrl;
          scriptData.inspiration_video_notes = referenceVideoNotes || null;
        }
        
        // Prepare data for API endpoint (uses slightly different field names)
        const apiData = {
          brand_id: scriptData.brand_id,
          creator_id: scriptData.creator_id,
          title: scriptData.title,
          script_content: scriptData.script_content,
          status: scriptData.status,
          concept_status: scriptData.concept_status,
          b_roll_shot_list: scriptData.b_roll_shot_list,
          hook_type: scriptData.hook_type,
          hook_count: scriptData.hook_count,
          hook_body: scriptData.hook_body,
          cta: scriptData.cta,
          company_description: scriptData.company_description,
          guide_description: scriptData.guide_description,
          filming_instructions: scriptData.filming_instructions,
          ai_custom_prompt: scriptData.ai_custom_prompt,
          system_instructions: scriptData.system_instructions,
          creative_strategist: scriptData.creative_strategist,
          inspiration_video_url: scriptData.inspiration_video_url,
          inspiration_video_notes: scriptData.inspiration_video_notes,
          is_ai_generated: scriptData.is_ai_generated,
          is_tbd_creator: creatorInfo.creator_id === '00000000-0000-0000-0000-000000000000'
        };

        // Save script to database using API endpoint for better error handling
        const response = await fetch('/api/ugc/scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }
      }
      
      // Reset form after successful save
      setTitle('');
      setCreativeStrategist('');
      setScriptContent({
        scene_start: '',
        segments: [{ segment: 'Initial Approach', script: '', visuals: '' }],
        scene_end: ''
      });
      setHookBody('');
      setCta('');
      setBRollShotList([]);
      setSelectedCreators(['TBD']);
      setAiCustomPrompt('');
      setReferenceVideoNotes('');
      setIsAiGenerated(false);
      handleRemoveVideo();
      
      // Switch to concept view and refresh scripts
      handleViewChange('concept');
      setActiveStatus('Script Approval'); // Switch to Script Approval status
      
      // Refresh the scripts to show the newly created ones
      try {
        const scriptsData = await getUgcCreatorScriptsByConceptStatus(brandId, 'Script Approval');
        setScripts(scriptsData);
      } catch (refreshError) {
        console.error('Failed to refresh scripts after creation:', refreshError);
      }
      
    } catch (err: unknown) {
      console.error('Failed to save script:', err);
      setError('Failed to save script. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Debug prompt handler
  const handleShowDebugPrompt = () => {
    const promptData = {
      title,
      creativeStrategist,
      aiCustomPrompt,
      hookType,
      hookCount,
      referenceVideo: referenceVideo?.name,
      referenceVideoNotes,
      systemInstructions,
      companyDescription,
      guideDescription,
      filmingInstructions
    };
    
    setDebugPromptData(JSON.stringify(promptData, null, 2));
    setShowDebugModal(true);
  };

  // Script segment handlers
  const handleAddSegment = () => {
    setScriptContent(prev => ({
      ...prev,
      segments: [...(prev.segments || []), { segment: 'New Segment', script: '', visuals: '' }]
    }));
  };

  const handleUpdateSegment = (index: number, field: 'segment' | 'script' | 'visuals', value: string) => {
    setScriptContent(prev => ({
      ...prev,
      segments: prev.segments?.map((seg, i) => 
        i === index ? { ...seg, [field]: value } : seg
      ) || []
    }));
  };

  const handleRemoveSegment = (index: number) => {
    setScriptContent(prev => ({
      ...prev,
      segments: prev.segments?.filter((_, i) => i !== index) || []
    }));
  };

  // B-roll shot handlers
  const handleAddBRollShot = () => {
    setBRollShotList(prev => [...prev, '']);
  };

  const handleUpdateBRollShot = (index: number, value: string) => {
    setBRollShotList(prev => prev.map((shot, i) => i === index ? value : shot));
  };

  const handleRemoveBRollShot = (index: number) => {
    setBRollShotList(prev => prev.filter((_, i) => i !== index));
  };

  // Creator selection handler
  const handleCreatorSelection = (creatorId: string) => {
    setSelectedCreators(prev => {
      if (prev.includes(creatorId)) {
        return prev.filter(id => id !== creatorId);
      } else {
        return [...prev, creatorId];
      }
    });
  };

  // Handle status change in concept view
  const handleStatusChange = async (status: string) => {
    setActiveStatus(status);
    
    // Update URL with the new status
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set('status', status);
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
    
    // The useEffect will handle fetching the scripts for the new status
  };

  // Script approval handlers
  const handleApproveScript = async (scriptId: string) => {
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
      
      // Refresh scripts for current status
      handleRefresh();
      
    } catch (err) {
      console.error('Failed to approve script:', err);
      setError(`Failed to approve script: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRequestRevision = async (scriptId: string, revisionNotes: string) => {
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
      
      // Refresh scripts for current status
      handleRefresh();
      
    } catch (err) {
      console.error('Failed to request revision:', err);
      setError(`Failed to request revision: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleAssignCreators = async (scriptId: string, creatorIds: string[]) => {
    try {
      const response = await fetch(`/api/ugc/scripts/${scriptId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorIds })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      // Refresh scripts for current status
      handleRefresh();
      
    } catch (err) {
      console.error('Failed to assign creators:', err);
      setError(`Failed to assign creators: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCreatorApprove = async (scriptId: string) => {
    try {
      const response = await fetch(`/api/ugc/scripts/${scriptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'CREATOR_APPROVED',
          concept_status: 'Creator Shooting' 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      // Refresh scripts for current status
      handleRefresh();
      
    } catch (err) {
      console.error('Failed to approve creator:', err);
      setError(`Failed to approve creator: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCreatorReject = async (scriptId: string, rejectionNotes: string) => {
    try {
      const response = await fetch(`/api/ugc/scripts/${scriptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'CREATOR_REASSIGNMENT',
          concept_status: 'Creator Assignment',
          revision_notes: rejectionNotes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      // Refresh scripts for current status
      handleRefresh();
      
    } catch (err) {
      console.error('Failed to reject creator:', err);
      setError(`Failed to reject creator: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleApproveContent = async (scriptId: string) => {
    try {
      const response = await fetch(`/api/ugc/scripts/${scriptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'COMPLETED',
          concept_status: 'To Edit' 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      // Refresh scripts for current status
      handleRefresh();
      
    } catch (err) {
      console.error('Failed to approve content:', err);
      setError(`Failed to approve content: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRequestContentRevision = async (scriptId: string, revisionNotes: string) => {
    try {
      const response = await fetch(`/api/ugc/scripts/${scriptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'CONTENT_REVISION_REQUESTED',
          concept_status: 'Creator Shooting',
          revision_notes: revisionNotes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      // Refresh scripts for current status
      handleRefresh();
      
    } catch (err) {
      console.error('Failed to request content revision:', err);
      setError(`Failed to request content revision: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSubmitContent = async (scriptId: string, contentLink: string) => {
    try {
      const response = await fetch(`/api/ugc/scripts/${scriptId}/submit-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ final_content_link: contentLink })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      // Refresh scripts for current status
      handleRefresh();
      
    } catch (err) {
      console.error('Failed to submit content:', err);
      setError(`Failed to submit content: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteScript = async (scriptId: string) => {
    try {
      const response = await fetch(`/api/ugc/scripts/${scriptId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      // Refresh scripts for current status
      handleRefresh();
      
    } catch (err) {
      console.error('Failed to delete script:', err);
      setError(`Failed to delete script: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Workflow handlers
  const handleCreateWorkflow = async () => {
    if (!newWorkflow.name.trim()) return;

    setIsSaving(true);
    try {
      const createdWorkflow = await createWorkflowTemplate({
        ...newWorkflow,
        brand_id: brandId,
        is_active: true
      });

      setWorkflows([...workflows, createdWorkflow]);
      setSelectedWorkflow(createdWorkflow);
      setIsCreateDialogOpen(false);
      setNewWorkflow({
        name: '',
        description: '',
        category: 'onboarding',
        trigger_event: 'creator_added',
      });
    } catch (error) {
      console.error('Error creating workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!selectedWorkflow) return;

    setIsSaving(true);
    try {
      await updateWorkflowTemplate(selectedWorkflow.id, {
        is_active: selectedWorkflow.is_active
      });
    } catch (error) {
      console.error('Error saving workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6" key={brandId}>
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
      
      <div className="flex space-x-1 border-b mb-6">
        {navigationItems.map((group) => {
          const isActiveGroup = group.items.some(item => item.view === activeView);
          return (
            <DropdownMenu key={group.group}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`flex items-center gap-2 px-4 h-12 rounded-none border-b-2 text-sm transition-all duration-200 ease-in-out ${isActiveGroup ? 'border-primary text-primary font-semibold' : 'border-transparent text-gray-500 hover:bg-gray-100/50 hover:text-gray-900 font-medium'}`}>
                  <group.icon className={`h-5 w-5 transition-colors duration-200 ease-in-out ${isActiveGroup ? 'text-primary' : 'text-gray-400'}`} />
                  <span>{group.group}</span>
                  <ChevronDown className="h-4 w-4 text-gray-400 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {group.items.map((item) => (
                  <DropdownMenuItem
                    key={item.view}
                    onClick={() => handleViewChange(item.view)}
                    className={`cursor-pointer flex items-center gap-3 p-2 ${activeView === item.view ? 'bg-accent text-accent-foreground' : ''}`}
                  >
                    <item.icon className={`h-4 w-4 ${activeView === item.view ? 'text-primary' : 'text-gray-500'}`} />
                    <span className="text-sm">{item.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
      </div>
      
      {activeView === 'concept' && (
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
                        onClick={() => handleStatusChange(status)}
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
                          showActionButtons={true}
                          creators={creators}
                          onApprove={handleApproveScript}
                          onRequestRevision={handleRequestRevision}
                          onAssign={handleAssignCreators}
                          onCreatorApprove={handleCreatorApprove}
                          onCreatorReject={handleCreatorReject}
                          onApproveContent={handleApproveContent}
                          onRequestContentRevision={handleRequestContentRevision}
                          onSubmitContent={handleSubmitContent}
                          onDelete={handleDeleteScript}
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
      )}
        
      {activeView === 'script' && (
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
                              aria-label="Upload reference video file"
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
                    <div className="mt-2 space-y-4">
                      {creators.length > 0 ? (
                        <>
                          {/* Search Bar */}
                          <div className="relative">
                            <Input
                              placeholder="Search creators..."
                              value={creatorSearchQuery}
                              onChange={(e) => setCreatorSearchQuery(e.target.value)}
                              className="pl-10"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                          </div>

                          {/* TBD Option */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            <Button
                              variant={selectedCreators.includes('TBD') ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => handleCreatorSelection('TBD')}
                              className="flex items-center gap-2"
                            >
                              <span>TBD (To Be Determined)</span>
                            </Button>
                          </div>

                          {/* Filtered Creators */}
                          <div className="max-h-60 overflow-y-auto border rounded-lg p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {creators
                                .filter(creator => {
                                  if (!creatorSearchQuery) return true;
                                  const query = creatorSearchQuery.toLowerCase();
                                  return (
                                    (creator.name && creator.name.toLowerCase().includes(query)) ||
                                    (creator.email && creator.email.toLowerCase().includes(query))
                                  );
                                })
                                .map((creator) => (
                                  <Button
                                    key={creator.id}
                                    variant={selectedCreators.includes(creator.id) ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleCreatorSelection(creator.id)}
                                    className="justify-start h-auto py-2 px-3 text-left"
                                  >
                                    <div className="flex flex-col items-start min-w-0 w-full">
                                      <span className="font-medium truncate w-full">
                                        {creator.name || 'Unnamed'}
                                      </span>
                                      <span className="text-xs text-gray-500 truncate w-full">
                                        {creator.email}
                                      </span>
                                    </div>
                                  </Button>
                                ))}
                            </div>
                            
                            {creators.filter(creator => {
                              if (!creatorSearchQuery) return true;
                              const query = creatorSearchQuery.toLowerCase();
                              return (
                                (creator.name && creator.name.toLowerCase().includes(query)) ||
                                (creator.email && creator.email.toLowerCase().includes(query))
                              );
                            }).length === 0 && creatorSearchQuery && (
                              <div className="text-center py-8 text-gray-500">
                                <p>No creators found matching &quot;{creatorSearchQuery}&quot;</p>
                                <p className="text-sm">Try a different search term</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Selected Summary */}
                          {selectedCreators.length > 0 && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm font-medium text-blue-800 mb-1">
                                Selected ({selectedCreators.length}):
                              </p>
                              <p className="text-sm text-blue-600">
                                {selectedCreators.map(id => {
                                  if (id === 'TBD') return 'TBD';
                                  const creator = creators.find(c => c.id === id);
                                  return creator?.name || creator?.email;
                                }).join(', ')}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500 border rounded-lg">
                          <p>No creators available.</p>
                          <p className="text-sm">Create some creators first in the Creator View tab.</p>
                        </div>
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
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Submit for Approval
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
      )}
        
      {activeView === 'creator' && (
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
                  {/* Creator Onboarding Form Link */}
                  <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        Creator Onboarding Form
                      </CardTitle>
                      <CardDescription>
                        Share this link with potential creators to collect their information and add them to your pipeline
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                          <Input
                            value={`${window.location.origin}/apply/${brandId}`}
                            readOnly
                            className="flex-1 bg-gray-50"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/apply/${brandId}`);
                              // You could add a toast notification here
                            }}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`${window.location.origin}/apply/${brandId}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Open
                          </Button>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span>Public form - no login required</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Shield className="h-4 w-4 text-blue-500" />
                            <span>Secure data collection</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4 text-purple-500" />
                            <span>Auto-adds to pipeline</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Creator Filter/Sort Options */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    <Select value={creatorFilterStatus} onValueChange={setCreatorFilterStatus}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses ({creators.length})</SelectItem>
                        {UGC_CREATOR_ONBOARDING_STATUSES.map((status) => {
                          const count = creators.filter(c => c.status === status).length;
                          return (
                            <SelectItem key={status} value={status}>
                              {status} ({count})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    
                    <Select value={creatorSortBy} onValueChange={setCreatorSortBy}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Most Recent</SelectItem>
                        <SelectItem value="name">Name A-Z</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="text-sm text-gray-500 flex items-center">
                      Showing {filteredAndSortedCreators.length} of {creators.length} creators
                    </div>
                  </div>
                  
                  {/* Creators Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAndSortedCreators.map((creator) => (
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
                    
                    {filteredAndSortedCreators.length === 0 && creators.length > 0 && (
                      <div className="col-span-full text-center py-12 text-gray-500">
                        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No creators match the current filters</p>
                        <p className="text-sm">Try adjusting your filter settings</p>
                      </div>
                    )}
                    
                    {creators.length === 0 && (
                      <div className="col-span-full text-center py-12 text-gray-500">
                        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No creators found</p>
                        <p className="text-sm">Share the onboarding form above to start building your UGC pipeline</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
      )}

      {activeView === 'templates' && (
        <>
          {brand && (
            <EmailTemplateGenerator 
              brandId={brand.id}
              brandName={brand.name}
            />
          )}
        </>
      )}

      {activeView === 'ai-agent' && (
        <>
          {brand && (
            <UgcAiCoordinatorPanel 
              brand={brand} 
              creators={creators} 
              onRefresh={handleRefresh} 
            />
          )}
        </>
      )}
        
      {activeView === 'inbox' && (
        <>
          {brand && (
            <AdvancedEmailInbox 
              brandId={brand.id}
              brandName={brand.name}
            />
          )}
        </>
      )}
        
      {activeView === 'settings' && (
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
      )}

      {activeView === 'workflow' && (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">UGC Workflow Automation</h2>
              <p className="text-gray-600">Build and manage automated workflows for your UGC creators</p>
            </div>

            <Tabs value={activeWorkflowTab} onValueChange={setActiveWorkflowTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="workflows">
                  <GitBranch className="h-4 w-4 mr-2" />
                  Workflows
                </TabsTrigger>
                <TabsTrigger value="statuses">
                  <List className="h-4 w-4 mr-2" />
                  Creator Statuses
                </TabsTrigger>
                <TabsTrigger value="templates">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message Templates
                </TabsTrigger>
                <TabsTrigger value="analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="workflows" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Workflow Templates</h3>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        New Workflow
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Workflow</DialogTitle>
                        <DialogDescription>
                          Set up a new automation workflow for your UGC creators.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Workflow Name</Label>
                          <Input
                            id="name"
                            value={newWorkflow.name}
                            onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                            placeholder="e.g., Creator Onboarding"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={newWorkflow.description}
                            onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                            placeholder="Describe what this workflow does..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="category">Category</Label>
                          <Select
                            value={newWorkflow.category}
                            onValueChange={(value) => setNewWorkflow({ ...newWorkflow, category: value as WorkflowCategory })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="onboarding">Onboarding</SelectItem>
                              <SelectItem value="script_pipeline">Script Pipeline</SelectItem>
                              <SelectItem value="rate_negotiation">Rate Negotiation</SelectItem>
                              <SelectItem value="product_shipment">Product Shipment</SelectItem>
                              <SelectItem value="contract_signing">Contract Signing</SelectItem>
                              <SelectItem value="content_delivery">Content Delivery</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="trigger">Trigger Event</Label>
                          <Select
                            value={newWorkflow.trigger_event}
                            onValueChange={(value) => setNewWorkflow({ ...newWorkflow, trigger_event: value as TriggerEvent })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="creator_added">Creator Added</SelectItem>
                              <SelectItem value="status_change">Status Change</SelectItem>
                              <SelectItem value="manual">Manual Trigger</SelectItem>
                              <SelectItem value="time_based">Time Based</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleCreateWorkflow} disabled={isSaving}>
                            {isSaving ? 'Creating...' : 'Create Workflow'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {isWorkflowLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : workflows.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Settings2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
                      <p className="text-gray-500 mb-4">Create your first workflow to start automating</p>
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Workflow
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Workflow List */}
                    <div className="lg:col-span-1">
                      <Card>
                        <CardHeader>
                          <CardTitle>Your Workflows</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {workflows.map((workflow) => (
                              <div
                                key={workflow.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  selectedWorkflow?.id === workflow.id
                                    ? 'border-blue-300 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => setSelectedWorkflow(workflow)}
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-medium">{workflow.name}</div>
                                    <div className="text-sm text-gray-500">{workflow.description}</div>
                                    <div className="flex gap-1 mt-2">
                                      <Badge variant="secondary" className="text-xs">
                                        {workflow.category}
                                      </Badge>
                                      {workflow.is_active ? (
                                        <Badge variant="default" className="text-xs">Active</Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-xs">Inactive</Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Workflow Builder */}
                    <div className="lg:col-span-3">
                      {selectedWorkflow && (
                        <WorkflowBuilder
                          workflow={selectedWorkflow}
                          brandId={brandId}
                          onSave={handleSaveWorkflow}
                        />
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="statuses">
                <CreatorStatusManager brandId={brandId} />
              </TabsContent>

              <TabsContent value="templates">
                <MessageTemplateManager brandId={brandId} />
              </TabsContent>

              <TabsContent value="analytics">
                <WorkflowAnalytics brandId={brandId} />
              </TabsContent>
            </Tabs>
          </div>
      )}

      {activeView === 'fields' && (
        <>
          {brandId && (
            <CreatorFieldManager brandId={brandId} />
          )}
        </>
      )}

      {activeView === 'contracts' && (
        <>
          {brandId && (
            <ContractsTab 
              brandId={brandId}
              creators={creators}
              onRefresh={handleRefresh}
            />
          )}
        </>
      )}
      
      {/* Debug Modal */}
      <Dialog open={showDebugModal} onOpenChange={setShowDebugModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Debug - AI Generation Prompt</DialogTitle>
            <DialogDescription>
              This shows the data that would be sent to the AI for script generation
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-auto">
              {debugPromptData}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 