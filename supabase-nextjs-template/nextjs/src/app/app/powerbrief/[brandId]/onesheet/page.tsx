"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useBrand } from '@/lib/context/BrandContext';
import { 
  Button,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { 
  Loader2, 
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';
import { OneSheet } from '@/lib/types/onesheet';
import { HybridOneSheetV2 } from '@/components/onesheet/HybridOneSheetV2';

// Simple debounce implementation
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Helper to unwrap params safely
type ParamsType = { brandId: string };

export default function OneSheetPage({ params }: { params: ParamsType | Promise<ParamsType> }) {
  const { selectedBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onesheet, setOnesheet] = useState<OneSheet | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Extract params using React.use()
  const unwrappedParams = params instanceof Promise ? React.use(params) : params;
  const { brandId } = unwrappedParams;

  // Debounced auto-save function
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

  // Load OneSheet data
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

  // Handle updates from hybrid component
  const handleUpdate = (updates: Partial<OneSheet>) => {
    if (!onesheet) return;
    
    const updatedOnesheet = { ...onesheet, ...updates };
    setOnesheet(updatedOnesheet);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link href="/app/powerbrief">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to PowerBrief
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Creative Strategy OneSheet</h1>
              <p className="text-gray-600">
                {selectedBrand?.name} • Your living creative strategy document
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {saving && (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Saving...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <HybridOneSheetV2
        onesheet={onesheet}
        onUpdate={handleUpdate}
        onAutoSave={debouncedAutoSave}
      />
    </div>
  );
} 