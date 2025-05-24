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
  ChevronLeft,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import AssetImportModal from './AssetImportModal';
import MetaCampaignSelector from './MetaCampaignSelector';
import MetaAdSetSelector from './MetaAdSetSelector';
// Import shared types
import {
    AdDraft,
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
import { Button } from '@/components/ui/button';

// DefaultValues interface is now imported and aliased
// ColumnDef interface is now imported
// AdCreativeStatus type is now imported
// AdDraft interface is now imported
// ImportedAssetGroup interface is now imported
// callToActionOptions and adCreativeStatusOptions are now imported

interface AdSheetViewProps {
  defaults: DefaultValues; // Uses the imported and aliased DefaultValues
  onGoBack: () => void; 
  activeBatch?: AdBatch | null; // Optional active batch info
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

const AdSheetView: React.FC<AdSheetViewProps> = ({ defaults, onGoBack, activeBatch }) => {
  const [adDrafts, setAdDrafts] = useState<AdDraft[]>([]);
  const [columns, setColumns] = useState<ColumnDef<AdDraft>[]>(initialColumns);
  const [isColumnDropdownOpen, setColumnDropdownOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{rowIndex: number; columnId: string} | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [checkedDraftIds, setCheckedDraftIds] = useState<Set<string>>(new Set());
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false); // State for bulk edit modal
  const [draftsForBulkEdit, setDraftsForBulkEdit] = useState<AdDraft[]>([]); // State to hold drafts for modal
  const [isLaunching, setIsLaunching] = useState(false); // State for launch loading
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterAppStatus, setFilterAppStatus] = useState<AppAdDraftStatus[]>(['DRAFT', 'UPLOADING', 'ERROR']); // Filter out PUBLISHED by default, but include ERROR
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Log active batch for debugging
  console.log('Active batch in AdSheetView:', activeBatch?.name || 'No active batch');

  // Filter ads based on selected app statuses
  const filteredAdDrafts = adDrafts.filter(draft => 
    filterAppStatus.includes(draft.appStatus || 'DRAFT')
  );

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
                            newDraft.campaignId = updatedValues.campaignId === undefined ? null : updatedValues.campaignId; // Can be string or null
                            newDraft.adSetId = null; // Always reset adSetId when campaign changes
                        } else if (k === 'adSetId' && fieldsToApply.campaignId === false) {
                            // Only update adSetId if campaignId is NOT being updated in the same bulk operation
                            // or if campaignId in formData matched the draft's original campaignId (more complex check)
                            // For simplicity now: if campaignId is bulk-edited, adSetId is reset above.
                            // This allows adSetId to be set if only it's selected for update.
                            newDraft.adSetId = updatedValues.adSetId === undefined ? null : updatedValues.adSetId;
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
      adSetId: defaults.adSetId,       
      destinationUrl: defaults.destinationUrl,  
      callToAction: defaults.callToAction, 
      assets: [],
      status: defaults.status as AdCreativeStatus,
      appStatus: 'DRAFT', // Default meta upload status
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
            adSetId: defaults.adSetId,       
            destinationUrl: defaults.destinationUrl, 
            callToAction: defaults.callToAction, 
            assets: group.files.map(asset => ({
                name: asset.name,
                supabaseUrl: asset.supabaseUrl,
                type: asset.type,
                aspectRatios: group.aspectRatiosDetected,
            })),
            status: defaults.status as AdCreativeStatus,
            appStatus: 'DRAFT', // Default meta upload status
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
      const response = await fetch('/api/meta/launch-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });
      
      const result = await response.json(); // Always try to parse JSON

      if (!response.ok) {
        throw new Error(result.message || 'Failed to launch ads');
      }
      
      alert(`Server response: ${result.message}`);
      // Potentially clear checked drafts or update their status after successful launch initiation
      // For example, if you want to clear selections after a successful API call:
      // setCheckedDraftIds(new Set());
      // Or update status of launched ads based on `result.details`

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
            onCampaignSelect={(campaignId) => handleCellValueChange(rowIndex, 'campaignId', campaignId)}
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
            onAdSetSelect={(adSetId) => handleCellValueChange(rowIndex, 'adSetId', adSetId)}
            disabled={!draft.campaignId} 
          />
        );
      case 'assets':
        return (
          <div className="flex flex-wrap gap-1 cursor-pointer" onClick={() => {
            setIsAssetModalOpen(true); 
            }}
          >
            {draft.assets.length > 0 ? (
              draft.assets.map((asset, i) => (
                <span key={i} className={`px-2 py-0.5 text-xs rounded-full ${asset.type === 'image' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {asset.name} ({asset.aspectRatios ? asset.aspectRatios.join('/') : asset.type})
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">(Click to import/add)</span>
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

  // Load existing ad drafts on component mount
  useEffect(() => {
    const loadAdDrafts = async () => {
      if (!defaults.brandId) return;
      
      try {
        setLoading(true);
        const params = new URLSearchParams({
          brandId: defaults.brandId
        });
        
        // Filter by ad batch if available
        if (activeBatch?.id) {
          params.append('adBatchId', activeBatch.id);
        }
        
        const response = await fetch(`/api/ad-drafts?${params}`);
        if (!response.ok) throw new Error('Failed to load ad drafts');
        
        const existingDrafts: AdDraft[] = await response.json();
        
        // Ensure all drafts have brandId set (safety check for existing drafts)
        const draftsWithBrandId = existingDrafts.map(draft => ({
          ...draft,
          brandId: draft.brandId || defaults.brandId || undefined
        }));
        
        setAdDrafts(draftsWithBrandId);
      } catch (error) {
        console.error('Error loading ad drafts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdDrafts();
  }, [defaults.brandId, activeBatch?.id]);

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
            adBatchId: activeBatch?.id || null
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
  }, [adDrafts, defaults.brandId, activeBatch?.id, loading]);

  return (
    <div className="mt-6 pb-16">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-1">2. Ad Sheet</h2>
            <p className="text-sm text-gray-500 mb-1">Brand: <span className="font-medium text-gray-700">{defaults.brandId || 'N/A'}</span></p>
            <div className="text-xs text-gray-500 space-y-0.5">
                <p>Ad Account: <span className="font-medium text-gray-600">{defaults.adAccountId || 'N/A'}</span></p>
                <p>Default Campaign ID: <span className="font-medium text-gray-600">{defaults.campaignId || 'Not Set'}</span></p>
                <p>Default Ad Set ID: <span className="font-medium text-gray-600">{defaults.adSetId || 'Not Set'}</span></p>
                <p>FB Page: <span className="font-medium text-gray-600">{defaults.fbPage || 'N/A'}</span> | IG Account: <span className="font-medium text-gray-600">{defaults.igAccount || 'N/A'}</span></p>
                <p>Pixel: <span className="font-medium text-gray-600">{defaults.pixel || 'N/A'}</span> | Default Status: <span className="font-medium text-gray-600">{defaults.status}</span></p>
                {defaults.urlParams && <p>URL Params: <span className="font-medium text-gray-600">{defaults.urlParams}</span></p>}
                <p>Dest. URL: <span className="font-medium text-gray-600">{defaults.destinationUrl}</span> | CTA: <span className="font-medium text-gray-600">{defaults.callToAction.replace(/_/g, ' ')}</span></p>
                <p>Primary Text: <span className="font-medium text-gray-600 truncate w-60 inline-block" title={defaults.primaryText}>{defaults.primaryText}</span></p>
                <p>Headline: <span className="font-medium text-gray-600">{defaults.headline}</span></p>
            </div>
             <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Button onClick={onGoBack} variant="outline" size="sm">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to Settings
                </Button>
                {activeBatch && (
                  <span className="text-sm text-gray-600">
                    Batch: {activeBatch.name}
                  </span>
                )}
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
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 flex items-center"
              >
                <Filter className="mr-2 h-4 w-4 text-gray-500" /> 
                Filter ({filterAppStatus.length})
              </button>
              {isFilterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border z-10">
                  <div className="py-1">
                    <div className="px-3 py-2 text-sm font-medium text-gray-900 border-b">Meta Upload Status</div>
                    {appAdDraftStatusOptions.map(status => (
                      <label key={status} className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={filterAppStatus.includes(status)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilterAppStatus(prev => [...prev, status]);
                            } else {
                              setFilterAppStatus(prev => prev.filter(s => s !== status));
                            }
                          }}
                          className="mr-2 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="capitalize">{status}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
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
    </div>
  );
};

export default AdSheetView; 