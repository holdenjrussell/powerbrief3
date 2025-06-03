"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Frame, ArrowRight, AlertTriangle, Wrench } from 'lucide-react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { getBrands } from '@/lib/services/powerbriefService';
import { Brand } from '@/lib/types/powerbrief';

export default function PowerFramePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useGlobal();

  useEffect(() => {
    if (!user?.id) return;

    const fetchBrands = async () => {
      try {
        const userBrands = await getBrands(user.id);
        setBrands(userBrands);
      } catch (error) {
        console.error('Error fetching brands:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

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
              We're working hard to bring you the best AI-powered wireframing experience!
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

      {brands.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Frame className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No brands found</h3>
          <p className="text-gray-500 mb-4">Create a brand first to start using PowerFrame</p>
          <Link
            href="/app/powerbrief"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Brand
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/app/powerframe/${brand.id}`}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {brand.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {brand.brand_info_data?.product || 'No product description'}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </div>
              
              <div className="flex items-center text-sm text-gray-500">
                <Frame className="h-4 w-4 mr-1" />
                <span>Click to manage wireframes</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 