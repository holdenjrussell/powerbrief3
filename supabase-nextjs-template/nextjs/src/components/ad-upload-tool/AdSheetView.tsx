"use client";
import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  Filter,
  Trash2,
  PlusCircle,
  Columns,
} from 'lucide-react';
import AssetImportModal from './AssetImportModal'; // Import the modal

// Updated DefaultValues interface to match AdBatchCreator
interface DefaultValues {
  brandId: string | null;
  adAccountId: string | null;
  fbPage: string;
  igAccount: string;
  urlParams: string;
  pixel: string;
  status: 'ACTIVE' | 'PAUSED';
  primaryText: string; 
  headline: string;    
  description: string; 
  destinationUrl: string; 
  callToAction: string; 
}

// Define ColumnDef interface locally
interface ColumnDef<TData> {
  id: Extract<keyof TData, string> | 'actions'; // More specific ID type
  label: string;
  visible: boolean;
  type: 'text' | 'textarea' | 'select' | 'url' | 'custom' | 'status';
  options?: string[];
}

// Define AdDraft interface
interface AdDraft {
  id: string; 
  adName: string;
  primaryText: string;
  headline?: string;
  description?: string;
  campaign: string; 
  adSet: string;    
  destinationUrl: string;
  callToAction: string; 
  assets: Array<{ name: string; supabaseUrl: string; type: 'image' | 'video'; aspectRatios?: string[] }>;
  status: 'Draft' | 'ReadyToReview' | 'Uploading' | 'Synced' | 'Error';
  // Add other AdDraft fields here if they can be column IDs
}

// Define ImportedAssetGroup (as expected by AdSheetView from the modal)
interface ImportedAssetGroup {
    groupName: string;
    files: Array<{ id: string; name: string; supabaseUrl: string; type: 'image' | 'video' }>;
    aspectRatiosDetected?: string[];
}

interface AdSheetViewProps {
  defaults: DefaultValues; // This now includes all necessary default fields
  onGoBack: () => void; 
}

const callToActionOptions = [
  'BOOK_TRAVEL', 'CALL_NOW', 'CONTACT_US', 'DOWNLOAD', 'GET_DIRECTIONS',
  'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'SUBSCRIBE', 'WATCH_MORE', 'NO_BUTTON'
];

// MOCK DATA (to be replaced with API calls)
const mockCampaignsData: Record<string, Array<{id: string, name: string}>> = {
  'act_1234567890': [
    { id: 'campaign1_alpha', name: 'Alpha Campaign 1 (act_1234567890)' },
    { id: 'campaign2_alpha', name: 'Alpha Campaign 2 (act_1234567890)' },
  ],
  'act_0987654321': [
    { id: 'campaign1_beta', name: 'Beta Campaign 1 (act_0987654321)' },
    { id: 'campaign2_beta', name: 'Beta Campaign 2 (act_0987654321)' },
  ],
};

const mockAdSetsData: Record<string, Record<string, Array<{id: string, name: string}>>> = {
  'act_1234567890': {
    'campaign1_alpha': [
      { id: 'adset1_c1_alpha', name: 'Ad Set 1 (Alpha C1)' },
      { id: 'adset2_c1_alpha', name: 'Ad Set 2 (Alpha C1)' },
    ],
    'campaign2_alpha': [
      { id: 'adset1_c2_alpha', name: 'Ad Set 1 (Alpha C2)' },
    ],
  },
  'act_0987654321': {
    'campaign1_beta': [
      { id: 'adset1_c1_beta', name: 'Ad Set 1 (Beta C1)' },
    ],
    'campaign2_beta': [
      { id: 'adset1_c2_beta', name: 'Ad Set 1 (Beta C2)' },
      { id: 'adset2_c2_beta', name: 'Ad Set 2 (Beta C2)' },
    ],
  },
};

