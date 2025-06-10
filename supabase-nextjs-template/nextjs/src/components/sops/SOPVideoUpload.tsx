"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Play, Loader2, CheckCircle, AlertCircle, Trash2, Edit } from 'lucide-react';

interface SOPVideoUploadProps {
  sopId: string;
  onVideoUploaded?: (videoUrl: string) => void;
  onVideoRemoved?: () => void;
  isAdmin?: boolean; // Only admins can upload/remove videos
}

interface UploadProgress {
  uploading: boolean;
  progress: number;
  error?: string | null;
}

interface SOPVideo {
  id: string;
  sop_id: string;
  title: string;
  description?: string;
  video_url: string;
  file_name: string;
  original_name: string;
  file_size: number;
  duration?: number;
  uploaded_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function SOPVideoUpload({ 
  sopId, 
  onVideoUploaded, 
  onVideoRemoved,
  isAdmin = false 
}: SOPVideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    uploading: false,
    progress: 0,
    error: null
  });
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<SOPVideo | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current video on mount
  useEffect(() => {
    fetchCurrentVideo();
  }, [sopId]);

  const fetchCurrentVideo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sops/${sopId}/video`);
      const data = await response.json();
      
      if (response.ok) {
        setCurrentVideo(data.video);
      } else {
        console.error('Failed to fetch video:', data.error);
      }
    } catch (error) {
      console.error('Error fetching video:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setUploadProgress({
        uploading: false,
        progress: 0,
        error: 'Please select a video file (MP4, MOV, AVI, etc.)'
      });
      return;
    }

    // Check file size (500MB limit)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadProgress({
        uploading: false,
        progress: 0,
        error: `File too large. Maximum size is 500MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
      });
      return;
    }

    try {
      setUploadProgress({ uploading: true, progress: 0, error: null });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('sopId', sopId);
      formData.append('title', `${sopId.replace('-', ' ')} Training Video`);

      const response = await fetch('/api/sops/upload-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      setUploadProgress({
        uploading: false,
        progress: 100,
        error: null
      });

      // Refresh the current video data
      await fetchCurrentVideo();

      // Call the callback with the new video URL
      if (onVideoUploaded) {
        onVideoUploaded(result.videoUrl);
      }

      // Hide replace confirmation if it was shown
      setShowReplaceConfirm(false);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Video upload error:', error);
      setUploadProgress({
        uploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed'
      });
    }
  }, [sopId, onVideoUploaded]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // If there's already a video and user is replacing it, show confirmation
      if (currentVideo && !showReplaceConfirm) {
        setShowReplaceConfirm(true);
        return;
      }
      
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      
      // If there's already a video, show confirmation
      if (currentVideo && !showReplaceConfirm) {
        setShowReplaceConfirm(true);
        return;
      }
      
      handleFileSelect(file);
    }
  }, [currentVideo, showReplaceConfirm, handleFileSelect]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRemoveVideo = async () => {
    if (!currentVideo) return;

    try {
      const response = await fetch(`/api/sops/${sopId}/video`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove video');
      }

      // Clear current video state
      setCurrentVideo(null);

      // Call the callback
      if (onVideoRemoved) {
        onVideoRemoved();
      }
      
      setShowReplaceConfirm(false);
    } catch (error) {
      console.error('Error removing video:', error);
      // You might want to show this error to the user
    }
  };

  const confirmReplace = () => {
    const fileInput = fileInputRef.current;
    if (fileInput?.files?.[0]) {
      handleFileSelect(fileInput.files[0]);
    }
  };

  const cancelReplace = () => {
    setShowReplaceConfirm(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <Loader2 className="mx-auto h-12 w-12 text-gray-400 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Loading video...</p>
      </div>
    );
  }

  // If user is not admin and there's no video, show a message
  if (!isAdmin && !currentVideo) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <Play className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 font-medium">No training video available yet</p>
        <p className="text-gray-500 text-sm mt-1">Video content will be added soon</p>
      </div>
    );
  }

  // Show existing video
  if (currentVideo && !showReplaceConfirm) {
    return (
      <div className="space-y-4">
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <video 
            controls 
            className="w-full h-full"
            preload="metadata"
          >
            <source src={currentVideo.video_url} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        
        <div className="text-sm text-gray-600">
          <p><strong>Title:</strong> {currentVideo.title}</p>
          {currentVideo.description && (
            <p><strong>Description:</strong> {currentVideo.description}</p>
          )}
          <p><strong>Size:</strong> {(currentVideo.file_size / 1024 / 1024).toFixed(2)} MB</p>
          <p><strong>Uploaded:</strong> {new Date(currentVideo.created_at).toLocaleDateString()}</p>
        </div>
        
        {isAdmin && (
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Edit className="h-4 w-4 mr-2" />
              Replace Video
            </button>
            <button
              onClick={handleRemoveVideo}
              className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove Video
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload video file for SOP training"
            />
          </div>
        )}
      </div>
    );
  }

  // Show replace confirmation
  if (showReplaceConfirm) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-medium text-amber-900 mb-2">Replace Existing Video?</h4>
            <p className="text-amber-800 text-sm mb-4">
              This will replace the current training video. This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={confirmReplace}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
              >
                Yes, Replace
              </button>
              <button
                onClick={cancelReplace}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show upload interface
  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {uploadProgress.uploading ? (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 text-primary-600 animate-spin" />
            <div>
              <p className="text-lg font-medium text-gray-700">Uploading Video...</p>
              <p className="text-sm text-gray-500">Please wait while we process your video</p>
            </div>
          </div>
        ) : uploadProgress.progress === 100 ? (
          <div className="space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
            <div>
              <p className="text-lg font-medium text-green-700">Upload Complete!</p>
              <p className="text-sm text-green-600">Your video has been successfully uploaded</p>
            </div>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Upload Training Video
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Drag and drop a video file here, or click to browse
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!isAdmin}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Video File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={!isAdmin}
                aria-label="Select video file for SOP training upload"
              />
            </div>
            <div className="mt-4 text-xs text-gray-400">
              Supported formats: MP4, MOV, AVI • Maximum size: 500MB
            </div>
          </>
        )}
      </div>

      {/* Error Display */}
      {uploadProgress.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-red-900 mb-1">Upload Error</h4>
              <p className="text-red-800 text-sm">{uploadProgress.error}</p>
            </div>
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-blue-800 text-sm">
                Only administrators can upload training videos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 