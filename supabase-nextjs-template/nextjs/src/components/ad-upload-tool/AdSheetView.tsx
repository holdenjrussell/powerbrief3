"use client";
import React, { useState, useEffect, useMemo } from 'react';
import {
  UploadCloud,
  Filter,
  Trash2,
  PlusCircle,
  Columns,
  Edit,
  Rocket,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Zap,
  Brain
} from 'lucide-react';
import AssetImportModal from './AssetImportModal';
import MetaCampaignSelector from './MetaCampaignSelector';
import MetaAdSetSelector from './MetaAdSetSelector';
// Import shared types
import {
    AdDraft,
    AdDraftAsset,
    AdCreativeStatus,
    adCreativeStatusOptions,
    AppAdDraftStatus,
    appAdDraftStatusOptions,
    callToActionOptions,
    ColumnDef,
    ImportedAssetGroup,
    AdSheetDefaultValues as DefaultValues,
    BulkEditableAdDraftFields
} from './adUploadTypes';
import BulkEditModal from './BulkEditModal'; // Import BulkEditModal
import BulkRenameModal from './BulkRenameModal'; // Import BulkRenameModal
import { needsCompression, compressVideoWithQuality, getFileSizeMB } from '@/lib/utils/videoCompression';
import { createSPAClient } from '@/lib/supabase/client';

// DefaultValues interface is now imported and aliased
// ColumnDef interface is now imported
// AdCreativeStatus type is now imported
// AdDraft interface is now imported
// ImportedAssetGroup interface is now imported
// callToActionOptions and adCreativeStatusOptions are now imported

interface AdSheetViewProps {
  defaults: DefaultValues; // Uses the imported and aliased DefaultValues
  activeBatch?: AdBatch | null; // Optional active batch info
  selectedConfiguration?: { id: string; name: string; description?: string } | null; // Selected configuration info
}

interface AdBatch {
  id: string;
  name: string;
  brand_id: string;
  ad_account_id: string | null;
  campaign_id: string | null;
  ad_set_id: string | null;
  fb_page_id: string | null;
  ig_account_id: string | null;
  pixel_id: string | null;
  url_params: string | null;
  destination_url: string | null;
  call_to_action: string | null;
  status: string;
  primary_text: string | null;
  headline: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CopyGenerationResult {
  assetId: string;
  assetName: string;
  adDraftId: string;
  adDraftName: string;
  generatedCopy?: {
    Headline: string;
    "Body Copy": string;
    Description: string;
  };
  error?: string;
  success: boolean;
}

const initialColumns: ColumnDef<AdDraft>[] = [
    { id: 'select', label: 'Select', visible: true, type: 'custom' as const },
    { id: 'adName', label: 'Ad Name', visible: true, type: 'text' as const },
    { id: 'primaryText', label: 'Primary Text', visible: true, type: 'textarea' as const },
    { id: 'headline', label: 'Headline', visible: true, type: 'text' as const },
    { id: 'description', label: 'Description', visible: false, type: 'text' as const },
    { id: 'campaignId', label: 'Campaign', visible: true, type: 'custom' as const }, 
    { id: 'adSetId', label: 'Ad Set', visible: true, type: 'custom' as const }, 
    { id: 'destinationUrl', label: 'Destination URL', visible: true, type: 'url' as const },
    { id: 'callToAction', label: 'Call To Action', visible: true, type: 'select' as const, options: callToActionOptions.map(cta => cta.replace(/_/g, ' ')) },
    { id: 'assets', label: 'Assets', visible: true, type: 'custom' as const }, 
    { id: 'status', label: 'Ad Status', visible: true, type: 'status' as const }, 
    { id: 'appStatus', label: 'Meta Upload Status', visible: true, type: 'appStatus' as const }, 
];

// Define a more specific type for the value in handleCellValueChange
type AdDraftValue = AdDraft[keyof AdDraft];

const AdSheetView: React.FC<AdSheetViewProps> = ({ defaults, activeBatch, selectedConfiguration }) => {
  const [adDrafts, setAdDrafts] = useState<AdDraft[]>([]);
  const [columns, setColumns] = useState<ColumnDef<AdDraft>[]>(initialColumns);
  const [isColumnDropdownOpen, setColumnDropdownOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{rowIndex: number; columnId: string} | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [checkedDraftIds, setCheckedDraftIds] = useState<Set<string>>(new Set());
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false); // State for bulk edit modal
  const [isBulkRenameModalOpen, setIsBulkRenameModalOpen] = useState(false); // State for bulk rename modal
  const [draftsForBulkEdit, setDraftsForBulkEdit] = useState<AdDraft[]>([]); // State to hold drafts for modal
  const [isLaunching, setIsLaunching] = useState(false); // State for launch loading
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hidePublished, setHidePublished] = useState(true); // Simple toggle for hiding published ads
  const [isCompressing, setIsCompressing] = useState(false); // State for video compression
  const [compressionProgress, setCompressionProgress] = useState<{[key: string]: number}>({}); // Progress per asset
  