const initialColumns = [
    { id: 'adName', label: 'Ad Name', visible: true, type: 'text' as const },
    { id: 'primaryText', label: 'Primary Text', visible: true, type: 'textarea' as const },
    { id: 'headline', label: 'Headline', visible: true, type: 'text' as const }, // Made visible by default
    { id: 'description', label: 'Description', visible: false, type: 'text' as const },
    { id: 'campaign', label: 'Campaign', visible: true, type: 'select' as const, options: [] as string[] }, // Initialize with empty options
    { id: 'adSet', label: 'Ad Set', visible: true, type: 'select' as const, options: [] as string[] }, 
    { id: 'destinationUrl', label: 'Destination URL', visible: true, type: 'url' as const },
    { id: 'callToAction', label: 'Call To Action', visible: true, type: 'select' as const, options: callToActionOptions.map(cta => cta.replace(/_/g, ' ')) }, // Format for display
    { id: 'assets', label: 'Assets', visible: true, type: 'custom' as const }, 
    { id: 'status', label: 'Status', visible: true, type: 'status' as const }, 
];


const AdSheetView: React.FC<AdSheetViewProps> = ({ defaults, onGoBack }) => {
  const [adDrafts, setAdDrafts] = useState<AdDraft[]>([]);
  const [columns, setColumns] = useState<ColumnDef<AdDraft>[]>(initialColumns as ColumnDef<AdDraft>[]); // Cast initialColumns
  const [isColumnDropdownOpen, setColumnDropdownOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{rowIndex: number; columnId: string} | null>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false); // State for modal

  const getCampaignOptions = (adAccountId: string | null): Array<{id: string, name: string}> => {
    if (!adAccountId || !mockCampaignsData[adAccountId]) {
      return [];
    }
    return mockCampaignsData[adAccountId];
  };

  const getAdSetOptions = (adAccountId: string | null, campaignId: string | null): Array<{id: string, name: string}> => {
    if (!adAccountId || !campaignId || !mockAdSetsData[adAccountId] || !mockAdSetsData[adAccountId][campaignId]) {
      return [];
    }
    return mockAdSetsData[adAccountId][campaignId];
  };

  useEffect(() => {
    if (adDrafts.length === 0) {
        // No longer adding an empty row by default, user will import or add manually
    }
  }, [adDrafts.length]); 

  const handleAddRow = () => {
    const newDraft: AdDraft = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      adName: `New Ad ${adDrafts.length + 1}`,
      primaryText: defaults.primaryText,      
      headline: defaults.headline,       
      description: defaults.description,  
      campaign: '', // Initialize campaign as empty
      adSet: '', 
      destinationUrl: defaults.destinationUrl,  
      callToAction: defaults.callToAction, 
      assets: [],
      status: 'Draft',
    };
    setAdDrafts(prev => [...prev, newDraft]);
  };

  const handleAssetsImported = (importedAssetGroups: ImportedAssetGroup[]) => {
    const newAdDrafts: AdDraft[] = importedAssetGroups.map((group, index) => {
        const adNameFromAsset = group.groupName.replace(/\.[^/.]+$/, "");
        return {
            id: `imported-draft-${Date.now()}-${index}`,
            adName: `${adNameFromAsset} (Ad ${adDrafts.length + index + 1})`,
            primaryText: defaults.primaryText, 
            headline: defaults.headline, 
            description: defaults.description,
            campaign: '', // Initialize campaign as empty
            adSet: '', 
            destinationUrl: defaults.destinationUrl, 
            callToAction: defaults.callToAction, 
            assets: group.files.map(asset => ({
                name: asset.name,
                supabaseUrl: asset.supabaseUrl,
                type: asset.type,
                aspectRatios: group.aspectRatiosDetected,
            })),
            status: 'Draft',
        };
    });
    setAdDrafts(prev => [...prev, ...newAdDrafts]);
    setIsAssetModalOpen(false);
  };

  const handleCellValueChange = (rowIndex: number, columnId: Extract<keyof AdDraft, string>, value: AdDraft[keyof AdDraft] | string) => {
    setAdDrafts(prevDrafts => {
      const updatedDrafts = prevDrafts.map((draft, index) => {
        if (index === rowIndex) {
          const newDraft = { ...draft, [columnId]: value };
          // If campaign is changed, reset adSet
          if (columnId === 'campaign') {
            newDraft.adSet = ''; 
          }
          return newDraft;
        }
        return draft;
      });
      return updatedDrafts;
    });
  };

  const toggleColumnVisibility = (columnId: string) => {
    setColumns(prevCols =>
      prevCols.map(col =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const handleDeleteRow = (rowIndex: number) => {
    setAdDrafts(prev => prev.filter((_, index) => index !== rowIndex));
  };
  
  const renderCellContent = (draft: AdDraft, column: typeof columns[0], rowIndex: number) => {
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
                let options = column.options || [];
                if (column.id === 'adSet') {
                    const currentCampaign = draft.campaign;
                    const adSetOptions = getAdSetOptions(defaults.adAccountId, currentCampaign);
                    options = adSetOptions.map(as => as.name);
                } else if (column.id === 'callToAction') {
                    // Display options with spaces, but store raw value
                    options = callToActionOptions.map(cta => cta.replace(/_/g, ' ')); 
                }
                return (
                    <select 
                        value={column.id === 'callToAction' ? String(value || '').replace(/_/g, ' ') : String(value || '')}
                        onChange={(e) => {
                            let valToStore = e.target.value;
                            if (column.id === 'callToAction') {
                                valToStore = valToStore.replace(/ /g, '_').toUpperCase();
                            }
                            handleCellValueChange(rowIndex, column.id as Extract<keyof AdDraft, string>, valToStore);
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
            default:
                return <span className="truncate text-sm cursor-pointer" onClick={() => setEditingCell({rowIndex, columnId: column.id})}>{String(value) || '-'}</span>;
        }
    }

    switch (column.id) {
      case 'assets':
        return (
          <div className="flex flex-wrap gap-1" onClick={() => setIsAssetModalOpen(true) } style={{cursor: 'pointer'}}>
            {draft.assets.length > 0 ? (
              draft.assets.map((asset, i) => (
                <span key={i} className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                  {asset.name} ({asset.aspectRatios ? asset.aspectRatios.join('/') : asset.type})
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-400 italic">(Click to import)</span>
            )}
          </div>
        );
      case 'status':
        return (
          <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer 
            ${draft.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' : 
              draft.status === 'ReadyToReview' ? 'bg-blue-100 text-blue-800' : 
              draft.status === 'Synced' ? 'bg-green-100 text-green-800' : 
              draft.status === 'Uploading' ? 'bg-purple-100 text-purple-800' : 'bg-red-100 text-red-800'}
            `}
            onClick={() => alert('Status editing TBD - likely a dropdown')}
            >
            {draft.status}
          </span>
        );
      case 'callToAction': // Display formatted CTA value when not in edit mode
        return (
            <span 
                className="truncate text-sm p-1 cursor-pointer hover:bg-gray-100" 
                onClick={() => setEditingCell({rowIndex, columnId: column.id})}
            >
                {(String(value || '').replace(/_/g, ' ')) || '-'}
            </span>
        );
      case 'campaign':
        const campaignOptions = getCampaignOptions(defaults.adAccountId);
        if (editingCell && editingCell.rowIndex === rowIndex && editingCell.columnId === column.id) {
          return (
            <select
              value={String(value || '')}
              onChange={(e) => {
                handleCellValueChange(rowIndex, column.id as Extract<keyof AdDraft, string>, e.target.value);
                setEditingCell(null); // Exit edit mode after change
              }}
              onBlur={() => setEditingCell(null)}
              className="w-full p-1 border rounded text-sm"
              autoFocus
              aria-label={`Campaign for row ${rowIndex + 1}`}
            >
              <option value="">-- Select Campaign --</option>
              {campaignOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          );
        }
        return (
          <span 
            className="truncate text-sm p-1 cursor-pointer hover:bg-gray-100" 
            onClick={() => setEditingCell({rowIndex, columnId: column.id})}
          >
            {String(value || '') || '-'}
          </span>
        );
      case 'adSet':
        const currentCampaign = draft.campaign; // Get campaign from the current row's draft
        const adSetOptions = getAdSetOptions(defaults.adAccountId, currentCampaign);
        if (editingCell && editingCell.rowIndex === rowIndex && editingCell.columnId === column.id) {
          return (
            <select
              value={String(value || '')}
              onChange={(e) => {
                handleCellValueChange(rowIndex, column.id as Extract<keyof AdDraft, string>, e.target.value);
                setEditingCell(null); // Exit edit mode after change
              }}
              onBlur={() => setEditingCell(null)}
              className="w-full p-1 border rounded text-sm"
              autoFocus
              disabled={!currentCampaign} // Disable if no campaign is selected
              aria-label={`Ad Set for row ${rowIndex + 1}`}
            >
              <option value="">-- Select Ad Set --</option>
              {adSetOptions.map(as => <option key={as.id} value={as.name}>{as.name}</option>)}
            </select>
          );
        }
        return (
          <span 
            className="truncate text-sm p-1 cursor-pointer hover:bg-gray-100"
            onClick={() => setEditingCell({rowIndex, columnId: column.id})}
          >
            {String(value || '') || '-'}
          </span>
        );
      default:
        const displayValue = String(value || '-');
        return (
            <span 
                className={`truncate text-sm p-1 ${column.type !== 'custom' && column.type !== 'status' ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                onClick={() => {
                    if (column.type !== 'custom' && column.type !== 'status') { 
                        setEditingCell({rowIndex, columnId: column.id});
                    }
                }}
                title={displayValue.length > 30 ? displayValue : ''} 
            >
                {displayValue}
            </span>
        );
    }
  };

  return (
    <div className="mt-6 pb-16">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-1">2. Ad Sheet</h2>
            <p className="text-sm text-gray-500 mb-1">Brand: <span className="font-medium text-gray-700">{defaults.brandId} (Details TBD)</span></p>
            <div className="text-xs text-gray-500 space-y-0.5">
                <p>FB Page: <span className="font-medium text-gray-600">{defaults.fbPage}</span> | IG Account: <span className="font-medium text-gray-600">{defaults.igAccount}</span></p>
                <p>Pixel: <span className="font-medium text-gray-600">{defaults.pixel}</span> | Default Status: <span className="font-medium text-gray-600">{defaults.status}</span></p>
                {defaults.urlParams && <p>URL Params: <span className="font-medium text-gray-600">{defaults.urlParams}</span></p>}
                {/* Display new defaults */}
                <p>Dest. URL: <span className="font-medium text-gray-600">{defaults.destinationUrl}</span> | CTA: <span className="font-medium text-gray-600">{defaults.callToAction.replace(/_/g, ' ')}</span></p>
                <p>Primary Text: <span className="font-medium text-gray-600 truncate w-60 inline-block" title={defaults.primaryText}>{defaults.primaryText}</span></p>
                <p>Headline: <span className="font-medium text-gray-600">{defaults.headline}</span></p>
            </div>
             <button 
                onClick={onGoBack} 
                className="mt-3 text-sm text-primary-600 hover:text-primary-800 focus:outline-none flex items-center"
              >
                &larr; Change Defaults
            </button>
        </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
            <div className="flex items-center gap-2">
                <button
                onClick={() => setIsAssetModalOpen(true)} // Open the modal
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
                                />
                                <span id={`col-label-${col.id}`}>{col.label}</span>
                            </label>
                        ))}
                        </div>
                    </div>
                )}
            </div>
            <button
              onClick={() => alert('Filter functionality TBD')} 
              className="px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 flex items-center"
            >
              <Filter className="mr-2 h-4 w-4 text-gray-500" /> Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.filter(col => col.visible).map(col => (
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
              {adDrafts.map((draft, rowIndex) => (
                <tr key={draft.id} className="hover:bg-gray-50">
                  {columns.filter(col => col.visible).map(col => (
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
               {adDrafts.length === 0 && (
                    <tr>
                        <td colSpan={columns.filter(c => c.visible).length + 1} className="text-center py-10 text-gray-500">
                            No ad drafts yet. Click &apos;Add Ad&apos; or &apos;Import Assets&apos; to get started.
                        </td>
                    </tr>
                )}
            </tbody>
          </table>
        </div>
         {adDrafts.length > 0 && 
            <div className="mt-6 flex justify-end">
                 <button
                    onClick={() => alert('Review & Launch TBD')}
                    className="px-6 py-3 text-base font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm flex items-center"
                    >
                    Review & Launch Ads ({adDrafts.filter(d => d.status === 'ReadyToReview').length})
                </button>
            </div>
        }
      </div>
      {/* Asset Import Modal rendering */}
      <AssetImportModal 
        isOpen={isAssetModalOpen} 
        onClose={() => setIsAssetModalOpen(false)} 
        onAssetsImported={handleAssetsImported} 
        brandId={defaults.brandId}
      />
    </div>
  );
};

export default AdSheetView; 