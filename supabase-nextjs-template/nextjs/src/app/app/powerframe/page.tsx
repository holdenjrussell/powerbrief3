"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Frame, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Share2,
  Layout,
  AlertTriangle,
  Wrench,
  Building2
} from 'lucide-react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { useBrand } from '@/lib/context/BrandContext';
import { PageType, Wireframe } from '@/lib/types/powerframe';
import { 
  getPageTypes, 
  getWireframes, 
  createWireframe,
  deleteWireframe,
  initializeDefaultPageTypes 
} from '@/lib/services/powerframeService';
import { useRouter } from 'next/navigation';

export default function PowerFramePage() {
  const { selectedBrand, isLoading: brandsLoading } = useBrand();
  const { user } = useGlobal();
  const router = useRouter();
  
  const [pageTypes, setPageTypes] = useState<PageType[]>([]);
  const [wireframes, setWireframes] = useState<Wireframe[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPageType, setSelectedPageType] = useState<string>('');
  const [wireframeName, setWireframeName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user?.id || !selectedBrand?.id || brandsLoading) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch page types
        try {
          console.log('Fetching page types for brand:', selectedBrand.id);
          
          const types = await getPageTypes(selectedBrand.id);
          console.log('Page types fetched:', types);
          if (types.length === 0) {
            // Initialize default page types if none exist
            console.log('No page types found, initializing defaults...');
            await initializeDefaultPageTypes(selectedBrand.id);
            const newTypes = await getPageTypes(selectedBrand.id);
            setPageTypes(newTypes);
          } else {
            setPageTypes(types);
          }
        } catch (error) {
          console.error('Error fetching page types:', error);
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
          const frames = await getWireframes(selectedBrand.id);
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
  }, [user?.id, selectedBrand?.id, brandsLoading]);

  const handleCreateWireframe = async () => {
    if (!wireframeName.trim() || !selectedBrand?.id) return;

    setCreating(true);
    try {
      const newWireframe = await createWireframe({
        brand_id: selectedBrand.id,
        name: wireframeName,
        page_type_id: selectedPageType || undefined,
      });

      setWireframes([newWireframe, ...wireframes]);
      setShowCreateModal(false);
      setWireframeName('');
      setSelectedPageType('');
      
      // Navigate to the wireframe editor
      router.push(`/app/powerframe/${selectedBrand.id}/${newWireframe.id}`);
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

  // Show loading state while brands are loading
  if (brandsLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading brands...</p>
        </div>
      </div>
    );
  }

  // Show brand selection prompt if no brand is selected
  if (!selectedBrand?.id) {
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

  // Show main PowerFrame interface for selected brand
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {selectedBrand.name} - PowerFrame
            </h1>
            <p className="text-gray-600">Create and manage wireframes for your brand</p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Wireframe
          </button>
        </div>
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

      {/* Loading state for wireframes */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading wireframes...</p>
          </div>
        </div>
      ) : (
        /* Wireframes Grid */
        wireframes.length === 0 ? (
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
                  href={`/app/powerframe/${selectedBrand.id}/${wireframe.id}`}
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
                            router.push(`/app/powerframe/${selectedBrand.id}/${wireframe.id}`);
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
        )
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