"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';
import { useBrand } from '@/lib/context/BrandContext';

export default function PowerFramePage() {
  const { selectedBrand, isLoading } = useBrand();
  const router = useRouter();

  useEffect(() => {
    // If a brand is selected, redirect to its wireframe management page
    if (selectedBrand?.id) {
      router.push(`/app/powerframe/${selectedBrand.id}`);
    }
  }, [selectedBrand, router]);

  if (isLoading || selectedBrand?.id) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {selectedBrand?.id ? 'Redirecting to wireframe management...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show this only if no brand is selected
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PowerFrame</h1>
        <p className="text-gray-600">AI-powered wireframing tool for creating page layouts and structures</p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No brand selected</h3>
        <p className="text-gray-500">Please select a brand from the dropdown above to start using PowerFrame</p>
      </div>
    </div>
  );
} 