"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Plus, 
  Save,
  Share2,
  Upload,
  Type,
  Video,
  Square,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Rows,
  GripVertical,
  Bold,
  Italic,
  Underline,
  Code,
  Edit2,
  Package,
  Sparkles,
  X,
  Grid3X3,
  MoreHorizontal
} from 'lucide-react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { getBrands, getBrandById } from '@/lib/services/powerbriefService';
import { Brand, Product } from '@/lib/types/powerbrief';
import { 
  Wireframe, 
  WireframeModule,
  ModuleType,
  AlignmentType,
  WireframeRow
} from '@/lib/types/powerframe';
import { 
  getWireframe, 
  updateWireframeStructure,
  uploadCompetitorSnapshot 
} from '@/lib/services/powerframeService';
import { getProductsByBrand } from '@/lib/services/productService';

interface DraggedItem {
  module: WireframeModule;
  sourceRowId: string;
}

interface ExtendedWireframeModule extends WireframeModule {
  name?: string;
}

interface ExtendedWireframeRow extends WireframeRow {
  name?: string;
  modules: ExtendedWireframeModule[];
  layout?: 'horizontal' | 'grid';
}

interface ExtractedModule {
  type: string;
  name?: string;
  sectionName?: string;
  content?: {
    text?: string;
    placeholder?: string;
  };
  position?: {
    row?: number;
    column?: number;
    width?: number;
    height?: number;
  };
  alignment?: string;
  originalIndex?: number;
}

