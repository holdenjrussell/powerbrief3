"use client";
import React, { useState, useCallback, ChangeEvent } from 'react';
import { X, UploadCloud, Check, Trash2, Loader2, FileVideo, FileImage, AlertCircle, Info } from 'lucide-react';
import { createSPAClient } from '@/lib/supabase/client';

// Logging utility
const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[PowerBriefAssetUpload] ${message}`, data || '');
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`[PowerBriefAssetUpload] ${message}`, data || '');
  },
  error: (message: string, error?: unknown) => {
    console.error(`[PowerBriefAssetUpload] ${message}`, error || '');
  },
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[PowerBriefAssetUpload] ${message}`, data || '');
    }
  }
};

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

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

const ASPECT_RATIO_IDENTIFIERS = ['4x5', '9x16', '1x1', '16x9'];
const KNOWN_FILENAME_SUFFIXES_TO_REMOVE = ['_compressed', '-compressed', '_comp', '-comp', '_v1', '_v2', '_v3', '-v1', '-v2', '-v3'];
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB in bytes
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime', 'video/x-msvideo'];

// Helper function to extract base name and aspect ratio from filename
const getBaseNameAndRatio = (filename: string): { baseName: string; detectedRatio: string | null } => {
  logger.debug('Parsing filename', { filename });
  
  let nameWorkInProgress = filename.substring(0, filename.lastIndexOf('.')) || filename;
  
  // Remove known trailing suffixes
  for (const suffix of KNOWN_FILENAME_SUFFIXES_TO_REMOVE) {
    if (nameWorkInProgress.endsWith(suffix)) {
      nameWorkInProgress = nameWorkInProgress.substring(0, nameWorkInProgress.length - suffix.length);
      logger.debug('Removed suffix from filename', { suffix, newName: nameWorkInProgress });
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
        const result = {
          baseName: nameWorkInProgress.substring(0, nameWorkInProgress.length - pattern.length).trim(),
          detectedRatio: id
        };
        logger.debug('Detected aspect ratio in filename', { filename, pattern, result });
        return result;
      }
    }
  }
  
  const result = { baseName: nameWorkInProgress.trim(), detectedRatio: null };
  logger.debug('No aspect ratio detected in filename', { filename, result });
  return result;
};

