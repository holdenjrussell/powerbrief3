"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, ChevronLeft, ChevronRight, Upload, X, Save, CheckCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTldrawPersistence } from '@/hooks/useTldrawPersistence';

// Dynamically import Tldraw to avoid SSR issues and prevent duplicate imports
const TldrawComponent = dynamic(
  () => import('@tldraw/tldraw').then((mod) => mod.Tldraw),
  { 
    ssr: false,
    loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100">Loading canvas...</div>
  }
);

// Import CSS
import '@tldraw/tldraw/tldraw.css';
import '@/styles/powerframe.css';

export default function WireframeEditorPage() {
  const params = useParams();
  const brandId = params.brandId as string;
  const wireframeId = params.wireframeId as string;
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<'gemini-2.5-pro' | 'gemini-2.5-flash'>('gemini-2.5-pro');
  const [isGenerating, setIsGenerating] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentEditor, setCurrentEditor] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [toRichTextFn, setToRichTextFn] = useState<any>(null);
  
  // Temporary debugging feature
  const [jsonInput, setJsonInput] = useState('');
  const [isLoadingJson, setIsLoadingJson] = useState(false);

  // Custom persistence hook
  const { saveNow, hasLoadedInitialData } = useTldrawPersistence({
    wireframeId,
    editor: currentEditor,
    autoSaveIntervalMs: 3000 // Auto-save every 3 seconds
  });

  // Valid tldraw colors - expanded list
  const VALID_COLORS = ['black', 'grey', 'white', 'blue', 'red', 'green', 'orange', 'yellow', 'light-violet', 'violet', 'light-blue', 'light-green', 'light-red', 'light-grey'];
  
  // Color mapping for invalid colors
  const COLOR_MAP: Record<string, string> = {
    'dark-grey': 'black',
    'light-gray': 'light-grey',
    'dark-gray': 'black',
    'gray': 'grey'
  };

  // Function to validate and fix colors
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateColor = (color: any): string => {
    if (typeof color !== 'string') return 'black';
    
    const lowerColor = color.toLowerCase();
    
    // If it's already valid, return it
    if (VALID_COLORS.includes(lowerColor)) {
      return lowerColor;
    }
    
    // If we have a mapping for it, use that
    if (COLOR_MAP[lowerColor]) {
      return COLOR_MAP[lowerColor];
    }
    
    // Default to black for any unknown color
    return 'black';
  };

  // Ensure we're on the client side and load toRichText function
  useEffect(() => {
    setIsClient(true);
    // Load toRichText function dynamically
    import('@tldraw/tldraw').then((mod) => {
      setToRichTextFn(() => mod.toRichText);
    });
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        alert('Image file size must be less than 20MB');
        return;
      }

      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      }
    };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/jpeg;base64, prefix to get just the base64 string
        const base64String = result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerateWireframe = async () => {
    if (!selectedImage) {
      alert('Please upload an image first');
      return;
    }
    
    if (!currentEditor) {
      alert('Editor not available');
      return;
    }

    if (isGenerating) {
      console.log('Generation already in progress, ignoring click');
      return;
    }

    setIsGenerating(true);
    try {
      // Convert image to base64
      const base64Image = await convertImageToBase64(selectedImage);
      
      // Create a basic brand context for the API
      const brandContext = {
        brandName: 'Your Brand',
        brandConfig: {
          voice: prompt || 'Professional and engaging',
          tone: 'Friendly',
          values: 'Quality and innovation',
          usp: 'Best-in-class solutions',
          targetAudience: 'Modern consumers',
          keywords: [] 
        },
        pageType: 'General'
      };
      
      console.log('Sending request to API...');
      const response = await fetch('/api/powerframe/extract-modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64Image,
          imageType: selectedImage.type,
          brandContext: JSON.stringify(brandContext),
          pageType: 'General',
          products: null,
          model: selectedModel 
        }),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate wireframe');
      }

      const { extractedModules } = await response.json();
      
      if (!extractedModules || !Array.isArray(extractedModules)) {
        throw new Error('Invalid response format from AI service');
      }

      await processAndCreateShapes(extractedModules);
      
    } catch (error) {
      console.error('Error generating wireframe:', error);
      alert(`Failed to generate wireframe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Temporary debugging function to load JSON directly
  const handleLoadJson = async () => {
    if (!jsonInput.trim()) {
      alert('Please enter JSON data first');
      return;
    }
    
    if (!currentEditor) {
      alert('Editor not available');
      return;
    }

    if (isLoadingJson) {
      console.log('JSON loading already in progress, ignoring click');
      return;
    }

    setIsLoadingJson(true);
    try {
      console.log('Parsing JSON input...');
      const parsedJson = JSON.parse(jsonInput);
      
      if (!Array.isArray(parsedJson)) {
        throw new Error('JSON must be an array of shapes');
      }

      await processAndCreateShapes(parsedJson);
      
    } catch (error) {
      console.error('Error loading JSON:', error);
      alert(`Failed to load JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingJson(false);
    }
  };

  // Extract the common shape processing logic - simplified to avoid interference
  const processAndCreateShapes = async (extractedModules: unknown[]) => {
    console.log('Processing shapes...', extractedModules.length, 'shapes');
      
    // Minimal processing - just ensure basic shape structure and pass through
    const processedShapes: unknown[] = [];
    
    extractedModules.forEach((shape: unknown) => {
      // Type assertion for basic shape properties
      const shapeObj = shape as Record<string, unknown>;
      
      // Only fix critical issues without extensive validation
      const processedShape = {
        ...shapeObj,
        id: shapeObj.id || currentEditor.createShapeId(),
        x: Math.round((shapeObj.x as number) || 0),
        y: Math.round((shapeObj.y as number) || 0),
      };
      
      // Quick fix for the most common color issue - work on original object
      if (shapeObj.props && typeof shapeObj.props === 'object') {
        const props = shapeObj.props as Record<string, unknown>;
        if (props.color === 'light-grey') {
          props.color = 'grey';
        }
      }
      
      processedShapes.push(processedShape);
    });
    
    if (processedShapes.length > 0 && isClient && currentEditor) {
      try {
        // Clear existing shapes
        const existingShapeIds = currentEditor.getCurrentPageShapes().map((s: unknown) => (s as Record<string, unknown>).id);
        if (existingShapeIds.length > 0) {
          currentEditor.deleteShapes(existingShapeIds);
        }
        
        // Create shapes in batch - simple approach
        currentEditor.createShapes(processedShapes);
        currentEditor.zoomToFit();
        
        console.log(`✅ Created ${processedShapes.length} shapes successfully`);
        alert(`Generated ${processedShapes.length} wireframe elements!`);
        
      } catch (error) {
        console.error('Error creating shapes:', error);
        alert(`Failed to create some shapes. Check console for details.`);
      }
    } else {
      alert('No valid shapes to create.');
    }
  };

  // Manual save function
  const handleManualSave = async () => {
    if (!currentEditor || isSaving) return;
    
    setIsSaving(true);
    try {
      await saveNow();
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save wireframe. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Don't render anything until client-side
  if (!isClient) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading wireframe editor...</p>
        </div>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
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
              <h1 className="text-xl font-semibold text-gray-900">AI Wireframe Canvas</h1>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-500">Wireframe ID: {wireframeId}</p>
                {hasLoadedInitialData && (
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600">Data loaded</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Save Status */}
            <div className="flex items-center space-x-2">
              {lastSaved && (
                <span className="text-xs text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              
              {/* Debug Test Button */}
              <button
                onClick={() => {
                  if (currentEditor) {
                    console.log('🧪 Testing zoom programmatically...');
                    console.log('🔍 Current zoom level:', currentEditor.getZoomLevel());
                    currentEditor.zoomIn();
                    console.log('✅ Zoom in command sent');
                    setTimeout(() => {
                      console.log('🔍 New zoom level:', currentEditor.getZoomLevel());
                    }, 100);
                  } else {
                    console.log('❌ Editor not available');
                  }
                }}
                className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                title="Test zoom functionality"
              >
                🧪 Test Zoom
              </button>
              
              <button
                onClick={() => {
                  if (currentEditor) {
                    console.log('🧪 Testing zoom to fit...');
                    currentEditor.zoomToFit();
                    console.log('✅ Zoom to fit command sent');
                  }
                }}
                className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                title="Test zoom to fit"
              >
                🎯 Fit
              </button>
              
              <button
                onClick={async () => {
                  if (confirm('Clear all canvas data? This will reset your wireframe to empty.')) {
                    try {
                      console.log('🗑️ Clearing corrupted tldraw data...');
                      await fetch(`/api/wireframes/${wireframeId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tldraw_data: null })
                      });
                      window.location.reload();
                    } catch (error) {
                      console.error('Failed to clear data:', error);
                      alert('Failed to clear data. Try refreshing the page.');
                    }
                  }
                }}
                className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                title="Clear corrupted canvas data"
              >
                🗑️ Reset
              </button>
              
              {/* Manual Save Button */}
              <button
                onClick={handleManualSave}
                disabled={isSaving || !currentEditor}
                className="inline-flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Save wireframe to Supabase"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3" />
                    <span>Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Auto-save indicator */}
        <div className="mt-2 text-xs text-gray-400">
          Auto-saves every 3 seconds • Design persisted to Supabase
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* AI Generation Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-12' : 'w-80'} bg-gray-50 border-r transition-all duration-300 overflow-y-auto flex flex-col flex-shrink-0`}>
          <div className="p-4 space-y-6 flex-grow">
            <div className="flex justify-between items-center mb-4">
              {!sidebarCollapsed && <h3 className="text-sm font-semibold text-gray-900">AI Generation</h3>}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </div>
            
            {!sidebarCollapsed && (
              <>
                <div className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Image *
                    </label>
                    {!selectedImage ? (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-2 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span>
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG, JPEG (MAX. 20MB)</p>
                          </div>
                        </label>
            </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          {imagePreview && (
                            <img
                              src={imagePreview}
                              alt="Upload preview"
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                          )}
                          <button
                            onClick={removeImage}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            title="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{selectedImage.name}</p>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Upload a screenshot or wireframe to analyze
                    </p>
                  </div>

                  <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                      Brand Voice/Instructions
                    </label>
                    <textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Describe your brand voice, target audience, or specific instructions..."
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Optional: Provide context about your brand or specific requirements
                    </p>
                    </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">AI Model</label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value as 'gemini-2.5-pro' | 'gemini-2.5-flash')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      aria-label="Select AI model for wireframe generation"
                    >
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro (Quality)</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
                    </select>
                  </div>

                  {/* Temporary JSON Input Feature */}
                  <div className="border-t pt-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                      <h4 className="text-sm font-medium text-yellow-800 mb-1">🛠️ Debug Mode</h4>
                      <p className="text-xs text-yellow-700">Load JSON directly to test shape validation</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        JSON Shapes Array
                      </label>
                      <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono text-xs"
                        placeholder='Paste JSON array here, e.g.:
[
  {
    "id": "shape:test_1",
    "type": "text",
    "x": 100,
    "y": 100,
    "props": {
      "richText": "Hello World",
      "font": "sans",
      "size": "m",
      "color": "black"
    }
  }
]'
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Paste a JSON array of TLDraw shapes to test directly
                      </p>
                    </div>

                    <button
                      onClick={handleLoadJson}
                      disabled={isLoadingJson || !jsonInput.trim()}
                      className="w-full mt-3 flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      <span>{isLoadingJson ? 'Loading...' : 'Load JSON Shapes'}</span>
                    </button>
                    
                    {isLoadingJson && (
                      <div className="mt-2 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                        <span className="ml-2 text-xs text-gray-500">Processing JSON...</span>
                      </div>
                    )}
                  </div>
                </div>
            
                <div className="pt-4 border-t">
                  <button
                    onClick={handleGenerateWireframe}
                    disabled={isGenerating || !selectedImage}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>{isGenerating ? 'Generating...' : 'Generate Wireframe'}</span>
                  </button>
                  
                  {isGenerating && (
                    <div className="mt-2 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-xs text-gray-500">Analyzing with Gemini AI...</span>
              </div>
            )}
            
                  <p className="mt-2 text-xs text-gray-500 text-center">
                    AI will analyze the image and create wireframe elements on the canvas
                  </p>
            </div>
              </>
            )}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <TldrawComponent 
            className="w-full h-full"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onMount={(editor: any) => {
              // Prevent multiple mounts
              if (currentEditor) {
                return;
              }
              
              setCurrentEditor(editor);
              
              // Setup for better trackpad support - allow all scrolling directions
              if (editor) {
                const container = editor.getContainer();
                if (container) {
                  // Use 'auto' to allow all native scrolling behaviors
                  // This lets tldraw handle its own event management without interference
                  container.style.touchAction = 'auto';
                  
                  // Ensure the container can handle overflow properly
                  container.style.overflow = 'visible';
                  
                  console.log('🎯 Container setup complete - touchAction: auto, overflow: visible');
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
} 