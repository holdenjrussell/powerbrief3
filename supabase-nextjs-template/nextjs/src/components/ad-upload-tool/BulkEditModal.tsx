"use client";
import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square } from 'lucide-react';
import {
    AdDraft,
    AdCreativeStatus,
    adCreativeStatusOptions,
    callToActionOptions,
    BulkEditableAdDraftFields
} from './adUploadTypes'; 
import MetaCampaignSelector from './MetaCampaignSelector';
import MetaAdSetSelector from './MetaAdSetSelector';

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftsToEdit: AdDraft[];
  onApplyBulkEdit: (updatedFields: BulkEditableAdDraftFields, fieldsToUpdate: Record<keyof BulkEditableAdDraftFields, boolean>) => void;
  brandId: string | null;
  adAccountId: string | null;
}

// Type for the value in handleInputChange, covering all possible field types in BulkEditableAdDraftFields
type BulkEditValue = string | string[] | AdCreativeStatus | null | undefined;

const BulkEditModal: React.FC<BulkEditModalProps> = ({
  isOpen,
  onClose,
  draftsToEdit,
  onApplyBulkEdit,
  brandId,
  adAccountId,
}) => {
  const [formData, setFormData] = useState<BulkEditableAdDraftFields>({});
  const [fieldsToUpdate, setFieldsToUpdate] = useState<Record<keyof BulkEditableAdDraftFields, boolean>>({
    primaryText: false,
    headline: false,
    description: false,
    campaignId: false,
    adSetId: false,
    destinationUrl: false,
    callToAction: false,
    status: false,
  });

  useEffect(() => {
    setFormData({}); 
    setFieldsToUpdate({
        primaryText: false, headline: false, description: false, campaignId: false, adSetId: false,
        destinationUrl: false, callToAction: false, status: false
    });
  }, [draftsToEdit, isOpen]);

  const handleInputChange = (field: keyof BulkEditableAdDraftFields, value: BulkEditValue) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'campaignId') {
        setFormData(prev => ({ ...prev, adSetId: null }));
        if(fieldsToUpdate.campaignId && value !== null && value !== undefined) { // if campaignId is being actively changed to a new value
             // Also ensure adSetId is marked for update, as it will be nulled or needs re-selection
            setFieldsToUpdate(prev => ({...prev, adSetId: true}));
        }
    }
  };

  const toggleFieldUpdate = (field: keyof BulkEditableAdDraftFields) => {
    setFieldsToUpdate(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = () => {
    onApplyBulkEdit(formData, fieldsToUpdate);
    onClose();
  };

  if (!isOpen) return null;

  const selectedDraftCount = draftsToEdit.length;

  const renderFormField = (
    fieldKey: keyof BulkEditableAdDraftFields, 
    label: string, 
    type: 'text' | 'textarea' | 'select' | 'campaign' | 'adset' | 'status',
    options?: readonly string[] // Changed to readonly string[] to match imported types
  ) => {
    const isChecked = fieldsToUpdate[fieldKey];
    return (
      <div key={fieldKey} className="mb-4 p-3 border border-gray-200 rounded-md bg-gray-50">
        <div className="flex items-center mb-2">
          <button 
            onClick={() => toggleFieldUpdate(fieldKey)} 
            className="mr-2 p-1 focus:outline-none flex items-center text-sm text-gray-600 hover:text-gray-800"
            aria-label={`Toggle update for ${label}`}
          >
            {isChecked ? <CheckSquare size={18} className="text-primary-600" /> : <Square size={18} className="text-gray-400" />}
            <span className="ml-1.5">Update {label}?</span>
          </button>
        </div>
        {isChecked && (
          <>
            {type === 'textarea' && (
              <textarea
                value={formData[fieldKey] as string || ''} // Added type assertion
                onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                placeholder={`Enter ${label}`}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                rows={3}
                aria-label={label}
              />
            )}
            {type === 'text' && (
              <input
                type="text"
                value={formData[fieldKey] as string || ''} // Added type assertion
                onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                placeholder={`Enter ${label}`}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                aria-label={label}
              />
            )}
            {/* CTA Select */}
            {type === 'select' && fieldKey === 'callToAction' && options && (
              <select
                value={formData[fieldKey] as string || ''} // Added type assertion
                onChange={(e) => handleInputChange(fieldKey, e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                aria-label={label} 
              >
                <option value="">-- Select {label} --</option>
                {options.map(opt => <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>)}
              </select>
            )}
            {/* Status Select */}
            {type === 'status' && fieldKey === 'status' && (
                 <select
                    value={formData.status || ''}
                    onChange={(e) => handleInputChange('status', e.target.value as AdCreativeStatus)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                    aria-label={label} 
                >
                    <option value="">-- Select Status --</option>
                    {adCreativeStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            )}
             {type === 'campaign' && brandId && adAccountId && (
                 <MetaCampaignSelector
                    brandId={brandId}
                    adAccountId={adAccountId}
                    selectedCampaignId={formData.campaignId || null}
                    onCampaignSelect={(campaignId) => handleInputChange('campaignId', campaignId)}
                />
            )}
            {type === 'adset' && brandId && adAccountId && (
                <MetaAdSetSelector
                    brandId={brandId}
                    adAccountId={adAccountId}
                    campaignId={formData.campaignId || null} 
                    selectedAdSetId={formData.adSetId || null}
                    onAdSetSelect={(adSetId) => handleInputChange('adSetId', adSetId)}
                    disabled={!formData.campaignId}
                />
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out opacity-100">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-xl transform transition-all duration-300 ease-in-out scale-100 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Bulk Edit {selectedDraftCount} Ad Draft{selectedDraftCount > 1 ? 's' : ''}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close modal">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto flex-grow pr-2">
          {renderFormField('primaryText', 'Primary Text', 'textarea')}
          {renderFormField('headline', 'Headline', 'text')}
          {renderFormField('description', 'Description', 'textarea')}
          {renderFormField('destinationUrl', 'Destination URL', 'text')}
          {renderFormField('callToAction', 'Call To Action', 'select', callToActionOptions)}
          {renderFormField('status', 'Status', 'status')}
          {renderFormField('campaignId', 'Campaign', 'campaign')}
          {renderFormField('adSetId', 'Ad Set', 'adset')}
        </div>

        <div className="mt-6 pt-5 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!Object.values(fieldsToUpdate).some(val => val)} 
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Changes to Selected ({Object.values(fieldsToUpdate).filter(val => val).length} fields)
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkEditModal; 