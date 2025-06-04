"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Building2, Settings } from 'lucide-react';
import { useBrand } from '@/lib/context/BrandContext';
import Link from 'next/link';

export default function BrandSelector() {
  const { brands, selectedBrand, setSelectedBrand, isLoading } = useBrand();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2">
        <Building2 className="h-5 w-5 text-gray-400" />
        <span className="text-sm text-gray-500">Loading brands...</span>
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <Link 
        href="/app/powerbrief" 
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
      >
        <Building2 className="h-5 w-5" />
        <span>Create Brand</span>
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
        aria-expanded={isOpen ? "true" : "false"}
        aria-haspopup="true"
      >
        <Building2 className="h-5 w-5 text-gray-500" />
        <span className="font-medium">{selectedBrand?.name || 'Select Brand'}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Brands
            </div>
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => {
                  setSelectedBrand(brand);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                  selectedBrand?.id === brand.id ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                }`}
              >
                <span>{brand.name}</span>
                {selectedBrand?.id === brand.id && (
                  <span className="text-primary-600">✓</span>
                )}
              </button>
            ))}
          </div>
          
          <div className="border-t border-gray-200">
            <Link
              href="/app/brands"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Manage Brands
            </Link>
            <Link
              href={selectedBrand ? `/app/powerbrief/${selectedBrand.id}/brand-config` : '/app/powerbrief'}
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4 mr-2" />
              Brand Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
} 