"use client";
import React, { useState, useCallback, ChangeEvent } from 'react';
import { X, UploadCloud, Check, Trash2, Loader2, FileVideo, FileImage, AlertCircle, Info, Zap } from 'lucide-react';
import { createSPAClient } from '@/lib/supabase/client';
import AssetGroupingPreview from './PowerBriefAssetGroupingPreview';
import { UploadedAssetGroup, UploadedAsset } from '@/lib/types/powerbrief';
import { needsCompression, compressVideoWithQuality, getFileSizeMB } from '@/lib/utils/videoCompression';
import { generateThumbnailsForAssetGroups } from '@/lib/utils/automaticThumbnailGeneration';

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
  uploadProgress?: number; // Upload progress (0-100)
  uploadError?: string | null;
  supabaseUrl?: string;
  detectedRatio?: string | null;
  baseName?: string;
  groupKey?: string;
  compressing?: boolean;
  compressionProgress?: number;
  needsCompression?: boolean;
  originalSize?: number;
  thumbnailBlob?: Blob;
  thumbnailUrl?: string;
  thumbnailExtracted?: boolean;
  videoDimensions?: { width: number; height: number }; // Video dimensions
  // Add thumbnail selection properties
  selectedThumbnailTimestamp?: number;
  customThumbnailBlob?: Blob; // For manually selected thumbnails
  hasCustomThumbnail?: boolean;
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

