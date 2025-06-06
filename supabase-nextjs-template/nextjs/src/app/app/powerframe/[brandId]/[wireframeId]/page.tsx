"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, ChevronLeft, ChevronRight, Upload, X, Save, CheckCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTldrawPersistence } from '@/hooks/useTldrawPersistence';

// Dynamically import both Tldraw component and toRichText function together to avoid multiple instances
const TldrawComponent = dynamic(
  () => import('@tldraw/tldraw').then((mod) => {
    // Store the toRichText function when tldraw loads to avoid duplicate imports
    if (typeof window !== 'undefined') {
      (window as Window & { __tldrawToRichText?: typeof mod.toRichText }).__tldrawToRichText = mod.toRichText;
    }
    return mod.Tldraw;
  }),
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

  // Custom persistence hook - NO AUTO-SAVE
  const { saveNow, hasLoadedInitialData } = useTldrawPersistence({
    wireframeId,
    editor: currentEditor
  });

  // Add save on page unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (currentEditor) {
        try {
          await saveNow();
        } catch (error) {
          console.error('Failed to save on page unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentEditor, saveNow]);

  // Very infrequent backup save (every 5 minutes) as safety net
  useEffect(() => {
    if (!currentEditor) return;

    const backupSaveInterval = setInterval(async () => {
      try {
        console.log('Performing backup save...');
        await saveNow();
      } catch (error) {
        console.error('Backup save failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(backupSaveInterval);
  }, [currentEditor, saveNow]);

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

  // Function to validate and fix shape properties
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validateShape = (shape: any): any => {
    const validatedShape = { ...shape }; // Shallow copy for modification
    
    // Ensure props object exists
    if (!validatedShape.props) {
      validatedShape.props = {};
    }

    // Handle text shapes
    if (validatedShape.type === 'text') {
      // Check if shape has old 'text' property instead of 'richText'
      if (validatedShape.props.text !== undefined && validatedShape.props.richText === undefined) {
        console.warn(`DEFENSIVE FIX (TEXT): Shape ID ${validatedShape.id || 'N/A'} (type: text) has legacy 'text' property. Converting to 'richText'.`);
        // Convert text to richText format using dynamically loaded function
        if (toRichTextFn) {
          const textValue = String(validatedShape.props.text === null || typeof validatedShape.props.text === 'undefined' ? '' : validatedShape.props.text);
          validatedShape.props.richText = toRichTextFn(textValue);
          delete validatedShape.props.text;
        }
      }
      
      // Ensure props.richText exists and is in the correct format
      if (validatedShape.props.richText === undefined) {
        console.warn(`DEFENSIVE FIX (TEXT): Shape ID ${validatedShape.id || 'N/A'} (type: text) missing 'richText' property. Adding default.`);
        if (toRichTextFn) {
          validatedShape.props.richText = toRichTextFn('');
        }
      } else if (typeof validatedShape.props.richText === 'string') {
        // If richText is a plain string, convert it to rich text format
        console.warn(`DEFENSIVE FIX (TEXT): Shape ID ${validatedShape.id || 'N/A'} (type: text) has plain string 'richText'. Converting to rich text format.`);
        if (toRichTextFn) {
          validatedShape.props.richText = toRichTextFn(validatedShape.props.richText);
        }
      } else if (typeof validatedShape.props.richText === 'object' && validatedShape.props.richText !== null) {
        // richText is already an object (proper rich text format), leave it as is
        console.log(`DEFENSIVE CHECK (TEXT): Shape ID ${validatedShape.id || 'N/A'} (type: text) already has richText object format.`);
      }
      
      // Ensure font property exists and is valid
      if (!validatedShape.props.font || !['sans', 'serif', 'mono', 'draw'].includes(validatedShape.props.font)) {
        console.warn(`DEFENSIVE FIX (TEXT): Shape ID ${validatedShape.id || 'N/A'} (type: text) missing or invalid 'font'. Value: ${validatedShape.props.font}. Adding default 'sans'.`);
        validatedShape.props.font = 'sans';
      }
      
      // Ensure size property exists and is valid
      if (!validatedShape.props.size || !['s', 'm', 'l', 'xl'].includes(validatedShape.props.size)) {
        console.warn(`DEFENSIVE FIX (TEXT): Shape ID ${validatedShape.id || 'N/A'} (type: text) missing or invalid 'size'. Value: ${validatedShape.props.size}. Setting to default 'm'.`);
        validatedShape.props.size = 'm';
      }
      
      // Remove align property as it's not valid for text shapes in this TLDraw version
      if (validatedShape.props.align !== undefined) {
        console.warn(`DEFENSIVE FIX (TEXT): Shape ID ${validatedShape.id || 'N/A'} (type: text) has invalid 'align' property. Removing it.`);
        delete validatedShape.props.align;
      }
      
      // Add autoSize property if not present
      if (typeof validatedShape.props.autoSize === 'undefined') {
        validatedShape.props.autoSize = true; // Default to auto-sizing
      }
      
      // If w is provided, ensure it's a positive number
      if (validatedShape.props.w !== undefined) {
        if (typeof validatedShape.props.w !== 'number' || validatedShape.props.w <= 0) {
          console.warn(`DEFENSIVE FIX (TEXT): Shape ID ${validatedShape.id || 'N/A'} (type: text) has invalid 'w'. Value: ${validatedShape.props.w}. Removing it.`);
          delete validatedShape.props.w;
        }
      }
      
      // Validate color
      if (validatedShape.props.color) {
        validatedShape.props.color = validateColor(validatedShape.props.color);
      }
    }
    
    // For geo shapes, handle text property (geo shapes CAN have text with font)
    if (validatedShape.type === 'geo' && validatedShape.props?.text) {
      // Ensure font property exists when text is present
      if (!validatedShape.props.font) {
        console.warn(`DEFENSIVE FIX (GEO): Shape ID ${validatedShape.id || 'N/A'} (type: geo) has text but missing font property. Adding default 'sans'.`);
        validatedShape.props.font = 'sans';
      }
    }
    
    // Validate color property if it exists for any shape type
    if (validatedShape.props?.color) {
      validatedShape.props.color = validateColor(validatedShape.props.color);
    }
    
    // Validate size property for geo shapes
    if (validatedShape.type === 'geo' && validatedShape.props?.size) {
       if (!['s', 'm', 'l', 'xl'].includes(validatedShape.props.size)) {
        console.warn(`DEFENSIVE FIX (GEO_SIZE): Shape ID ${validatedShape.id || 'N/A'} (type: geo) has invalid 'size'. Value: ${validatedShape.props.size}. Setting to default 'm'.`);
        validatedShape.props.size = 'm';
       }
    }
    
    return validatedShape;
  };

  // Ensure we're on the client side and get toRichText function from stored reference
  useEffect(() => {
    setIsClient(true);
    
    // Get toRichText function from the stored reference to avoid duplicate imports
    const checkForTldrawFunction = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tldrawWindow = window as Window & { __tldrawToRichText?: (text: string) => any };
      if (tldrawWindow.__tldrawToRichText) {
        setToRichTextFn(() => tldrawWindow.__tldrawToRichText);
      } else {
        // If not available yet, check again in 100ms
        setTimeout(checkForTldrawFunction, 100);
      }
    };
    
    checkForTldrawFunction();
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

  // Extract the common shape processing logic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processAndCreateShapes = async (extractedModules: any[]) => {
    console.log('Extracted modules from input:', JSON.stringify(extractedModules, null, 2));
      
    // Validate and ensure all shapes have proper IDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedShapes: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extractedModules.forEach((shape: any, index: number) => {
      console.log(`Processing shape ${index}:`, JSON.stringify(shape, null, 2));
      const validatedShape = validateShape(shape);
      console.log(`Validated shape ${index}:`, JSON.stringify(validatedShape, null, 2));
      
      // Add the validated shape with an ID
      processedShapes.push({
        ...validatedShape,
        id: validatedShape.id || currentEditor.createShapeId()
      });
    });
    
    const validatedShapes = processedShapes;
    
    if (validatedShapes.length > 0 && isClient) {
      // Clear existing shapes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingShapeIds = currentEditor.getCurrentPageShapes().map((s: any) => s.id);
      if (existingShapeIds.length > 0) {
        currentEditor.deleteShapes(existingShapeIds);
      }
      
      // Log the validated shapes for debugging
      console.log('=== VALIDATED SHAPES BEFORE CREATION ===');
      console.log(JSON.stringify(validatedShapes, null, 2));
      console.log('=== END VALIDATED SHAPES ===');
      
      // Create shapes directly from input
      try {
        // Try batch creation first
        currentEditor.createShapes(validatedShapes);
        currentEditor.zoomToFit();
        alert(`Generated ${validatedShapes.length} wireframe elements!`);
      } catch (batchError) {
        console.error('Error creating shapes in batch:', batchError);
        console.error('Attempting to create shapes one by one to isolate the problem...');
        
        // Try creating shapes one by one to isolate the problematic shape
        let successCount = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const failedShapes: Array<{index: number, shape: any, error: any}> = [];
        
        for (let i = 0; i < validatedShapes.length; i++) {
          const shape = validatedShapes[i];
          try {
            console.log(`Attempting to create shape ${i + 1}/${validatedShapes.length}:`, JSON.stringify(shape, null, 2));
            currentEditor.createShapes([shape]);
            successCount++;
          } catch (singleShapeError) {
            console.error(`Failed to create shape at index ${i}:`, singleShapeError);
            console.error('Problematic shape data:', JSON.stringify(shape, null, 2));
            
            // Store the failed shape info
            failedShapes.push({
              index: i,
              shape: shape,
              error: singleShapeError
            });
            
            // Log specific details about text shapes
            if (shape.type === 'text') {
              console.error('Text shape debug info:');
              console.error('- props.richText type:', typeof shape.props?.richText);
              console.error('- props.richText value:', shape.props?.richText);
              console.error('- props.richText length:', shape.props?.richText?.length);
              console.error('- props.font:', shape.props?.font);
              console.error('- props.size:', shape.props?.size);
              console.error('- props.color:', shape.props?.color);
              console.error('- All props keys:', Object.keys(shape.props || {}));
              
              // Check for unusual characters in richText if it's a string
              if (typeof shape.props?.richText === 'string') {
                const charCodes = [];
                for (let j = 0; j < shape.props.richText.length; j++) {
                  charCodes.push(shape.props.richText.charCodeAt(j));
                }
                console.error('- Character codes in richText:', charCodes);
              }
            }
            
            // Continue to next shape instead of breaking
            console.log(`Continuing to next shape...`);
          }
        }
        
        // Show comprehensive summary
        if (successCount > 0) {
          currentEditor.zoomToFit();
        }
        
        // Create detailed error summary
        console.log('\n=== SHAPE CREATION SUMMARY ===');
        console.log(`✅ Successfully created: ${successCount}/${validatedShapes.length} shapes`);
        console.log(`❌ Failed to create: ${failedShapes.length}/${validatedShapes.length} shapes`);
        
        if (failedShapes.length > 0) {
          console.log('\n=== FAILED SHAPES DETAILS ===');
          failedShapes.forEach(({index, shape, error}) => {
            console.log(`\nShape ${index + 1} (ID: ${shape.id || 'N/A'}):`);
            console.log(`- Type: ${shape.type}`);
            console.log(`- Error: ${error.message}`);
            console.log(`- Shape data:`, JSON.stringify(shape, null, 2));
          });
          
          // Create summary for alert
          const errorTypes = failedShapes.reduce((acc, {error}) => {
            const errorMsg = error.message || 'Unknown error';
            acc[errorMsg] = (acc[errorMsg] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const errorSummary = Object.entries(errorTypes)
            .map(([error, count]) => `• ${error} (${count}x)`)
            .join('\n');
          
          alert(`Shape Creation Results:
✅ Success: ${successCount}/${validatedShapes.length}
❌ Failed: ${failedShapes.length}/${validatedShapes.length}

Common Errors:
${errorSummary}

Check console for detailed error analysis.`);
        } else {
          alert(`All ${successCount} shapes created successfully!`);
        }
      }
    } else {
      alert('No shapes were generated. Please try different input.');
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
        
        {/* Save indicator */}
        <div className="mt-2 text-xs text-gray-400">
          Manual save • Backup save every 5 min • Saves on page exit
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
        <div className="flex-1 overflow-hidden" style={{ touchAction: 'none' }}>
          <TldrawComponent 
            className="w-full h-full"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onMount={(editor: any) => {
              // Prevent multiple mounts
              if (currentEditor) {
                return;
              }
              
              setCurrentEditor(editor);
              
              // Let tldraw handle ALL events natively - no custom event handling
              console.log('🎯 Editor mounted - letting tldraw handle all events natively');
              
              // Ensure the editor container has proper touch handling
              const editorContainer = editor.getContainer();
              if (editorContainer) {
                editorContainer.style.touchAction = 'none';
              }
            }}
          />
        </div>
      </div>
    </div>
  );
} 