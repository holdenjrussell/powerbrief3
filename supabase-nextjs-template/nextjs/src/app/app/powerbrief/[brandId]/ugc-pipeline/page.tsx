'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui";
import { Plus, Loader2, Save, Settings2, X, Sparkles, Trash2, Upload, Bug } from "lucide-react";
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
import { Brand } from '@/lib/types/powerbrief';

// Helper to unwrap params safely
type ParamsType = { brandId: string };

// Add a constant for the TBD creator ID (this is a reliable UUID that won't change)
const TBD_CREATOR_ID = '00000000-0000-0000-0000-000000000000';

export default function UgcPipelinePage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const { user } = useAuth();
  const router = useRouter();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [creators, setCreators] = useState<UgcCreator[]>([]);
  const [scripts, setScripts] = useState<UgcCreatorScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'concept' | 'script' | 'creator' | 'settings'>('concept');
  const [activeStatus, setActiveStatus] = useState<string>(UGC_CREATOR_SCRIPT_CONCEPT_STATUSES[0]);
  const [showNewCreatorDialog, setShowNewCreatorDialog] = useState(false);
  const [newCreator] = useState<Partial<UgcCreator>>({
    name: '',
    status: 'New Creator Submission',
    contract_status: 'not signed',
    products: [],
    content_types: [],
    platforms: []
  });
  const [creatingCreator, setCreatingCreator] = useState(false);
  
  // Script creation state
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
  
  // Settings state
  const [companyDescription, setCompanyDescription] = useState<string>('');
  const [guideDescription, setGuideDescription] = useState<string>('');
  const [filmingInstructions, setFilmingInstructions] = useState<string>('');
  const [defaultSystemInstructions, setDefaultSystemInstructions] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Creative strategist state
  const [creativeStrategist, setCreativeStrategist] = useState<string>('');

  // Reference video notes state
  const [referenceVideoNotes, setReferenceVideoNotes] = useState<string>('');

  // Debug state
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugPromptData, setDebugPromptData] = useState<string>('');

  // State for selected creators, default to TBD
  const [selectedCreators, setSelectedCreators] = useState<string[]>(['TBD']);

  // Add a state for creator search
  const [creatorSearch, setCreatorSearch] = useState<string>('');

  // Add state for creator status filter
  const [activeCreatorStatus, setActiveCreatorStatus] = useState<string>('All');

  // Unwrap params using React.use()
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const { brandId } = unwrappedParams;

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

    fetchBrandData();
  }, [user?.id, brandId, activeView, activeStatus]);

  const handleCreateCreator = async (formData: Partial<UgcCreator>) => {
    if (!user?.id || !brand || !formData.name) return;
    
    try {
      setCreatingCreator(true);
      
      const newCreator = await createUgcCreator({
        brand_id: brand.id,
        user_id: user.id,
        name: formData.name,
        status: formData.status || 'New Creator Submission',
        contract_status: formData.contract_status || 'not signed',
        gender: formData.gender,
        products: formData.products || [],
        content_types: formData.content_types || [],
        platforms: formData.platforms || [],
        email: formData.email,
        phone_number: formData.phone_number,
        instagram_handle: formData.instagram_handle,
        tiktok_handle: formData.tiktok_handle,
        portfolio_link: formData.portfolio_link,
        per_script_fee: formData.per_script_fee,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        country: formData.country,
        contacted_by: formData.contacted_by
      });
      
      setCreators(prev => [newCreator, ...prev]);
      setShowNewCreatorDialog(false);
      
      // Navigate to the new creator's page
      router.push(`/app/powerbrief/${brand.id}/ugc-pipeline/creators/${newCreator.id}`);
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

  const handleViewChange = (view: 'concept' | 'script' | 'creator' | 'settings') => {
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

  const uploadVideoForAI = async (file: File): Promise<string> => {
    try {
      setUploadingVideo(true);
      setError(null);
      
      // Create a form data object
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload the file - use the temp-video endpoint
      const response = await fetch('/api/uploads/temp-video', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response as JSON, try to get it as text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status-based message
          }
        }
        throw new Error(errorMessage);
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

  // Handle script generation with AI
  const handleGenerateScript = async (): Promise<void> => {
    if (!brand) return;
    
    try {
      setGeneratingScript(true);
      setError(null);
      
      // Format reference video data if it exists
      let referenceVideoData;
      if (referenceVideo) {
        try {
          // Upload the video first
          const uploadedUrl = await uploadVideoForAI(referenceVideo);
          referenceVideoData = {
            url: uploadedUrl,
            type: referenceVideo.type
          };
          console.log('Reference video data prepared:', referenceVideoData);
        } catch (uploadError) {
          console.error('Video upload failed:', uploadError);
          setError(`Failed to upload reference video: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
          return; // Exit early if video upload fails
        }
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
            ugc_guide_description: guideDescription,
            ugc_filming_instructions: filmingInstructions
          },
          customPrompt: aiCustomPrompt,
          systemInstructions: systemInstructions || defaultSystemInstructions,
          referenceVideo: referenceVideoData,
          hookOptions: {
            type: hookType,
            count: hookCount
          },
          company_description: companyDescription,
          guide_description: guideDescription,
          filming_instructions: filmingInstructions
        })
      });
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response as JSON, try to get it as text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status-based message
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Update state with the generated script
      setScriptContent(data.script_content);
      setHookBody(data.hook_body || '');
      setCta(data.cta || '');
      setBRollShotList(data.b_roll_shot_list || []);
      
      // Update descriptions if they were generated and not already set
      if (data.company_description && !companyDescription) {
        setCompanyDescription(data.company_description);
      }
      
      if (data.guide_description && !guideDescription) {
        setGuideDescription(data.guide_description);
      }
      
      if (data.filming_instructions && !filmingInstructions) {
        setFilmingInstructions(data.filming_instructions);
      }
      
      // Switch to the script tab
      setActiveView('script');
      
    } catch (err: unknown) {
      console.error('Script generation failed:', err);
      setError(`Failed to generate script: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGeneratingScript(false);
    }
  };

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

  // Assign script to creator(s)
  const handleAssignScript = async (scriptId: string, creatorIds: string[]) => {
    try {
      // Update script with creator assignment
      const response = await fetch(`/api/ugc/scripts/${scriptId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          creatorIds,
          status: 'SCRIPT_ASSIGNED',
          concept_status: 'Send Script to Creator' 
        })
      });
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response as JSON, try to get it as text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status-based message
          }
        }
        throw new Error(errorMessage);
      }
      
      // Refresh scripts list
      const updatedScripts = await getUgcCreatorScriptsByConceptStatus(brandId, activeStatus);
      setScripts(updatedScripts);
      
    } catch (err: unknown) {
      console.error('Failed to assign script:', err);
      setError(`Failed to assign script: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle script approval
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
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response as JSON, try to get it as text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status-based message
          }
        }
        throw new Error(errorMessage);
      }
      
      // Refresh scripts list
      const updatedScripts = await getUgcCreatorScriptsByConceptStatus(brandId, activeStatus);
      setScripts(updatedScripts);
      
    } catch (err: unknown) {
      console.error('Failed to approve script:', err);
      setError(`Failed to approve script: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle script revision request
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
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response as JSON, try to get it as text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status-based message
          }
        }
        throw new Error(errorMessage);
      }
      
      // Refresh scripts list
      const updatedScripts = await getUgcCreatorScriptsByConceptStatus(brandId, activeStatus);
      setScripts(updatedScripts);
      
    } catch (err: unknown) {
      console.error('Failed to request revision:', err);
      setError(`Failed to request revision: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  // Handle creator approval of script
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
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response as JSON, try to get it as text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status-based message
          }
        }
        throw new Error(errorMessage);
      }
      
      // Refresh scripts list
      const updatedScripts = await getUgcCreatorScriptsByConceptStatus(brandId, activeStatus);
      setScripts(updatedScripts);
      
    } catch (err: unknown) {
      console.error('Failed to approve by creator:', err);
      setError(`Failed to approve by creator: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  // Handle creator rejection of script
  const handleCreatorReject = async (scriptId: string, rejectionNotes: string) => {
    try {
      // Get the script to check its current creator
      const scriptResponse = await fetch(`/api/ugc/scripts/${scriptId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!scriptResponse.ok) {
        let errorMessage = `Server error: ${scriptResponse.status}`;
        try {
          const errorData = await scriptResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response as JSON, try to get it as text
          try {
            const errorText = await scriptResponse.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status-based message
          }
        }
        throw new Error(errorMessage);
      }
      
      // We don't actually need the script data, just fetching to make sure it exists
      
      const response = await fetch(`/api/ugc/scripts/${scriptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'CREATOR_REASSIGNMENT',
          concept_status: 'Creator Assignment',
          creator_id: TBD_CREATOR_ID, // Reset to TBD
          revision_notes: rejectionNotes
        })
      });
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response as JSON, try to get it as text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status-based message
          }
        }
        throw new Error(errorMessage);
      }
      
      // Refresh scripts list
      const updatedScripts = await getUgcCreatorScriptsByConceptStatus(brandId, activeStatus);
      setScripts(updatedScripts);
      
    } catch (err: unknown) {
      console.error('Failed to reject by creator:', err);
      setError(`Failed to reject by creator: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle script deletion
  const handleDeleteScript = async (scriptId: string) => {
    try {
      console.log(`Script ${scriptId} deleted, refreshing scripts list`);
      // Refresh scripts list after deletion
      const updatedScripts = await getUgcCreatorScriptsByConceptStatus(brandId, activeStatus);
      setScripts(updatedScripts);
    } catch (err: unknown) {
      console.error('Failed to refresh scripts after deletion:', err);
      setError(`Failed to refresh scripts: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle content approval
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
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response as JSON, try to get it as text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status-based message
          }
        }
        throw new Error(errorMessage);
      }
      
      // Refresh scripts list
      const updatedScripts = await getUgcCreatorScriptsByConceptStatus(brandId, activeStatus);
      setScripts(updatedScripts);
      
    } catch (err: unknown) {
      console.error('Failed to approve content:', err);
      setError(`Failed to approve content: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle content revision request
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
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response as JSON, try to get it as text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status-based message
          }
        }
        throw new Error(errorMessage);
      }
      
      // Refresh scripts list
      const updatedScripts = await getUgcCreatorScriptsByConceptStatus(brandId, activeStatus);
      setScripts(updatedScripts);
      
    } catch (err: unknown) {
      console.error('Failed to request content revision:', err);
      setError(`Failed to request content revision: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Handle content submission from backend (Creator Shooting status)
  const handleSubmitContent = async (scriptId: string, contentLink: string) => {
    try {
      const response = await fetch(`/api/ugc/scripts/${scriptId}/submit-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          final_content_link: contentLink
        })
      });
      
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response as JSON, try to get it as text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status-based message
          }
        }
        throw new Error(errorMessage);
      }
      
      // Refresh scripts list
      const updatedScripts = await getUgcCreatorScriptsByConceptStatus(brandId, activeStatus);
      setScripts(updatedScripts);
      
    } catch (err: unknown) {
      console.error('Failed to submit content:', err);
      setError(`Failed to submit content: ${err instanceof Error ? err.message : 'Unknown error'}`);
      throw err; // Re-throw so the ScriptCard can handle the error state
    }
  };

  // Handle creator selection
  const handleCreatorSelection = (creatorId: string) => {
    // Check if this is a toggle action
    if (selectedCreators.includes(creatorId)) {
      // Remove the creator if already selected
      setSelectedCreators(prev => prev.filter(id => id !== creatorId));
    } else {
      // Add the creator to the selection
      setSelectedCreators(prev => [...prev, creatorId]);
    }
  };

  // Add a function to filter creators by search term and status
  const filteredCreators = creators.filter(creator => {
    const matchesSearch = creator.name.toLowerCase().includes(creatorSearch.toLowerCase());
    const matchesStatus = activeCreatorStatus === 'All' || creator.status === activeCreatorStatus;
    return matchesSearch && matchesStatus;
  });

  // Get creator count by status for filter badges
  const getCreatorCountByStatus = (status: string) => {
    if (status === 'All') return creators.length;
    return creators.filter(creator => creator.status === status).length;
  };

  // Submit script for approval
  const handleSubmitScript = async () => {
    if (!brand || !title) {
      setError('Please provide a title for the script.');
      return;
    }
    
    // Always require at least the TBD creator or a real creator
    if (selectedCreators.length === 0) {
      setError('Please select at least one creator or choose "To Be Determined".');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // If there's a reference video, upload it first
      let finalVideoUrl = null;
      if (referenceVideo) {
        try {
          setUploadingVideo(true);
          finalVideoUrl = await uploadVideoForAI(referenceVideo);
          console.log('Reference video uploaded successfully:', finalVideoUrl);
        } catch (uploadError) {
          console.error('Failed to upload reference video:', uploadError);
          throw new Error(`Failed to upload video: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        } finally {
          setUploadingVideo(false);
        }
      }
      
      // Check if we're using TBD creator - use the special TBD ID instead of null
      const firstCreatorId = selectedCreators[0] === 'TBD' ? TBD_CREATOR_ID : selectedCreators[0];
      
      // Create script with pending approval status
      const newScript = {
        brand_id: brand.id,
        user_id: user?.id,
        creator_id: firstCreatorId, // Always provide a non-null UUID
        title: title,
        status: 'PENDING_APPROVAL',
        concept_status: 'Script Approval',
        script_content: scriptContent,
        b_roll_shot_list: bRollShotList.filter(shot => shot.trim() !== ''),
        hook_body: hookBody,
        cta: cta,
        company_description: companyDescription,
        guide_description: guideDescription,
        filming_instructions: filmingInstructions,
        creative_strategist: creativeStrategist.trim() || null,
        // Use the permanent uploaded URL instead of the temporary blob URL
        inspiration_video_url: finalVideoUrl || null,
        inspiration_video_notes: referenceVideoNotes || null,
        // Store additional creators as metadata if more than one
        additional_creators: selectedCreators.length > 1 ? 
          selectedCreators.filter(id => id !== 'TBD' && id !== firstCreatorId) : 
          null,
        // Flag to indicate this is a TBD creator
        is_tbd_creator: selectedCreators[0] === 'TBD'
      };
      
      console.log('Submitting script for approval:', {
        title: newScript.title,
        brand_id: newScript.brand_id,
        user_id: newScript.user_id,
        creator_id: newScript.creator_id,
        is_tbd_creator: newScript.is_tbd_creator,
        scriptContentLength: JSON.stringify(newScript.script_content).length
      });
      
      // Create the script
      const response = await fetch('/api/ugc/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScript)
      });
      
      // Get response data before checking status
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Script creation failed:', responseData);
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse the error response as JSON, try to get it as text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch {
            // If all else fails, use the status-based message
          }
        }
        throw new Error(errorMessage);
      }
      
      console.log('Script created successfully:', responseData);
      
      // Reset form fields
      setTitle('');
      setSelectedCreators([]);
      setScriptContent({
        scene_start: '',
        segments: [{ segment: 'Initial Approach', script: '', visuals: '' }],
        scene_end: ''
      });
      setBRollShotList([]);
      setHookBody('');
      setCta('');
      setCreativeStrategist('');
      setReferenceVideo(null);
      setReferenceVideoUrl('');
      setReferenceVideoNotes('');
      
      // Switch to concept view with Script Approval status
      setActiveView('concept');
      setActiveStatus('Script Approval');
      
    } catch (err: unknown) {
      console.error('Failed to save script:', err);
      if (err instanceof Error) {
        setError(`Failed to save script: ${err.message}`);
      } else {
        setError(`Failed to save script: Unexpected error occurred`);
      }
    } finally {
      setSaving(false);
    }
  };

  // Generate debug prompt data
  const generateDebugPromptData = () => {
    if (!brand) return '';
    
    // Format reference video data if it exists
    let referenceVideoData;
    if (referenceVideo) {
      referenceVideoData = {
        url: 'PREVIEW_URL_WILL_BE_GENERATED_UPON_UPLOAD',
        type: referenceVideo.type
      };
    }
    
    // Prepare the data that would be sent to the AI
    const promptData = {
      brandContext: {
        brand_info_data: brand.brand_info_data || {},
        target_audience_data: brand.target_audience_data || {},
        competition_data: brand.competition_data || {},
        ugc_company_description: companyDescription,
        ugc_guide_description: guideDescription,
        ugc_filming_instructions: filmingInstructions
      },
      customPrompt: aiCustomPrompt,
      systemInstructions: systemInstructions || defaultSystemInstructions,
      referenceVideo: referenceVideoData,
      hookOptions: {
        type: hookType,
        count: hookCount
      },
      company_description: companyDescription,
      guide_description: guideDescription,
      filming_instructions: filmingInstructions
    };
    
    // Convert to formatted JSON string
    return JSON.stringify(promptData, null, 2);
  };
  
  // Show debug prompt data
  const handleShowDebugPrompt = () => {
    setDebugPromptData(generateDebugPromptData());
    setShowDebugModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>Brand not found.</AlertDescription>
        </Alert>
        <Link href="/app/powerbrief">
          <Button className="mt-4">
            Back to Brands
          </Button>
        </Link>
      </div>
    );
  }

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
      
      <Tabs value={activeView} onValueChange={(v: string) => handleViewChange(v as 'concept' | 'script' | 'creator' | 'settings')}>
        <TabsList className="mb-4">
          <TabsTrigger value="concept">Concept View</TabsTrigger>
          <TabsTrigger value="script">Script Creation</TabsTrigger>
          <TabsTrigger value="creator">Creator View</TabsTrigger>
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
                    return (
                      <Button
                        key={status}
                        variant={activeStatus === status ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setActiveStatus(status)}
                        className="whitespace-nowrap"
                      >
                        {status}
                        {status === activeStatus && scripts.length > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs">
                            {scripts.length}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
                
                {scripts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No scripts found with the status: {activeStatus}</p>
                    {activeStatus === 'Script Approval' && (
                      <Button
                        onClick={() => setActiveView('script')}
                        className="mt-4"
                      >
                        Create New Script
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scripts.map((script) => (
                      <ScriptCard 
                        key={script.id} 
                        script={script}
                        showActionButtons={true}
                        onApprove={handleApproveScript}
                        onRequestRevision={handleRequestRevision}
                        onAssign={activeStatus === 'Creator Assignment' ? 
                          handleAssignScript : undefined}
                        onCreatorApprove={activeStatus === 'Send Script to Creator' ?
                          handleCreatorApprove : undefined}
                        onCreatorReject={activeStatus === 'Send Script to Creator' ?
                          handleCreatorReject : undefined}
                        onApproveContent={activeStatus === 'Content Approval' ?
                          handleApproveContent : undefined}
                        onRequestContentRevision={activeStatus === 'Content Approval' ?
                          handleRequestContentRevision : undefined}
                        onSubmitContent={activeStatus === 'Creator Shooting' ?
                          handleSubmitContent : undefined}
                        onDelete={handleDeleteScript}
                        creators={creators}
                        brandId={brandId}
                      />
                    ))}
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
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="custom-prompt">Custom Prompt (Optional)</Label>
                    <Textarea
                      id="custom-prompt"
                      value={aiCustomPrompt}
                      onChange={(e) => setAiCustomPrompt(e.target.value)}
                      placeholder="Provide custom instructions for the AI to follow when generating the script"
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="hook-type">Hook Type</Label>
                      <Select 
                        value={hookType} 
                        onValueChange={setHookType}
                      >
                        <SelectTrigger id="hook-type" className="mt-1 w-full">
                          <SelectValue placeholder="Select hook type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="verbal">Verbal</SelectItem>
                          <SelectItem value="question">Question</SelectItem>
                          <SelectItem value="statistic">Statistic</SelectItem>
                          <SelectItem value="testimonial">Testimonial</SelectItem>
                          <SelectItem value="problem-solution">Problem-Solution</SelectItem>
                          <SelectItem value="controversial">Controversial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="hook-count">Number of Hooks</Label>
                      <Select 
                        value={hookCount.toString()} 
                        onValueChange={(v) => setHookCount(parseInt(v))}
                      >
                        <SelectTrigger id="hook-count" className="mt-1 w-full">
                          <SelectValue placeholder="Select number" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Reference Video (Optional)</Label>
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
                            <span className="ml-2 text-sm text-gray-500 truncate max-w-[200px]">
                              {referenceVideo?.name}
                            </span>
                          </div>
                          
                          <div className="max-w-md">
                            <Label>Reference Video Preview</Label>
                            <video 
                              src={referenceVideoUrl} 
                              controls 
                              className="w-full h-auto rounded-md mt-1 border"
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
                  
                  <div className="flex space-x-4">
                    <Button
                      onClick={handleGenerateScript}
                      disabled={generatingScript || uploadingVideo}
                      className="mt-4"
                    >
                      {generatingScript ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {uploadingVideo ? 'Uploading Video...' : 'Generating...'}
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Script with AI
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={handleShowDebugPrompt}
                      variant="outline"
                      className="mt-4"
                      title="View what will be sent to the AI"
                    >
                      <Bug className="h-4 w-4 mr-2" />
                      Debug Prompt
                    </Button>
                  </div>
                </TabsContent>
                
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
                </TabsContent>
                
                <TabsContent value="metadata" className="space-y-6">
                  <div className="rounded-md border border-gray-200">
                    <div className="px-4 py-3 border-b bg-gray-50">
                      <Label htmlFor="creator-select" className="text-sm font-medium">
                        Assign to Creator(s)
                      </Label>
                    </div>
                    <div className="p-4 space-y-4">
                      {/* TBD Option styled as a card */}
                      <div className="rounded-md border border-gray-200 bg-gray-50 p-3 flex items-center hover:bg-gray-100 transition-colors">
                        <input 
                          type="checkbox" 
                          id="tbd-creator" 
                          checked={selectedCreators.includes('TBD')}
                          onChange={() => handleCreatorSelection('TBD')}
                          className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          aria-label="Select TBD option"
                          title="To Be Determined"
                        />
                        <Label htmlFor="tbd-creator" className="ml-2 flex-1 cursor-pointer font-medium">
                          To Be Determined (TBD)
                        </Label>
                      </div>
                      
                      {/* Creator search */}
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Search creators..."
                          value={creatorSearch}
                          onChange={(e) => setCreatorSearch(e.target.value)}
                          className="pl-9"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                          </svg>
                        </div>
                        {creatorSearch && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 h-7 w-7 transform -translate-y-1/2 p-0"
                            onClick={() => setCreatorSearch('')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      {/* Creator list */}
                      {creators.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <p>No creators available. Create some creators first.</p>
                          <Button
                            onClick={() => setShowNewCreatorDialog(true)}
                            variant="outline"
                            className="mt-2"
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            New Creator
                          </Button>
                        </div>
                      ) : filteredCreators.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <p>No creators match your search.</p>
                        </div>
                      ) : (
                        <div className="border rounded-md overflow-hidden">
                          <div className="max-h-[300px] overflow-y-auto">
                            {filteredCreators.map((creator) => (
                              <div 
                                key={creator.id} 
                                className={`flex items-center p-3 hover:bg-gray-50 transition-colors ${
                                  selectedCreators.includes(creator.id) ? 'bg-blue-50' : ''
                                }`}
                              >
                                <input 
                                  type="checkbox" 
                                  id={`creator-${creator.id}`} 
                                  checked={selectedCreators.includes(creator.id)}
                                  onChange={() => handleCreatorSelection(creator.id)}
                                  className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  aria-label={`Select creator ${creator.name}`}
                                  title={`Select ${creator.name}`}
                                />
                                <Label htmlFor={`creator-${creator.id}`} className="ml-2 flex-1 cursor-pointer">
                                  <div className="font-medium">{creator.name}</div>
                                  {creator.email && <div className="text-xs text-gray-500">{creator.email}</div>}
                                </Label>
                                
                                {selectedCreators.includes(creator.id) && (
                                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                    Selected
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        Select &quot;TBD&quot; to create without a specific creator, or choose one or more creators. 
                        You can change the assignment later.
                      </p>
                      
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium">Selected:</span>
                        <span className="text-gray-500">
                          {selectedCreators.length === 0 
                            ? 'None' 
                            : selectedCreators.includes('TBD') 
                              ? 'TBD' 
                              : `${selectedCreators.length} creator(s)`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="creative-strategist">Creative Strategist (Optional)</Label>
                    <Input
                      id="creative-strategist"
                      value={creativeStrategist}
                      onChange={(e) => setCreativeStrategist(e.target.value)}
                      placeholder="Enter creative strategist name"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Name of the creative strategist assigned to this script.
                    </p>
                  </div>
                  
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
                
                <TabsContent value="system" className="space-y-6">
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="system-instructions">System Instructions</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSystemInstructions(defaultSystemInstructions)}
                      disabled={!defaultSystemInstructions}
                    >
                      Reset to Default
                    </Button>
                  </div>
                  <Textarea
                    id="system-instructions"
                    value={systemInstructions || defaultSystemInstructions}
                    onChange={(e) => setSystemInstructions(e.target.value)}
                    placeholder="System instructions for the AI model"
                    className="mt-1 font-mono text-sm"
                    rows={12}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    These instructions define how the AI generates the script. If left empty, default instructions from settings will be used.
                  </p>
                </TabsContent>
              </Tabs>
              
              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleSubmitScript}
                  disabled={!title || saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Submit for Approval
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
              <CardTitle>UGC Creators</CardTitle>
              <CardDescription>View and manage your UGC creators by their onboarding status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Status Filter Buttons */}
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  <Button
                    variant={activeCreatorStatus === 'All' ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setActiveCreatorStatus('All')}
                    className="whitespace-nowrap"
                  >
                    All Creators
                    {activeCreatorStatus === 'All' && creators.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs">
                        {getCreatorCountByStatus('All')}
                      </span>
                    )}
                  </Button>
                  {UGC_CREATOR_ONBOARDING_STATUSES.map((status) => {
                    const count = getCreatorCountByStatus(status);
                    return (
                      <Button
                        key={status}
                        variant={activeCreatorStatus === status ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setActiveCreatorStatus(status)}
                        className="whitespace-nowrap"
                      >
                        {status}
                        {activeCreatorStatus === status && count > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs">
                            {count}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>

                {creators.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No creators found. Add your first creator to get started!</p>
                    <Button
                      onClick={() => setShowNewCreatorDialog(true)}
                      className="mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Creator
                    </Button>
                  </div>
                ) : filteredCreators.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No creators found with the status: {activeCreatorStatus}</p>
                    <Button
                      onClick={() => setActiveCreatorStatus('All')}
                      variant="outline"
                      className="mt-4"
                    >
                      Show All Creators
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCreators.map((creator) => (
                      <CreatorCard key={creator.id} creator={creator} brandId={brandId} />
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
                    placeholder="Enter default system instructions for AI script generation"
                    className="mt-1 font-mono text-sm"
                    rows={10}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    These instructions will be used by the AI when generating UGC scripts. They provide guidance on the structure and content of the generated scripts.
                  </p>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Debug Dialog */}
      <Dialog open={showDebugModal} onOpenChange={setShowDebugModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Debug: AI Prompt Data</DialogTitle>
            <DialogDescription>
              This is what will be sent to the AI model when generating a script
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-[60vh]">
            <pre className="text-xs font-mono whitespace-pre-wrap">{debugPromptData}</pre>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDebugModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
    </div>
  );
} 