const ASPECT_RATIO_IDENTIFIERS = ['4x5', '9x16'];
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

  // Look for aspect ratio identifiers at the end (right before extension)
  let detectedRatio: string | null = null;
  let baseNameWithoutRatio = nameWorkInProgress;
  
  for (const id of ASPECT_RATIO_IDENTIFIERS) {
    const patternsToTest = [
      `_${id}`,
      `-${id}`
    ];
    
    for (const pattern of patternsToTest) {
      if (nameWorkInProgress.endsWith(pattern)) {
        detectedRatio = id;
        baseNameWithoutRatio = nameWorkInProgress.substring(0, nameWorkInProgress.length - pattern.length).trim();
        logger.debug('Found aspect ratio at end', { pattern, detectedRatio, baseNameWithoutRatio });
        break;
      }
    }
    if (detectedRatio) break;
  }
  logger.debug('Aspect ratio detection result', { detectedRatio, baseNameWithoutRatio });

  // Extract version information (v1, v2, v3, etc.) from the remaining name
  let version: string | null = null;
  let finalBaseName = baseNameWithoutRatio;
  const versionPatterns = ['_v1', '_v2', '_v3', '_v4', '_v5', '-v1', '-v2', '-v3', '-v4', '-v5'];
  for (const versionPattern of versionPatterns) {
    if (baseNameWithoutRatio.endsWith(versionPattern)) {
      version = versionPattern.substring(1); // Remove the _ or - prefix
      finalBaseName = baseNameWithoutRatio.substring(0, baseNameWithoutRatio.length - versionPattern.length).trim();
      logger.debug('Found version', { versionPattern, version, finalBaseName });
      break;
    }
  }
  logger.debug('Version detection result', { version, finalBaseName });

  // Create a group key that combines base name and version
  // This ensures assets with same version but different aspect ratios are grouped together
  let groupKey: string;
  if (version) {
    groupKey = `${finalBaseName}_${version}`;
    logger.debug('Created groupKey with version', { finalBaseName, version, groupKey });
  } else {
    groupKey = finalBaseName;
    logger.debug('Created groupKey without version', { groupKey });
  }
  
  const result = { 
    baseName: finalBaseName.trim(), 
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

// Function to extract first frame from video as thumbnail (client-side)
const extractVideoThumbnail = async (videoFile: File): Promise<{ thumbnailBlob: Blob; error?: string }> => {
  return new Promise((resolve) => {
    try {
      logger.debug('Extracting thumbnail from video', { fileName: videoFile.name });
      
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve({ thumbnailBlob: new Blob(), error: 'Could not create canvas context' });
        return;
      }
      
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';
      
      const videoUrl = URL.createObjectURL(videoFile);
      
      video.addEventListener('loadedmetadata', () => {
        clearTimeout(timeout);
        
        // Calculate thumbnail dimensions - use a standard size that Meta can handle well
        // Aim for 1280x720 (16:9) or similar standard dimensions
        const maxWidth = 1280;
        const maxHeight = 720;
        let thumbWidth = video.videoWidth;
        let thumbHeight = video.videoHeight;
        
        // Scale down if video is too large
        if (thumbWidth > maxWidth || thumbHeight > maxHeight) {
          const ratio = Math.min(maxWidth / thumbWidth, maxHeight / thumbHeight);
          thumbWidth = Math.round(thumbWidth * ratio);
          thumbHeight = Math.round(thumbHeight * ratio);
        }
        
        // Ensure even dimensions (some encoders prefer this)
        thumbWidth = thumbWidth % 2 === 0 ? thumbWidth : thumbWidth - 1;
        thumbHeight = thumbHeight % 2 === 0 ? thumbHeight : thumbHeight - 1;
        
        // Set minimum size to avoid too small images
        if (thumbWidth < 320 || thumbHeight < 180) {
          thumbWidth = 320;
          thumbHeight = 180;
        }
        
        canvas.width = thumbWidth;
        canvas.height = thumbHeight;
        
        logger.debug('Thumbnail dimensions calculated', {
          fileName: videoFile.name,
          originalDimensions: `${video.videoWidth}x${video.videoHeight}`,
          thumbnailDimensions: `${thumbWidth}x${thumbHeight}`
        });
        
        // Seek to 1 second instead of 0 to avoid black frames
        video.currentTime = Math.min(1.0, video.duration * 0.1); // 10% into video or 1 second, whichever is smaller
      });
      
      video.addEventListener('seeked', () => {
        try {
          // Clear canvas first
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw video frame to canvas with high quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert canvas to blob with high quality JPEG
          canvas.toBlob((blob) => {
            if (blob && blob.size > 0) {
              logger.debug('Thumbnail extracted successfully', { 
                fileName: videoFile.name,
                thumbnailSize: blob.size,
                thumbnailSizeKB: (blob.size / 1024).toFixed(2),
                dimensions: `${canvas.width}x${canvas.height}`
              });
              resolve({ thumbnailBlob: blob });
            } else {
              logger.error('Empty thumbnail blob generated', { fileName: videoFile.name });
              resolve({ thumbnailBlob: new Blob(), error: 'Generated thumbnail is empty' });
            }
            
            // Clean up
            URL.revokeObjectURL(videoUrl);
            video.remove();
            canvas.remove();
          }, 'image/jpeg', 0.95); // Higher quality JPEG
          
        } catch (error) {
          logger.error('Error drawing video frame', { fileName: videoFile.name, error });
          resolve({ thumbnailBlob: new Blob(), error: `Frame extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
          
          // Clean up
          URL.revokeObjectURL(videoUrl);
          video.remove();
          canvas.remove();
        }
      });
      
      video.addEventListener('error', (e) => {
        logger.error('Video load error during thumbnail extraction', { fileName: videoFile.name, error: e });
        resolve({ thumbnailBlob: new Blob(), error: 'Could not load video for thumbnail extraction' });
        
        // Clean up
        URL.revokeObjectURL(videoUrl);
        video.remove();
        canvas.remove();
      });
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        logger.error('Thumbnail extraction timeout', { fileName: videoFile.name });
        resolve({ thumbnailBlob: new Blob(), error: 'Thumbnail extraction timed out' });
        
        // Clean up
        URL.revokeObjectURL(videoUrl);
        video.remove();
        canvas.remove();
      }, 30000); // 30 second timeout
      
      video.src = videoUrl;
      video.load();
      
    } catch (error) {
      logger.error('Thumbnail extraction setup failed', { fileName: videoFile.name, error });
      resolve({ thumbnailBlob: new Blob(), error: `Thumbnail extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  });
};

// Function to check video dimensions
const getVideoDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('video/')) {
      resolve(null);
      return;
    }

    const video = document.createElement('video');
    const videoUrl = URL.createObjectURL(file);
    
    video.addEventListener('loadedmetadata', () => {
      clearTimeout(timeout);
      const dimensions = {
        width: video.videoWidth,
        height: video.videoHeight
      };
      URL.revokeObjectURL(videoUrl);
      video.remove();
      resolve(dimensions);
    });
    
    video.addEventListener('error', () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(videoUrl);
      video.remove();
      resolve(null);
    });
    
    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(videoUrl);
      video.remove();
      resolve(null);
    }, 10000); // 10 second timeout
    
    video.src = videoUrl;
    video.load();
  });
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

  const handleFiles = async (files: FileList) => {
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
      
      // Check video dimensions if it's a video file
      let videoDimensions = null;
      if (file.type.startsWith('video/')) {
        videoDimensions = await getVideoDimensions(file);
        if (videoDimensions) {
          logger.debug('Video dimensions checked', { 
            fileName: file.name, 
            width: videoDimensions.width, 
            height: videoDimensions.height 
          });
          
          if (videoDimensions.width < 1200) {
            const error = `Video width ${videoDimensions.width}px is below the minimum 1200px required for Meta ads`;
            errors.push(`${file.name}: ${error}`);
            logger.warn('Video rejected - width too small', { 
              fileName: file.name, 
              width: videoDimensions.width,
              minWidth: 1200
            });
            continue;
          }
        } else {
          logger.warn('Could not determine video dimensions', { fileName: file.name });
        }
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
        supabaseUrl: null,
        // Add compression detection
        needsCompression: needsCompression(file),
        originalSize: file.size,
        compressing: false,
        compressionProgress: 0,
        thumbnailBlob: undefined,
        thumbnailUrl: undefined,
        thumbnailExtracted: false,
        videoDimensions,
        // Add thumbnail selection properties
        selectedThumbnailTimestamp: undefined,
        customThumbnailBlob: undefined,
        hasCustomThumbnail: false
      };
      
      newFiles.push(assetFile);
      logger.debug('File added to queue', { 
        fileName: file.name, 
        baseName, 
        detectedRatio,
        fileId: assetFile.id,
        needsCompression: assetFile.needsCompression,
        fileSize: getFileSizeMB(file).toFixed(2) + 'MB',
        videoDimensions
      });
    }
    
    // Show errors if any
    if (errors.length > 0) {
      addToast('error', 'File Validation Errors', errors.join('\n'));
      logger.error('File validation errors occurred', { errors });
    }
    
    // Show success message for valid files
    if (newFiles.length > 0) {
      const compressionCount = newFiles.filter(f => f.needsCompression).length;
      let message = `${newFiles.length} file(s) added successfully.`;
      if (compressionCount > 0) {
        message += ` ${compressionCount} video(s) over 500MB will be automatically compressed.`;
      }
      
      addToast('success', 'Files Added', message);
      logger.info('Files successfully added to queue', { 
        addedCount: newFiles.length,
        totalInQueue: selectedFiles.length + newFiles.length,
        compressionCount
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
    logger.info('handleConfirmGrouping called', {
      updatedGroupsCount: updatedGroups.length,
      groups: updatedGroups.map(g => ({
        baseName: g.baseName,
        assetCount: g.assets.length,
        assetIds: g.assets.map(a => a.id)
      }))
    });

    // Convert back to our internal format and update selectedFiles
    const updatedFiles: AssetFile[] = [];
    
    updatedGroups.forEach((group) => {
      // Use the user-set group name (baseName) as the shared group key
      const sharedGroupKey = group.baseName;
      
      group.assets.forEach(asset => {
        const originalFile = selectedFiles.find(f => f.id === asset.id);
        if (originalFile) {
          updatedFiles.push({
            ...originalFile,
            baseName: originalFile.baseName, // Keep original baseName for display
            groupKey: sharedGroupKey // All files in this group get the user's custom group name
          });
        }
      });
    });
    
    logger.info('Updated files with manual grouping', {
      updatedFilesCount: updatedFiles.length,
      files: updatedFiles.map(f => ({
        id: f.id,
        name: f.file.name,
        baseName: f.baseName,
        groupKey: f.groupKey
      }))
    });

    // Close the preview modal first
    setShowGroupingPreview(false);
    
    // Process and upload with the updated files directly
    processAndUploadWithFiles(updatedFiles);
  };

  const processAndUploadWithFiles = async (filesToUpload: AssetFile[]) => {
    if (filesToUpload.length === 0) {
      logger.warn('Upload attempted with no files selected');
      return;
    }

    logger.info('Starting upload process', { 
      fileCount: filesToUpload.length,
      conceptId,
      userId,
      files: filesToUpload.map(f => ({
        name: f.file.name,
        size: f.file.size,
        type: f.file.type,
        baseName: f.baseName,
        groupKey: f.groupKey,
        detectedRatio: f.detectedRatio,
        needsCompression: f.needsCompression
      }))
    });

    // Create a map to preserve manual grouping through the upload process
    const manualGroupingMap: Record<string, string> = {};
    filesToUpload.forEach(file => {
      // Use groupKey if it exists (set by manual grouping), otherwise use baseName
      const groupIdentifier = file.groupKey || file.baseName || file.file.name;
      manualGroupingMap[file.id] = groupIdentifier;
    });
    logger.info('Manual grouping map created', { manualGroupingMap });

    setIsProcessing(true);
    setSelectedFiles(prevFiles => prevFiles.map(sf => ({ ...sf, uploading: true, uploadProgress: 0, uploadError: null })));

    const supabase = createSPAClient();
    const uploadedAssets: UploadedAsset[] = [];
    let successCount = 0;
    let errorCount = 0;
    const uploadStartTime = Date.now();

    addToast('info', 'Upload Started', `Starting upload of ${filesToUpload.length} file(s)...`);

    // Step 1: Extract thumbnails for videos
    logger.info('Step 1: Extracting video thumbnails...');
    for (const assetFile of filesToUpload) {
      if (assetFile.file.type.startsWith('video/')) {
        try {
          logger.info(`Extracting thumbnail for video: ${assetFile.file.name}`);
          
          const { thumbnailBlob, error } = await extractVideoThumbnail(assetFile.file);
          
          if (error) {
            logger.warn(`Could not extract thumbnail for ${assetFile.file.name}: ${error}`);
            // Continue without thumbnail - the server will handle fallback
          } else {
            // Update the asset file with thumbnail data
            setSelectedFiles(prev => prev.map(sf => 
              sf.id === assetFile.id 
                ? { ...sf, thumbnailBlob, thumbnailExtracted: true }
                : sf
            ));
            logger.info(`Thumbnail extracted for ${assetFile.file.name}`);
          }
        } catch (thumbnailError) {
          logger.warn(`Thumbnail extraction failed for ${assetFile.file.name}:`, thumbnailError);
          // Continue without thumbnail
        }
      }
    }

    // Step 2: Compress videos that need compression
    logger.info('Step 2: Compressing videos...');
    const filesToProcess: AssetFile[] = [];
    for (const assetFile of filesToUpload) {
      if (assetFile.needsCompression) {
        try {
          logger.info(`Compressing ${assetFile.file.name} (${getFileSizeMB(assetFile.file).toFixed(2)}MB)`);
          
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

          logger.info(`Compression complete: ${getFileSizeMB(assetFile.file).toFixed(2)}MB → ${getFileSizeMB(compressedFile).toFixed(2)}MB`);

        } catch (compressionError) {
          logger.error(`Video compression failed for ${assetFile.file.name}:`, compressionError);
          addToast('error', 'Compression Failed', `Failed to compress ${assetFile.file.name}. ${compressionError instanceof Error ? compressionError.message : 'Unknown error'}`);
          
          // Add original file to processing queue anyway
          filesToProcess.push(assetFile);
        }
      } else {
        // No compression needed, add to processing queue
        filesToProcess.push(assetFile);
      }
    }

    // Step 3: Upload all files (videos and their thumbnails)
    logger.info('Step 3: Uploading files...');
    for (const assetFile of filesToProcess) {
      const fileUploadStartTime = Date.now();
      
      try {
        // Upload the main file (video or image)
        const timestamp = Date.now();
        const filePath = `${conceptId}/${timestamp}_${assetFile.file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
        
        logger.debug('Uploading main file', { 
          fileName: assetFile.file.name,
          filePath,
          fileSize: assetFile.file.size,
          fileType: assetFile.file.type
        });

        // Simulate upload progress
        const updateProgress = (progress: number) => {
          setSelectedFiles(prev => prev.map(sf => 
            sf.id === assetFile.id ? { ...sf, uploadProgress: progress } : sf
          ));
        };

        updateProgress(10); // Starting upload
        await new Promise(resolve => setTimeout(resolve, 200)); // Small delay

        updateProgress(25); // Preparing file
        await new Promise(resolve => setTimeout(resolve, 100));

        const { data, error } = await supabase.storage
          .from('ad-creatives')
          .upload(filePath, assetFile.file, {
            cacheControl: '3600',
            upsert: false,
          });

        updateProgress(60); // Main file uploaded
        await new Promise(resolve => setTimeout(resolve, 150));

        if (error) {
          const errorMessage = `Upload failed: ${error.message}`;
          logger.error('Main file upload failed', { fileName: assetFile.file.name, error });
          setSelectedFiles(prev => prev.map(sf => 
            sf.id === assetFile.id ? { ...sf, uploading: false, uploadError: errorMessage } : sf
          ));
          errorCount++;
          continue;
        }

        if (data) {
          updateProgress(70); // Getting public URL
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const { data: { publicUrl } } = supabase.storage.from('ad-creatives').getPublicUrl(filePath);
          
          if (!publicUrl) {
            const error = 'Could not get public URL for uploaded file.';
            logger.error('Failed to get public URL', { fileName: assetFile.file.name, filePath });
            throw new Error(error);
          }

          updateProgress(80); // Processing thumbnail
          await new Promise(resolve => setTimeout(resolve, 100));

          const uploadedAsset: UploadedAsset & { thumbnailUrl?: string } = {
            id: assetFile.id,
            name: assetFile.file.name,
            supabaseUrl: publicUrl,
            type: assetFile.file.type.startsWith('image/') ? 'image' : 'video',
            aspectRatio: assetFile.detectedRatio || 'unknown',
            baseName: assetFile.groupKey || assetFile.baseName || assetFile.file.name,
            uploadedAt: new Date().toISOString()
          };

          // Upload thumbnail if it exists (for videos)
          if (assetFile.thumbnailBlob && assetFile.thumbnailBlob.size > 0) {
            try {
              const thumbnailFileName = `${assetFile.file.name.split('.')[0]}_thumbnail.jpg`;
              const thumbnailPath = `${conceptId}/${timestamp}_${thumbnailFileName}`;
              
              logger.debug('Uploading video thumbnail', { 
                videoFileName: assetFile.file.name,
                thumbnailPath,
                thumbnailSize: assetFile.thumbnailBlob.size
              });

              const { data: thumbnailData, error: thumbnailError } = await supabase.storage
                .from('ad-creatives')
                .upload(thumbnailPath, assetFile.thumbnailBlob, {
                  cacheControl: '3600',
                  upsert: false,
                });

              if (thumbnailError) {
                logger.warn('Thumbnail upload failed', { 
                  videoFileName: assetFile.file.name, 
                  error: thumbnailError 
                });
              } else if (thumbnailData) {
                const { data: { publicUrl: thumbnailPublicUrl } } = supabase.storage
                  .from('ad-creatives')
                  .getPublicUrl(thumbnailPath);
                
                if (thumbnailPublicUrl) {
                  // Add thumbnail info to the uploaded asset
                  uploadedAsset.thumbnailUrl = thumbnailPublicUrl;
                  logger.info('Video thumbnail uploaded successfully', { 
                    videoFileName: assetFile.file.name,
                    thumbnailUrl: thumbnailPublicUrl
                  });
                }
              }
            } catch (thumbnailUploadError) {
              logger.warn('Thumbnail upload error', { 
                videoFileName: assetFile.file.name, 
                error: thumbnailUploadError 
              });
              // Continue without thumbnail
            }
          }

          updateProgress(95); // Finalizing
          await new Promise(resolve => setTimeout(resolve, 100));

          updateProgress(100); // Complete

          uploadedAssets.push(uploadedAsset);

          setSelectedFiles(prev => prev.map(sf => 
            sf.id === assetFile.id ? { ...sf, uploading: false, uploadProgress: 100, supabaseUrl: publicUrl } : sf
          ));
          
          const uploadDuration = Date.now() - fileUploadStartTime;
          successCount++;

          logger.info('File upload successful', { 
            fileName: assetFile.file.name,
            publicUrl,
            uploadDuration,
            fileSize: assetFile.file.size,
            uploadSpeed: (assetFile.file.size / 1024 / 1024) / (uploadDuration / 1000), // MB/s
            wasCompressed: assetFile.originalSize && assetFile.originalSize !== assetFile.file.size,
            hasThumbnail: !!(assetFile.thumbnailBlob && assetFile.thumbnailBlob.size > 0),
            groupKey: assetFile.groupKey,
            baseName: assetFile.baseName,
            uploadedAssetBaseName: uploadedAsset.baseName
          });
        }

      } catch (e: unknown) {
        const uploadError = e as Error | { message: string } | string;
        const errorMessage = typeof uploadError === 'string' ? uploadError : (uploadError as Error)?.message || 'Upload failed';
        const filePath = `${conceptId}/${Date.now()}_${assetFile.file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
        
        logger.error('File upload failed', { 
          fileName: assetFile.file.name,
          fileSize: assetFile.file.size,
          filePath,
          error: uploadError,
          errorMessage
        });

        setSelectedFiles(prev => prev.map(sf => 
          sf.id === assetFile.id ? { ...sf, uploading: false, uploadError: errorMessage } : sf
        ));
        
        errorCount++;
        const uploadDuration = Date.now() - fileUploadStartTime;

        logger.error('File upload error', { 
          fileName: assetFile.file.name,
          errorMessage,
          uploadDuration,
          fileSize: assetFile.file.size
        });
      }
    }

    // Rest of the upload completion logic remains the same...
    const totalDuration = Date.now() - uploadStartTime;
    
    logger.info('Upload process completed', { 
      totalDuration,
      successCount,
      errorCount,
      totalFiles: filesToUpload.length,
      uploadedAssets: uploadedAssets.length
    });

    if (successCount > 0) {
      addToast('success', 'Upload Complete', `Successfully uploaded ${successCount} file(s).`);
    }
    
    if (errorCount > 0) {
      addToast('error', 'Upload Errors', `${errorCount} file(s) failed to upload. Check individual file errors below.`);
    }

    // Group uploaded assets by their groupKey/baseName for the callback
    const assetGroups: AssetGroup[] = [];
    const groupsByGroupKey: Record<string, UploadedAsset[]> = {};

    logger.info('Creating final asset groups from uploaded assets', {
      uploadedAssetsCount: uploadedAssets.length,
      uploadedAssets: uploadedAssets.map(a => ({
        id: a.id,
        name: a.name,
        baseName: a.baseName
      })),
      manualGroupingMap
    });

    uploadedAssets.forEach(asset => {
      // Use the manual grouping if available, otherwise use the baseName
      const groupKey = manualGroupingMap[asset.id] || asset.baseName;
      logger.debug('Grouping asset', {
        assetId: asset.id,
        assetName: asset.name,
        manualGroup: manualGroupingMap[asset.id],
        baseName: asset.baseName,
        finalGroupKey: groupKey
      });
      
      if (!groupsByGroupKey[groupKey]) {
        groupsByGroupKey[groupKey] = [];
      }
      groupsByGroupKey[groupKey].push(asset);
    });

    Object.entries(groupsByGroupKey).forEach(([groupKey, assets]) => {
      assetGroups.push({
        baseName: groupKey,
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
      try {
        onAssetsUploaded(assetGroups);
        
        // Automatically generate thumbnails for any video assets that were uploaded
        try {
          console.log('[PowerBriefAssetUpload] Starting automatic thumbnail generation...');
          
          // Convert asset groups to the format expected by the thumbnail utility
          const assetGroupsForThumbnails = assetGroups.map(group => ({
            baseName: group.baseName,
            assets: group.assets.map(asset => ({
              id: asset.id,
              name: asset.name,
              supabaseUrl: asset.supabaseUrl,
              type: asset.type
            }))
          }));
          
          const thumbnailResult = await generateThumbnailsForAssetGroups(
            assetGroupsForThumbnails, 
            conceptId
          );
          
          if (thumbnailResult.processed > 0) {
            addToast('success', 'Thumbnails Generated', 
              `Automatically generated ${thumbnailResult.processed} video thumbnails.`);
            logger.info('Automatic thumbnail generation completed', { 
              processed: thumbnailResult.processed,
              total: thumbnailResult.total,
              errors: thumbnailResult.errors.length
            });
          }
          
          if (thumbnailResult.errors.length > 0) {
            addToast('warning', 'Thumbnail Generation Issues', 
              `${thumbnailResult.errors.length} thumbnails failed to generate. Videos uploaded successfully.`);
            logger.warn('Some thumbnail generation errors occurred', { 
              errors: thumbnailResult.errors 
            });
          }
          
        } catch (thumbnailError) {
          logger.error('Automatic thumbnail generation failed', thumbnailError);
          addToast('warning', 'Thumbnail Generation Failed', 
            'Videos uploaded successfully, but thumbnail generation failed. You can generate them manually later.');
        }
        
        setSelectedFiles([]);
        logger.info('Assets uploaded callback completed, closing modal');
        onClose();
      } catch (callbackError) {
        logger.error('onAssetsUploaded callback failed', callbackError);
        addToast('error', 'Upload Error', 'Failed to complete the upload process. Please try again.');
        setSelectedFiles([]);
      } finally {
        setIsProcessing(false);
      }
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
                <li>• Use: &ldquo;ConceptName_v1_4x5.mp4&rdquo;</li>
                <li>• Include aspect ratios: 4x5, 9x16 (before file extension)</li>
                <li>• Version numbers: v1, v2, v3 (before aspect ratio)</li>
                <li>• Examples: ProductDemo_v1_4x5.mp4, ProductDemo_v1_9x16.mp4</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Auto-Compression Information Banner */}
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start">
            <Zap size={20} className="text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-800 mb-1">
                Smart Auto-Compression
              </h4>
              <p className="text-sm text-blue-700 mb-2">
                Videos over 500MB are automatically compressed during upload to ensure successful processing and Meta compatibility.
                Files under 500MB will maintain original quality.
                <span className="block text-xs mt-1 text-blue-600">⚡ Balanced compression - optimized for quality while maintaining reasonable file sizes</span>
              </p>
              <p className="text-xs text-amber-600">
                💡 <strong>Pro Tip:</strong> Our compression balances quality and file size for optimal Meta compatibility.
              </p>
            </div>
          </div>
        </div>

        {/* Large Files Detected Banner */}
        {selectedFiles.some(f => f.needsCompression) && (
          <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-start">
              <Zap size={20} className="text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-orange-800 mb-1">
                  Large Assets Detected - Auto-Compression Enabled
                </h4>
                <p className="text-sm text-orange-700 mb-2">
                  {selectedFiles.filter(f => f.needsCompression).length} video(s) over 500MB will be automatically compressed during upload.
                  <span className="block text-xs mt-1 text-orange-600">⚡ Balanced compression - optimized for quality while maintaining reasonable file sizes</span>
                </p>
                <p className="text-xs text-orange-600">
                  ⚡ Compression will happen automatically when you upload - no action needed!
                </p>
              </div>
            </div>
          </div>
        )}

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
          <div className="mb-4 mx-auto max-w-lg bg-amber-50 border border-amber-200 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Meta Video Requirements</h3>
                <p className="mt-1 text-xs text-amber-700">
                  Videos must have a minimum width of <strong>1200px</strong> for Meta ads. 
                  Recommended sizes: 1200x1500 (4:5) or 1200x2133 (9:16).
                </p>
              </div>
            </div>
          </div>
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
                <div key={file.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  file.needsCompression && !file.compressing && !file.uploadError
                    ? 'bg-amber-50 border-amber-200'
                    : file.compressing
                      ? 'bg-blue-50 border-blue-200'
                      : file.originalSize && file.originalSize !== file.file.size
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    {file.file.type.startsWith('image/') ? (
                      <FileImage className="h-5 w-5 text-blue-500" />
                    ) : (
                      <FileVideo className="h-5 w-5 text-purple-500" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">{file.file.name}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
                        <span>Base: {file.baseName}</span>
                        {file.detectedRatio && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                            {file.detectedRatio}
                          </span>
                        )}
                        <span>{getFileSizeMB(file.file).toFixed(2)} MB</span>
                        {file.videoDimensions && (
                          <span className={`px-2 py-1 rounded ${
                            file.videoDimensions.width < 1200 
                              ? 'bg-red-100 text-red-700 font-semibold' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {file.videoDimensions.width}x{file.videoDimensions.height}
                            {file.videoDimensions.width < 1200 && ' ⚠️'}
                          </span>
                        )}
                      </div>
                      
                      {/* Status indicators */}
                      <div className="flex items-center flex-wrap gap-2">
                        {file.needsCompression && !file.compressing && !file.uploadError && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <Zap size={12} className="mr-1" />
                            Will auto-compress (over 500MB)
                          </span>
                        )}
                        
                        {file.compressing && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Loader2 size={12} className="animate-spin mr-1" />
                            Compressing... {file.compressionProgress || 0}%
                          </span>
                        )}
                        
                        {file.originalSize && file.originalSize !== file.file.size && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Compressed: {getFileSizeMB(file.file).toFixed(1)}MB 
                            (was {(file.originalSize / (1024 * 1024)).toFixed(1)}MB)
                          </span>
                        )}
                        
                        {!file.needsCompression && !file.originalSize && file.file.type.startsWith('video/') && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Under 500MB - No compression needed
                          </span>
                        )}
                        
                        {file.uploading && !file.compressing && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Loader2 size={12} className="animate-spin mr-1" />
                            Uploading... {file.uploadProgress || 0}%
                          </span>
                        )}
                        
                        {file.supabaseUrl && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Uploaded successfully
                          </span>
                        )}
                      </div>
                      
                      {file.compressing && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${file.compressionProgress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {file.uploading && !file.compressing && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${file.uploadProgress || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
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