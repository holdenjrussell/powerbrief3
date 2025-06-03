"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  Frame, 
  ArrowLeft, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Share2,
  Layout
} from 'lucide-react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { getBrands } from '@/lib/services/powerbriefService';
import { Brand } from '@/lib/types/powerbrief';
import { PageType, Wireframe } from '@/lib/types/powerframe';
import { 
  getPageTypes, 
  getWireframes, 
  createWireframe,
  deleteWireframe,
  initializeDefaultPageTypes 
} from '@/lib/services/powerframeService';
import { createSPASassClient } from '@/lib/supabase/client';

export default function BrandPowerFramePage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  
  const [brand, setBrand] = useState<Brand | null>(null);
  const [pageTypes, setPageTypes] = useState<PageType[]>([]);
  const [wireframes, setWireframes] = useState<Wireframe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPageType, setSelectedPageType] = useState<string>('');
  const [wireframeName, setWireframeName] = useState('');
  const [creating, setCreating] = useState(false);
  
  const { user } = useGlobal();

  useEffect(() => {
    if (!user?.id || !brandId) return;

    const fetchData = async () => {
      try {
        // Fetch brand
        const brands = await getBrands(user.id);
        const brandData = brands.find(b => b.id === brandId);
        if (!brandData) {
          router.push('/app/powerframe');
          return;
        }
        setBrand(brandData);

        // Fetch page types
        try {
          console.log('Fetching page types for brand:', brandId);
          console.log('User ID:', user.id);
          
          // First, let's check if we can access the brands table
          const sassClient = await createSPASassClient();
          const supabase = sassClient.getSupabaseClient();
          const { data: brandCheck, error: brandError } = await supabase
            .from('brands')
            .select('id, name')
            .eq('id', brandId)
            .single();
            
          console.log('Brand check:', brandCheck, 'Error:', brandError);
          
          const types = await getPageTypes(brandId);
          console.log('Page types fetched:', types);
          if (types.length === 0) {
            // Initialize default page types if none exist
            console.log('No page types found, initializing defaults...');
            await initializeDefaultPageTypes(brandId);
            const newTypes = await getPageTypes(brandId);
            setPageTypes(newTypes);
          } else {
            setPageTypes(types);
          }
        } catch (error) {
          console.error('Error fetching page types:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          // Check if it's a table not found error
          if (error && typeof error === 'object' && 'message' in error) {
            const errorMessage = (error as { message: string }).message;
            if (errorMessage.includes('relation') || ('code' in error && error.code === '42P01')) {
              console.error('PowerFrame tables not found. Please run the database migration.');
            }
          }
        }

        // Fetch wireframes
        try {
          const frames = await getWireframes(brandId);
          setWireframes(frames);
        } catch (error) {
          console.error('Error fetching wireframes:', error);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, brandId, router]);

  const handleCreateWireframe = async () => {
    if (!wireframeName.trim()) return;

    setCreating(true);
    try {
      const newWireframe = await createWireframe({
        brand_id: brandId,
        name: wireframeName,
        page_type_id: selectedPageType || undefined,
      });

      setWireframes([newWireframe, ...wireframes]);
      setShowCreateModal(false);
      setWireframeName('');
      setSelectedPageType('');
      
      // Navigate to the wireframe editor
      router.push(`/app/powerframe/${brandId}/${newWireframe.id}`);
    } catch (error) {
      console.error('Error creating wireframe:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWireframe = async (id: string) => {
    if (!confirm('Are you sure you want to delete this wireframe?')) return;

    try {
      await deleteWireframe(id);
      setWireframes(wireframes.filter(w => w.id !== id));
    } catch (error) {
      console.error('Error deleting wireframe:', error);
    }
  };

  const getPageTypeName = (pageTypeId?: string) => {
    if (!pageTypeId) return 'No page type';
    const pageType = pageTypes.find(pt => pt.id === pageTypeId);
    return pageType?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/app/powerframe"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to brands
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {brand?.name} - PowerFrame
            </h1>
            <p className="text-gray-600">Create and manage wireframes for your brand</p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Wireframe
          </button>
        </div>
      </div>

      {/* Wireframes Grid */}
      {wireframes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Layout className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No wireframes yet</h3>
          <p className="text-gray-500 mb-4">Create your first wireframe to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Wireframe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wireframes.map((wireframe) => (
            <div
              key={wireframe.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <Link
                href={`/app/powerframe/${brandId}/${wireframe.id}`}
                className="block p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {wireframe.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {getPageTypeName(wireframe.page_type_id)}
                    </p>
                  </div>
                  <div className="relative group">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="p-1 rounded hover:bg-gray-100"
                      aria-label="More options"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-400" />
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(`/app/powerframe/${brandId}/${wireframe.id}`);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // TODO: Implement share functionality
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteWireframe(wireframe.id);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center">
                    <Frame className="h-4 w-4 mr-1" />
                    {wireframe.status}
                  </span>
                  <span>
                    {new Date(wireframe.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Wireframe</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wireframe Name
                </label>
                <input
                  type="text"
                  value={wireframeName}
                  onChange={(e) => setWireframeName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Homepage Wireframe"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Page Type (Optional)
                </label>
                <select
                  value={selectedPageType}
                  onChange={(e) => setSelectedPageType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Select page type"
                >
                  <option value="">Select a page type</option>
                  {pageTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setWireframeName('');
                  setSelectedPageType('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWireframe}
                disabled={!wireframeName.trim() || creating}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 