// Toast component
const Toast: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  React.useEffect(() => {
    logger.debug('Toast displayed', { type: toast.type, title: toast.title });
    const timer = setTimeout(() => {
      onRemove(toast.id);
      logger.debug('Toast auto-removed', { id: toast.id });
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className={`border rounded-lg p-4 mb-2 ${getToastStyles()}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h4 className="text-sm font-medium">{toast.title}</h4>
          <p className="text-sm mt-1">{toast.message}</p>
        </div>
        <button
          onClick={() => {
            onRemove(toast.id);
            logger.debug('Toast manually closed', { id: toast.id });
          }}
          className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600"
          title="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Log component initialization
  React.useEffect(() => {
    if (isOpen) {
      logger.info('PowerBriefAssetUpload opened', { conceptId, userId });
    }
  }, [isOpen, conceptId, userId]);

  const addToast = useCallback((type: ToastMessage['type'], title: string, message: string) => {
    const newToast: ToastMessage = {
      id: crypto.randomUUID(),
      type,
      title,
      message
    };
    setToasts(prev => [...prev, newToast]);
    logger.info('Toast added', { type, title, message });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    logger.debug('Validating file', { 
      name: file.name, 
      size: file.size, 
      type: file.type,
      sizeInMB: (file.size / 1024 / 1024).toFixed(2)
    });

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const error = `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 200MB.`;
      logger.warn('File validation failed - size too large', { 
        fileName: file.name, 
        fileSize: file.size, 
        maxSize: MAX_FILE_SIZE 
      });
      return { isValid: false, error };
    }

    // Check file type
    const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
    const isVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);
    
    if (!isImage && !isVideo) {
      const error = `Unsupported file type: ${file.type}. Please use JPG, PNG, GIF, MP4, MOV, or AVI files.`;
      logger.warn('File validation failed - unsupported type', { 
        fileName: file.name, 
        fileType: file.type,
        supportedImages: SUPPORTED_IMAGE_TYPES,
        supportedVideos: SUPPORTED_VIDEO_TYPES
      });
      return { isValid: false, error };
    }

    logger.debug('File validation passed', { fileName: file.name });
    return { isValid: true };
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
      logger.debug('Drag active');
    } else if (e.type === "dragleave") {
      setDragActive(false);
      logger.debug('Drag inactive');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      logger.info('Files dropped', { fileCount: e.dataTransfer.files.length });
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      logger.info('Files selected via input', { fileCount: e.target.files.length });
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    logger.info('Processing files', { 
      fileCount: files.length,
      fileNames: Array.from(files).map(f => f.name)
    });

    const newFiles: AssetFile[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateFile(file);
      
      if (!validation.isValid) {
        errors.push(`${file.name}: ${validation.error}`);
        logger.warn('File rejected during processing', { 
          fileName: file.name, 
          error: validation.error 
        });
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
      logger.debug('File added to queue', { 
        fileName: file.name, 
        baseName, 
        detectedRatio,
        fileId: assetFile.id
      });
    }
    
    // Show errors if any
    if (errors.length > 0) {
      addToast('error', 'File Validation Errors', errors.join('\n'));
      logger.error('File validation errors occurred', { errors });
    }
    
    // Show success message for valid files
    if (newFiles.length > 0) {
      addToast('success', 'Files Added', `${newFiles.length} file(s) added successfully.`);
      logger.info('Files successfully added to queue', { 
        addedCount: newFiles.length,
        totalInQueue: selectedFiles.length + newFiles.length
      });
    }
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    const fileToRemove = selectedFiles.find(f => f.id === fileId);
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
    addToast('info', 'File Removed', 'File removed from upload queue.');
    logger.info('File removed from queue', { 
      fileId, 
      fileName: fileToRemove?.file.name,
      remainingCount: selectedFiles.length - 1
    });
  };

  const processAndUpload = async () => {
    if (selectedFiles.length === 0) {
      logger.warn('Upload attempted with no files selected');
      return;
    }

    logger.info('Starting upload process', { 
      fileCount: selectedFiles.length,
      conceptId,
      userId,
      files: selectedFiles.map(f => ({
        name: f.file.name,
        size: f.file.size,
        type: f.file.type,
        baseName: f.baseName,
        detectedRatio: f.detectedRatio
      }))
    });

    setIsProcessing(true);
    setSelectedFiles(prevFiles => prevFiles.map(sf => ({ ...sf, uploading: true, uploadError: null })));

    const supabase = createSPAClient();
    const uploadedAssets: UploadedAsset[] = [];
    let successCount = 0;
    let errorCount = 0;
    const uploadStartTime = Date.now();

    addToast('info', 'Upload Started', `Starting upload of ${selectedFiles.length} file(s)...`);

    for (const assetFile of selectedFiles) {
      const file = assetFile.file;
      const filePath = `powerbrief/${userId}/${conceptId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
      const fileUploadStartTime = Date.now();

      logger.info('Starting file upload', { 
        fileName: file.name,
        filePath,
        fileSize: file.size,
        fileType: file.type
      });

      try {
        const { data, error } = await supabase.storage
          .from('ad-creatives')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          logger.error('Supabase storage upload error', { 
            fileName: file.name,
            error: error,
            errorMessage: error.message
          });
          throw error;
        }

        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('ad-creatives').getPublicUrl(filePath);
          
          if (!publicUrl) {
            const error = 'Could not get public URL for uploaded file.';
            logger.error('Failed to get public URL', { fileName: file.name, filePath });
            throw new Error(error);
          }

          const uploadedAsset: UploadedAsset = {
            id: assetFile.id,
            name: file.name,
            supabaseUrl: publicUrl,
            type: file.type.startsWith('image/') ? 'image' : 'video',
            aspectRatio: assetFile.detectedRatio || 'unknown',
            baseName: assetFile.baseName || file.name
          };

          uploadedAssets.push(uploadedAsset);

          setSelectedFiles(prev => prev.map(sf => 
            sf.id === assetFile.id ? { ...sf, uploading: false, supabaseUrl: publicUrl } : sf
          ));
          
          const uploadDuration = Date.now() - fileUploadStartTime;
          successCount++;

          logger.info('File upload successful', { 
            fileName: file.name,
            publicUrl,
            uploadDuration,
            fileSize: file.size,
            uploadSpeed: (file.size / 1024 / 1024) / (uploadDuration / 1000) // MB/s
          });
        }
      } catch (e: unknown) {
        let errorMessage = 'Upload failed';
        
        // Better error handling for different error types
        if (e && typeof e === 'object') {
          if ('message' in e && typeof e.message === 'string') {
            errorMessage = e.message;
          } else if ('error' in e && typeof e.error === 'string') {
            errorMessage = e.error;
          } else if ('statusCode' in e && 'message' in e) {
            errorMessage = `${e.statusCode}: ${e.message}`;
          } else {
            // Try to stringify the error object for debugging
            try {
              const errorStr = JSON.stringify(e);
              if (errorStr !== '{}') {
                errorMessage = `Upload error: ${errorStr}`;
              }
            } catch {
              errorMessage = 'Unknown upload error occurred';
            }
          }
        } else if (typeof e === 'string') {
          errorMessage = e;
        }
        
        // Check for specific error types
        if (errorMessage.toLowerCase().includes('file') && errorMessage.toLowerCase().includes('size')) {
          errorMessage = `File too large. Maximum size is 200MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`;
        } else if (errorMessage.toLowerCase().includes('timeout')) {
          errorMessage = 'Upload timed out. Please try again with a smaller file or check your internet connection.';
        } else if (errorMessage.toLowerCase().includes('network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('forbidden')) {
          errorMessage = 'Permission denied. Please check your account permissions.';
        }
        
        const uploadDuration = Date.now() - fileUploadStartTime;
        
        logger.error('File upload failed', {
          fileName: file.name,
          filePath,
          fileSize: file.size,
          uploadDuration,
          errorType: typeof e,
          errorMessage,
          originalError: e
        });
        
        setSelectedFiles(prev => prev.map(sf => 
          sf.id === assetFile.id ? { ...sf, uploading: false, uploadError: errorMessage } : sf
        ));
        
        errorCount++;
      }
    }

    const totalUploadDuration = Date.now() - uploadStartTime;

    // Show final upload results
    if (successCount > 0 && errorCount === 0) {
      addToast('success', 'Upload Complete', `All ${successCount} file(s) uploaded successfully!`);
      logger.info('Upload process completed successfully', { 
        successCount, 
        totalDuration: totalUploadDuration,
        averageTimePerFile: totalUploadDuration / successCount
      });
    } else if (successCount > 0 && errorCount > 0) {
      addToast('warning', 'Upload Partially Complete', `${successCount} file(s) uploaded successfully, ${errorCount} failed.`);
      logger.warn('Upload process partially completed', { 
        successCount, 
        errorCount, 
        totalDuration: totalUploadDuration 
      });
    } else if (errorCount > 0) {
      addToast('error', 'Upload Failed', `All ${errorCount} file(s) failed to upload. Please check the errors and try again.`);
      logger.error('Upload process failed completely', { 
        errorCount, 
        totalDuration: totalUploadDuration 
      });
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

    logger.info('Asset groups created', { 
      groupCount: assetGroups.length,
      groups: assetGroups.map(g => ({
        baseName: g.baseName,
        assetCount: g.assets.length,
        aspectRatios: g.aspectRatios
      }))
    });

    if (uploadedAssets.length > 0) {
      onAssetsUploaded(assetGroups);
      setSelectedFiles([]);
      setIsProcessing(false);
      logger.info('Assets uploaded callback completed, closing modal');
      onClose();
    } else {
      setIsProcessing(false);
      logger.warn('No assets were uploaded, keeping modal open');
    }
  };

  // Log when component closes
  const handleClose = () => {
    logger.info('PowerBriefAssetUpload closed', { 
      hadSelectedFiles: selectedFiles.length > 0,
      selectedFileCount: selectedFiles.length
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Upload Creative Assets</h2>
          <button 
            onClick={handleClose} 
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close upload modal"
            title="Close upload modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Toast notifications */}
        {toasts.length > 0 && (
          <div className="mb-4 max-h-32 overflow-y-auto">
            {toasts.map(toast => (
              <Toast key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
          </div>
        )}

        {/* Upload Limits and Guidelines */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2 flex items-center">
            <Info className="h-4 w-4 mr-2" />
            Upload Guidelines & Limits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-medium mb-1">File Requirements:</h4>
              <ul className="space-y-1">
                <li>• Maximum file size: <strong>200MB</strong></li>
                <li>• Images: JPG, PNG, GIF, WebP</li>
                <li>• Videos: MP4, MOV, AVI</li>
                <li>• Multiple files supported</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-1">Naming Convention:</h4>
              <ul className="space-y-1">
                <li>• Use: &ldquo;ConceptName_4x5_v1.jpg&rdquo;</li>
                <li>• Include aspect ratios: 4x5, 9x16, 1x1, 16x9</li>
                <li>• Version numbers: v1, v2, v3</li>
                <li>• Upload multiple versions per concept</li>
              </ul>
            </div>
          </div>
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
          <p className="text-sm text-gray-500 mb-2">
            Upload images and videos for your concept variations
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Maximum 200MB per file • JPG, PNG, GIF, MP4, MOV, AVI
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
                      {file.uploadError && (
                        <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={file.uploadError}>
                          Error: {file.uploadError}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.uploading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    {file.supabaseUrl && <Check className="h-4 w-4 text-green-500" />}
                    {file.uploadError && <AlertCircle className="h-4 w-4 text-red-500" />}
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
            onClick={handleClose}
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