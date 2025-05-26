"use client";
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Settings, ChevronUp, ChevronDown, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrefixAbbreviation {
  key: string;
  full_name: string;
  description: string;
}

interface NamingPrefix {
  id: string;
  prefix: string; // e.g., "ld(", "pt(", "ang(", "wc("
  meaning: string; // e.g., "Launch Date", "Primary Theme", "Angle", "Wildcard"
  type: 'dynamic' | 'abbreviation' | 'wildcard'; // dynamic = filled with metadata, abbreviation = AI selects from list, wildcard = AI generates description
  abbreviations: PrefixAbbreviation[]; // only used if type is 'abbreviation'
  order: number;
}

interface NamingConventionSettings {
  prefixes: NamingPrefix[];
  separator: string; // single separator between all parts
  include_editor: boolean;
  include_strategist: boolean;
  include_launch_date: boolean;
  date_format: string;
  custom_prompt_template: string;
}

interface NamingConventionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: NamingConventionSettings) => void;
  initialSettings?: NamingConventionSettings;
  brandId: string;
}

const defaultSettings: NamingConventionSettings = {
  prefixes: [],
  separator: ')_',
  include_editor: true,
  include_strategist: true,
  include_launch_date: true,
  date_format: 'MM-DD-YYYY',
  custom_prompt_template: '',
};

