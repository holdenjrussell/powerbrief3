"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useBrand } from '@/lib/context/BrandContext';
import { Button, Alert, AlertDescription } from '@/components/ui';
import { ArrowLeft, Loader2, AlertCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';
import type { OneSheet } from '@/lib/types/onesheet';
import { GuidedOneSheetFlow } from '@/components/onesheet/GuidedOneSheetFlow';

// Debounce implementation with proper typing
type DebouncedFunction<T extends (...args: any[]) => any> = (...args: Parameters<T>) => void;

const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): DebouncedFunction<T> => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

type ParamsType = { brandId: string };

export default function GuidedOneSheetPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const { selectedBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onesheet, setOnesheet] = useState<OneSheet | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract params
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const { brandId } = unwrappedParams;

  // Debounced auto-save
  const debouncedAutoSave = useCallback(
    debounce(async (field: string, value: unknown) => {
      if (!onesheet?.id) return;
      
      try {
        setSaving(true);
        const response = await fetch(`/api/onesheet/${onesheet.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value })
        });

        if (!response.ok) throw new Error('Failed to save');
        
        const updatedOneSheet = await response.json();
        setOnesheet(updatedOneSheet);
      } catch (err) {
        console.error('Auto-save failed:', err);
        toast({
          title: "Save Failed",
          description: "Your changes could not be saved. Please try again.",
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    }, 1000),
    [onesheet?.id]
  );

  // Load OneSheet
  useEffect(() => {
    const fetchOneSheet = async () => {
      if (!brandId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/onesheet?brandId=${brandId}`);
        
        if (!response.ok) throw new Error('Failed to fetch OneSheet');
        
        const data = await response.json();
        setOnesheet(data);
      } catch (err) {
        console.error('Error fetching OneSheet:', err);
        setError('Failed to load OneSheet. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOneSheet();
  }, [brandId]);

  // Handle updates from guided flow
  const handleUpdate = (updates: Partial<OneSheet>) => {
    if (!onesheet) return;
    
    const updatedOnesheet = { ...onesheet, ...updates };
    setOnesheet(updatedOnesheet);
    
    // Auto-save the updates
    Object.entries(updates).forEach(([field, value]) => {
      debouncedAutoSave(field, value);
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !onesheet) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'OneSheet not found'}</AlertDescription>
        </Alert>
        <Link href="/app/powerbrief">
          <Button className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to PowerBrief
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/app/powerbrief/${brandId}/onesheet`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Classic View
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  Intelligent OneSheet Generator
                </h1>
                <p className="text-sm text-gray-600">{selectedBrand?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {saving && (
                <div className="flex items-center text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Saving...
                </div>
              )}
              <Link href="/app/sops/creative-feedback-loop" target="_blank">
                <Button variant="outline" size="sm">
                  View Process Guide
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8 px-6">
        <GuidedOneSheetFlow
          onesheet={onesheet}
          onUpdate={handleUpdate}
          onAutoSave={debouncedAutoSave}
        />
      </div>
    </div>
  );
} 