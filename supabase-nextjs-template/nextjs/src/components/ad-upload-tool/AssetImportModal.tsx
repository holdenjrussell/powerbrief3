"use client";
import React, { useState, useCallback, ChangeEvent, useMemo } from 'react';
import { X, UploadCloud, Check, Trash2, Loader2, Square, CheckSquare, Zap } from 'lucide-react';
import { createSPAClient } from '@/lib/supabase/client';
import { useGlobal } from '@/lib/context/GlobalContext';
import { ImportedAssetGroup } from './adUploadTypes';
import { needsCompression, compressVideoWithQuality, getFileSizeMB } from '@/lib/utils/videoCompression';
import AssetGroupingPreview from '@/components/PowerBriefAssetGroupingPreview';
import { UploadedAssetGroup } from '@/lib/types/powerbrief';

interface AssetFile {
  file: File;
  id: string;
  previewUrl?: string; // For image previews, if implemented
  uploading?: boolean; // To indicate upload in progress
  uploadError?: string | null; // To store upload error message
  supabaseUrl?: string; // To store the Supabase URL after successful upload
  compressing?: boolean; // To indicate compression in progress
  compressionProgress?: number; // Compression progress (0-100)
  needsCompression?: boolean; // Whether this file needs compression
  originalSize?: number; // Original file size for comparison
  detectedRatio?: string | null; // Detected aspect ratio
}

const DEFAULT_ASPECT_RATIO_IDENTIFIERS = ['4x5', '9x16'];
const KNOWN_FILENAME_SUFFIXES_TO_REMOVE = ['_compressed', '-compressed', '_comp', '-comp']; // List of suffixes to remove before ratio detection

interface ProcessedAssetFile extends AssetFile {
  baseName?: string;
  detectedRatio?: string | null;
}

// Helper function to extract base name and aspect ratio
const getBaseNameAndRatio = (filename: string, identifiers: string[], suffixesToRemove: string[]): { baseName: string; detectedRatio: string | null } => {
  let nameWorkInProgress = filename.substring(0, filename.lastIndexOf('.')) || filename;
  
  // Step 1: Remove known trailing suffixes (like _compressed)
  for (const suffix of suffixesToRemove) {
    if (nameWorkInProgress.endsWith(suffix)) {
      nameWorkInProgress = nameWorkInProgress.substring(0, nameWorkInProgress.length - suffix.length);
      break; 
    }
  }

  // Step 2: Look for aspect ratio identifiers at the end (right before extension)
  for (const id of identifiers) {
    // Check for patterns like: "_4x5", "-4x5" at the end
    const patternsToTest = [
      `_${id}`,
      `-${id}`
    ];
    
    for (const pattern of patternsToTest) {
      if (nameWorkInProgress.endsWith(pattern)) {
        const baseNameWithoutRatio = nameWorkInProgress.substring(0, nameWorkInProgress.length - pattern.length).trim();
        return {
          baseName: baseNameWithoutRatio,
          detectedRatio: id
        };
      }
    }
  }
  
  // If no specific ratio pattern is found after cleaning suffixes,
  // the remaining nameWorkInProgress is the baseName.
  return { baseName: nameWorkInProgress.trim(), detectedRatio: null };
};

interface AssetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetsImported: (assetGroups: ImportedAssetGroup[]) => void;
  brandId: string | null; // Added brandId prop
}