const NamingConventionModal: React.FC<NamingConventionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSettings,
  brandId
}) => {
  const [settings, setSettings] = useState<NamingConventionSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [editingPrefix, setEditingPrefix] = useState<string | null>(null);
  const [newPrefix, setNewPrefix] = useState<Partial<NamingPrefix>>({
    prefix: '',
    meaning: '',
    type: 'dynamic',
    abbreviations: []
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    } else {
      setSettings(defaultSettings);
    }
  }, [initialSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to database
      const response = await fetch('/api/brands/naming-convention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandId,
          settings
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save naming convention settings');
      }

      onSave(settings);
      onClose();
    } catch (error) {
      console.error('Error saving naming convention settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addPrefix = () => {
    if (newPrefix.prefix && newPrefix.meaning) {
      const prefix: NamingPrefix = {
        id: crypto.randomUUID(),
        prefix: newPrefix.prefix,
        meaning: newPrefix.meaning,
        type: newPrefix.type || 'dynamic',
        abbreviations: newPrefix.abbreviations || [],
        order: settings.prefixes.length
      };
      
      setSettings(prev => ({
        ...prev,
        prefixes: [...prev.prefixes, prefix].sort((a, b) => a.order - b.order)
      }));
      
      setNewPrefix({
        prefix: '',
        meaning: '',
        type: 'dynamic',
        abbreviations: []
      });
    }
  };

  const removePrefix = (id: string) => {
    setSettings(prev => ({
      ...prev,
      prefixes: prev.prefixes.filter(p => p.id !== id)
    }));
  };

  const movePrefix = (id: string, direction: 'up' | 'down') => {
    setSettings(prev => {
      const prefixes = [...prev.prefixes];
      const index = prefixes.findIndex(p => p.id === id);
      
      if (index === -1) return prev;
      
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prefixes.length) return prev;
      
      // Swap the prefixes
      [prefixes[index], prefixes[newIndex]] = [prefixes[newIndex], prefixes[index]];
      
      // Update order values
      prefixes.forEach((prefix, i) => {
        prefix.order = i;
      });
      
      return {
        ...prev,
        prefixes
      };
    });
  };

  const updatePrefix = (id: string, updates: Partial<NamingPrefix>) => {
    setSettings(prev => ({
      ...prev,
      prefixes: prev.prefixes.map(p => 
        p.id === id ? { ...p, ...updates } : p
      )
    }));
  };

  const addAbbreviationToPrefix = (prefixId: string, abbreviation: PrefixAbbreviation) => {
    updatePrefix(prefixId, {
      abbreviations: [
        ...(settings.prefixes.find(p => p.id === prefixId)?.abbreviations || []),
        abbreviation
      ]
    });
  };

  const removeAbbreviationFromPrefix = (prefixId: string, abbreviationKey: string) => {
    const prefix = settings.prefixes.find(p => p.id === prefixId);
    if (prefix) {
      updatePrefix(prefixId, {
        abbreviations: prefix.abbreviations.filter(a => a.key !== abbreviationKey)
      });
    }
  };

  const generatePreview = () => {
    const parts = settings.prefixes
      .sort((a, b) => a.order - b.order)
      .map(prefix => {
        if (prefix.type === 'dynamic') {
          return `${prefix.prefix}${prefix.meaning === 'Launch Date' ? '02-26-2025' : 'VALUE'}`;
        } else if (prefix.type === 'abbreviation') {
          const firstAbbrev = prefix.abbreviations[0];
          return `${prefix.prefix}${firstAbbrev ? firstAbbrev.key : 'ABV'}`;
        } else if (prefix.type === 'wildcard') {
          return `${prefix.prefix}AI Generated Description`;
        }
        return `${prefix.prefix}VALUE`;
      });
    
    return parts.join(settings.separator);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Settings className="h-6 w-6 mr-2 text-blue-600" />
            <h2 className="text-xl font-semibold">Advanced Naming Convention Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            title="Close modal"
            aria-label="Close naming convention settings modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Preview Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-medium mb-2">Preview</h3>
            <div className="font-mono text-sm bg-white p-3 rounded border">
              {generatePreview() || 'No prefixes configured'}
            </div>
          </div>

          {/* Separator Section */}
          <div>
            <h3 className="text-lg font-medium mb-3">Separator</h3>
            <p className="text-sm text-gray-600 mb-3">
              Character(s) used to separate each prefix-value pair in the final name
            </p>
            <input
              type="text"
              value={settings.separator}
              onChange={(e) => setSettings(prev => ({ ...prev, separator: e.target.value }))}
              placeholder="e.g., )_, -, _"
              className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Prefixes Section */}
          <div>
            <h3 className="text-lg font-medium mb-3">Prefixes (in order)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Define prefixes in the order they should appear in the final name. Dynamic prefixes are filled with metadata, 
              abbreviation prefixes let AI select from your defined abbreviations, and wildcard prefixes generate a 4-5 word 
              unique description of the video content.
            </p>

            {/* Add New Prefix */}
            <div className="bg-gray-50 border rounded-lg p-4 mb-4">
              <h4 className="font-medium mb-3">Add New Prefix</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={newPrefix.prefix ?? ''}
                  onChange={(e) => setNewPrefix(prev => ({ ...prev, prefix: e.target.value }))}
                  placeholder="Prefix (e.g., ld(, ang()"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={newPrefix.meaning ?? ''}
                  onChange={(e) => setNewPrefix(prev => ({ ...prev, meaning: e.target.value }))}
                  placeholder="Meaning (e.g., Launch Date, Angle)"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newPrefix.type ?? 'dynamic'}
                  onChange={(e) => setNewPrefix(prev => ({ ...prev, type: e.target.value as 'dynamic' | 'abbreviation' | 'wildcard' }))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Select prefix type"
                >
                  <option value="dynamic">Dynamic (filled with data)</option>
                  <option value="abbreviation">Abbreviation (AI selects)</option>
                  <option value="wildcard">Wildcard (AI generates description)</option>
                </select>
                <Button onClick={addPrefix} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prefix
                </Button>
              </div>
            </div>

            {/* Existing Prefixes */}
            <div className="space-y-3">
              {settings.prefixes
                .sort((a, b) => a.order - b.order)
                .map((prefix, index) => (
                <div key={prefix.id} className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col space-y-1">
                        <button
                          onClick={() => movePrefix(prefix.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => movePrefix(prefix.id, 'down')}
                          disabled={index === settings.prefixes.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <div className="font-medium">
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded">{prefix.prefix}</span>
                          <span className="ml-2">{prefix.meaning}</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            prefix.type === 'dynamic' 
                              ? 'bg-blue-100 text-blue-800' 
                              : prefix.type === 'abbreviation' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-purple-100 text-purple-800'
                          }`}>
                            {prefix.type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingPrefix(editingPrefix === prefix.id ? null : prefix.id)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Edit prefix"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removePrefix(prefix.id)}
                        className="p-2 text-red-400 hover:text-red-600"
                        title="Remove prefix"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Edit Prefix Details */}
                  {editingPrefix === prefix.id && (
                    <div className="border-t pt-3 mt-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        <input
                          type="text"
                          value={prefix.prefix}
                          onChange={(e) => updatePrefix(prefix.id, { prefix: e.target.value })}
                          placeholder="Prefix"
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={prefix.meaning}
                          onChange={(e) => updatePrefix(prefix.id, { meaning: e.target.value })}
                          placeholder="Meaning"
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <select
                          value={prefix.type}
                          onChange={(e) => updatePrefix(prefix.id, { type: e.target.value as 'dynamic' | 'abbreviation' | 'wildcard' })}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="Select prefix type"
                        >
                          <option value="dynamic">Dynamic</option>
                          <option value="abbreviation">Abbreviation</option>
                          <option value="wildcard">Wildcard</option>
                        </select>
                      </div>

                      {/* Abbreviations for this prefix */}
                      {prefix.type === 'abbreviation' && (
                        <AbbreviationManager
                          prefix={prefix}
                          onAddAbbreviation={(abbrev) => addAbbreviationToPrefix(prefix.id, abbrev)}
                          onRemoveAbbreviation={(key) => removeAbbreviationFromPrefix(prefix.id, key)}
                        />
                      )}
                    </div>
                  )}

                  {/* Show abbreviations summary */}
                  {prefix.type === 'abbreviation' && prefix.abbreviations.length > 0 && editingPrefix !== prefix.id && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">Abbreviations:</span> {prefix.abbreviations.map(a => a.key).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Metadata Inclusion Section */}
          <div>
            <h3 className="text-lg font-medium mb-3">Metadata Inclusion</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.include_editor}
                  onChange={(e) => setSettings(prev => ({ ...prev, include_editor: e.target.checked }))}
                  className="mr-2"
                />
                Include editor name for dynamic prefixes
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.include_strategist}
                  onChange={(e) => setSettings(prev => ({ ...prev, include_strategist: e.target.checked }))}
                  className="mr-2"
                />
                Include strategist name for dynamic prefixes
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.include_launch_date}
                  onChange={(e) => setSettings(prev => ({ ...prev, include_launch_date: e.target.checked }))}
                  className="mr-2"
                />
                Include launch date for dynamic prefixes
              </label>
            </div>
          </div>

          {/* Date Format Section */}
          <div>
            <h3 className="text-lg font-medium mb-3">Date Format</h3>
            <select
              value={settings.date_format}
              onChange={(e) => setSettings(prev => ({ ...prev, date_format: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Select date format"
              aria-label="Select date format"
            >
              <option value="MM-DD-YYYY">MM-DD-YYYY (02-26-2025)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (2025-02-26)</option>
              <option value="DD-MM-YYYY">DD-MM-YYYY (26-02-2025)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (02/26/2025)</option>
              <option value="YYYY/MM/DD">YYYY/MM/DD (2025/02/26)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (26/02/2025)</option>
            </select>
          </div>

          {/* Custom Prompt Template Section */}
          <div>
            <h3 className="text-lg font-medium mb-3">Custom AI Instructions</h3>
            <p className="text-sm text-gray-600 mb-3">
              Add custom instructions for the AI when selecting abbreviations (optional)
            </p>
            <textarea
              value={settings.custom_prompt_template}
              onChange={(e) => setSettings(prev => ({ ...prev, custom_prompt_template: e.target.value }))}
              placeholder="e.g., Focus on emotional angles when selecting abbreviations for the 'ang(' prefix..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
    </div>
  );
};

// Component for managing abbreviations within a prefix
interface AbbreviationManagerProps {
  prefix: NamingPrefix;
  onAddAbbreviation: (abbreviation: PrefixAbbreviation) => void;
  onRemoveAbbreviation: (key: string) => void;
}

const AbbreviationManager: React.FC<AbbreviationManagerProps> = ({
  prefix,
  onAddAbbreviation,
  onRemoveAbbreviation
}) => {
  const [newAbbrev, setNewAbbrev] = useState<Partial<PrefixAbbreviation>>({
    key: '',
    full_name: '',
    description: ''
  });

  const addAbbreviation = () => {
    if (newAbbrev.key && newAbbrev.full_name) {
      onAddAbbreviation({
        key: newAbbrev.key,
        full_name: newAbbrev.full_name,
        description: newAbbrev.description || ''
      });
      setNewAbbrev({ key: '', full_name: '', description: '' });
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <h5 className="font-medium mb-3">Abbreviations for {prefix.prefix}</h5>
      
      {/* Add new abbreviation */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-3">
        <input
          type="text"
          value={newAbbrev.key ?? ''}
          onChange={(e) => setNewAbbrev(prev => ({ ...prev, key: e.target.value }))}
          placeholder="Key (e.g., DESR)"
          className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="text"
          value={newAbbrev.full_name ?? ''}
          onChange={(e) => setNewAbbrev(prev => ({ ...prev, full_name: e.target.value }))}
          placeholder="Full Name (e.g., Desire & Attraction)"
          className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="text"
          value={newAbbrev.description ?? ''}
          onChange={(e) => setNewAbbrev(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Description for AI"
          className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <Button onClick={addAbbreviation} size="sm">
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Existing abbreviations */}
      <div className="space-y-2">
        {prefix.abbreviations.map((abbrev) => (
          <div key={abbrev.key} className="flex items-center justify-between bg-white p-2 rounded border">
            <div className="flex-1">
              <span className="font-mono font-medium">{abbrev.key}</span>
              {abbrev.full_name && (
                <span className="text-gray-600 ml-2">- {abbrev.full_name}</span>
              )}
              {abbrev.description && (
                <div className="text-sm text-gray-500 mt-1">{abbrev.description}</div>
              )}
            </div>
            <button
              onClick={() => onRemoveAbbreviation(abbrev.key)}
              className="p-1 text-red-400 hover:text-red-600"
              title={`Remove ${abbrev.key}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NamingConventionModal; 