export default function WireframeEditorPage() {
  const params = useParams();
  const router = useRouter();
  const brandId = params.brandId as string;
  const wireframeId = params.wireframeId as string;
  
  const [brand, setBrand] = useState<Brand | null>(null);
  const [wireframe, setWireframe] = useState<Wireframe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [draggedModule, setDraggedModule] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [resizingModule, setResizingModule] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [dragOverModule, setDragOverModule] = useState<string | null>(null);
  const [editingModuleName, setEditingModuleName] = useState<string | null>(null);
  const [htmlMode, setHtmlMode] = useState<{ [key: string]: boolean }>({});
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [editingRowName, setEditingRowName] = useState<string | null>(null);
  const [resizingModuleHeight, setResizingModuleHeight] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<'gemini-2.5-pro' | 'gemini-2.5-flash'>('gemini-2.5-pro');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const { user } = useGlobal();

  useEffect(() => {
    if (!user?.id || !brandId || !wireframeId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch brands
        const brandsData = await getBrands(user!.id);
        
        // Find current brand
        const currentBrand = brandsData.find(b => b.id === brandId);
        setBrand(currentBrand || null);
        
        // Fetch wireframe
        const wireframeData = await getWireframe(wireframeId);
        setWireframe(wireframeData);
        
        // Fetch products for this brand
        const productsData = await getProductsByBrand(brandId);
        setAvailableProducts(productsData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, brandId, wireframeId, router]);

  const handleSave = async () => {
    if (!wireframe) return;

    setSaving(true);
    try {
      await updateWireframeStructure(wireframeId, {
        structure: wireframe.structure
      });
    } catch (error) {
      console.error('Error saving wireframe:', error);
    } finally {
      setSaving(false);
    }
  };

  const addRow = () => {
    if (!wireframe) return;

    const newRow: ExtendedWireframeRow = {
      id: `row-${Date.now()}`,
      columns: 12,
      modules: [],
      name: 'New Section',
      layout: 'grid'
    };

    setWireframe({
      ...wireframe,
      structure: {
        ...wireframe.structure,
        rows: [...wireframe.structure.rows, newRow] as WireframeRow[]
      }
    });
  };

  const deleteRow = (rowId: string) => {
    if (!wireframe) return;

    setWireframe({
      ...wireframe,
      structure: {
        ...wireframe.structure,
        rows: wireframe.structure.rows.filter(row => row.id !== rowId)
      }
    });
  };

  const addModule = (rowId: string, type: ModuleType) => {
    if (!wireframe) return;

    const newModule: ExtendedWireframeModule = {
      id: `module-${Date.now()}`,
      wireframe_id: wireframeId,
      type,
      name: type.charAt(0).toUpperCase() + type.slice(1) + ' Module',
      content: getDefaultContent(type),
      position: { row: 0, column: 0, width: 4, height: 200 },
      alignment: 'left',
      is_content_placeholder: type === 'text',
      is_design_descriptor: false,
      order_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setWireframe({
      ...wireframe,
      structure: {
        ...wireframe.structure,
        rows: wireframe.structure.rows.map(row => 
          row.id === rowId 
            ? { ...row, modules: [...row.modules, newModule] }
            : row
        )
      }
    });
  };

  const deleteModule = (rowId: string, moduleId: string) => {
    if (!wireframe) return;

    setWireframe({
      ...wireframe,
      structure: {
        ...wireframe.structure,
        rows: wireframe.structure.rows.map(row => 
          row.id === rowId 
            ? { ...row, modules: row.modules.filter(m => m.id !== moduleId) }
            : row
        )
      }
    });
  };

  const updateModule = (rowId: string, moduleId: string, updates: Partial<WireframeModule>) => {
    if (!wireframe) return;

    setWireframe({
      ...wireframe,
      structure: {
        ...wireframe.structure,
        rows: wireframe.structure.rows.map(row => 
          row.id === rowId 
            ? {
                ...row,
                modules: row.modules.map(m => 
                  m.id === moduleId ? { ...m, ...updates } : m
                )
              }
            : row
        )
      }
    });
  };

  const moveModule = (fromRowId: string, toRowId: string, module: WireframeModule, targetIndex?: number) => {
    if (!wireframe) return;

    setWireframe({
      ...wireframe,
      structure: {
        ...wireframe.structure,
        rows: wireframe.structure.rows.map(row => {
          if (row.id === fromRowId && fromRowId === toRowId && targetIndex !== undefined) {
            // Reordering within the same row
            const modules = [...row.modules];
            const currentIndex = modules.findIndex(m => m.id === module.id);
            if (currentIndex !== -1) {
              modules.splice(currentIndex, 1);
              modules.splice(targetIndex, 0, module);
            }
            return { ...row, modules };
          } else if (row.id === fromRowId) {
            // Remove from source row
            return {
              ...row,
              modules: row.modules.filter(m => m.id !== module.id)
            };
          } else if (row.id === toRowId) {
            // Add to target row
            const modules = [...row.modules];
            if (targetIndex !== undefined) {
              modules.splice(targetIndex, 0, module);
            } else {
              modules.push(module);
            }
            return { ...row, modules };
          }
          return row;
        })
      }
    });
  };

  const handleModuleDragStart = (e: React.DragEvent, module: WireframeModule, rowId: string) => {
    setDraggedItem({ module, sourceRowId: rowId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleModuleDrop = (e: React.DragEvent, targetRowId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.sourceRowId !== targetRowId) {
      moveModule(draggedItem.sourceRowId, targetRowId, draggedItem.module);
    }
    setDraggedItem(null);
  };

  const handleResize = (rowId: string, moduleId: string, newWidth?: number, newHeight?: number) => {
    const row = wireframe?.structure.rows.find(r => r.id === rowId);
    const targetModule = row?.modules.find(m => m.id === moduleId);
    if (!targetModule) return;
    
    updateModule(rowId, moduleId, {
      position: {
        ...targetModule.position,
        width: newWidth !== undefined ? Math.max(1, Math.min(12, newWidth)) : targetModule.position.width,
        height: newHeight !== undefined ? Math.max(50, newHeight) : targetModule.position.height
      }
    });
  };

  const getDefaultContent = (type: ModuleType) => {
    switch (type) {
      case 'text':
        return { text: 'Text content here' };
      case 'video':
        return { placeholder: 'Video placeholder' };
      case 'button':
        return { text: 'Button', style: 'primary' as const };
      case 'container':
        return { backgroundColor: '#f3f4f6', placeholder: 'Image placeholder' };
      case 'header':
        return { text: 'Header Section' };
      case 'footer':
        return { text: 'Footer Section' };
      default:
        return {};
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !wireframe) return;

    try {
      const url = await uploadCompetitorSnapshot(file, wireframeId);
      setWireframe({ ...wireframe, competitor_snapshot_url: url });
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleGenerateContent = async () => {
    if (!wireframe?.competitor_snapshot_url) {
      alert('Please upload a competitor snapshot first');
      return;
    }

    try {
      setLoading(true);
      
      // Fetch full brand configuration
      const brandData = await getBrandById(brandId);
      
      // Only use products if some are selected
      const hasSelectedProducts = selectedProducts.length > 0;
      const productsToUse = hasSelectedProducts ? selectedProducts : [];
      
      const featuredProducts = productsToUse.slice(0, 3);
      const mainProduct = featuredProducts[0];
      const relatedProducts = featuredProducts.slice(1);
      
      // Build comprehensive brand context
      const brandContext = {
        brandName: brand?.name || brandData?.name || '',
        brandConfig: {
          voice: brandData?.brand_info_data?.brandVoice || '',
          tone: brandData?.brand_info_data?.brandVoice || '', // Using brandVoice as tone
          values: brandData?.brand_info_data?.positioning || '',
          usp: brandData?.brand_info_data?.competitiveAdvantage || '',
          targetAudience: brandData?.target_audience_data?.characteristics || '',
          keywords: [] // Not available in current schema
        },
        pageType: wireframe.page_type_id === 'pdp' ? 'PDP' : 
                  wireframe.page_type_id === 'home' ? 'Home' :
                  wireframe.page_type_id === 'collection' ? 'Collection' :
                  wireframe.page_type_id === 'listicle' ? 'Listicle' :
                  wireframe.page_type_id === 'advertorial' ? 'Advertorial' : 'General',
        products: hasSelectedProducts ? {
          main: mainProduct,
          related: relatedProducts,
          featured: featuredProducts
        } : null
      };
      
      console.log('Brand context being sent:', brandContext);
      console.log('Selected products:', selectedProducts);
      console.log('Selected model:', selectedModel);
      
      // Call the extract modules API
      const response = await fetch('/api/powerframe/extract-modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: wireframe.competitor_snapshot_url,
          brandContext: JSON.stringify(brandContext), // Send as string for the prompt
          pageType: brandContext.pageType,
          products: brandContext.products, // Will be null if no products selected
          model: selectedModel // Pass the selected model
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract modules');
      }

      const { extractedModules } = await response.json();
      
      if (!extractedModules || !extractedModules.modules) {
        throw new Error('Invalid response format');
      }

      // Convert extracted modules to wireframe format
      const currentRows = wireframe.structure.rows;
      const newRows: ExtendedWireframeRow[] = [];
      
      // Group modules by their section - each section becomes ONE row
      const modulesBySection = new Map<string, ExtractedModule[]>();
      
      extractedModules.modules.forEach((module: ExtractedModule, index: number) => {
        const sectionName = module.sectionName || 'Default Section';
        if (!modulesBySection.has(sectionName)) {
          modulesBySection.set(sectionName, []);
        }
        modulesBySection.get(sectionName)!.push({ ...module, originalIndex: index });
      });

      // Create ONE row per section
      modulesBySection.forEach((modules, sectionName) => {
        const rowId = `row-${Date.now()}-${sectionName.replace(/\s+/g, '-').toLowerCase()}`;
        
        // Convert all modules in this section to wireframe modules
        const wireframeModules: ExtendedWireframeModule[] = modules.map((module) => ({
          id: `module-${Date.now()}-${module.originalIndex}`,
          wireframe_id: wireframeId,
          type: module.type as ModuleType,
          name: module.name || module.type,
          content: {
            ...module.content,
            text: module.content?.text || module.content?.placeholder || ''
          },
          position: {
            row: module.position?.row || 0,
            column: module.position?.column || 0,
            width: module.position?.width || 4,
            height: module.position?.height || 200
          },
          alignment: (module.alignment || 'left') as AlignmentType,
          is_content_placeholder: module.type === 'text',
          is_design_descriptor: false,
          order_index: module.originalIndex || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        // Create a single row for this entire section
        newRows.push({
          id: rowId,
          name: sectionName,
          columns: 12,
          modules: wireframeModules,
          layout: 'grid' // Use grid layout to support stacking within the section
        });
      });

      // Append new rows to existing ones
      setWireframe({
        ...wireframe,
        structure: {
          ...wireframe.structure,
          rows: [...currentRows, ...newRows]
        },
        extracted_modules: extractedModules.modules,
        system_instructions: `Generated with brand context: ${brandContext.brandName}, Page Type: ${brandContext.pageType}`
      });

      // Auto-save
      await handleSave();
      
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateRowLayout = (rowId: string, layout: 'horizontal' | 'grid') => {
    if (!wireframe) return;

    setWireframe({
      ...wireframe,
      structure: {
        ...wireframe.structure,
        rows: wireframe.structure.rows.map(r => 
          r.id === rowId 
            ? { ...r, layout } as WireframeRow
            : r
        )
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!wireframe) return null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href={`/app/powerframe/${brandId}`}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{wireframe.name}</h1>
              <p className="text-sm text-gray-500">{brand?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setShowProductSelector(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              <Package className="h-4 w-4" />
              <span>Select Products ({selectedProducts.length})</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="flex flex-col">
                <label className="text-xs text-gray-500 mb-1">AI Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as 'gemini-2.5-pro' | 'gemini-2.5-flash')}
                  className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  title="Choose AI model for content generation"
                >
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Better quality)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Faster)</option>
                </select>
              </div>
              
              <button
                onClick={handleGenerateContent}
                disabled={loading || !wireframe?.competitor_snapshot_url}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed mt-5"
                title={!wireframe?.competitor_snapshot_url ? 'Please upload a competitor snapshot first' : 'Generate content from competitor layout'}
              >
                <Sparkles className="h-4 w-4" />
                <span>{loading ? 'Generating...' : 'Generate Content'}</span>
              </button>
            </div>
            
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-64'} bg-gray-50 border-r transition-all duration-300 overflow-y-auto`}>
          <div className="p-4 space-y-6">
            {/* Collapse/Expand Button */}
            <div className="flex justify-between items-center">
              {!sidebarCollapsed && <h3 className="text-sm font-medium text-gray-900">Tools</h3>}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded hover:bg-gray-200 transition-colors"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                )}
              </button>
            </div>

            {!sidebarCollapsed && (
              <>
                {/* Upload Competitor Snapshot */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Competitor Snapshot</h3>
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400">
                      <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">Upload snapshot</p>
                    </div>
                  </label>
                  {wireframe.competitor_snapshot_url && (
                    <div className="mt-2">
                      <img 
                        src={wireframe.competitor_snapshot_url} 
                        alt="Competitor snapshot" 
                        className="w-full rounded border"
                      />
                    </div>
                  )}
                </div>

                {/* Module Types */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Add Elements</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className="flex flex-col items-center p-3 border rounded hover:bg-gray-100"
                      draggable
                      onDragStart={() => setDraggedModule('text')}
                    >
                      <Type className="h-6 w-6 text-gray-600 mb-1" />
                      <span className="text-xs">Text</span>
                    </button>
                    <button
                      className="flex flex-col items-center p-3 border rounded hover:bg-gray-100"
                      draggable
                      onDragStart={() => setDraggedModule('video')}
                    >
                      <Video className="h-6 w-6 text-gray-600 mb-1" />
                      <span className="text-xs">Video</span>
                    </button>
                    <button
                      className="flex flex-col items-center p-3 border rounded hover:bg-gray-100"
                      draggable
                      onDragStart={() => setDraggedModule('button')}
                    >
                      <Square className="h-6 w-6 text-gray-600 mb-1" />
                      <span className="text-xs">Button</span>
                    </button>
                    <button
                      className="flex flex-col items-center p-3 border rounded hover:bg-gray-100"
                      draggable
                      onDragStart={() => setDraggedModule('container')}
                    >
                      <div className="h-6 w-6 border-2 border-dashed border-gray-600 rounded mb-1" />
                      <span className="text-xs">Container</span>
                    </button>
                  </div>
                </div>

                {/* Add Row */}
                <div>
                  <button
                    onClick={addRow}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-gray-100 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold">{wireframe?.name || 'Wireframe Editor'}</h1>
                <select
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                  value={wireframe?.page_type_id || 'general'}
                  onChange={(e) => {
                    if (wireframe) {
                      setWireframe({
                        ...wireframe,
                        page_type_id: e.target.value === 'general' ? undefined : e.target.value
                      });
                    }
                  }}
                  title="Page Type"
                >
                  <option value="general">General Page</option>
                  <option value="home">Home Page</option>
                  <option value="pdp">Product Detail Page (PDP)</option>
                  <option value="collection">Collection Page</option>
                  <option value="listicle">Listicle</option>
                  <option value="advertorial">Advertorial</option>
                </select>
              </div>
            </div>
            {wireframe.structure.rows.length === 0 ? (
              <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <Rows className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rows yet</h3>
                <p className="text-gray-500 mb-4">Add a row to start building your wireframe</p>
                <button
                  onClick={addRow}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Row
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {wireframe.structure.rows.map((row) => (
                  <div
                    key={row.id}
                    className="bg-white rounded-lg border p-4"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedModule) {
                        addModule(row.id, draggedModule as ModuleType);
                        setDraggedModule(null);
                      } else if (draggedItem) {
                        handleModuleDrop(e, row.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {editingRowName === row.id ? (
                          <input
                            type="text"
                            className="text-sm font-medium px-2 py-1 border rounded"
                            value={(row as ExtendedWireframeRow).name || 'Section'}
                            onChange={(e) => {
                              setWireframe({
                                ...wireframe,
                                structure: {
                                  ...wireframe.structure,
                                  rows: wireframe.structure.rows.map(r => 
                                    r.id === row.id 
                                      ? { ...r, name: e.target.value } as WireframeRow
                                      : r
                                  )
                                }
                              });
                            }}
                            onBlur={() => setEditingRowName(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingRowName(null);
                              }
                            }}
                            placeholder="Section name"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900 flex items-center"
                            onClick={() => setEditingRowName(row.id)}
                          >
                            {(row as ExtendedWireframeRow).name || 'Section'}
                            <Edit2 className="h-3 w-3 ml-1" />
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Layout Toggle */}
                        <div className="flex items-center bg-gray-100 rounded p-1">
                          <button
                            onClick={() => updateRowLayout(row.id, 'grid')}
                            className={`p-1 rounded ${
                              (row as ExtendedWireframeRow).layout !== 'horizontal' 
                                ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                            }`}
                            title="Grid layout (stacking)"
                          >
                            <Grid3X3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => updateRowLayout(row.id, 'horizontal')}
                            className={`p-1 rounded ${
                              (row as ExtendedWireframeRow).layout === 'horizontal' 
                                ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                            }`}
                            title="Horizontal layout"
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="text-red-500 hover:text-red-700"
                          aria-label="Delete row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {row.modules.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center">
                        <p className="text-sm text-gray-500">Drop elements here</p>
                      </div>
                    ) : (
                      <div className={
                        (row as ExtendedWireframeRow).layout === 'horizontal' 
                          ? "flex flex-wrap gap-2" 
                          : "grid grid-cols-12 gap-2 grid-rows-[repeat(auto-fit,minmax(60px,auto))]"
                      }>
                        {row.modules.map((module, moduleIndex) => (
                          <div
                            key={module.id}
                            className={`relative group border rounded cursor-move ${
                              selectedModule === module.id ? 'ring-2 ring-primary-500' : ''
                            } ${resizingModule === module.id ? 'ring-2 ring-blue-500' : ''} ${
                              resizingModuleHeight === module.id ? 'ring-2 ring-orange-500' : ''} ${
                              dragOverModule === module.id ? 'ring-2 ring-green-500' : ''
                            }`}
                            style={
                              (row as ExtendedWireframeRow).layout === 'horizontal' 
                                ? {
                                    width: `calc(${(module.position.width / 12) * 100}% - 0.5rem)`,
                                    height: `${module.position.height}px`,
                                    minHeight: '60px',
                                    maxHeight: 'none',
                                    flexShrink: 0
                                  }
                                  : { 
                                      gridColumn: `${module.position.column + 1} / span ${module.position.width}`,
                                      gridRow: `${module.position.row + 1}`,
                                      height: `${module.position.height}px`,
                                      minHeight: '60px',
                                      maxHeight: 'none'
                                    }
                            }
                            draggable={resizingModule !== module.id && editingModule !== module.id}
                            onDragStart={(e) => {
                              if (resizingModule === module.id || editingModule === module.id) {
                                e.preventDefault();
                                return;
                              }
                              handleModuleDragStart(e, module, row.id);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (draggedItem && draggedItem.module.id !== module.id) {
                                setDragOverModule(module.id);
                              }
                            }}
                            onDragLeave={() => setDragOverModule(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverModule(null);
                              if (draggedItem && draggedItem.module.id !== module.id) {
                                moveModule(
                                  draggedItem.sourceRowId, 
                                  row.id, 
                                  draggedItem.module, 
                                  moduleIndex
                                );
                                setDraggedItem(null);
                              }
                            }}
                            onClick={() => setSelectedModule(module.id)}
                            onDoubleClick={() => setEditingModule(module.id)}
                          >
                            {/* Drag handle */}
                            <div className="absolute left-0 top-0 bottom-0 w-6 bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-move z-10">
                              <GripVertical className="h-4 w-4 text-gray-400" />
                            </div>
                            
                            {/* Width resize handle */}
                            <div
                              className="absolute -right-1 top-0 bottom-0 w-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-ew-resize flex items-center justify-center z-10"
                              style={{ backgroundColor: 'transparent' }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setResizingModule(module.id);
                                const startX = e.clientX;
                                const startWidth = module.position.width;
                                
                                const handleMouseMove = (e: MouseEvent) => {
                                  e.preventDefault();
                                  const diff = Math.round((e.clientX - startX) / 50);
                                  const newWidth = Math.max(1, Math.min(12, startWidth + diff));
                                  handleResize(row.id, module.id, newWidth);
                                };
                                
                                const handleMouseUp = () => {
                                  setResizingModule(null);
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            >
                              <div className="w-1 h-8 bg-primary-500 rounded-full" />
                            </div>
                            
                            {/* Height resize handle */}
                            <div
                              className="absolute -bottom-1 left-0 right-0 h-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-ns-resize flex items-center justify-center z-10"
                              style={{ backgroundColor: 'transparent' }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setResizingModuleHeight(module.id);
                                const startY = e.clientY;
                                const startHeight = module.position.height;
                                
                                const handleMouseMove = (e: MouseEvent) => {
                                  e.preventDefault();
                                  const diff = e.clientY - startY;
                                  const newHeight = Math.max(60, startHeight + diff);
                                  handleResize(row.id, module.id, undefined, newHeight);
                                };
                                
                                const handleMouseUp = () => {
                                  setResizingModuleHeight(null);
                                  document.removeEventListener('mousemove', handleMouseMove);
                                  document.removeEventListener('mouseup', handleMouseUp);
                                };
                                
                                document.addEventListener('mousemove', handleMouseMove);
                                document.addEventListener('mouseup', handleMouseUp);
                              }}
                            >
                              <div className="h-1 w-8 bg-primary-500 rounded-full" />
                            </div>
                            
                            {/* Module content */}
                            <div className="h-full p-3 flex flex-col">
                              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                                <div className="flex items-center space-x-2">
                                  {editingModuleName === module.id ? (
                                    <input
                                      type="text"
                                      className="text-xs px-2 py-1 border rounded"
                                      value={(module as ExtendedWireframeModule).name || module.type}
                                      onChange={(e) => {
                                        updateModule(row.id, module.id, { name: e.target.value } as Partial<WireframeModule>);
                                      }}
                                      onBlur={() => setEditingModuleName(null)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          setEditingModuleName(null);
                                        }
                                      }}
                                      placeholder="Module name"
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 flex items-center"
                                      onClick={() => setEditingModuleName(module.id)}
                                    >
                                      {(module as ExtendedWireframeModule).name || module.type}
                                      <Edit2 className="h-3 w-3 ml-1" />
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1">
                                  {/* Alignment buttons */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateModule(row.id, module.id, { alignment: 'left' });
                                    }}
                                    className={`p-1 rounded ${module.alignment === 'left' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                                    aria-label="Align left"
                                  >
                                    <AlignLeft className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateModule(row.id, module.id, { alignment: 'center' });
                                    }}
                                    className={`p-1 rounded ${module.alignment === 'center' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                                    aria-label="Align center"
                                  >
                                    <AlignCenter className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateModule(row.id, module.id, { alignment: 'right' });
                                    }}
                                    className={`p-1 rounded ${module.alignment === 'right' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                                    aria-label="Align right"
                                  >
                                    <AlignRight className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteModule(row.id, module.id);
                                    }}
                                    className="p-1 text-red-500 hover:text-red-700"
                                    aria-label="Delete module"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Module content preview */}
                              <div className={`text-${module.alignment} flex-1 min-h-0 overflow-hidden`}>
                                {module.type === 'text' && (
                                  editingModule === module.id ? (
                                    <div className="h-full flex flex-col">
                                      {/* WYSIWYG Toolbar */}
                                      <div className="flex items-center space-x-1 mb-2 p-2 bg-gray-100 rounded-t flex-wrap flex-shrink-0">
                                        <button
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            document.execCommand('bold', false);
                                          }}
                                          className="p-1 rounded hover:bg-gray-200"
                                          aria-label="Bold"
                                        >
                                          <Bold className="h-4 w-4" />
                                        </button>
                                        <button
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            document.execCommand('italic', false);
                                          }}
                                          className="p-1 rounded hover:bg-gray-200"
                                          aria-label="Italic"
                                        >
                                          <Italic className="h-4 w-4" />
                                        </button>
                                        <button
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            document.execCommand('underline', false);
                                          }}
                                          className="p-1 rounded hover:bg-gray-200"
                                          aria-label="Underline"
                                        >
                                          <Underline className="h-4 w-4" />
                                        </button>
                                        <div className="border-l mx-1 h-4" />
                                        <button
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            document.execCommand('insertUnorderedList', false);
                                          }}
                                          className="p-1 rounded hover:bg-gray-200"
                                          aria-label="Bullet list"
                                          title="Bullet list"
                                        >
                                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                                          </svg>
                                        </button>
                                        <button
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            document.execCommand('insertOrderedList', false);
                                          }}
                                          className="p-1 rounded hover:bg-gray-200"
                                          aria-label="Numbered list"
                                          title="Numbered list"
                                        >
                                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                          </svg>
                                        </button>
                                        <div className="border-l mx-1 h-4" />
                                        <select
                                          onMouseDown={(e) => e.preventDefault()}
                                          onChange={(e) => {
                                            e.preventDefault();
                                            const value = e.target.value;
                                            if (value) {
                                              document.execCommand('formatBlock', false, value);
                                            }
                                          }}
                                          className="text-xs px-2 py-1 border rounded"
                                          defaultValue=""
                                          title="Font size"
                                        >
                                          <option value="">Format</option>
                                          <option value="h1">Heading 1</option>
                                          <option value="h2">Heading 2</option>
                                          <option value="h3">Heading 3</option>
                                          <option value="p">Paragraph</option>
                                          <option value="pre">Code</option>
                                          <option value="blockquote">Quote</option>
                                        </select>
                                        <button
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            document.execCommand('createLink', false, prompt('Enter URL:') || '');
                                          }}
                                          className="p-1 rounded hover:bg-gray-200"
                                          aria-label="Insert link"
                                          title="Insert link"
                                        >
                                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                          </svg>
                                        </button>
                                        <div className="border-l mx-1 h-4" />
                                        <button
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => setHtmlMode({ ...htmlMode, [module.id]: !htmlMode[module.id] })}
                                          className={`p-1 rounded ${htmlMode[module.id] ? 'bg-gray-300' : 'hover:bg-gray-200'}`}
                                          aria-label="HTML mode"
                                        >
                                          <Code className="h-4 w-4" />
                                        </button>
                                      </div>
                                      
                                      {htmlMode[module.id] ? (
                                        <textarea
                                          className="flex-1 w-full resize-none border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 p-2 rounded-b font-mono text-xs min-h-0"
                                          value={(module.content as { text: string }).text}
                                          onChange={(e) => {
                                            updateModule(row.id, module.id, {
                                              content: { 
                                                ...(module.content as object),
                                                text: e.target.value 
                                              }
                                            });
                                          }}
                                          onBlur={() => setEditingModule(null)}
                                          placeholder="Enter HTML"
                                          autoFocus
                                        />
                                      ) : (
                                        <div
                                          ref={(el) => {
                                            if (el && el.innerHTML !== (module.content as { text: string }).text) {
                                              el.innerHTML = (module.content as { text: string }).text;
                                            }
                                          }}
                                          contentEditable
                                          className="flex-1 w-full border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 p-2 rounded-b overflow-auto wysiwyg-content min-h-0"
                                          onInput={(e) => {
                                            updateModule(row.id, module.id, {
                                              content: { 
                                                ...(module.content as object),
                                                text: e.currentTarget.innerHTML 
                                              }
                                            });
                                          }}
                                          onBlur={() => {
                                            setEditingModule(null);
                                            setHtmlMode({ ...htmlMode, [module.id]: false });
                                          }}
                                          suppressContentEditableWarning={true}
                                        />
                                      )}
                                    </div>
                                  ) : (
                                    <div 
                                      className="h-full w-full cursor-text p-2 overflow-auto wysiwyg-content" 
                                      style={{ fontSize: '14px', lineHeight: '1.4' }}
                                      onDoubleClick={() => setEditingModule(module.id)}
                                      dangerouslySetInnerHTML={{ __html: (module.content as { text: string }).text }}
                                    />
                                  )
                                )}
                                {module.type === 'video' && (
                                  <div className="bg-gray-200 h-full w-full rounded flex items-center justify-center">
                                    <Video className="h-8 w-8 text-gray-400" />
                                  </div>
                                )}
                                {module.type === 'button' && (
                                  <div className="flex items-center justify-center h-full w-full p-2">
                                    {editingModule === module.id ? (
                                      <input
                                        type="text"
                                        className="w-full px-4 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        value={(module.content as { text: string }).text}
                                        onChange={(e) => {
                                          updateModule(row.id, module.id, {
                                            content: { 
                                              ...(module.content as object),
                                              text: e.target.value 
                                            }
                                          });
                                        }}
                                        onBlur={() => setEditingModule(null)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            setEditingModule(null);
                                          }
                                        }}
                                        placeholder="Button text"
                                        autoFocus
                                      />
                                    ) : (
                                      <button 
                                        className="w-full h-full px-4 py-2 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 min-h-[40px]"
                                        onDoubleClick={(e) => {
                                          e.stopPropagation();
                                          setEditingModule(module.id);
                                        }}
                                      >
                                        {(module.content as { text: string }).text}
                                      </button>
                                    )}
                                  </div>
                                )}
                                {module.type === 'container' && (
                                  <div className="h-full w-full rounded bg-gray-100 flex items-center justify-center relative overflow-hidden">
                                    {/* X pattern background */}
                                    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                      <line x1="0" y1="0" x2="100%" y2="100%" stroke="#d1d5db" strokeWidth="2" />
                                      <line x1="100%" y1="0" x2="0" y2="100%" stroke="#d1d5db" strokeWidth="2" />
                                    </svg>
                                    {/* Placeholder text */}
                                    <div className="relative z-10 p-4 text-center">
                                      {editingModule === module.id ? (
                                        <input
                                          type="text"
                                          className="w-full px-2 py-1 text-sm border rounded bg-white"
                                          value={(module.content as { placeholder?: string }).placeholder || 'Image placeholder'}
                                          onChange={(e) => {
                                            updateModule(row.id, module.id, {
                                              content: { 
                                                ...(module.content as object),
                                                placeholder: e.target.value 
                                              }
                                            });
                                          }}
                                          onBlur={() => setEditingModule(null)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              setEditingModule(null);
                                            }
                                          }}
                                          placeholder="Describe image"
                                          autoFocus
                                        />
                                      ) : (
                                        <span 
                                          className="text-sm text-gray-600 cursor-pointer hover:text-gray-800"
                                          onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            setEditingModule(module.id);
                                          }}
                                        >
                                          {(module.content as { placeholder?: string }).placeholder || 'Image placeholder'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {module.type === 'header' && (
                                  <div className="h-full w-full bg-gray-800 text-white p-4 rounded flex items-center justify-center">
                                    <span className="text-sm font-semibold">{(module.content as { text: string }).text}</span>
                                  </div>
                                )}
                                {module.type === 'footer' && (
                                  <div className="h-full w-full bg-gray-800 text-white p-4 rounded flex items-center justify-center">
                                    <span className="text-sm">{(module.content as { text: string }).text}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Selector Modal */}
      {showProductSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Products for Wireframe</h3>
              <button
                onClick={() => setShowProductSelector(false)}
                className="text-gray-400 hover:text-gray-600"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Select products to feature in your wireframe. The first product will be the main product for PDP pages.
              </p>
            </div>
            
            <div className="space-y-2 mb-4">
              {availableProducts.map((product) => {
                const isSelected = selectedProducts.some(p => p.id === product.id);
                const isMain = selectedProducts[0]?.id === product.id;
                
                return (
                  <div
                    key={product.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
                      } else {
                        setSelectedProducts([...selectedProducts, product]);
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-1"
                        aria-label={`Select ${product.name}`}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{product.name}</h4>
                          {isMain && (
                            <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded">Main Product</span>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          {product.price && (
                            <span>${product.price} {product.currency || 'USD'}</span>
                          )}
                          {product.category && (
                            <span>{product.category}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {availableProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No products found for this brand. Add products in the brand settings.
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowProductSelector(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowProductSelector(false);
                  // Products are already selected in state
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 