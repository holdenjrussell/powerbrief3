"use client";
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Settings, Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NamingConventionModal from './NamingConventionModal';

interface PrefixAbbreviation {
  key: string;
  full_name: string;
  description: string;
}

interface NamingPrefix {
  id: string;
  prefix: string;
  meaning: string;
  type: 'dynamic' | 'abbreviation' | 'wildcard';
  abbreviations: PrefixAbbreviation[];
  order: number;
}

interface NamingConventionSettings {
  prefixes: NamingPrefix[];
  separator: string;
  include_editor: boolean;
  include_strategist: boolean;
  include_launch_date: boolean;
  date_format: string;
  custom_prompt_template: string;
}

interface BulkRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (adDraftIds: string[], launchDate?: string) => Promise<void>;
  selectedAdIds: string[];
  brandId: string;
}

interface RenameResult {
  adDraftId: string;
  originalName: string;
  newName: string;
  success: boolean;
  error?: string;
}

const BulkRenameModal: React.FC<BulkRenameModalProps> = ({
  isOpen,
  onClose,
  onRename,
  selectedAdIds,
  brandId
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [launchDate, setLaunchDate] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-preview-05-20'); // Default model
  const [namingSettings, setNamingSettings] = useState<NamingConventionSettings | null>(null);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [results, setResults] = useState<RenameResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [renamingProgress, setRenamingProgress] = useState<{
    current: number;
    total: number;
    currentAdName: string;
  } | null>(null);

  // Available AI models for renaming
  const availableModels = [
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Current)', description: 'Reliable and consistent naming' },
    { value: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash Preview (Experimental)', description: 'Latest model with enhanced reasoning' }
  ];

  // Load naming convention settings when modal opens
  useEffect(() => {
    if (isOpen && brandId) {
      loadNamingSettings();
    }
  }, [isOpen, brandId]);

  const loadNamingSettings = async () => {
    try {
      const response = await fetch(`/api/brands/naming-convention?brandId=${brandId}`);
      if (response.ok) {
        const data = await response.json();
        setNamingSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading naming settings:', error);
    }
  };

  const handleRename = async () => {
    if (selectedAdIds.length === 0) {
      alert('No ads selected for renaming.');
      return;
    }

    setIsRenaming(true);
    setShowResults(false);
    setRenamingProgress({ current: 0, total: selectedAdIds.length, currentAdName: 'Starting...' });
    
    try {
      // Call the bulk rename API
      const response = await fetch('/api/ai/bulk-rename-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          adDraftIds: selectedAdIds,
          namingConventionSettings: namingSettings,
          launchDate: launchDate || undefined,
          model: selectedModel
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to rename ads');
      }

      const data = await response.json();
      setResults(data.results || []);
      setShowResults(true);

      // Call the parent's onRename to refresh the data
      await onRename(selectedAdIds, launchDate || undefined);

    } catch (error) {
      console.error('Error renaming ads:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to rename ads. Please try again.';
      alert(errorMessage);
    } finally {
      setIsRenaming(false);
      setRenamingProgress(null);
    }
  };

  const handleNamingSettingsSaved = (settings: NamingConventionSettings) => {
    setNamingSettings(settings);
    setShowNamingModal(false);
  };

  const handleClose = () => {
    setShowResults(false);
    setResults([]);
    setLaunchDate('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center">
              <Sparkles className="h-6 w-6 mr-2 text-purple-600" />
              <h2 className="text-xl font-semibold">Bulk AI Rename</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
              title="Close modal"
              aria-label="Close bulk rename modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            {!showResults ? (
              <div className="space-y-6">
                <div>
                  <p className="text-gray-600 mb-4">
                    Use AI to automatically rename {selectedAdIds.length} selected ad{selectedAdIds.length !== 1 ? 's' : ''} based on your brand&apos;s naming convention and the ad content.
                    Dynamic prefixes like &quot;strat(&quot; will be completed with metadata, abbreviation prefixes will use your defined abbreviations, 
                    and wildcard prefixes will generate unique 4-5 word descriptions of the content (images or videos).
                  </p>
                </div>

                {/* Launch Date Input */}
                <div>
                  <label htmlFor="launch-date" className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Launch Date (Optional)
                  </label>
                  <input
                    id="launch-date"
                    type="date"
                    value={launchDate}
                    onChange={(e) => setLaunchDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    title="Select launch date for ad naming"
                    placeholder="Select launch date"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    If provided, the launch date will be included in the generated ad names according to your naming convention.
                  </p>
                </div>

                {/* AI Model Selection */}
                <div>
                  <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-2">
                    <Sparkles className="h-4 w-4 inline mr-1" />
                    AI Model
                  </label>
                  <select
                    id="model-select"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    title="Select AI model for renaming"
                  >
                    {availableModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    {availableModels.find(m => m.value === selectedModel)?.description}
                  </p>
                </div>

                {/* Naming Convention Settings */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium">Naming Convention</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNamingModal(true)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                  
                  {namingSettings ? (
                    <div className="space-y-2 text-sm text-gray-600">
                      {namingSettings.prefixes.length > 0 && (
                        <div>
                          <span className="font-medium">Prefixes:</span> {namingSettings.prefixes.map(p => `${p.prefix} (${p.meaning})`).join(', ')}
                        </div>
                      )}
                      {namingSettings.separator && (
                        <div>
                          <span className="font-medium">Separator:</span> &quot;{namingSettings.separator}&quot;
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {namingSettings.include_editor && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Include Editor</span>
                        )}
                        {namingSettings.include_strategist && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Include Strategist</span>
                        )}
                        {namingSettings.include_launch_date && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">Include Launch Date</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No naming convention configured. Click &quot;Configure&quot; to set up your naming rules.
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRename} 
                    disabled={isRenaming}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isRenaming ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Renaming...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Rename {selectedAdIds.length} Ad{selectedAdIds.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>

                {/* Progress Indicator */}
                {isRenaming && renamingProgress && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-800">
                        Processing ads... ({renamingProgress.current}/{renamingProgress.total})
                      </span>
                      <span className="text-sm text-blue-600">
                        {Math.round((renamingProgress.current / renamingProgress.total) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(renamingProgress.current / renamingProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-blue-700">
                      Current: {renamingProgress.currentAdName}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Estimated time remaining: {Math.ceil((renamingProgress.total - renamingProgress.current) * 2)} seconds
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Results View */
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Rename Results</h3>
                  <p className="text-gray-600">
                    {results.filter(r => r.success).length} of {results.length} ads renamed successfully.
                  </p>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {results.map((result) => (
                    <div
                      key={result.adDraftId}
                      className={`p-3 rounded-lg border ${
                        result.success 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">Original:</span> {result.originalName}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">New:</span> 
                            <span className={result.success ? 'text-green-800' : 'text-red-800'}>
                              {result.newName}
                            </span>
                          </div>
                          {result.error && (
                            <div className="text-sm text-red-600 mt-1">
                              Error: {result.error}
                            </div>
                          )}
                        </div>
                        <div className={`ml-2 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                          {result.success ? '✓' : '✗'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleClose}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Naming Convention Settings Modal */}
      <NamingConventionModal
        isOpen={showNamingModal}
        onClose={() => setShowNamingModal(false)}
        onSave={handleNamingSettingsSaved}
        initialSettings={namingSettings || undefined}
        brandId={brandId}
      />
    </>
  );
};

export default BulkRenameModal; 