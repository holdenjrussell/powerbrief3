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
  Brain,
  FileVideo
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
import { createSPAClient } from '@/lib/supabase/client';
import VideoThumbnailScrubberModal from './VideoThumbnailScrubberModal';
import { generateThumbnailsForDraft } from '@/lib/utils/automaticThumbnailGeneration';

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
    { id: 'thumbnails', label: 'Thumbnails', visible: true, type: 'custom' as const }, 
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
  
  // Add new state for copy generation
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [showCopyResultsModal, setShowCopyResultsModal] = useState(false);
  const [copyResults, setCopyResults] = useState<CopyGenerationResult[]>([]);
  const [showCustomPromptModal, setShowCustomPromptModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Add thumbnail generation state
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState<{[key: string]: number}>({});
  
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

  // Video thumbnail scrubber modal state
  const [thumbnailScrubberModal, setThumbnailScrubberModal] = useState<{
    isOpen: boolean;
    videoAsset: AdDraftAsset | null;
    allVideoAssets: AdDraftAsset[];
    draftId: string;
  }>({
    isOpen: false,
    videoAsset: null,
    allVideoAssets: [],
    draftId: ''
  });

  // Manual thumbnail upload modal state
  const [manualThumbnailModal, setManualThumbnailModal] = useState<{
    isOpen: boolean;
    videoAsset: AdDraftAsset | null;
    draftId: string;
    uploading: boolean;
  }>({
    isOpen: false,
    videoAsset: null,
    draftId: '',
    uploading: false
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

  const handleAssetsImported = async (importedAssetGroups: ImportedAssetGroup[]) => {
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
    
    // Add to state first
    setAdDrafts(prev => [...prev, ...newAdDrafts]);
    setIsAssetModalOpen(false);
    
    // Save the new drafts to database and automatically generate thumbnails
    try {
      console.log('[AdSheetView] Saving imported ad drafts and generating thumbnails...');
      setSaving(true);
      
      const response = await fetch('/api/ad-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drafts: newAdDrafts }),
      });
      
      if (!response.ok) throw new Error('Failed to save ad drafts');
      
      const savedDrafts = await response.json();
      console.log('[AdSheetView] Drafts saved successfully:', savedDrafts.length);
      
      // Generate thumbnails for each draft that has video assets
      let totalThumbnailsGenerated = 0;
      const thumbnailErrors: string[] = [];
      
      for (const draft of savedDrafts) {
        const hasVideoAssets = draft.assets && draft.assets.some((asset: { type: string }) => asset.type === 'video');
        
        if (hasVideoAssets) {
          try {
            console.log(`[AdSheetView] Generating thumbnails for draft: ${draft.adName}`);
            
            const thumbnailResult = await generateThumbnailsForDraft(draft.id);
            
            if (thumbnailResult.processed > 0) {
              totalThumbnailsGenerated += thumbnailResult.processed;
              console.log(`[AdSheetView] Generated ${thumbnailResult.processed} thumbnails for draft: ${draft.adName}`);
            }
            
            if (thumbnailResult.errors.length > 0) {
              console.warn(`[AdSheetView] Some thumbnail errors for draft ${draft.adName}:`, thumbnailResult.errors);
              thumbnailResult.errors.forEach(error => {
                thumbnailErrors.push(`${draft.adName}: ${error.error}`);
              });
            }
            
          } catch (thumbnailError) {
            console.error(`[AdSheetView] Thumbnail generation failed for draft ${draft.adName}:`, thumbnailError);
            thumbnailErrors.push(`${draft.adName}: Thumbnail generation failed`);
          }
        }
      }
      
      // Show feedback to user
      if (totalThumbnailsGenerated > 0) {
        alert(`Assets imported successfully! Automatically generated ${totalThumbnailsGenerated} video thumbnails.`);
      } else if (thumbnailErrors.length > 0) {
        alert(`Assets imported successfully! However, some thumbnail generation failed. You can generate them manually using the "Generate Thumbnails" button.`);
      } else {
        alert('Assets imported successfully!');
      }
      
      // Refresh the ad drafts to show the saved versions with thumbnails
      await refreshAdDrafts();
      
    } catch (error) {
      console.error('[AdSheetView] Error saving drafts or generating thumbnails:', error);
      alert('Assets imported to sheet, but there was an issue saving to database. Please save manually.');
    } finally {
      setSaving(false);
    }
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
      if (!defaults.brandId) {
        console.warn('⚠️ No brandId available, skipping load');
        return;
      }
      
      try {
        setLoading(true);
        
        // Clear existing data immediately when brand changes to prevent showing stale data
        setAdDrafts([]);
        
        const params = new URLSearchParams({
          brandId: defaults.brandId
        });
        
        console.log('🔍 Loading ALL drafts for brand:', defaults.brandId);
        
        const apiUrl = `/api/ad-drafts?${params}`;
        console.log('🌐 API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
          // Add cache busting to prevent stale responses
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            // Add explicit brand context
            'X-Brand-Context': defaults.brandId
          }
        });
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
        
        // Check for thumbnail generation on initial load
        setTimeout(() => {
          checkAndGenerateThumbnails(draftsWithBrandId);
        }, 100);
        
      } catch (error) {
        console.error('❌ Error loading ad drafts:', error);
        // Clear ads on error to prevent showing stale data
        setAdDrafts([]);
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
    if (!defaults.brandId) {
      console.warn('⚠️ No brandId available, skipping refresh');
      return;
    }
    
    try {
      const params = new URLSearchParams({
        brandId: defaults.brandId
      });
      
      console.log('🔄 Refreshing ALL drafts for brand:', defaults.brandId);
      
      const apiUrl = `/api/ad-drafts?${params}`;
      console.log('🌐 Refresh API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        // Add cache busting to prevent stale responses
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          // Add explicit brand context to prevent cross-brand contamination
          'X-Brand-Context': defaults.brandId
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh ad drafts: ${response.status} ${response.statusText}`);
      }
      
      const existingDrafts: AdDraft[] = await response.json();
      console.log('🔄 Refreshed drafts from API:', existingDrafts.length);
      
      // CRITICAL: Validate that all returned drafts belong to the current brand
      const wrongBrandDrafts = existingDrafts.filter(draft => 
        draft.brandId && draft.brandId !== defaults.brandId
      );
      
      if (wrongBrandDrafts.length > 0) {
        console.error('❌ BRAND MISMATCH DETECTED! Wrong brand drafts returned:', wrongBrandDrafts.map(d => ({
          id: d.id,
          name: d.adName,
          brandId: d.brandId,
          expectedBrandId: defaults.brandId
        })));
        
        // Filter out wrong brand drafts as a safety measure
        const correctBrandDrafts = existingDrafts.filter(draft => 
          !draft.brandId || draft.brandId === defaults.brandId
        );
        
        console.log('🛡️ Filtered to correct brand drafts:', correctBrandDrafts.length);
        setAdDrafts(correctBrandDrafts);
        return;
      }
      
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
        brandId: draft.brandId || defaults.brandId
      }));
      
      console.log('✅ Setting refreshed drafts in state:', draftsWithBrandId.length);
      setAdDrafts(draftsWithBrandId);
      
      // Log current filter state after refresh
      console.log('🔄 Current filter after refresh:', hidePublished);
      console.log('🔄 Drafts that will be visible after refresh:', 
        draftsWithBrandId.filter(draft => !hidePublished || draft.appStatus !== 'PUBLISHED').length
      );
      
      // Check for thumbnail generation after refresh (but don't trigger infinite loops)
      if (existingDrafts.length > 0) {
        checkAndGenerateThumbnails(draftsWithBrandId);
      }
      
    } catch (error) {
      console.error('❌ Error refreshing ad drafts:', error);
      // Don't clear the drafts on error - keep showing what we have
    }
  };

  // Function to check and generate thumbnails for drafts
  const checkAndGenerateThumbnails = async (drafts: AdDraft[]) => {
    const draftsNeedingThumbnails = drafts.filter(draft => 
      draft.assets && draft.assets.some(asset => 
        asset.type === 'video' && (!asset.thumbnailUrl || asset.thumbnailUrl === null || asset.thumbnailUrl === '')
      )
    );
    
    if (draftsNeedingThumbnails.length > 0) {
      console.log(`[checkAndGenerateThumbnails] Found ${draftsNeedingThumbnails.length} drafts needing thumbnails`);
      
      // Debug: Log which specific assets need thumbnails
      draftsNeedingThumbnails.forEach(draft => {
        const videoAssetsNeedingThumbnails = draft.assets.filter(asset => 
          asset.type === 'video' && (!asset.thumbnailUrl || asset.thumbnailUrl === null || asset.thumbnailUrl === '')
        );
        console.log(`[checkAndGenerateThumbnails] Draft "${draft.adName}" needs thumbnails:`, 
          videoAssetsNeedingThumbnails.map(a => ({ name: a.name, thumbnailUrl: a.thumbnailUrl }))
        );
      });
      
      // Generate thumbnails for all drafts that need them
      let totalGenerated = 0;
      const errors: string[] = [];
      
      for (const draft of draftsNeedingThumbnails) {
        try {
          console.log(`[checkAndGenerateThumbnails] Processing: ${draft.adName}`);
          const result = await generateThumbnailsForDraft(draft.id);
          
          if (result.processed > 0) {
            totalGenerated += result.processed;
            console.log(`[checkAndGenerateThumbnails] ✅ Generated ${result.processed} thumbnails for ${draft.adName}`);
          }
          
          if (result.errors.length > 0) {
            console.warn(`[checkAndGenerateThumbnails] ⚠️ Errors for ${draft.adName}:`, result.errors);
            result.errors.forEach(error => errors.push(`${draft.adName}: ${error.error}`));
          }
          
          // Small delay between drafts
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error(`[checkAndGenerateThumbnails] ❌ Failed for ${draft.adName}:`, error);
          errors.push(`${draft.adName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      if (totalGenerated > 0) {
        console.log(`[checkAndGenerateThumbnails] 🎉 Generated ${totalGenerated} thumbnails total`);
        // Refresh again to show the new thumbnails
        setTimeout(() => refreshAdDrafts(), 1000);
      }
      
      if (errors.length > 0) {
        console.warn(`[checkAndGenerateThumbnails] ⚠️ ${errors.length} errors occurred:`, errors);
      }
    } else {
      console.log(`[checkAndGenerateThumbnails] ✅ All video assets have thumbnails`);
    }
  };

  // Force thumbnail generation function
  const forceGenerateThumbnails = async () => {
    console.log('[forceGenerateThumbnails] Manual thumbnail generation triggered');
    await checkAndGenerateThumbnails(adDrafts);
  };

  // Expose function for debugging (development only)
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as unknown as { forceGenerateThumbnails?: () => Promise<void> }).forceGenerateThumbnails = forceGenerateThumbnails;
    }
  }, [adDrafts]);

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

    // Check for missing thumbnails in selected drafts
    const draftsToLaunch = filteredAdDrafts.filter(draft => checkedDraftIds.has(draft.id));
    const draftsWithMissingThumbnails = draftsToLaunch.filter(draft => 
      draft.assets.some(asset => asset.type === 'video' && !asset.thumbnailUrl)
    );

    if (draftsWithMissingThumbnails.length > 0) {
      const draftNames = draftsWithMissingThumbnails.map(d => d.adName).join('\n• ');
      const shouldContinue = confirm(
        `⚠️ Missing Video Thumbnails Detected!\n\n` +
        `The following ad drafts have videos without thumbnails:\n• ${draftNames}\n\n` +
        `Thumbnails are required for Meta video ads. Would you like to:\n\n` +
        `• Click "OK" to automatically generate thumbnails now\n` +
        `• Click "Cancel" to set custom thumbnails manually\n\n` +
        `Tip: Use the thumbnail scrubber or manual upload options in the thumbnails column.`
      );

      if (!shouldContinue) {
        // User wants to set thumbnails manually
        alert(`💡 To set thumbnails:\n\n` +
              `1. Look at the "Thumbnails" column for orange warning indicators\n` +
              `2. Click on missing thumbnails to use the scrubber tool\n` +
              `3. Hover over thumbnails to see the manual upload button\n` +
              `4. Or use "Generate Thumbnails" button for automatic generation`);
        return;
      }

      // User chose to auto-generate thumbnails
      console.log('🔧 Auto-generating missing thumbnails before launch...');
      setIsGeneratingThumbnails(true);
      
      try {
        let totalGenerated = 0;
        const errors: string[] = [];
        
        for (const draft of draftsWithMissingThumbnails) {
          try {
            const result = await generateThumbnailsForDraft(draft.id);
            
            if (result.processed > 0) {
              totalGenerated += result.processed;
              console.log(`✅ Generated ${result.processed} thumbnails for ${draft.adName}`);
            }
            
            if (result.errors.length > 0) {
              result.errors.forEach(error => errors.push(`${draft.adName}: ${error.error}`));
            }
            
          } catch (error) {
            console.error(`❌ Thumbnail generation failed for ${draft.adName}:`, error);
            errors.push(`${draft.adName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        if (totalGenerated > 0) {
          alert(`✅ Generated ${totalGenerated} thumbnails! Proceeding with launch...`);
          // Refresh ad drafts to get updated thumbnails
          await refreshAdDrafts();
        }
        
        if (errors.length > 0 && totalGenerated === 0) {
          alert(`❌ Thumbnail generation failed for all videos. Please set thumbnails manually before launching:\n\n${errors.join('\n')}`);
          return;
        }
        
      } catch (error) {
        console.error('Auto thumbnail generation failed:', error);
        alert('❌ Automatic thumbnail generation failed. Please set thumbnails manually before launching.');
        return;
      } finally {
        setIsGeneratingThumbnails(false);
      }
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
      case 'thumbnails':
        const videoAssets = draft.assets.filter(asset => asset.type === 'video');
        return (
          <div className="flex flex-wrap gap-2">
            {videoAssets.length > 0 ? (
              <>
                {/* Show thumbnails for video assets */}
                {videoAssets.slice(0, 3).map((asset, i) => (
                  <div
                    key={i}
                    className="relative cursor-pointer group"
                    title={asset.thumbnailUrl ? "Click to change thumbnail" : "Click to generate thumbnail"}
                  >
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt={`Thumbnail for ${asset.name}`}
                        className="w-12 h-12 object-cover rounded border-2 border-gray-200 hover:border-blue-400 transition-colors"
                    onClick={() => {
                      // Open the thumbnail scrubber modal
                      setThumbnailScrubberModal({
                        isOpen: true,
                        videoAsset: asset,
                        allVideoAssets: draft.assets.filter(a => a.type === 'video'),
                        draftId: draft.id
                      });
                    }}
                      />
                    ) : (
                      <div 
                        className="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50 hover:border-orange-400 transition-colors"
                        onClick={() => {
                          // Open the thumbnail scrubber modal
                          setThumbnailScrubberModal({
                            isOpen: true,
                            videoAsset: asset,
                            allVideoAssets: draft.assets.filter(a => a.type === 'video'),
                            draftId: draft.id
                          });
                        }}
                      >
                        <FileVideo className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Missing thumbnail indicator */}
                    {!asset.thumbnailUrl && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center" title="Thumbnail missing">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    )}
                    
                    {/* Manual upload button on hover */}
                    <div className="absolute -bottom-1 -left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setManualThumbnailModal({
                            isOpen: true,
                            videoAsset: asset,
                            draftId: draft.id,
                            uploading: false
                          });
                        }}
                        className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center hover:bg-blue-600 transition-colors"
                        title="Upload custom thumbnail"
                      >
                        <UploadCloud size={8} className="text-white" />
                      </button>
                    </div>
                    
                    {/* Thumbnail progress indicator */}
                    {thumbnailProgress[`${draft.id}_${asset.name}`] !== undefined && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
                        <div className="text-white text-xs">
                          {thumbnailProgress[`${draft.id}_${asset.name}`] === -1 ? (
                            <X className="h-4 w-4 text-red-500" />
                          ) : (
                            `${thumbnailProgress[`${draft.id}_${asset.name}`]}%`
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Show count if more than 3 video assets */}
                {videoAssets.length > 3 && (
                  <div
                    className="w-12 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-400"
                    title={`Click to see ${videoAssets.length - 3} more video(s)`}
                    onClick={() => {
                      // Open scrubber for the 4th video asset
                      const fourthAsset = videoAssets[3];
                      if (fourthAsset) {
                        setThumbnailScrubberModal({
                          isOpen: true,
                          videoAsset: fourthAsset,
                          allVideoAssets: draft.assets.filter(a => a.type === 'video'),
                          draftId: draft.id
                        });
                      }
                    }}
                  >
                    <span className="text-xs text-gray-600 font-medium">+{videoAssets.length - 3}</span>
                  </div>
                )}
                
                {/* If no thumbnails exist, show generate button */}
                {videoAssets.some(asset => !asset.thumbnailUrl) && (
                  <div className="text-xs text-orange-600 flex items-center">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Missing
                  </div>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-400">No videos</span>
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

  // Auto-save ad drafts with proper debouncing and race condition prevention
  useEffect(() => {
    // Skip if no brand ID or if we're still loading initial data
    if (!defaults.brandId || loading) return;
    
    // Skip if adDrafts is empty (initial load)
    if (adDrafts.length === 0) return;
    
    // Create a flag to track if this effect is still active
    let isActive = true;
    
    const saveAdDrafts = async () => {
      // Double-check we're still active before saving
      if (!isActive || !defaults.brandId || adDrafts.length === 0 || loading) return;
      
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
        
        // Only process the response if we're still active
        if (isActive) {
          const result = await response.json();
          console.log('[AdSheetView] Auto-save completed:', result.results?.length || 0, 'drafts saved');
        }
      } catch (error) {
        console.error('Error saving ad drafts:', error);
      } finally {
        if (isActive) {
          setSaving(false);
        }
      }
    };

    // Debounce the save operation with a longer delay
    const timeoutId = setTimeout(saveAdDrafts, 2000); // Increased from 1000ms to 2000ms
    
    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
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

  // Commented out - Populate Names feature temporarily disabled
  /*
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
  */

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

  // Generate thumbnails for video assets that don't have them
  const handleGenerateThumbnails = async () => {
    setIsGeneratingThumbnails(true);
    setThumbnailProgress({});
    
    try {
      // Get all video assets from checked drafts that might need thumbnails
      const checkedDrafts = filteredAdDrafts.filter(draft => checkedDraftIds.has(draft.id));
      
      if (checkedDrafts.length === 0) {
        alert('No video assets found in selected drafts.');
        return;
      }
      
      // First, get the actual asset IDs from the database
      const response = await fetch('/api/ad-drafts/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId: defaults.brandId,
          draftIds: checkedDrafts.map(d => d.id)
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch asset information from database');
      }
      
      const assetsFromDb = await response.json();
      const videoAssets = assetsFromDb.filter((asset: { id: string; name: string; supabase_url: string; type: string; ad_draft_id: string }) => asset.type === 'video');
      
      if (videoAssets.length === 0) {
        alert('No video assets found in selected drafts.');
        return;
      }
      
      console.log(`Generating thumbnails for ${videoAssets.length} video assets`);
      const supabase = createSPAClient();
      let processed = 0;
      
      for (const dbAsset of videoAssets) {
        try {
          setThumbnailProgress(prev => ({ ...prev, [dbAsset.id]: 0 }));
          
          // Extract thumbnail from video
          const { thumbnailBlob, error } = await extractVideoThumbnailFromUrl(dbAsset.supabase_url);
          
          setThumbnailProgress(prev => ({ ...prev, [dbAsset.id]: 50 }));
          
          if (error || !thumbnailBlob || thumbnailBlob.size === 0) {
            console.warn(`Could not extract thumbnail for ${dbAsset.name}: ${error}`);
            setThumbnailProgress(prev => ({ ...prev, [dbAsset.id]: -1 })); // Error state
            continue;
          }
          
          // Upload thumbnail to Supabase
          const timestamp = Date.now();
          const thumbnailFileName = `${dbAsset.name.split('.')[0]}_thumbnail.jpg`;
          const thumbnailPath = `${dbAsset.ad_draft_id}/${timestamp}_${thumbnailFileName}`;
          
          const { data, error: uploadError } = await supabase.storage
            .from('ad-creatives')
            .upload(thumbnailPath, thumbnailBlob, {
              cacheControl: '3600',
              upsert: false,
            });
          
          if (uploadError || !data) {
            console.error(`Failed to upload thumbnail for ${dbAsset.name}:`, uploadError);
            setThumbnailProgress(prev => ({ ...prev, [dbAsset.id]: -1 })); // Error state
            continue;
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('ad-creatives')
            .getPublicUrl(thumbnailPath);
          
          if (publicUrl) {
            // Update the database with the thumbnail URL
            const { error: updateError } = await supabase
              .from('ad_draft_assets')
              .update({ thumbnail_url: publicUrl })
              .eq('id', dbAsset.id);
            
            if (updateError) {
              console.error(`Failed to update thumbnail URL in database for ${dbAsset.name}:`, updateError);
              setThumbnailProgress(prev => ({ ...prev, [dbAsset.id]: -1 })); // Error state
              continue;
            }
            
            console.log(`Thumbnail generated, uploaded, and saved to database for ${dbAsset.name}: ${publicUrl}`);
            setThumbnailProgress(prev => ({ ...prev, [dbAsset.id]: 100 }));
            processed++;
          }
          
        } catch (error) {
          console.error(`Error processing ${dbAsset.name}:`, error);
          setThumbnailProgress(prev => ({ ...prev, [dbAsset.id]: -1 })); // Error state
        }
      }
      
      alert(`Thumbnail generation complete. Processed ${processed} of ${videoAssets.length} videos.`);
      
      // Refresh the ad drafts to show the updated thumbnails
      await refreshAdDrafts();
      
    } catch (error) {
      console.error('Error in thumbnail generation:', error);
      alert('Failed to generate thumbnails. Please try again.');
    } finally {
      setIsGeneratingThumbnails(false);
      setTimeout(() => setThumbnailProgress({}), 3000); // Clear progress after 3 seconds
    }
  };
  
  // Function to extract first frame from video URL as thumbnail
  const extractVideoThumbnailFromUrl = async (videoUrl: string): Promise<{ thumbnailBlob: Blob; error?: string }> => {
    return new Promise(async (resolve) => {
      try {
        // Fetch the video first
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
          resolve({ thumbnailBlob: new Blob(), error: `Failed to fetch video: ${videoResponse.statusText}` });
          return;
        }
        
        const videoBlob = await videoResponse.blob();
        const videoObjectUrl = URL.createObjectURL(videoBlob);
        
        // Create video element to extract frame
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve({ thumbnailBlob: new Blob(), error: 'Could not create canvas context' });
          return;
        }
        
        video.crossOrigin = 'anonymous';
        video.muted = true;
        video.preload = 'metadata';
        
        video.addEventListener('loadedmetadata', () => {
          // Set canvas dimensions to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Seek to first frame
          video.currentTime = 0;
        });
        
        video.addEventListener('seeked', () => {
          try {
            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert canvas to blob
            canvas.toBlob((blob) => {
              if (blob) {
                resolve({ thumbnailBlob: blob });
              } else {
                resolve({ thumbnailBlob: new Blob(), error: 'Could not extract frame from video' });
              }
              
              // Clean up
              URL.revokeObjectURL(videoObjectUrl);
              video.remove();
              canvas.remove();
            }, 'image/jpeg', 0.8);
            
          } catch (error) {
            resolve({ thumbnailBlob: new Blob(), error: `Frame extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
            
            // Clean up
            URL.revokeObjectURL(videoObjectUrl);
            video.remove();
            canvas.remove();
          }
        });
        
        video.addEventListener('error', () => {
          resolve({ thumbnailBlob: new Blob(), error: 'Could not load video for thumbnail extraction' });
          
          // Clean up
          URL.revokeObjectURL(videoObjectUrl);
          video.remove();
          canvas.remove();
        });
        
        video.src = videoObjectUrl;
        video.load();
        
      } catch (error) {
        resolve({ thumbnailBlob: new Blob(), error: `Thumbnail extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
      }
    });
  };

  // Manual thumbnail upload function
  const handleManualThumbnailUpload = async (file: File, videoAsset: AdDraftAsset, draftId: string) => {
    setManualThumbnailModal(prev => ({ ...prev, uploading: true }));
    
    try {
      const supabase = createSPAClient();
      
      // Upload thumbnail to Supabase
      const timestamp = Date.now();
      const thumbnailFileName = `${videoAsset.name.split('.')[0]}_manual_thumbnail.jpg`;
      const thumbnailPath = `${draftId}/${timestamp}_${thumbnailFileName}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('ad-creatives')
        .upload(thumbnailPath, file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError || !data) {
        throw new Error(uploadError?.message || 'Upload failed');
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ad-creatives')
        .getPublicUrl(thumbnailPath);
      
      if (publicUrl) {
        // Update the database with the thumbnail URL
        const { error: updateError } = await supabase
          .from('ad_draft_assets')
          .update({ thumbnail_url: publicUrl })
          .eq('ad_draft_id', draftId)
          .eq('name', videoAsset.name)
          .eq('type', 'video');
        
        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }
        
        console.log(`Manual thumbnail uploaded successfully for ${videoAsset.name}: ${publicUrl}`);
        
        // Refresh the ad drafts to show the updated thumbnail
        await refreshAdDrafts();
        
        alert('Thumbnail uploaded successfully!');
        setManualThumbnailModal({ isOpen: false, videoAsset: null, draftId: '', uploading: false });
      }
      
    } catch (error) {
      console.error('Manual thumbnail upload failed:', error);
      alert(`Failed to upload thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setManualThumbnailModal(prev => ({ ...prev, uploading: false }));
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
                
                {/* Generate Thumbnails Button */}
                <button
                    onClick={handleGenerateThumbnails}
                    disabled={checkedDraftIds.size === 0 || isGeneratingThumbnails}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Generate thumbnails for video assets in selected ad drafts"
                 >
                    {isGeneratingThumbnails ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Thumbnails...
                      </>
                    ) : (
                      <>
                        <FileVideo className="mr-2 h-4 w-4" /> 
                        Generate Thumbnails ({checkedDraftIds.size})
                      </>
                    )}
                </button>
                
                {/* Temporarily hidden - Manual Compress button
                <button
                    onClick={handleCompressVideos}
                    disabled={checkedDraftIds.size === 0 || isCompressing}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md shadow-sm flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Manually compress videos in selected ads (Note: New uploads are automatically compressed if over 500MB)"
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

      {/* Video Thumbnail Scrubber Modal */}
      <VideoThumbnailScrubberModal
        isOpen={thumbnailScrubberModal.isOpen}
        onClose={() => setThumbnailScrubberModal({
          isOpen: false,
          videoAsset: null,
          allVideoAssets: [],
          draftId: ''
        })}
        videoAsset={thumbnailScrubberModal.videoAsset!}
        allVideoAssets={thumbnailScrubberModal.allVideoAssets}
        draftId={thumbnailScrubberModal.draftId}
        onThumbnailUpdated={async () => {
          // Refresh ad drafts to show updated thumbnails
          await refreshAdDrafts();
        }}
      />

      {/* Asset Preview Modal */}
      <AssetPreviewModal />

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
                        <div className="mt-3">
                          <button
                            onClick={() => {
                              if (result.generatedCopy) {
                                setAdDrafts(prevDrafts => 
                                  prevDrafts.map(draft => {
                                    if (draft.id === result.adDraftId) {
                                      return {
                                        ...draft,
                                        headline: result.generatedCopy!.Headline || draft.headline,
                                        primaryText: result.generatedCopy!["Body Copy"] || draft.primaryText,
                                        description: result.generatedCopy!.Description || draft.description
                                      };
                                    }
                                    return draft;
                                  })
                                );
                                alert(`Applied copy to ad: ${result.adDraftName}`);
                              }
                            }}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Apply to Ad
                          </button>
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

      {/* Asset Import Modal */}
      {isAssetModalOpen && (
        <AssetImportModal
          isOpen={isAssetModalOpen}
          onClose={() => setIsAssetModalOpen(false)}
          onAssetsImported={handleAssetsImported}
          brandId={defaults.brandId}
        />
      )}

      {/* Bulk Edit Modal */}
      {isBulkEditModalOpen && (
        <BulkEditModal
          isOpen={isBulkEditModalOpen}
          onClose={() => setIsBulkEditModalOpen(false)}
          onApplyBulkEdit={handleApplyBulkEdit}
          draftsToEdit={draftsForBulkEdit}
          brandId={defaults.brandId}
          adAccountId={defaults.adAccountId}
        />
      )}

      {/* Bulk Rename Modal */}
      {isBulkRenameModalOpen && (
        <BulkRenameModal
          isOpen={isBulkRenameModalOpen}
          onClose={() => setIsBulkRenameModalOpen(false)}
          onRename={handleBulkRename}
          selectedAdIds={Array.from(checkedDraftIds)}
          brandId={defaults.brandId || ''}
        />
      )}

      {/* Manual Thumbnail Upload Modal */}
      {manualThumbnailModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Upload Custom Thumbnail</h2>
                <button
                  onClick={() => setManualThumbnailModal({ isOpen: false, videoAsset: null, draftId: '', uploading: false })}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Upload a custom thumbnail for: <span className="font-medium">{manualThumbnailModal.videoAsset?.name}</span>
                </p>
                <label htmlFor="thumbnail-upload" className="sr-only">
                  Upload thumbnail image
                </label>
                <input
                  id="thumbnail-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && manualThumbnailModal.videoAsset) {
                      handleManualThumbnailUpload(file, manualThumbnailModal.videoAsset, manualThumbnailModal.draftId);
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  disabled={manualThumbnailModal.uploading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: JPG or PNG images with 1:1 aspect ratio
                </p>
              </div>

              {manualThumbnailModal.uploading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-gray-600">Uploading thumbnail...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdSheetView; 