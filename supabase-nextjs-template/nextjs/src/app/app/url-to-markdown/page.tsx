"use client";

import React from 'react';
import { useBrand } from '@/lib/context/BrandContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Link2, Building2 } from 'lucide-react';
import { UrlToMarkdown } from '@/components/UrlToMarkdown';

export default function UrlToMarkdownPage() {
  const { selectedBrand } = useBrand();

  if (!selectedBrand) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Link2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              URL to Markdown Converter
            </h1>
            <p className="text-lg text-gray-600">
              Extract and convert web content to clean, structured markdown format
            </p>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a brand from the sidebar to use the URL to Markdown converter.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Link2 className="mx-auto h-12 w-12 text-primary-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            URL to Markdown Converter
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Extract and convert web content to clean, structured markdown format. 
            Perfect for research, documentation, and content analysis across websites, 
            Reddit, and social media platforms.
          </p>
        </div>

        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedBrand.name}</h3>
                <p className="text-gray-600">Selected brand for content extraction</p>
              </div>
            </div>
          </div>
        </div>

        <UrlToMarkdown brandId={selectedBrand.id} />
      </div>
    </div>
  );
} 