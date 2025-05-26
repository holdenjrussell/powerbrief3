"use client";
import React, { useState, useCallback, ChangeEvent } from 'react';
import { X, UploadCloud, Check, Trash2, Loader2, FileVideo, FileImage, AlertCircle, Info } from 'lucide-react';
import { createSPAClient } from '@/lib/supabase/client';
import AssetGroupingPreview from './PowerBriefAssetGroupingPreview';
import { UploadedAssetGroup, UploadedAsset } from '@/lib/types/powerbrief';

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
  groupKey?: string;
}

interface UploadedAsset {
  id: string;
  name: string;
  supabaseUrl: string;
  type: 'image' | 'video';
  aspectRatio: string;
  baseName: string;
  groupKey: string;
}

interface AssetGroup {
  baseName: string;
  assets: UploadedAsset[];
  aspectRatios: string[];
}

interface UploadedAssetGroup {
  baseName: string;
  assets: UploadedAsset[];
  aspectRatios: string[];
  uploadedAt: string;
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
const KNOWN_FILENAME_SUFFIXES_TO_REMOVE = ['_compressed', '-compressed', '_comp', '-comp'];
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB in bytes (increased from 200MB)
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime', 'video/x-msvideo'];

// Helper function to extract base name, aspect ratio, and version from filename
const getBaseNameRatioAndVersion = (filename: string): { baseName: string; detectedRatio: string | null; version: string | null; groupKey: string } => {
  logger.debug('Parsing filename', { filename });
  
  let nameWorkInProgress = filename.substring(0, filename.lastIndexOf('.')) || filename;
  logger.debug('After removing extension', { nameWorkInProgress });
  
  // Remove known trailing suffixes first
  for (const suffix of KNOWN_FILENAME_SUFFIXES_TO_REMOVE) {
    if (nameWorkInProgress.endsWith(suffix)) {
      nameWorkInProgress = nameWorkInProgress.substring(0, nameWorkInProgress.length - suffix.length);
      logger.debug('Removed suffix from filename', { suffix, newName: nameWorkInProgress });
      break; 
    }
  }

  // Extract version information (v1, v2, v3, etc.)
  let version: string | null = null;
  const versionPatterns = ['_v1', '_v2', '_v3', '_v4', '_v5', '-v1', '-v2', '-v3', '-v4', '-v5'];
  for (const versionPattern of versionPatterns) {
    if (nameWorkInProgress.includes(versionPattern)) {
      version = versionPattern.substring(1); // Remove the _ or - prefix
      logger.debug('Found version', { versionPattern, version });
      break;
    }
  }
  logger.debug('Version detection result', { version });

  // Look for aspect ratio identifiers
  let detectedRatio: string | null = null;
  let baseNameWithoutRatio = nameWorkInProgress;
  
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
      if (nameWorkInProgress.includes(pattern)) {
        detectedRatio = id;
        baseNameWithoutRatio = nameWorkInProgress.replace(pattern, '').trim();
        logger.debug('Found aspect ratio', { pattern, detectedRatio, baseNameWithoutRatio });
        break;
      }
    }
    if (detectedRatio) break;
  }
  logger.debug('Aspect ratio detection result', { detectedRatio, baseNameWithoutRatio });

  // Create a group key that combines base name and version
  // This ensures assets with same version but different aspect ratios are grouped together
  let groupKey: string;
  if (version) {
    // Remove version from base name to get the core concept name
    const coreBaseName = baseNameWithoutRatio.replace(new RegExp(`[_-]?${version}$`), '').trim();
    groupKey = `${coreBaseName}_${version}`;
    logger.debug('Created groupKey with version', { coreBaseName, version, groupKey });
  } else {
    groupKey = baseNameWithoutRatio;
    logger.debug('Created groupKey without version', { groupKey });
  }
  
  const result = { 
    baseName: baseNameWithoutRatio.trim(), 
    detectedRatio, 
    version,
    groupKey
  };
  logger.info('Final parsing result', { filename, result });
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
  const [showGroupingPreview, setShowGroupingPreview] = useState(false);
  const [previewGroups, setPreviewGroups] = useState<Record<string, AssetFile[]>>({});
  const [previewAssetGroups, setPreviewAssetGroups] = useState<UploadedAssetGroup[]>([]);

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
      const error = `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 1GB.`;
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
      
      const { baseName, detectedRatio, groupKey } = getBaseNameRatioAndVersion(file.name);
      
      const assetFile: AssetFile = {
        id: crypto.randomUUID(),
        file,
        baseName,
        detectedRatio,
        groupKey,
        uploading: false,
        uploadError: null,
        supabaseUrl: null
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

  const showGroupingPreviewModal = () => {
    // Group files by their groupKey to show preview
    const groups: Record<string, AssetFile[]> = {};
    selectedFiles.forEach(file => {
      const groupKey = file.groupKey || file.baseName || 'ungrouped';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(file);
    });
    
    // Convert to UploadedAssetGroup format for the preview component
    const assetGroups: UploadedAssetGroup[] = Object.entries(groups).map(([groupKey, files]) => ({
      baseName: groupKey,
      assets: files.map(file => ({
        id: file.id,
        name: file.file.name,
        supabaseUrl: URL.createObjectURL(file.file), // Create temporary URL for preview
        type: file.file.type.startsWith('image/') ? 'image' as const : 'video' as const,
        aspectRatio: file.detectedRatio || 'unknown',
        baseName: file.baseName || file.file.name,
        uploadedAt: new Date().toISOString()
      })),
      aspectRatios: [...new Set(files.map(f => f.detectedRatio).filter(Boolean))],
      uploadedAt: new Date().toISOString()
    }));
    
    setPreviewGroups(groups);
    setPreviewAssetGroups(assetGroups);
    setShowGroupingPreview(true);
    
    logger.info('Showing grouping preview', { 
      groupCount: Object.keys(groups).length,
      groups: Object.entries(groups).map(([key, files]) => ({
        groupKey: key,
        fileCount: files.length,
        files: files.map(f => f.file.name)
      }))
    });
  };

  const handleConfirmGrouping = (updatedGroups: UploadedAssetGroup[]) => {
    // Convert back to our internal format and update selectedFiles
    const updatedFiles: AssetFile[] = [];
    
    updatedGroups.forEach(group => {
      group.assets.forEach(asset => {
        const originalFile = selectedFiles.find(f => f.id === asset.id);
        if (originalFile) {
          updatedFiles.push({
            ...originalFile,
            baseName: asset.baseName,
            groupKey: group.baseName
          });
        }
      });
    });
    
    setSelectedFiles(updatedFiles);
    setShowGroupingPreview(false);
    
    // Proceed with upload using the updated grouping
    processAndUpload();
  };

  const proceedWithUpload = () => {
    setShowGroupingPreview(false);
    processAndUpload();
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
        // For very large files (>50MB), use API route upload to bypass client limits
        const isVeryLargeFile = file.size > 50 * 1024 * 1024; // 50MB threshold
        
        // Use direct Supabase upload for all files to bypass Vercel limits
        logger.info('Using direct Supabase upload', { 
          fileName: file.name,
          fileSize: file.size 
        });
        
        // Direct upload to Supabase Storage
        const uploadResult = await supabase.storage
          .from('ad-creatives')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        const { data, error } = uploadResult;

        if (error) {
          // Enhanced error logging for debugging
          logger.error('Supabase storage upload error', { 
            fileName: file.name,
            fileSize: file.size,
            filePath,
            error: error,
            errorMessage: error.message,
            isVeryLargeFile,
            isLargeFile: file.size > 10 * 1024 * 1024
          });
          
          // Check if it's a bucket creation issue
          if (error.message?.includes('bucket') || error.message?.includes('not found')) {
            throw new Error(`Storage bucket 'ad-creatives' not found. Please contact support to set up the storage bucket.`);
          }
          
          // Check if it's a size limit issue - suggest API route for large files
          if (error.message?.includes('size') || error.message?.includes('exceeded') || error.message?.includes('Payload too large')) {
            if (file.size > 50 * 1024 * 1024) {
              throw new Error(`File too large for direct upload. Retrying with server-side upload...`);
            } else {
              throw new Error(`File size limit exceeded. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB. Please try compressing the file or contact support to increase limits.`);
            }
          }
          
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
            baseName: assetFile.baseName || file.name,
            groupKey: assetFile.groupKey || assetFile.baseName
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
            uploadSpeed: (file.size / 1024 / 1024) / (uploadDuration / 1000), // MB/s
            isLargeFile: file.size > 10 * 1024 * 1024
          });
        }
      } catch (e: unknown) {
        let errorMessage = 'Upload failed';
        let shouldRetryWithAPI = false;
        
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
        
        // Check for specific error types and provide helpful messages
        if (errorMessage.toLowerCase().includes('payload too large') || 
            errorMessage.toLowerCase().includes('413') ||
            (errorMessage.toLowerCase().includes('file') && errorMessage.toLowerCase().includes('size'))) {
          
          if (file.size > 50 * 1024 * 1024 && !errorMessage.includes('Retrying with server-side upload')) {
            shouldRetryWithAPI = true;
            errorMessage = `File too large for direct upload (${(file.size / 1024 / 1024).toFixed(2)}MB). Retrying with server-side upload...`;
          } else {
            errorMessage = `File too large. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB. Try compressing the file or contact support.`;
          }
        } else if (errorMessage.toLowerCase().includes('timeout')) {
          errorMessage = 'Upload timed out. Please try again with a smaller file or check your internet connection.';
        } else if (errorMessage.toLowerCase().includes('network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('forbidden')) {
          errorMessage = 'Permission denied. Please check your account permissions.';
        } else if (errorMessage.toLowerCase().includes('bucket')) {
          errorMessage = 'Storage bucket not configured. Please contact support.';
        }
        
        // If we should retry with API and haven't already tried it, attempt API upload
        if (shouldRetryWithAPI && file.size > 50 * 1024 * 1024) {
          // API retry removed - using direct Supabase uploads only
          logger.info('Skipping API retry - using direct uploads only', { 
            fileName: file.name,
            fileSize: file.size 
          });
        }
        
        const uploadDuration = Date.now() - fileUploadStartTime;
        
        logger.error('File upload failed', {
          fileName: file.name,
          filePath,
          fileSize: file.size,
          uploadDuration,
          errorType: typeof e,
          errorMessage,
          originalError: e,
          triedAPIRetry: shouldRetryWithAPI
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

    // Group assets by group key (which includes version)
    const assetGroups: AssetGroup[] = [];
    const groupsByGroupKey: Record<string, UploadedAsset[]> = {};

    uploadedAssets.forEach(asset => {
      const groupKey = asset.groupKey || asset.baseName; // Fallback to baseName if groupKey is missing
      if (!groupsByGroupKey[groupKey]) {
        groupsByGroupKey[groupKey] = [];
      }
      groupsByGroupKey[groupKey].push(asset);
    });

    Object.entries(groupsByGroupKey).forEach(([groupKey, assets]) => {
      assetGroups.push({
        baseName: groupKey, // Use groupKey as the display name
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
                <li>• Maximum file size: <strong>1GB</strong></li>
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
            Maximum 1GB per file • JPG, PNG, GIF, MP4, MOV, AVI
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
            onClick={showGroupingPreviewModal}
            disabled={selectedFiles.length === 0 || isProcessing}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Showing Preview...
              </>
            ) : (
              'Show Preview'
            )}
          </button>
        </div>
      </div>

      {/* Grouping Preview Modal */}
      {showGroupingPreview && (
        <AssetGroupingPreview
          isOpen={showGroupingPreview}
          onClose={() => setShowGroupingPreview(false)}
          assetGroups={previewAssetGroups}
          conceptTitle="Asset Upload Preview"
          onConfirmSend={handleConfirmGrouping}
        />
      )}
    </div>
  );
};

export default PowerBriefAssetUpload; 