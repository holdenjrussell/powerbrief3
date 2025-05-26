"use client";
import React, { useState, useCallback, ChangeEvent } from 'react';
import { X, UploadCloud, Check, Trash2, Loader2, FileVideo, FileImage } from 'lucide-react';
import { createSPAClient } from '@/lib/supabase/client';

interface AssetFile {
  file: File;
  id: string;
  previewUrl?: string;
  uploading?: boolean;
  uploadError?: string | null;
  supabaseUrl?: string;
  detectedRatio?: string | null;
  baseName?: string;
}

interface UploadedAsset {
  id: string;
  name: string;
  supabaseUrl: string;
  type: 'image' | 'video';
  aspectRatio: string;
  baseName: string;
}

interface AssetGroup {
  baseName: string;
  assets: UploadedAsset[];
  aspectRatios: string[];
}

interface PowerBriefAssetUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetsUploaded: (assetGroups: AssetGroup[]) => void;
  conceptId: string;
  userId: string;
}

const ASPECT_RATIO_IDENTIFIERS = ['4x5', '9x16', '1x1', '16x9'];
const KNOWN_FILENAME_SUFFIXES_TO_REMOVE = ['_compressed', '-compressed', '_comp', '-comp', '_v1', '_v2', '_v3', '-v1', '-v2', '-v3'];

// Helper function to extract base name and aspect ratio from filename
const getBaseNameAndRatio = (filename: string): { baseName: string; detectedRatio: string | null } => {
  let nameWorkInProgress = filename.substring(0, filename.lastIndexOf('.')) || filename;
  
  // Remove known trailing suffixes
  for (const suffix of KNOWN_FILENAME_SUFFIXES_TO_REMOVE) {
    if (nameWorkInProgress.endsWith(suffix)) {
      nameWorkInProgress = nameWorkInProgress.substring(0, nameWorkInProgress.length - suffix.length);
      break; 
    }
  }

  // Look for aspect ratio identifiers
  for (const id of ASPECT_RATIO_IDENTIFIERS) {
    const patternsToTest = [
      `_${id}`,
      `-${id}`,
      ` - ${id}`,
      `:${id}`,
      `(${id})`,
      `(${id}`
    ];
    
    for (const pattern of patternsToTest) {
      if (nameWorkInProgress.endsWith(pattern)) {
        return {
          baseName: nameWorkInProgress.substring(0, nameWorkInProgress.length - pattern.length).trim(),
          detectedRatio: id
        };
      }
    }
  }
  
  return { baseName: nameWorkInProgress.trim(), detectedRatio: null };
};

const PowerBriefAssetUpload: React.FC<PowerBriefAssetUploadProps> = ({ 
  isOpen, 
  onClose, 
  onAssetsUploaded, 
  conceptId, 
  userId 
}) => {
  const [selectedFiles, setSelectedFiles] = useState<AssetFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const newFiles: AssetFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        continue;
      }
      
      const { baseName, detectedRatio } = getBaseNameAndRatio(file.name);
      
      const assetFile: AssetFile = {
        file,
        id: crypto.randomUUID(),
        baseName,
        detectedRatio
      };
      
      newFiles.push(assetFile);
    }
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const processAndUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setSelectedFiles(prevFiles => prevFiles.map(sf => ({ ...sf, uploading: true, uploadError: null })));

    const supabase = createSPAClient();
    const uploadedAssets: UploadedAsset[] = [];

    for (const assetFile of selectedFiles) {
      const file = assetFile.file;
      const filePath = `powerbrief/${userId}/${conceptId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;

      try {
        const { data, error } = await supabase.storage
          .from('ad-creatives')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) throw error;

        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('ad-creatives').getPublicUrl(filePath);
          
          if (!publicUrl) {
            throw new Error('Could not get public URL for uploaded file.');
          }

          uploadedAssets.push({
            id: assetFile.id,
            name: file.name,
            supabaseUrl: publicUrl,
            type: file.type.startsWith('image/') ? 'image' : 'video',
            aspectRatio: assetFile.detectedRatio || 'unknown',
            baseName: assetFile.baseName || file.name
          });

          setSelectedFiles(prev => prev.map(sf => 
            sf.id === assetFile.id ? { ...sf, uploading: false, supabaseUrl: publicUrl } : sf
          ));
        }
      } catch (e: unknown) {
        const uploadError = e as Error | { message: string } | string;
        console.error(`Failed to upload ${file.name}:`, uploadError);
        const errorMessage = typeof uploadError === 'string' ? uploadError : (uploadError as Error)?.message || 'Upload failed';
        setSelectedFiles(prev => prev.map(sf => 
          sf.id === assetFile.id ? { ...sf, uploading: false, uploadError: errorMessage } : sf
        ));
      }
    }

    // Group assets by base name
    const assetGroups: AssetGroup[] = [];
    const groupsByBaseName: Record<string, UploadedAsset[]> = {};

    uploadedAssets.forEach(asset => {
      if (!groupsByBaseName[asset.baseName]) {
        groupsByBaseName[asset.baseName] = [];
      }
      groupsByBaseName[asset.baseName].push(asset);
    });

    Object.entries(groupsByBaseName).forEach(([baseName, assets]) => {
      assetGroups.push({
        baseName,
        assets,
        aspectRatios: [...new Set(assets.map(a => a.aspectRatio).filter(r => r !== 'unknown'))]
      });
    });

    onAssetsUploaded(assetGroups);
    setSelectedFiles([]);
    setIsProcessing(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Upload Creative Assets</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close upload modal"
            title="Close upload modal"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">Upload Guidelines</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Upload multiple versions of your concept (v1, v2, v3, etc.)</li>
            <li>• Include both 4x5 and 9x16 aspect ratios for each version</li>
            <li>• Use naming like: &ldquo;ConceptName_4x5_v1.jpg&rdquo; or &ldquo;ConceptName_9x16_v2.mp4&rdquo;</li>
            <li>• Supported formats: Images (JPG, PNG, GIF) and Videos (MP4, MOV, AVI)</li>
          </ul>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Upload images and videos for your concept variations
          </p>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleChange}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 cursor-pointer"
          >
            Select Files
          </label>
        </div>

        {/* File List */}
        {selectedFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-700 mb-3">
              Selected Files ({selectedFiles.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {file.file.type.startsWith('image/') ? (
                      <FileImage className="h-5 w-5 text-blue-500" />
                    ) : (
                      <FileVideo className="h-5 w-5 text-purple-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-700">{file.file.name}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>Base: {file.baseName}</span>
                        {file.detectedRatio && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                            {file.detectedRatio}
                          </span>
                        )}
                        <span>{(file.file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.uploading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    {file.supabaseUrl && <Check className="h-4 w-4 text-green-500" />}
                    {file.uploadError && (
                      <span className="text-xs text-red-500" title={file.uploadError}>
                        Error
                      </span>
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-red-500 hover:text-red-700"
                      disabled={file.uploading}
                      aria-label={`Remove ${file.file.name}`}
                      title={`Remove ${file.file.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={processAndUpload}
            disabled={selectedFiles.length === 0 || isProcessing}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Assets'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PowerBriefAssetUpload; 