  // Add new state for copy generation
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [showCopyResultsModal, setShowCopyResultsModal] = useState(false);
  const [copyResults, setCopyResults] = useState<CopyGenerationResult[]>([]);
  const [showCustomPromptModal, setShowCustomPromptModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Asset preview modal state
  const [assetPreviewModal, setAssetPreviewModal] = useState<{
    isOpen: boolean;
    assets: AdDraftAsset[];
    currentIndex: number;
  }>({
    isOpen: false,
    assets: [],
    currentIndex: 0
  });

  // Log active batch for debugging
  console.log('Active batch in AdSheetView:', activeBatch?.name || 'No active batch');
  console.log('Current adDrafts count:', adDrafts.length);
  console.log('Current filter:', hidePublished);
  console.log('Filtered drafts count:', adDrafts.filter(draft => !hidePublished || draft.appStatus !== 'PUBLISHED').length);
  
  // Enhanced debugging for filter function
  console.log('🔧 FILTER DEBUG:');
  console.log('- Raw adDrafts:', adDrafts.map(d => ({ id: d.id, name: d.adName, appStatus: d.appStatus })));
  console.log('- Filter includes PUBLISHED?', !hidePublished);
  console.log('- Filter includes UPLOADED?', !hidePublished);
  console.log('- Drafts with PUBLISHED status:', adDrafts.filter(d => d.appStatus === 'PUBLISHED').length);
  console.log('- Drafts with UPLOADED status:', adDrafts.filter(d => d.appStatus === 'UPLOADED').length);
  console.log('- Drafts with UPLOADING status:', adDrafts.filter(d => d.appStatus === 'UPLOADING').length);
  console.log('- Drafts with DRAFT status:', adDrafts.filter(d => d.appStatus === 'DRAFT').length);
  console.log('- Drafts with ERROR status:', adDrafts.filter(d => d.appStatus === 'ERROR').length);
  console.log('- Drafts with undefined status:', adDrafts.filter(d => !d.appStatus).length);

  // Filter ads based on selected app statuses
  const filteredAdDrafts = adDrafts.filter(draft => 
    !hidePublished || draft.appStatus !== 'PUBLISHED'
  );

  // Add debugging for filtered results
  console.log('🎯 FILTERED RESULTS:');
  console.log('- Filtered drafts:', filteredAdDrafts.map(d => ({ id: d.id, name: d.adName, appStatus: d.appStatus })));
  console.log('- Total filtered count:', filteredAdDrafts.length);

  const allDraftsChecked = useMemo(() => {
    return filteredAdDrafts.length > 0 && checkedDraftIds.size === filteredAdDrafts.length;
  }, [filteredAdDrafts, checkedDraftIds]);

  const handleSelectAllDraftsToggle = () => {
    if (allDraftsChecked) {
      setCheckedDraftIds(new Set());
    } else {
      setCheckedDraftIds(new Set(filteredAdDrafts.map(draft => draft.id)));
    }
  };

  const toggleDraftChecked = (draftId: string) => {
    setCheckedDraftIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(draftId)) {
        newSet.delete(draftId);
      } else {
        newSet.add(draftId);
      }
      return newSet;
    });
  };

  const openBulkEditModal = () => {
    if (checkedDraftIds.size === 0) {
        alert("Please select at least one ad draft to edit.");
        return;
    }
    const selectedDrafts = filteredAdDrafts.filter(draft => checkedDraftIds.has(draft.id));
    setDraftsForBulkEdit(selectedDrafts);
    setIsBulkEditModalOpen(true);
  };

  const openBulkRenameModal = () => {
    if (checkedDraftIds.size === 0) {
        alert("Please select at least one ad draft to rename.");
        return;
    }
    setIsBulkRenameModalOpen(true);
  };

  const handleBulkRename = async () => {
    // Refresh the ad drafts after renaming
    await refreshAdDrafts();
    // Clear selection
    setCheckedDraftIds(new Set());
  };

  const handleApplyBulkEdit = (updatedValues: BulkEditableAdDraftFields, fieldsToApply: Record<keyof BulkEditableAdDraftFields, boolean>) => {
    setAdDrafts(prevDrafts => 
        prevDrafts.map(draft => {
            if (checkedDraftIds.has(draft.id)) {
                const newDraft = { 
                  ...draft,
                  // Ensure brandId is preserved
                  brandId: draft.brandId || defaults.brandId || undefined
                }; 

                // Iterate over the keys of BulkEditableAdDraftFields that are marked for update
                let k: keyof BulkEditableAdDraftFields;
                for (k in fieldsToApply) {
                    if (fieldsToApply[k] && updatedValues[k] !== undefined) {
                        // Assign properties carefully, respecting their types
                        // This requires knowing the structure of AdDraft and BulkEditableAdDraftFields
                        // For example:
                        if (k === 'primaryText' && typeof updatedValues.primaryText === 'string') {
                            newDraft.primaryText = updatedValues.primaryText;
                        } else if (k === 'headline' && typeof updatedValues.headline === 'string') {
                            newDraft.headline = updatedValues.headline;
                        } else if (k === 'description' && typeof updatedValues.description === 'string') {
                            newDraft.description = updatedValues.description;
                        } else if (k === 'destinationUrl' && typeof updatedValues.destinationUrl === 'string') {
                            newDraft.destinationUrl = updatedValues.destinationUrl;
                        } else if (k === 'callToAction' && typeof updatedValues.callToAction === 'string') {
                            newDraft.callToAction = updatedValues.callToAction;
                        } else if (k === 'status' && typeof updatedValues.status === 'string') {
                            // Ensure the status is a valid AdCreativeStatus
                            if (adCreativeStatusOptions.includes(updatedValues.status as AdCreativeStatus)) {
                                newDraft.status = updatedValues.status as AdCreativeStatus;
                            }
                        } else if (k === 'campaignId') {
                            newDraft.campaignId = updatedValues.campaignId === undefined ? null : updatedValues.campaignId;
                            newDraft.campaignName = updatedValues.campaignName === undefined ? null : updatedValues.campaignName;
                            newDraft.adSetId = null;
                            newDraft.adSetName = null; // Also reset ad set name when campaign changes
                        } else if (k === 'campaignName') {
                            newDraft.campaignName = updatedValues.campaignName === undefined ? null : updatedValues.campaignName;
                        } else if (k === 'adSetId' && fieldsToApply.campaignId === false) {
                            // Only update adSetId if campaignId is NOT being updated in the same bulk operation
                            // or if campaignId in formData matched the draft's original campaignId (more complex check)
                            // For simplicity now: if campaignId is bulk-edited, adSetId is reset above.
                            // This allows adSetId to be set if only it's selected for update.
                            newDraft.adSetId = updatedValues.adSetId === undefined ? null : updatedValues.adSetId;
                        } else if (k === 'adSetName' && fieldsToApply.campaignId === false) {
                            newDraft.adSetName = updatedValues.adSetName === undefined ? null : updatedValues.adSetName;
                        }
                        // Note: This explicit mapping can become long. 
                        // The previous dynamic approach is common but faces stricter linting.
                    }
                }
                return newDraft;
            }
            return draft;
        })
    );
    setIsBulkEditModalOpen(false);
    setCheckedDraftIds(new Set()); 
  };

  useEffect(() => {
    if (defaults && adDrafts.length === 0) {}
  }, [defaults, adDrafts.length]); 

  const handleAddRow = () => {
    const newDraft: AdDraft = {
      id: crypto.randomUUID(),
      brandId: defaults.brandId || undefined,
      adName: `New Ad ${adDrafts.length + 1}`,
      primaryText: defaults.primaryText,      
      headline: defaults.headline,       
      description: defaults.description,  
      campaignId: defaults.campaignId,
      campaignName: defaults.campaignName, // Include campaign name
      adSetId: defaults.adSetId,
      adSetName: defaults.adSetName, // Include ad set name       
      destinationUrl: defaults.destinationUrl,  
      callToAction: defaults.callToAction, 
      assets: [],
      status: defaults.status as AdCreativeStatus,
      appStatus: 'DRAFT', // Default meta upload status
      // Add new Meta features from defaults
      siteLinks: [...(defaults.siteLinks || [])],
      advantageCreative: { ...defaults.advantageCreative }
    };
    setAdDrafts(prev => [...prev, newDraft]);
  };

  const handleAssetsImported = (importedAssetGroups: ImportedAssetGroup[]) => {
    const newAdDrafts: AdDraft[] = importedAssetGroups.map((group, index) => {
        const adNameFromAsset = group.groupName.replace(/\.[^/.]+$/, "");
        return {
            id: crypto.randomUUID(),
            brandId: defaults.brandId || undefined,
            adName: `${adNameFromAsset} (Ad ${adDrafts.length + index + 1})`,
            primaryText: defaults.primaryText, 
            headline: defaults.headline, 
            description: defaults.description,
            campaignId: defaults.campaignId,
            campaignName: defaults.campaignName, // Include campaign name
            adSetId: defaults.adSetId,
            adSetName: defaults.adSetName, // Include ad set name       
            destinationUrl: defaults.destinationUrl, 
            callToAction: defaults.callToAction, 
            assets: group.files.map(asset => ({
                name: asset.name,
                supabaseUrl: asset.supabaseUrl,
                type: asset.type,
                aspectRatios: asset.detectedAspectRatio ? [asset.detectedAspectRatio] : undefined,
            })),
            status: defaults.status as AdCreativeStatus,
            appStatus: 'DRAFT', // Default meta upload status
            // Add new Meta features from defaults
            siteLinks: [...(defaults.siteLinks || [])],
            advantageCreative: { ...defaults.advantageCreative }
        };
    });
    setAdDrafts(prev => [...prev, ...newAdDrafts]);
    setIsAssetModalOpen(false);
  };

  const handleCellValueChange = (rowIndex: number, columnId: Extract<keyof AdDraft, string>, value: AdDraftValue) => {
    setAdDrafts(prevDrafts => {
      const updatedDrafts = prevDrafts.map((draft, index) => {
        if (index === rowIndex) {
          const newDraft = { 
            ...draft, 
            [columnId]: value,
            // Ensure brandId is preserved
            brandId: draft.brandId || defaults.brandId || undefined
          };
          if (columnId === 'campaignId') {
            newDraft.adSetId = null;
            newDraft.adSetName = null; // Also reset ad set name when campaign changes
          }
          if (columnId === 'status' && !adCreativeStatusOptions.includes(value as AdCreativeStatus)) {
            console.warn('Attempted to set invalid status:', value);
            return draft; 
          }
          if (columnId === 'appStatus' && !appAdDraftStatusOptions.includes(value as AppAdDraftStatus)) {
            console.warn('Attempted to set invalid app status:', value);
            return draft; 
          }
          if (columnId === 'callToAction' && !callToActionOptions.includes(value as string)){
            console.warn('Attempted to set invalid CTA:', value);
            return draft; 
          }
          return newDraft;
        }
        return draft;
      });
      return updatedDrafts;
    });
  };

  const toggleColumnVisibility = (columnId: string) => {
    if (columnId === 'select') return;
    setColumns(prevCols =>
      prevCols.map(col =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleDeleteRow = async (rowIndex: number) => {
    const draftToRemove = filteredAdDrafts[rowIndex];
    
    // Delete from database first
    try {
      const response = await fetch('/api/ad-drafts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftIds: [draftToRemove.id] }),
      });
      
      if (!response.ok) throw new Error('Failed to delete draft from database');
    } catch (error) {
      console.error('Error deleting draft:', error);
      return; // Don't update UI if database delete failed
    }
    
    // Update local state after successful database delete
    setAdDrafts(prev => prev.filter((_, index) => index !== rowIndex));
    setCheckedDraftIds(prev => { 
        const newSet = new Set(prev);
        newSet.delete(draftToRemove.id);
        return newSet;
    });
  };
  
  // Load existing ad drafts on component mount
  useEffect(() => {
    const loadAdDrafts = async () => {
      if (!defaults.brandId) return;
      
      try {
        setLoading(true);
        const params = new URLSearchParams({
          brandId: defaults.brandId
        });
        
        // Remove batch filtering - load ALL ads for the brand
        console.log('🔍 Loading ALL drafts for brand:', defaults.brandId);
        
        const apiUrl = `/api/ad-drafts?${params}`;
        console.log('🌐 API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Failed to load ad drafts');
        
        const existingDrafts: AdDraft[] = await response.json();
        console.log('📦 Raw drafts from API:', existingDrafts.length, existingDrafts);
        
        // Ensure all drafts have brandId set (safety check for existing drafts)
        const draftsWithBrandId = existingDrafts.map(draft => ({
          ...draft,
          brandId: draft.brandId || defaults.brandId || undefined
        }));
        
        console.log('✅ Final drafts to display:', draftsWithBrandId.length, draftsWithBrandId);
        setAdDrafts(draftsWithBrandId);
      } catch (error) {
        console.error('Error loading ad drafts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdDrafts();
  }, [defaults.brandId]); // Remove activeBatch?.id dependency

  // Monitor filter changes for debugging
  useEffect(() => {
    console.log('🔧 Filter state changed:', hidePublished);
    console.log('🔧 Published ads included?', !hidePublished);
    console.log('🔧 Current drafts that match filter:', 
      adDrafts.filter(draft => !hidePublished || draft.appStatus !== 'PUBLISHED').length
    );
  }, [hidePublished, adDrafts]);

  // Function to refresh ad drafts data
  const refreshAdDrafts = async () => {
    if (!defaults.brandId) return;
    
    try {
      const params = new URLSearchParams({
        brandId: defaults.brandId
      });
      
      // Remove batch filtering - refresh ALL ads for the brand
      console.log('🔄 Refreshing ALL drafts for brand:', defaults.brandId);
      
      const apiUrl = `/api/ad-drafts?${params}`;
      console.log('🌐 Refresh API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Failed to refresh ad drafts');
      
      const existingDrafts: AdDraft[] = await response.json();
      console.log('🔄 Refreshed drafts from API:', existingDrafts.length, existingDrafts);
      
      // Log status breakdown of refreshed drafts
      const statusBreakdown = existingDrafts.reduce((acc, draft) => {
        const status = draft.appStatus || 'UNDEFINED';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log('🔄 Status breakdown after refresh:', statusBreakdown);
      
      // Ensure all drafts have brandId set (safety check for existing drafts)
      const draftsWithBrandId = existingDrafts.map(draft => ({
        ...draft,
        brandId: draft.brandId || defaults.brandId || undefined
      }));
      
      console.log('✅ Setting refreshed drafts in state:', draftsWithBrandId.length);
      setAdDrafts(draftsWithBrandId);
      
      // Log current filter state after refresh
      console.log('🔄 Current filter after refresh:', hidePublished);
      console.log('🔄 Drafts that will be visible after refresh:', 
        draftsWithBrandId.filter(draft => !hidePublished || draft.appStatus !== 'PUBLISHED').length
      );
      
    } catch (error) {
      console.error('Error refreshing ad drafts:', error);
    }
  };

  const handleLaunch = async () => {
    if (checkedDraftIds.size === 0) {
      alert("Please select at least one ad draft to launch.");
      return;
    }

    // Validate required Meta assets before launching
    const missingAssets = [];
    if (!defaults.brandId) missingAssets.push('Brand ID');
    if (!defaults.adAccountId) missingAssets.push('Ad Account ID');
    if (!defaults.fbPage) missingAssets.push('Facebook Page ID');
    
    // Instagram User ID is optional - ads will be Facebook-only if missing
    const hasInstagramUser = defaults.igAccount && defaults.igAccount.trim() !== '';

    if (missingAssets.length > 0) {
      alert(`Missing required Meta assets: ${missingAssets.join(', ')}. Please complete your Meta integration in brand settings.`);
      return;
    }

    // Exponential backoff retry logic for launch API
    const launchWithRetry = async (payload: Record<string, unknown>, maxRetries = 3): Promise<Response> => {
      let lastError: Error;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch('/api/meta/launch-ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          
          // If successful or client error (4xx), return immediately
          if (response.ok || (response.status >= 400 && response.status < 500)) {
            return response;
          }
          
          // For server errors (5xx), retry with backoff
          if (response.status >= 500 && attempt < maxRetries) {
            const delay = Math.min(2000 * Math.pow(2, attempt), 30000); // Cap at 30 seconds for launch
            console.log(`Launch API server error (${response.status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // If we've exhausted retries, throw the error
          throw new Error(`Launch API error: ${response.status} ${response.statusText}`);
          
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Unknown error');
          
          // For network errors, retry with backoff
          if (attempt < maxRetries) {
            const delay = Math.min(2000 * Math.pow(2, attempt), 30000); // Cap at 30 seconds for launch
            console.log(`Launch API network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1}):`, err);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
      }
      
      throw lastError!;
    };

    setIsLaunching(true);
    const draftsToLaunch = filteredAdDrafts.filter(draft => checkedDraftIds.has(draft.id));
    
    // Enhanced logging for debugging
    console.log("=== AD LAUNCH REQUEST DEBUG ===");
    console.log("Drafts to launch:", draftsToLaunch.length);
    console.log("Request payload validation:");
    console.log("- Brand ID:", defaults.brandId);
    console.log("- Ad Account ID:", defaults.adAccountId);
    console.log("- Facebook Page ID:", defaults.fbPage);
    console.log("- Instagram User ID:", defaults.igAccount || 'NOT SET (will create Facebook-only ads)');
    console.log("- Has Instagram User:", hasInstagramUser);
    
    // Log each draft being launched
    draftsToLaunch.forEach((draft, index) => {
      console.log(`Draft ${index + 1}:`, {
        id: draft.id,
        adName: draft.adName,
        campaignId: draft.campaignId,
        adSetId: draft.adSetId,
        assetsCount: draft.assets.length,
        status: draft.status
      });
    });

    const requestPayload = { 
      drafts: draftsToLaunch, 
      brandId: defaults.brandId, 
      adAccountId: defaults.adAccountId,
      fbPageId: defaults.fbPage,
      instagramUserId: defaults.igAccount || undefined
    };

    console.log("Complete request payload:", requestPayload);
    console.log("=== END DEBUG INFO ===");

    try {
      const response = await launchWithRetry(requestPayload);
      
      const result = await response.json(); // Always try to parse JSON

      if (!response.ok) {
        throw new Error(result.message || 'Failed to launch ads');
      }
      
      alert(`Server response: ${result.message}`);
      
      // Clear checked drafts after successful launch
      setCheckedDraftIds(new Set());
      
      // Refresh the ad drafts data to show updated statuses
      console.log('🔄 Refreshing ad drafts after successful launch...');
      await refreshAdDrafts();

    } catch (error) {
      console.error("Launch error:", error);
      alert(`Error launching ads: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLaunching(false);
    }
  };

  const renderCellContent = (draft: AdDraft, column: ColumnDef<AdDraft>, rowIndex: number) => {
    if (column.id === 'select') {
        return (
            <input 
                type="checkbox"
                checked={checkedDraftIds.has(draft.id)}
                onChange={() => toggleDraftChecked(draft.id)}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                aria-label={`Select ad ${draft.adName}`}
            />
        );
    }
    
    const value = draft[column.id as keyof AdDraft];

    if (editingCell && editingCell.rowIndex === rowIndex && editingCell.columnId === column.id) {
        switch (column.type) {
            case 'text':
            case 'url':
                return (
                    <input 
                        type={column.type === 'url' ? 'url' : 'text'}
                        value={String(value || '')}
                        onChange={(e) => handleCellValueChange(rowIndex, column.id as Extract<keyof AdDraft, string>, e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        className="w-full p-1 border border-primary-500 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        autoFocus
                        aria-label={column.label}
                    />
                );
            case 'textarea':
                 return (
                    <textarea
                        value={String(value || '')}
                        onChange={(e) => handleCellValueChange(rowIndex, column.id as Extract<keyof AdDraft, string>, e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        className="w-full p-1 border border-primary-500 rounded-sm text-sm h-20 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        autoFocus
                        aria-label={column.label}
                    />
                );
            case 'select':
                if (column.id === 'callToAction') {
                    const options = callToActionOptions.map(cta => cta.replace(/_/g, ' '));
                    return (
                        <select 
                            value={String(draft.callToAction || '').replace(/_/g, ' ')}
                            onChange={(e) => {
                                const valToStore = e.target.value.replace(/ /g, '_').toUpperCase();
                                handleCellValueChange(rowIndex, 'callToAction', valToStore);
                            }}
                            onBlur={() => setEditingCell(null)}
                            className="w-full p-1 border border-primary-500 rounded-sm text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                            autoFocus
                            aria-label={column.label}
                        >
                            <option value="">-- Select --</option>
                            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    );
                }
                return <span className="truncate text-sm cursor-pointer" onClick={() => setEditingCell({rowIndex, columnId: column.id as string})}>{String(value) || '-'}</span>;
            case 'status':
                 return (
                    <select
                        value={draft.status}
                        onChange={(e) => handleCellValueChange(rowIndex, 'status', e.target.value as AdCreativeStatus)}
                        onBlur={() => setEditingCell(null)}
                        className="w-full p-1 border border-primary-500 rounded-sm text-sm bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                        autoFocus
                        aria-label="Ad Status"
                    >
                        {adCreativeStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                );
            case 'appStatus':
                const appStatusColor = 
                    draft.appStatus === 'DRAFT' ? 'bg-gray-100 text-gray-800' : 
                    draft.appStatus === 'UPLOADING' ? 'bg-blue-100 text-blue-800' :
                    draft.appStatus === 'UPLOADED' ? 'bg-purple-100 text-purple-800' :
                    draft.appStatus === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 
                    draft.appStatus === 'ERROR' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'; 
                return (
                  <span 
                    className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80 ${appStatusColor}`}
                    onClick={() => setEditingCell({rowIndex, columnId: column.id as Extract<keyof AdDraft, string>})}
                    title={`Click to edit meta upload status: ${draft.appStatus || 'DRAFT'}`}
                    >
                    {draft.appStatus || 'DRAFT'}
                  </span>
                );
            default: 
                return (
                     <input 
                        type='text'
                        value={String(value || '')}
                        onChange={(e) => handleCellValueChange(rowIndex, column.id as Extract<keyof AdDraft, string>, e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        className="w-full p-1 border border-primary-500 rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        autoFocus
                        aria-label={column.label}
                    />
                );
        }
    }

    switch (column.id) {
      case 'campaignId':
        return (
          <MetaCampaignSelector
            brandId={defaults.brandId}
            adAccountId={defaults.adAccountId}
            selectedCampaignId={draft.campaignId}
            selectedCampaignName={draft.campaignName}
            onCampaignSelect={(campaignId, campaignName) => {
              handleCellValueChange(rowIndex, 'campaignId', campaignId);
              // Also update the campaign name if available
              if (campaignName !== undefined) {
                setAdDrafts(prevDrafts => 
                  prevDrafts.map((d, i) => 
                    i === rowIndex ? { ...d, campaignName } : d
                  )
                );
              }
            }}
            disabled={!defaults.adAccountId}
          />
        );
      case 'adSetId':
        return (
          <MetaAdSetSelector
            brandId={defaults.brandId}
            adAccountId={defaults.adAccountId} 
            campaignId={draft.campaignId} 
            selectedAdSetId={draft.adSetId}
            selectedAdSetName={draft.adSetName}
            onAdSetSelect={(adSetId, adSetName) => {
              handleCellValueChange(rowIndex, 'adSetId', adSetId);
              // Also update the ad set name if available
              if (adSetName !== undefined) {
                setAdDrafts(prevDrafts => 
                  prevDrafts.map((d, i) => 
                    i === rowIndex ? { ...d, adSetName } : d
                  )
                );
              }
            }}
            disabled={!draft.campaignId} 
          />
        );
      case 'assets':
        return (
          <div className="flex flex-wrap gap-2">
            {draft.assets.length > 0 ? (
              <>
                {/* Show first 3 assets as thumbnails */}
                {draft.assets.slice(0, 3).map((asset, i) => (
                  <div
                    key={i}
                    className="relative cursor-pointer group"
                    onClick={() => setAssetPreviewModal({
                      isOpen: true,
                      assets: draft.assets,
                      currentIndex: i
                    })}
                  >
                    {asset.type === 'image' ? (
                      <img
                        src={asset.supabaseUrl}
                        alt={asset.name}
                        className="w-12 h-12 object-cover rounded border-2 border-gray-200 hover:border-blue-400 transition-colors"
                      />
                    ) : (
                      <div className="relative w-12 h-12">
                        <video
                          src={asset.supabaseUrl}
                          className="w-full h-full object-cover rounded border-2 border-gray-200 hover:border-blue-400 transition-colors"
                          muted
                        />
                        {/* Video play icon overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded">
                          <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                            <div className="w-0 h-0 border-l-2 border-l-gray-800 border-t-1 border-t-transparent border-b-1 border-b-transparent ml-0.5"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Asset type badge */}
                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-xs flex items-center justify-center text-white font-bold ${
                      asset.type === 'image' ? 'bg-blue-500' : 'bg-purple-500'
                    }`}>
                      {asset.type === 'image' ? 'I' : 'V'}
                    </div>
                    
                    {/* Compression indicator for videos */}
                    {asset.type === 'video' && asset.name.includes('_compressed') && (
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center" title="Video was compressed">
                        <Zap size={8} className="text-white" />
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Show count if more than 3 assets */}
                {draft.assets.length > 3 && (
                  <div
                    className="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => setAssetPreviewModal({
                      isOpen: true,
                      assets: draft.assets,
                      currentIndex: 3
                    })}
                  >
                    <span className="text-xs text-gray-600 font-medium">+{draft.assets.length - 3}</span>
                  </div>
                )}
                
                {/* Add assets button */}
                <div
                  className="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-green-400 transition-colors"
                  onClick={() => setIsAssetModalOpen(true)}
                >
                  <span className="text-gray-400 text-lg">+</span>
                </div>
              </>
            ) : (
              <div
                className="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => setIsAssetModalOpen(true)}
              >
                <span className="text-xs text-gray-400 text-center">Click to add</span>
              </div>
            )}
          </div>
        );
      case 'status':
        const statusColor = 
            draft.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : 
            draft.status === 'PAUSED' ? 'bg-gray-100 text-gray-800' :
            draft.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
            draft.status === 'ARCHIVED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'; 
        return (
          <span 
            className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80 ${statusColor}`}
            onClick={() => setEditingCell({rowIndex, columnId: column.id as Extract<keyof AdDraft, string>})}
            title={`Click to edit status: ${draft.status}`}
            >
            {draft.status}
          </span>
        );
      case 'callToAction':
        return (
            <span 
                className="truncate text-sm p-1 cursor-pointer hover:bg-gray-100" 
                onClick={() => setEditingCell({rowIndex, columnId: column.id as Extract<keyof AdDraft, string>})}
            >
                {(String(draft.callToAction || '').replace(/_/g, ' ')) || '-'}
            </span>
        );
      default:
        const displayValue = String(value || '-');
        
        // Special handling for primary text to allow proper text wrapping and line breaks
        if (column.id === 'primaryText') {
          return (
            <div 
              className={`text-sm p-3 min-h-[4rem] whitespace-pre-wrap break-words leading-relaxed ${column.type !== 'custom' && column.type !== 'status' ? 'cursor-pointer hover:bg-gray-100 rounded' : ''}`}
              onClick={() => {
                if (column.type !== 'custom' && column.type !== 'status') { 
                  setEditingCell({rowIndex, columnId: column.id as Extract<keyof AdDraft, string>});
                }
              }}
              title="Click to edit"
              style={{ minWidth: '300px', maxWidth: '500px' }}
            >
              {displayValue}
            </div>
          );
        }
        
        return (
            <span 
                className={`truncate text-sm p-1 ${column.type !== 'custom' && column.type !== 'status' ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                onClick={() => {
                    if (column.type !== 'custom' && column.type !== 'status') { 
                        setEditingCell({rowIndex, columnId: column.id as Extract<keyof AdDraft, string>});
                    }
                }}
                title={displayValue.length > 30 ? displayValue : ''} 
            >
                {displayValue}
            </span>
        );
    }
  };

  // Auto-save ad drafts when they change (debounced)
  useEffect(() => {
    const saveAdDrafts = async () => {
      if (!defaults.brandId || adDrafts.length === 0 || loading) return;
      
      // Ensure all drafts have brandId before saving
      const draftsWithBrandId = adDrafts.map(draft => ({
        ...draft,
        brandId: draft.brandId || defaults.brandId || undefined
      }));
      
      try {
        setSaving(true);
        const response = await fetch('/api/ad-drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adDrafts: draftsWithBrandId,
            // Remove batch association
            adBatchId: null
          }),
        });
        
        if (!response.ok) throw new Error('Failed to save ad drafts');
      } catch (error) {
        console.error('Error saving ad drafts:', error);
      } finally {
        setSaving(false);
      }
    };

    // Debounce the save operation
    const timeoutId = setTimeout(saveAdDrafts, 1000);
    return () => clearTimeout(timeoutId);
  }, [adDrafts, defaults.brandId, loading]); // Remove activeBatch?.id dependency

  // Asset Preview Modal Component
  const AssetPreviewModal = () => {
    if (!assetPreviewModal.isOpen || assetPreviewModal.assets.length === 0) return null;

    const currentAsset = assetPreviewModal.assets[assetPreviewModal.currentIndex];
    const hasMultiple = assetPreviewModal.assets.length > 1;

    const nextAsset = () => {
      setAssetPreviewModal(prev => ({
        ...prev,
        currentIndex: (prev.currentIndex + 1) % prev.assets.length
      }));
    };

    const prevAsset = () => {
      setAssetPreviewModal(prev => ({
        ...prev,
        currentIndex: prev.currentIndex === 0 ? prev.assets.length - 1 : prev.currentIndex - 1
      }));
    };

    const closeModal = () => {
      setAssetPreviewModal({ isOpen: false, assets: [], currentIndex: 0 });
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={closeModal}>
        <div className="relative max-w-4xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
          {/* Close button */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-all"
            title="Close preview"
            aria-label="Close asset preview"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Navigation arrows for multiple assets */}
          {hasMultiple && (
            <>
              <button
                onClick={prevAsset}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-all"
                title="Previous asset"
              >
                ←
              </button>
              <button
                onClick={nextAsset}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-all"
                title="Next asset"
              >
                →
              </button>
            </>
          )}

          {/* Main content */}
          <div className="bg-white rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{currentAsset.name}</h3>
                {hasMultiple && (
                  <span className="text-sm text-gray-500">
                    {assetPreviewModal.currentIndex + 1} of {assetPreviewModal.assets.length}
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Type: {currentAsset.type} 
                {currentAsset.aspectRatios && currentAsset.aspectRatios.length > 0 && (
                  <span className="ml-2">• Aspect Ratios: {currentAsset.aspectRatios.join(', ')}</span>
                )}
                {currentAsset.type === 'video' && currentAsset.name.includes('_compressed') && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Zap size={12} className="mr-1" />
                    Compressed for Meta upload
                  </span>
                )}
              </div>
            </div>
            
            <div className="relative bg-gray-100 flex items-center justify-center min-h-[400px]">
              {currentAsset.type === 'image' ? (
                <img
                  src={currentAsset.supabaseUrl}
                  alt={currentAsset.name}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              ) : (
                <video
                  src={currentAsset.supabaseUrl}
                  className="max-w-full max-h-[60vh] object-contain"
                  controls
                />
              )}
            </div>
            
            <div className="p-4 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Click outside or press ESC to close
              </div>
              <a
                href={currentAsset.supabaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm flex items-center"
              >
                Open in new tab
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Handle ESC key for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && assetPreviewModal.isOpen) {
        setAssetPreviewModal({ isOpen: false, assets: [], currentIndex: 0 });
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [assetPreviewModal.isOpen]);

  const handlePopulateNames = async () => {
    if (!defaults.brandId) return;
    
    try {
      const response = await fetch('/api/ad-drafts/populate-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId: defaults.brandId })
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`${result.message}\nUpdated: ${result.updated}/${result.total} drafts`);
        // Refresh the ad drafts to show updated names
        await refreshAdDrafts();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error populating names:', error);
      alert('Failed to populate names. Please try again.');
    }
  };

  const handleApplySelectedConfig = () => {
    if (checkedDraftIds.size === 0) {
      alert('Please select at least one ad to apply the configuration to.');
      return;
    }

    const selectedCount = checkedDraftIds.size;
    const configName = selectedConfiguration?.name || 'Current Settings';
    
    const confirmMessage = `This will apply the "${configName}" configuration to ${selectedCount} selected ad draft(s). This includes:
    
• Campaign: ${defaults.campaignName || defaults.campaignId || 'Not Set'}
• Ad Set: ${defaults.adSetName || defaults.adSetId || 'Not Set'}
• Primary Text: ${defaults.primaryText}
• Headline: ${defaults.headline}
• Description: ${defaults.description}
• Destination URL: ${defaults.destinationUrl}
• Call to Action: ${defaults.callToAction}
• Status: ${defaults.status}
• Site Links: ${defaults.siteLinks?.length || 0} configured
• Advantage+ Creative: ${Object.values(defaults.advantageCreative || {}).filter(Boolean).length} enhancements

Are you sure you want to continue?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // Apply defaults to selected ad drafts only
    const updatedDrafts = adDrafts.map(draft => {
      if (checkedDraftIds.has(draft.id)) {
        return {
          ...draft,
          primaryText: defaults.primaryText,
          headline: defaults.headline,
          description: defaults.description,
          campaignId: defaults.campaignId,
          campaignName: defaults.campaignName,
          adSetId: defaults.adSetId,
          adSetName: defaults.adSetName,
          destinationUrl: defaults.destinationUrl,
          callToAction: defaults.callToAction,
          status: defaults.status as AdCreativeStatus,
          // Apply new Meta features from defaults
          siteLinks: [...(defaults.siteLinks || [])],
          advantageCreative: { ...defaults.advantageCreative }
        };
      }
      return draft;
    });

    setAdDrafts(updatedDrafts);
    alert(`Successfully applied "${configName}" to ${selectedCount} ad draft(s).`);
  };

  const handleCompressVideos = async () => {
    if (checkedDraftIds.size === 0) {
      alert("Please select at least one ad draft to compress videos.");
      return;
    }

    // Find all video assets in selected drafts that need compression
    const selectedDrafts = filteredAdDrafts.filter(draft => checkedDraftIds.has(draft.id));
    const videosToCompress: { draft: AdDraft; asset: AdDraftAsset; assetIndex: number }[] = [];

    for (const draft of selectedDrafts) {
      draft.assets.forEach((asset, index) => {
        if (asset.type === 'video') {
          // We'll check if it needs compression after fetching the file
          videosToCompress.push({ draft, asset, assetIndex: index });
        }
      });
    }

    if (videosToCompress.length === 0) {
      alert("No video assets found in selected ads.");
      return;
    }

    const confirmMessage = `Found ${videosToCompress.length} video asset(s) in ${selectedDrafts.length} selected ad(s).

This will manually compress existing videos:
• Download each video from Supabase
• Check if compression is needed (>150MB)
• Compress large videos automatically
• Upload compressed versions back to Supabase
• Update the ad drafts with new URLs

Note: New asset uploads are automatically compressed if over 150MB during import.
This manual compression is for existing assets that may need optimization.

This process may take several minutes. Continue?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsCompressing(true);
    setCompressionProgress({});

    const supabase = createSPAClient();
    let compressedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    try {
      for (const { draft, asset, assetIndex } of videosToCompress) {
        const progressKey = `${draft.id}-${assetIndex}`;
        
        try {
          console.log(`Processing video: ${asset.name}`);
          
          // Fetch the video file from Supabase
          const response = await fetch(asset.supabaseUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const file = new File([blob], asset.name, { type: blob.type });
          
          // Check if compression is needed
          if (!needsCompression(file)) {
            console.log(`Video ${asset.name} (${getFileSizeMB(file).toFixed(2)}MB) doesn't need compression`);
            skippedCount++;
            continue;
          }

          console.log(`Compressing video ${asset.name} (${getFileSizeMB(file).toFixed(2)}MB)...`);
          
          // Update progress
          setCompressionProgress(prev => ({ ...prev, [progressKey]: 0 }));

          // Compress the video
          const compressedFile = await compressVideoWithQuality(
            file, 
            'balanced', // Use balanced quality for 2x speed improvement
            (progress) => {
              setCompressionProgress(prev => ({ ...prev, [progressKey]: progress }));
            }
          );

          console.log(`Compression complete: ${getFileSizeMB(file).toFixed(2)}MB → ${getFileSizeMB(compressedFile).toFixed(2)}MB`);

          // Upload compressed video to Supabase
          const filePath = `${defaults.brandId}/${Date.now()}_${compressedFile.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
          
          const { error: uploadError } = await supabase.storage
            .from('ad-creatives')
            .upload(filePath, compressedFile, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage.from('ad-creatives').getPublicUrl(filePath);
          
          if (!publicUrl) {
            throw new Error('Could not get public URL for compressed video');
          }

          // Update the ad draft with the new compressed video URL
          setAdDrafts(prevDrafts => 
            prevDrafts.map(d => {
              if (d.id === draft.id) {
                const updatedAssets = [...d.assets];
                updatedAssets[assetIndex] = {
                  ...asset,
                  supabaseUrl: publicUrl,
                  name: compressedFile.name
                };
                return { ...d, assets: updatedAssets };
              }
              return d;
            })
          );

          compressedCount++;
          console.log(`Successfully compressed and updated ${asset.name}`);

        } catch (error) {
          console.error(`Failed to compress ${asset.name}:`, error);
          errorCount++;
        }
      }

      // Show completion message
      const message = `Video compression complete!

✅ Compressed: ${compressedCount} videos
⏭️ Skipped: ${skippedCount} videos (already under 150MB)
❌ Errors: ${errorCount} videos

${compressedCount > 0 ? 'Compressed videos have been updated in your ads.' : ''}`;

      alert(message);

    } catch (error) {
      console.error('Compression process failed:', error);
      alert(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCompressing(false);
      setCompressionProgress({});
    }
  };

  const handleGenerateCopy = async () => {
    if (checkedDraftIds.size === 0) {
      alert("Please select at least one ad draft to generate copy.");
      return;
    }

    if (!defaults.brandId) {
      alert("Brand ID is missing. Please ensure your brand is properly configured.");
      return;
    }

    const selectedDrafts = filteredAdDrafts.filter(draft => checkedDraftIds.has(draft.id));
    
    // Get all assets from selected drafts
    const allAssets: { assetId: string; assetName: string; draftId: string; draftName: string }[] = [];
    
    selectedDrafts.forEach(draft => {
      draft.assets.forEach(asset => {
        allAssets.push({
          assetId: `${draft.id}-${asset.name}`,
          assetName: asset.name,
          draftId: draft.id,
          draftName: draft.adName
        });
      });
    });

    if (allAssets.length === 0) {
      alert("No assets found in selected ad drafts. Please ensure your ads have assets before generating copy.");
      return;
    }

    // Show custom prompt modal first
    setShowCustomPromptModal(true);
  };

  const handleGenerateCopyWithPrompt = async (promptText: string) => {
    const selectedDrafts = filteredAdDrafts.filter(draft => checkedDraftIds.has(draft.id));
    
    setIsGeneratingCopy(true);
    setCopyResults([]);
    setShowCustomPromptModal(false);

    try {
      // Get asset IDs from the database first
      const response = await fetch('/api/ad-drafts/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: defaults.brandId,
          draftIds: selectedDrafts.map(d => d.id)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch asset information');
      }

      const assetsData = await response.json();
      const assetIds = assetsData.map((asset: { id: string }) => asset.id);

      if (assetIds.length === 0) {
        throw new Error('No assets found in the database for selected drafts');
      }

      // Call the copy generation API with custom prompt
      const copyResponse = await fetch('/api/ai/generate-copy-from-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: defaults.brandId,
          assetIds: assetIds,
          customPrompt: promptText
        }),
      });

      if (!copyResponse.ok) {
        const errorData = await copyResponse.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to generate copy');
      }

      const results = await copyResponse.json();
      setCopyResults(results.results || []);

      // Apply successful results to ad drafts
      let appliedCount = 0;
      for (const result of results.results) {
        if (result.success && result.generatedCopy) {
          // Update the corresponding ad draft
          setAdDrafts(prevDrafts => 
            prevDrafts.map(draft => {
              if (draft.id === result.adDraftId) {
                appliedCount++;
                return {
                  ...draft,
                  headline: result.generatedCopy.Headline || draft.headline,
                  primaryText: result.generatedCopy["Body Copy"] || draft.primaryText,
                  description: result.generatedCopy.Description || draft.description
                };
              }
              return draft;
            })
          );
        }
      }

      // Show results modal
      setShowCopyResultsModal(true);

      // Show completion message
      const successCount = results.results.filter((r: { success: boolean }) => r.success).length;
      const failureCount = results.results.length - successCount;
      
      alert(`Copy generation complete!\n\n✅ Generated: ${successCount} assets\n❌ Failed: ${failureCount} assets\n📝 Applied to ads: ${appliedCount} drafts`);

    } catch (error) {
      console.error('Copy generation failed:', error);
      alert(`Copy generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  return (
    <div className="mt-6 pb-16">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-1">Ad Sheet</h2>
            <p className="text-sm text-gray-500 mb-1">Brand: <span className="font-medium text-gray-700">{defaults.brandId || 'N/A'}</span></p>
            <div className="text-xs text-gray-500 space-y-0.5">
                <p>Ad Account: <span className="font-medium text-gray-600">{defaults.adAccountId || 'N/A'}</span></p>
                <p>Default Campaign: <span className="font-medium text-gray-600">
                  {defaults.campaignName || (defaults.campaignId ? `Campaign ID: ${defaults.campaignId}` : 'Not Set')}
                </span></p>
                <p>Default Ad Set: <span className="font-medium text-gray-600">
                  {defaults.adSetName || (defaults.adSetId ? `Ad Set ID: ${defaults.adSetId}` : 'Not Set')}
                </span></p>
                <p>FB Page: <span className="font-medium text-gray-600">{defaults.fbPage || 'N/A'}</span> | IG Account: <span className="font-medium text-gray-600">{defaults.igAccount || 'N/A'}</span></p>
                <p>Pixel: <span className="font-medium text-gray-600">{defaults.pixel || 'N/A'}</span> | Default Status: <span className="font-medium text-gray-600">{defaults.status}</span></p>
                {defaults.urlParams && <p>URL Params: <span className="font-medium text-gray-600">{defaults.urlParams}</span></p>}
                <p>Dest. URL: <span className="font-medium text-gray-600">{defaults.destinationUrl}</span> | CTA: <span className="font-medium text-gray-600">{defaults.callToAction.replace(/_/g, ' ')}</span></p>
                <p>Primary Text: <span className="font-medium text-gray-600 truncate w-60 inline-block" title={defaults.primaryText}>{defaults.primaryText}</span></p>
                <p>Headline: <span className="font-medium text-gray-600">{defaults.headline}</span></p>
                
                {/* New Meta Features Summary */}
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="font-medium text-gray-700 text-sm mb-1">🔧 Advanced Meta Features:</p>
                  <p>Site Links: <span className="font-medium text-gray-600">{defaults.siteLinks?.length || 0} configured</span></p>
                  <p>Advantage+ Creative: <span className="font-medium text-gray-600">{Object.values(defaults.advantageCreative || {}).filter(Boolean).length} enhancements</span></p>
                </div>
            </div>
            {/* Status indicators */}
            <div className="flex items-center space-x-4 mt-4">
                {saving && (
                  <span className="text-sm text-blue-600 flex items-center">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Saving...
                  </span>
                )}
                {loading && (
                  <span className="text-sm text-gray-600 flex items-center">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Loading drafts...
                  </span>
                )}
            </div>
        </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => setIsAssetModalOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm flex items-center"
                >
                    <UploadCloud className="mr-2 h-4 w-4" /> Import Assets
                </button>
                 <button
                    onClick={handleAddRow}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm flex items-center"
                 >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Ad
                </button>
                <button
                    onClick={openBulkEditModal} 
                    disabled={checkedDraftIds.size === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <Edit className="mr-2 h-4 w-4" /> Bulk Edit ({checkedDraftIds.size})
                </button>
                <button
                    onClick={openBulkRenameModal} 
                    disabled={checkedDraftIds.size === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <Sparkles className="mr-2 h-4 w-4" /> Bulk AI Rename ({checkedDraftIds.size})
                </button>
                {/* Temporarily hidden - Populate Names button
                <button
                    onClick={handlePopulateNames}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md shadow-sm flex items-center"
                    title="Fetch and populate missing campaign and ad set names from Meta API"
                 >
                    <Settings className="mr-2 h-4 w-4" /> Populate Names
                </button>
                */}
                <button
                    onClick={handleApplySelectedConfig}
                    disabled={checkedDraftIds.size === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Apply ${selectedConfiguration?.name || 'current configuration'} to selected ad drafts`}
                 >
                    <RefreshCw className="mr-2 h-4 w-4" /> 
                    Apply Selected Config ({checkedDraftIds.size})
                </button>
                
                {/* Generate Copy Button */}
                <button
                    onClick={handleGenerateCopy}
                    disabled={checkedDraftIds.size === 0 || isGeneratingCopy}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Generate AI copy for assets in selected ad drafts"
                 >
                    {isGeneratingCopy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Copy...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" /> 
                        Generate Copy ({checkedDraftIds.size})
                      </>
                    )}
                </button>
                
                {/* Temporarily hidden - Manual Compress button
                <button
                    onClick={handleCompressVideos}
                    disabled={checkedDraftIds.size === 0 || isCompressing}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Manually compress videos in selected ads (Note: New uploads are automatically compressed if over 150MB)"
                 >
                    {isCompressing ? (
                      <>
                        <Loader2 className="mr-2 h-4 animate-spin" />
                        Compressing... {Object.keys(compressionProgress).length > 0 && `(${Object.values(compressionProgress).reduce((a, b) => a + b, 0) / Object.keys(compressionProgress).length}%)`}
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" /> 
                        Manual Compress ({checkedDraftIds.size})
                      </>
                    )}
                </button>
                */}
                <button
                    onClick={handleLaunch} 
                    disabled={checkedDraftIds.size === 0 || isLaunching}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {isLaunching ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Launching...
                        </>
                    ) : (
                        <>
                            <Rocket className="mr-2 h-4 w-4" /> Review & Launch ({checkedDraftIds.size})
                        </>
                    )}
                </button>
                
                {/* Status Summary */}
                <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
                  <div className="font-medium">Status Summary:</div>
                  <div className="flex gap-3 mt-1">
                    <span>Total: {adDrafts.length}</span>
                    <span>Visible: {filteredAdDrafts.length}</span>
                    {adDrafts.filter(d => d.appStatus === 'PUBLISHED').length > 0 && (
                      <span className={`${!hidePublished ? 'text-green-600' : 'text-orange-600'}`}>
                        Published: {adDrafts.filter(d => d.appStatus === 'PUBLISHED').length}
                        {hidePublished && ' (hidden)'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Meta Integration Status Indicator */}
                <div className="flex items-center text-xs">
                  {defaults.brandId && defaults.adAccountId && defaults.fbPage ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      <span>Meta Ready</span>
                      {defaults.igAccount && (
                        <span className="ml-1 text-blue-600">(+Instagram)</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center text-orange-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      <span>Meta Setup Incomplete</span>
                    </div>
                  )}
                </div>
            </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
                <button 
                    onClick={() => setColumnDropdownOpen(!isColumnDropdownOpen)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 flex items-center"
                >
                    <Columns className="mr-2 h-4 w-4 text-gray-500"/> Columns
                </button>
                {isColumnDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border z-10 max-h-60 overflow-y-auto">
                        <div className="py-1">
                        {columns.map(col => (
                            <label key={col.id} className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={col.visible} 
                                    onChange={() => toggleColumnVisibility(col.id)}
                                    className="mr-2 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    aria-labelledby={`col-label-${col.id}`}
                                    disabled={col.id === 'select'}
                                />
                                <span id={`col-label-${col.id}`}>{col.label}</span>
                            </label>
                        ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="relative">
              <button
                onClick={() => setHidePublished(!hidePublished)}
                className={`px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 flex items-center ${
                  hidePublished ? 'bg-orange-50 border-orange-300' : 'bg-green-50 border-green-300'
                }`}
              >
                <Filter className="mr-2 h-4 w-4 text-gray-500" /> 
                {hidePublished ? 'Hide Published' : 'Show All'}
                {hidePublished && adDrafts.filter(d => d.appStatus === 'PUBLISHED').length > 0 && (
                  <span className="ml-1 text-orange-600 text-xs">({adDrafts.filter(d => d.appStatus === 'PUBLISHED').length} hidden)</span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.find(c => c.id === 'select' && c.visible) && (
                     <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap w-12">
                        <input 
                            type="checkbox"
                            checked={allDraftsChecked}
                            onChange={handleSelectAllDraftsToggle}
                            className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                            aria-label="Select all drafts"
                            disabled={filteredAdDrafts.length === 0}
                        />
                    </th>
                )}
                {columns.filter(col => col.visible && col.id !== 'select').map(col => (
                  <th
                    key={col.id}
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    <div className="flex items-center">
                        {col.label}
                    </div>                    
                  </th>
                ))}
                <th scope="col" className="relative px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAdDrafts.map((draft, rowIndex) => (
                <tr key={draft.id} className={`hover:bg-gray-50 ${checkedDraftIds.has(draft.id) ? 'bg-primary-50' : ''}`}>
                  {columns.find(c => c.id === 'select' && c.visible) && (
                     <td className="px-4 py-3 whitespace-nowrap align-top">
                        {renderCellContent(draft, columns.find(c => c.id === 'select')!, rowIndex)}                       
                    </td>
                  )}
                  {columns.filter(col => col.visible && col.id !== 'select').map(col => (
                    <td key={col.id} className="px-4 py-3 whitespace-nowrap align-top">
                      {renderCellContent(draft, col, rowIndex)}
                    </td>
                  ))}
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium align-top">
                    <div className="flex items-center justify-end gap-1">
                        <button 
                            onClick={() => handleDeleteRow(rowIndex)} 
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete Ad"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
               {filteredAdDrafts.length === 0 && (
                    <tr>
                        <td colSpan={columns.filter(c => c.visible).length + 1} className="text-center py-10 text-gray-500">
                            No ad drafts yet. Click &apos;Add Ad&apos; or &apos;Import Assets&apos; to get started.
                        </td>
                    </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
      <AssetImportModal 
        isOpen={isAssetModalOpen} 
        onClose={() => setIsAssetModalOpen(false)} 
        onAssetsImported={handleAssetsImported} 
        brandId={defaults.brandId}
      />
      {isBulkEditModalOpen && draftsForBulkEdit.length > 0 && (
        <BulkEditModal
            isOpen={isBulkEditModalOpen}
            onClose={() => setIsBulkEditModalOpen(false)}
            draftsToEdit={draftsForBulkEdit}
            onApplyBulkEdit={handleApplyBulkEdit}
            brandId={defaults.brandId}
            adAccountId={defaults.adAccountId}
        />
      )}
      <BulkRenameModal
        isOpen={isBulkRenameModalOpen}
        onClose={() => setIsBulkRenameModalOpen(false)}
        onRename={handleBulkRename}
        selectedAdIds={Array.from(checkedDraftIds)}
        brandId={defaults.brandId || ''}
      />
      <AssetPreviewModal />
      
      {/* Custom Prompt Modal */}
      {showCustomPromptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Customize AI Copy Generation</h2>
                <button
                  onClick={() => setShowCustomPromptModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close modal"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Add custom instructions to guide the AI in generating copy for your selected assets. 
                  Leave blank to use the default Meta ad optimization prompts.
                </p>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Prompt (Optional)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Example: Focus on eco-friendly benefits, use emotional language, emphasize family values..."
                />
                
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">What will be analyzed:</h4>
                  <div className="text-sm text-blue-700">
                    <p>• {filteredAdDrafts.filter(draft => checkedDraftIds.has(draft.id)).length} selected ad drafts</p>
                    <p>• {filteredAdDrafts.filter(draft => checkedDraftIds.has(draft.id)).reduce((total, draft) => total + draft.assets.length, 0)} total assets</p>
                    <p>• Your brand information and target audience data</p>
                    <p>• Asset content using AI vision analysis</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCustomPromptModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleGenerateCopyWithPrompt(customPrompt)}
                  disabled={isGeneratingCopy}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {isGeneratingCopy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Generate Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Copy Results Modal */}
      {showCopyResultsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Copy Generation Results</h2>
                <button
                  onClick={() => setShowCopyResultsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close results modal"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-6">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-green-600 font-semibold text-lg">
                      {copyResults.filter(r => r.success).length}
                    </div>
                    <div className="text-green-700">Successful</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-red-600 font-semibold text-lg">
                      {copyResults.filter(r => !r.success).length}
                    </div>
                    <div className="text-red-700">Failed</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-blue-600 font-semibold text-lg">
                      {copyResults.length}
                    </div>
                    <div className="text-blue-700">Total</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {copyResults.map((result, index) => (
                  <div key={index} className={`p-4 rounded-lg border ${
                    result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">
                        {result.assetName} ({result.adDraftName})
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        result.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    
                    {result.success && result.generatedCopy ? (
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Headline:</span>
                          <div className="text-gray-600 ml-2">{result.generatedCopy.Headline}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Body Copy:</span>
                          <div className="text-gray-600 ml-2 whitespace-pre-wrap">{result.generatedCopy["Body Copy"]}</div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Description:</span>
                          <div className="text-gray-600 ml-2">{result.generatedCopy.Description}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-600 text-sm">
                        Error: {result.error || 'Unknown error occurred'}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
                <button
                  onClick={() => setShowCopyResultsModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdSheetView; 