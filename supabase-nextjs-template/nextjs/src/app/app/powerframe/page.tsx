"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Wrench, Building2 } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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

      {/* Under Construction Banner */}
      <div className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full">
              <Wrench className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="text-lg font-semibold text-amber-800">Under Construction</h3>
            </div>
            <p className="text-amber-700">
              PowerFrame is currently in active development. Features may be incomplete or subject to change. 
              We&apos;re working hard to bring you the best AI-powered wireframing experience!
            </p>
            <div className="mt-3 flex items-center space-x-2 text-sm text-amber-600">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="font-medium">Building something amazing...</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No brand selected</h3>
        <p className="text-gray-500">Please select a brand from the dropdown above to start using PowerFrame</p>
      </div>
    </div>
  );
} 