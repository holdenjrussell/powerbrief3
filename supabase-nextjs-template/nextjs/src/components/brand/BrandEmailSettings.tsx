'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Check, AlertCircle, Copy } from 'lucide-react';

interface BrandEmailSettingsProps {
  brandId: string;
  brandName: string;
}

export default function BrandEmailSettings({ brandId, brandName }: BrandEmailSettingsProps) {
  const [emailIdentifier, setEmailIdentifier] = useState('');
  const [originalIdentifier, setOriginalIdentifier] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [availabilityCheck, setAvailabilityCheck] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: '' });

  useEffect(() => {
    fetchCurrentSettings();
  }, [brandId]);

  const fetchCurrentSettings = async () => {
    try {
      const response = await fetch(`/api/brands/${brandId}/email-settings`);
      const data = await response.json();
      if (data.success) {
        setEmailIdentifier(data.emailIdentifier || '');
        setOriginalIdentifier(data.emailIdentifier || '');
      }
    } catch (error) {
      console.error('Failed to fetch email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateIdentifier = (value: string): string | null => {
    if (!value) return 'Email identifier is required';
    if (value.length < 3) return 'Must be at least 3 characters';
    if (value.length > 50) return 'Must be 50 characters or less';
    if (!/^[a-z0-9-]+$/.test(value)) return 'Only lowercase letters, numbers, and hyphens allowed';
    if (value.startsWith('-') || value.endsWith('-')) return 'Cannot start or end with hyphen';
    if (value.includes('--')) return 'Cannot contain consecutive hyphens';
    return null;
  };

  const checkAvailability = async (value: string) => {
    if (!value || value === originalIdentifier) {
      setAvailabilityCheck({ checking: false, available: null, message: '' });
      return;
    }

    const validationError = validateIdentifier(value);
    if (validationError) {
      setAvailabilityCheck({ checking: false, available: false, message: validationError });
      return;
    }

    setAvailabilityCheck({ checking: true, available: null, message: 'Checking availability...' });

    try {
      const response = await fetch(`/api/brands/check-email-identifier?identifier=${encodeURIComponent(value)}`);
      const data = await response.json();
      
      setAvailabilityCheck({
        checking: false,
        available: data.available,
        message: data.available ? '✅ Available!' : '❌ Already taken'
      });
    } catch (error) {
      setAvailabilityCheck({
        checking: false,
        available: false,
        message: '❌ Error checking availability'
      });
    }
  };

  const handleIdentifierChange = (value: string) => {
    setEmailIdentifier(value.toLowerCase());
    setError('');
    setSuccess(false);
    
    // Debounce availability check
    clearTimeout(window.identifierCheckTimeout);
    window.identifierCheckTimeout = setTimeout(() => {
      checkAvailability(value.toLowerCase());
    }, 500);
  };

  const handleSave = async () => {
    const validationError = validateIdentifier(emailIdentifier);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!availabilityCheck.available && emailIdentifier !== originalIdentifier) {
      setError('Please choose an available identifier');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/brands/${brandId}/email-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailIdentifier }),
      });

      const data = await response.json();
      if (data.success) {
        setOriginalIdentifier(emailIdentifier);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (error) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const generateSuggestion = () => {
    const baseName = brandName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    return baseName.length >= 3 ? baseName : `${baseName}-brand`;
  };

  const copyEmailAddress = () => {
    if (emailIdentifier) {
      navigator.clipboard.writeText(`${emailIdentifier}@mail.powerbrief.ai`);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading email settings...</p>
      </div>
    );
  }

  const fullEmailAddress = emailIdentifier ? `${emailIdentifier}@mail.powerbrief.ai` : '';
  const hasChanges = emailIdentifier !== originalIdentifier;
  const canSave = hasChanges && 
    (availabilityCheck.available || emailIdentifier === originalIdentifier) && 
    !validateIdentifier(emailIdentifier);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Creator Email Configuration</h3>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Creators will email: <strong>your-identifier@mail.powerbrief.ai</strong></li>
          <li>• All responses are automatically tracked and processed by AI</li>
          <li>• Your regular business email stays separate at powerbrief.ai</li>
        </ul>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Identifier
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={emailIdentifier}
              onChange={(e) => handleIdentifierChange(e.target.value)}
              placeholder="your-brand-name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="flex items-center px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600">
              @mail.powerbrief.ai
            </span>
          </div>
          
          {/* Availability Check */}
          {availabilityCheck.message && (
            <div className={`mt-2 text-sm flex items-center gap-1 ${
              availabilityCheck.available === true ? 'text-green-600' : 
              availabilityCheck.available === false ? 'text-red-600' : 'text-gray-600'
            }`}>
              {availabilityCheck.checking ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              ) : availabilityCheck.available === true ? (
                <Check className="w-4 h-4" />
              ) : availabilityCheck.available === false ? (
                <AlertCircle className="w-4 h-4" />
              ) : null}
              {availabilityCheck.message}
            </div>
          )}

          {/* Suggestion */}
          {!emailIdentifier && (
            <button
              onClick={() => handleIdentifierChange(generateSuggestion())}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              💡 Use suggestion: {generateSuggestion()}
            </button>
          )}
        </div>

        {/* Preview */}
        {fullEmailAddress && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Creator Email Address:
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white border rounded text-sm">
                {fullEmailAddress}
              </code>
              <button
                onClick={copyEmailAddress}
                className="p-2 text-gray-500 hover:text-gray-700"
                title="Copy email address"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="text-red-600 text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-600 text-sm flex items-center gap-1">
            <Check className="w-4 h-4" />
            Email settings saved successfully!
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Email Settings'}
        </button>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    identifierCheckTimeout: NodeJS.Timeout;
  }
} 