const AssetImportModal: React.FC<AssetImportModalProps> = ({ isOpen, onClose, onAssetsImported, brandId }) => {
  const [selectedFiles, setSelectedFiles] = useState<AssetFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // For overall processing state
  const { user } = useGlobal(); // Get user from global context
  const [checkedFileIds, setCheckedFileIds] = useState<Set<string>>(new Set()); // New state for checked files
  
  // Grouping preview state
  const [showGroupingPreview, setShowGroupingPreview] = useState(false);
  const [previewAssetGroups, setPreviewAssetGroups] = useState<UploadedAssetGroup[]>([]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles: AssetFile[] = Array.from(event.target.files).map(file => ({
        file,
        id: `${file.name}-${file.lastModified}-${file.size}`,
        needsCompression: needsCompression(file),
        originalSize: file.size,
        // previewUrl: URL.createObjectURL(file) // Create for images, remember to revoke
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const newFiles: AssetFile[] = Array.from(event.dataTransfer.files).map(file => ({
        file,
        id: `${file.name}-${file.lastModified}-${file.size}`,
        needsCompression: needsCompression(file),
        originalSize: file.size,
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
      event.dataTransfer.clearData();
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    setCheckedFileIds(prev => { // Also remove from checked if it was checked
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  };

  const toggleFileChecked = (fileId: string) => {
    setCheckedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleSelectAllToggle = () => {
    if (checkedFileIds.size === selectedFiles.length) {
      setCheckedFileIds(new Set()); // Deselect all
    } else {
      setCheckedFileIds(new Set(selectedFiles.map(sf => sf.id))); // Select all
    }
  };

  const handleBulkRemove = () => {
    setSelectedFiles(prev => prev.filter(sf => !checkedFileIds.has(sf.id)));
    setCheckedFileIds(new Set()); // Clear selection after removal
  };

  const allFilesChecked = useMemo(() => selectedFiles.length > 0 && checkedFileIds.size === selectedFiles.length, [selectedFiles, checkedFileIds]);

  const showGroupingPreviewModal = () => {
    // Group files by their baseName to show preview
    const groups: Record<string, AssetFile[]> = {};
    selectedFiles.forEach(file => {
      const { baseName } = getBaseNameAndRatio(file.file.name, DEFAULT_ASPECT_RATIO_IDENTIFIERS, KNOWN_FILENAME_SUFFIXES_TO_REMOVE);
      const groupKey = baseName || file.file.name;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(file);
    });
    
    // Convert to UploadedAssetGroup format for the preview component
    const assetGroups: UploadedAssetGroup[] = Object.entries(groups).map(([groupKey, files]) => ({
      baseName: groupKey,
      assets: files.map(file => {
        const { baseName } = getBaseNameAndRatio(file.file.name, DEFAULT_ASPECT_RATIO_IDENTIFIERS, KNOWN_FILENAME_SUFFIXES_TO_REMOVE);
        return {
          id: file.id,
          name: file.file.name,
          supabaseUrl: URL.createObjectURL(file.file), // Create temporary URL for preview
          type: file.file.type.startsWith('image/') ? 'image' as const : 'video' as const,
          aspectRatio: file.detectedRatio || 'unknown',
          baseName: baseName || file.file.name,
          uploadedAt: new Date().toISOString()
        };
      }),
      aspectRatios: [...new Set(files.map(f => f.detectedRatio).filter(Boolean))],
      uploadedAt: new Date().toISOString()
    }));
    
    setPreviewAssetGroups(assetGroups);
    setShowGroupingPreview(true);
  };

  const handleConfirmGrouping = (updatedGroups: UploadedAssetGroup[]) => {
    // Convert back to our internal format and update selectedFiles
    const updatedFiles: AssetFile[] = [];
    
    updatedGroups.forEach(group => {
      group.assets.forEach(asset => {
        const originalFile = selectedFiles.find(f => f.id === asset.id);
        if (originalFile) {
          // Update the file with the new baseName from the group
          const { detectedRatio } = getBaseNameAndRatio(originalFile.file.name, DEFAULT_ASPECT_RATIO_IDENTIFIERS, KNOWN_FILENAME_SUFFIXES_TO_REMOVE);
          updatedFiles.push({
            ...originalFile,
            detectedRatio: detectedRatio
          });
        }
      });
    });
    
    setSelectedFiles(updatedFiles);
    setShowGroupingPreview(false);
    
    // Proceed with import using the updated grouping
    processAndImport();
  };

  const processAndImport = async () => {
    if (!user || !brandId) {
        console.error("User or Brand ID is missing. Cannot upload.");
        // Optionally, show an error to the user
        alert("User or Brand ID is missing. Please ensure you are logged in and a brand is selected.");
        return;
    }
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setSelectedFiles(prevFiles => prevFiles.map(sf => ({ ...sf, uploading: true, uploadError: null })));

    const supabase = createSPAClient();
    const processedAssetGroups: ImportedAssetGroup[] = [];

    // Step 1: Compress videos that need compression
    const filesToProcess: AssetFile[] = [];
    for (const assetFile of selectedFiles) {
      if (assetFile.needsCompression) {
        try {
          console.log(`Compressing ${assetFile.file.name} (${getFileSizeMB(assetFile.file).toFixed(2)}MB)`);
          
          // Update UI to show compression in progress
          setSelectedFiles(prev => prev.map(sf => 
            sf.id === assetFile.id 
              ? { ...sf, compressing: true, compressionProgress: 0 }
              : sf
          ));

          const compressedFile = await compressVideoWithQuality(
            assetFile.file, 
            'balanced', // Use balanced quality for 2x speed improvement
            (progress) => {
              setSelectedFiles(prev => prev.map(sf => 
                sf.id === assetFile.id 
                  ? { ...sf, compressionProgress: progress }
                  : sf
              ));
            }
          );

          // Update the asset file with the compressed version
          const updatedAssetFile: AssetFile = {
            ...assetFile,
            file: compressedFile,
            compressing: false,
            compressionProgress: 100,
            needsCompression: false, // No longer needs compression
          };

          filesToProcess.push(updatedAssetFile);
          
          // Update UI to show compression complete
          setSelectedFiles(prev => prev.map(sf => 
            sf.id === assetFile.id ? updatedAssetFile : sf
          ));

        } catch (compressionError) {
          console.error(`Failed to compress ${assetFile.file.name}:`, compressionError);
          
          // Update UI to show compression error
          setSelectedFiles(prev => prev.map(sf => 
            sf.id === assetFile.id 
              ? { 
                  ...sf, 
                  compressing: false, 
                  uploadError: `Compression failed: ${compressionError instanceof Error ? compressionError.message : 'Unknown error'}` 
                }
              : sf
          ));
          
          // Skip this file for upload
          continue;
        }
      } else {
        // File doesn't need compression, use as-is
        filesToProcess.push(assetFile);
      }
    }

    // Pre-process files to get base names and detected ratios
    const processedSelectedFiles: ProcessedAssetFile[] = filesToProcess.map(sf => {
      const { baseName, detectedRatio } = getBaseNameAndRatio(sf.file.name, DEFAULT_ASPECT_RATIO_IDENTIFIERS, KNOWN_FILENAME_SUFFIXES_TO_REMOVE);
      return { ...sf, baseName, detectedRatio };
    });

    // Group files by the extracted baseName
    const filesByBaseName: Record<string, ProcessedAssetFile[]> = {};
    processedSelectedFiles.forEach(psf => {
      const key = psf.baseName || psf.file.name; // Fallback to full filename if baseName is somehow empty
      if (!filesByBaseName[key]) {
        filesByBaseName[key] = [];
      }
      filesByBaseName[key].push(psf);
    });
    
    for (const groupNameKey in filesByBaseName) { // groupNameKey is the baseName
        const filesInGroup = filesByBaseName[groupNameKey];
        const uploadedGroupFiles: ImportedAssetGroup['files'] = [];
        const aspectRatiosInThisGroup: string[] = [];

        for (const assetFile of filesInGroup) { // assetFile is ProcessedAssetFile here
            const file = assetFile.file;
            // Use groupNameKey for the asset group name, which is the common base name
            const filePath = `${user.id}/${brandId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;

            try {
                const { data, error } = await supabase.storage
                    .from('ad-creatives') // Your bucket name
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false, // true if you want to overwrite
                    });

                if (error) {
                    throw error;
                }

                if (data) {
                    // Get public URL (or construct it if your RLS allows public reads with a known path structure)
                    const { data: { publicUrl } } = supabase.storage.from('ad-creatives').getPublicUrl(filePath);
                    
                    if (!publicUrl) {
                        throw new Error('Could not get public URL for uploaded file.');
                    }

                    uploadedGroupFiles.push({
                        id: assetFile.id,
                        name: file.name,
                        supabaseUrl: publicUrl,
                        type: file.type.startsWith('image/') ? 'image' : 'video',
                        detectedAspectRatio: assetFile.detectedRatio || undefined,
                    });
                    
                    // Collect detected ratios for the group
                    if (assetFile.detectedRatio) {
                        aspectRatiosInThisGroup.push(assetFile.detectedRatio);
                    }

                    setSelectedFiles(prev => prev.map(sf => sf.id === assetFile.id ? {...sf, uploading: false, supabaseUrl: publicUrl} : sf));
                }
            } catch (e: unknown) {
                const uploadError = e as Error | { message: string } | string;
                console.error(`Failed to upload ${file.name}:`, uploadError);
                const errorMessage = typeof uploadError === 'string' ? uploadError : (uploadError as Error)?.message || 'Upload failed';
                setSelectedFiles(prev => prev.map(sf => sf.id === assetFile.id ? {...sf, uploading: false, uploadError: errorMessage } : sf));
                // Continue to next file, or handle error more globally for the group
            }
        }

        if (uploadedGroupFiles.length > 0) {
            processedAssetGroups.push({
                groupName: groupNameKey, // Use the common baseName as the groupName
                files: uploadedGroupFiles,
                aspectRatiosDetected: [...new Set(aspectRatiosInThisGroup)] // Unique detected aspect ratios for this group
            });
        }
    }
    
    onAssetsImported(processedAssetGroups);
    setSelectedFiles([]); // Clear after successful import or if all failed but processed
    setIsProcessing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out opacity-100">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl transform transition-all duration-300 ease-in-out scale-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Import Assets</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close modal">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* General Auto-Compression Information Banner */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start">
              <Zap size={20} className="text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-blue-800 mb-1">
                  Smart Auto-Compression
                </h4>
                <p className="text-sm text-blue-700 mb-2">
                  Videos over 150MB are automatically compressed during import to ensure successful Meta uploads. 
                  <span className="text-blue-600"> Files under 150MB bypass compression.</span>
                  <span className="block text-xs mt-1 text-blue-600">⚡ Balanced compression - optimized for quality while maintaining reasonable file sizes</span>
                </p>
                <p className="text-xs text-blue-600">
                  💡 <strong>Pro Tip:</strong> Our compression balances quality and file size for optimal Meta compatibility.
                </p>
              </div>
            </div>
          </div>

          {/* File Naming Guidelines */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <div className="flex items-start">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-800 mb-1">
                  📝 File Naming Convention
                </h4>
                <p className="text-sm text-gray-700 mb-2">
                  Use this format: <code className="bg-gray-200 px-1 rounded">ConceptName_v1_4x5.mp4</code>
                </p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>• <strong>Aspect ratios:</strong> Only 4x5 and 9x16 (place right before file extension)</p>
                  <p>• <strong>Version numbers:</strong> v1, v2, v3 (place before aspect ratio)</p>
                  <p>• <strong>Examples:</strong> ProductDemo_v1_4x5.mp4, ProductDemo_v1_9x16.mp4</p>
                </div>
              </div>
            </div>
          </div>

          {/* File Upload Area */}
          <div 
            onDrop={handleDrop} 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer 
                        ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}`}
          >
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              id="file-upload-input"
            />
            <UploadCloud className={`mx-auto h-12 w-12 ${isDragging ? 'text-primary-600' : 'text-gray-400'}`} />
            <label htmlFor="file-upload-input" className="mt-2 block text-sm font-medium text-primary-600 hover:text-primary-500 cursor-pointer">
              <span>Click to upload</span> or drag and drop
            </label>
            <p className="mt-1 text-xs text-gray-500">Images or Videos (bulk select supported)</p>
            {selectedFiles.some(f => f.needsCompression) && (
              <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start">
                  <Zap size={20} className="text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-800 mb-1">
                      Large Assets Detected - Auto-Compression Enabled
                    </h4>
                    <p className="text-sm text-amber-700 mb-2">
                      {selectedFiles.filter(f => f.needsCompression).length} video(s) over 150MB will be automatically compressed to ensure successful upload to Meta.
                      <span className="block text-xs mt-1 text-amber-600">⚡ Balanced compression - optimized for quality while maintaining reasonable file sizes</span>
                    </p>
                    <p className="text-xs text-amber-600">
                      💡 <strong>Tip:</strong> You can bypass compression by ensuring your video files are under 150MB before uploading.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3 space-y-2">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-700">
                        Selected Files: {selectedFiles.length} ({checkedFileIds.size} checked)
                    </h3>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleBulkRemove}
                            disabled={checkedFileIds.size === 0 || isProcessing}
                            className="px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 border border-red-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remove selected files"
                        >
                            <Trash2 size={14} className="inline mr-1" />
                            Bulk Remove ({checkedFileIds.size})
                        </button>
                        <button 
                            onClick={handleSelectAllToggle}
                            className="px-2 py-1 text-xs font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md"
                            title={allFilesChecked ? "Deselect All" : "Select All"}
                        >
                            {allFilesChecked ? <CheckSquare size={14} className="inline mr-1" /> : <Square size={14} className="inline mr-1" />}
                            {allFilesChecked ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                </div>
              {selectedFiles.map(assetFile => (
                <div key={assetFile.id} className={`flex items-center justify-between p-3 rounded-lg text-sm border transition-all ${
                  checkedFileIds.has(assetFile.id) 
                    ? 'bg-primary-50 ring-2 ring-primary-300 border-primary-200' 
                    : assetFile.needsCompression && !assetFile.compressing && !assetFile.uploadError
                      ? 'bg-amber-50 border-amber-200'
                      : assetFile.compressing
                        ? 'bg-blue-50 border-blue-200'
                        : assetFile.originalSize && assetFile.originalSize !== assetFile.file.size
                          ? 'bg-green-50 border-green-200'
                          : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center flex-grow overflow-hidden">
                    <button onClick={() => toggleFileChecked(assetFile.id)} className="mr-3 p-1 focus:outline-none">
                        {checkedFileIds.has(assetFile.id) ? <CheckSquare size={18} className="text-primary-600" /> : <Square size={18} className="text-gray-400" />}
                    </button>
                    <div className="flex-grow overflow-hidden">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="truncate text-gray-700 font-medium" title={assetFile.file.name}>
                          {assetFile.file.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({getFileSizeMB(assetFile.file).toFixed(1)}MB)
                        </span>
                      </div>
                      
                      {/* Status indicators */}
                      <div className="flex items-center flex-wrap gap-2">
                        {assetFile.needsCompression && !assetFile.compressing && !assetFile.uploadError && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <Zap size={12} className="mr-1" />
                            Will auto-compress (over 150MB)
                          </span>
                        )}
                        
                        {assetFile.compressing && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Loader2 size={12} className="animate-spin mr-1" />
                            Compressing... {assetFile.compressionProgress || 0}%
                          </span>
                        )}
                        
                        {assetFile.originalSize && assetFile.originalSize !== assetFile.file.size && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Compressed: {getFileSizeMB(assetFile.file).toFixed(1)}MB 
                            (was {(assetFile.originalSize / (1024 * 1024)).toFixed(1)}MB)
                          </span>
                        )}
                        
                        {!assetFile.needsCompression && !assetFile.originalSize && assetFile.file.type.startsWith('video/') && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Under 150MB - No compression needed
                          </span>
                        )}
                        
                        {assetFile.uploadError && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            ❌ Error: {assetFile.uploadError}
                          </span>
                        )}
                        
                        {assetFile.supabaseUrl && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Uploaded successfully
                          </span>
                        )}
                      </div>
                      
                      {assetFile.compressing && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${assetFile.compressionProgress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                    {assetFile.uploading && !assetFile.compressing && <Loader2 size={16} className="animate-spin text-primary-500 flex-shrink-0" />}
                  </div>
                  <button 
                    onClick={() => removeFile(assetFile.id)} 
                    className="text-red-500 hover:text-red-700 ml-3 flex-shrink-0 p-1 rounded hover:bg-red-50"
                    aria-label={`Remove ${assetFile.file.name}`}
                    disabled={assetFile.uploading || assetFile.compressing || isProcessing}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Grouping Options - This section can be removed or simplified as grouping is now name-based */}
          {/* For now, let's hide it to simplify the UI, focusing on upload functionality */}
          {/* 
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset Grouping</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
              {(Object.keys(groupingOptionsDisplay) as GroupingOption[]).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setGroupingOption(key)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center px-4 py-2.5 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 transition-colors
                    ${groupingOption === key 
                        ? 'bg-primary-600 text-white border-primary-600 shadow-sm' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                  {groupingOptionsDisplay[key].icon}
                  {groupingOptionsDisplay[key].label}
                </button>
              ))}
            </div>
             <p className="mt-2 text-xs text-gray-500">{groupingOptionsDisplay[groupingOption].description}</p>
          </div>
          */}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 pt-5 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={showGroupingPreviewModal}
            disabled={selectedFiles.length === 0 || isProcessing || selectedFiles.some(f => f.uploading || f.compressing)}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : 
                selectedFiles.some(f => f.compressing) ?
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Compressing...</> :
                <><Check className="mr-2 h-4 w-4" /> Preview Grouping</>
            }
          </button>
        </div>
      </div>

      {/* Asset Grouping Preview Modal */}
      {showGroupingPreview && (
        <AssetGroupingPreview
          isOpen={showGroupingPreview}
          onClose={() => setShowGroupingPreview(false)}
          assetGroups={previewAssetGroups}
          conceptTitle="Asset Import Preview"
          onConfirmSend={handleConfirmGrouping}
        />
      )}
    </div>
  );
};

// Commenting out or removing the old grouping options UI and logic
// const groupingOptionsDisplay: Record<GroupingOption, {label: string, description: string, icon: React.ReactElement}> = {
//   individual: {
//     label: 'Individual Assets',
//     description: 'Each file will be treated as a separate ad creative.',
//     icon: <FileText size={18} className="mr-2"/>
//   },
//   pairs: {
//     label: 'Group by Name (Pairs)',
//     description: 'Group files by name for 2 aspect ratios (e.g., name_1x1, name_9x16). Assumes two files per group.',
//     icon: <Users size={18} className="mr-2" />
//   },
//   triples: {
//     label: 'Group by Name (Triples)',
//     description: 'Group files by name for 3 aspect ratios. Assumes three files per group.',
//     icon: <Users size={18} className="mr-2" />
//   }
// };

export default AssetImportModal; 