'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Save, Loader2, Clock, Upload, AlertCircle } from 'lucide-react';
import { createSPAClient } from '@/lib/supabase/client';
import { AdDraftAsset } from './adUploadTypes';

interface VideoThumbnailScrubberModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoAsset: AdDraftAsset;
  allVideoAssets: AdDraftAsset[]; // All video assets from the same concept
  draftId: string;
  onThumbnailUpdated: () => void;
}

export default function VideoThumbnailScrubberModal({
  isOpen,
  onClose,
  videoAsset,
  allVideoAssets,
  draftId,
  onThumbnailUpdated
}: VideoThumbnailScrubberModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasThumbnailSelected, setHasThumbnailSelected] = useState(false);
  const [customThumbnailUploaded, setCustomThumbnailUploaded] = useState(false);
  
  // Group related videos by concept name (remove version and aspect ratio)
  const getConceptName = (filename: string) => {
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    const withoutVersion = nameWithoutExt.replace(/_v\d+/i, '');
    const withoutRatio = withoutVersion.replace(/[_-](4x5|9x16|1x1|16x9)$/i, '');
    return withoutRatio;
  };

  const conceptName = videoAsset ? getConceptName(videoAsset.name) : '';
  const relatedVideos = videoAsset ? allVideoAssets.filter(asset => 
    getConceptName(asset.name) === conceptName && asset.type === 'video'
  ) : [];

  // Initialize video when modal opens
  useEffect(() => {
    if (!isOpen || !videoAsset || !videoRef.current) return;

    const video = videoRef.current;
    
    const handleLoadedMetadata = () => {
      console.log(`Video loaded: duration=${video.duration}s`);
      setDuration(video.duration);
      
      // Check if there's an existing thumbnail timestamp
      const existingTimestamp = videoAsset.thumbnailTimestamp;
      if (existingTimestamp && existingTimestamp > 0 && existingTimestamp <= video.duration) {
        console.log(`Setting to existing timestamp: ${existingTimestamp}s`);
        video.currentTime = existingTimestamp;
        setSelectedTimestamp(existingTimestamp);
        setHasThumbnailSelected(true);
      } else {
        // Start at beginning
        video.currentTime = 0;
        setCurrentTime(0);
        setSelectedTimestamp(null);
        setHasThumbnailSelected(false);
      }
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(video.currentTime);
      }
    };

    const handleSeeked = () => {
      console.log(`Video seeked to: ${video.currentTime}s`);
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => {
      console.log('Video started playing');
      setIsPlaying(true);
    };

    const handlePause = () => {
      console.log('Video paused');
      setIsPlaying(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Load the video
    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [isOpen, videoAsset, isDragging]);

  // Timeline click handler
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration === 0) return;
    
    e.preventDefault();
    const timeline = timelineRef.current;
    const rect = timeline.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percent * duration;
    
    console.log(`Timeline clicked: ${percent.toFixed(3)} = ${newTime.toFixed(2)}s`);
    seekToTime(newTime);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration === 0) return;
    
    e.preventDefault();
    setIsDragging(true);
    
    const timeline = timelineRef.current;
    const rect = timeline.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percent * duration;
    
    console.log(`Mouse down: starting drag at ${newTime.toFixed(2)}s`);
    seekToTime(newTime);
  };

  // Global mouse handlers for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current || duration === 0) return;
      
      const timeline = timelineRef.current;
      const rect = timeline.getBoundingClientRect();
      const moveX = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, moveX / rect.width));
      const newTime = percent * duration;
      
      seekToTime(newTime);
    };

    const handleMouseUp = () => {
      console.log('Drag ended');
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration]);

  const seekToTime = (time: number) => {
    const video = videoRef.current;
    if (!video || duration === 0) return;

    const clampedTime = Math.max(0, Math.min(duration, time));
    console.log(`Seeking to: ${clampedTime.toFixed(2)}s`);
    
    video.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    setSelectedTimestamp(clampedTime);
    setHasThumbnailSelected(true);
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(err => {
        console.error('Error playing video:', err);
        alert('Could not play video. This may be due to browser autoplay restrictions.');
      });
    }
  };

  const handleReset = () => {
    seekToTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle custom thumbnail upload
  const handleCustomThumbnailUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    setIsUploading(true);
    
    try {
      const supabase = createSPAClient();
      
      // Upload custom thumbnail for all related videos
      for (const video of relatedVideos) {
        try {
          console.log(`Uploading custom thumbnail for ${video.name}`);
          
          // Get existing asset info from database
          const { data: existingAssets, error: queryError } = await supabase
            .from('ad_draft_assets')
            .select('id, name, supabase_url, thumbnail_url')
            .eq('ad_draft_id', draftId)
            .eq('name', video.name)
            .eq('type', 'video');
          
          if (queryError) {
            throw new Error(`Failed to query database: ${queryError.message}`);
          }
          
          const existingAsset = existingAssets?.find(asset => 
            asset.supabase_url === video.supabaseUrl || asset.name === video.name
          );
          
          if (!existingAsset) {
            throw new Error(`No database record found for ${video.name}`);
          }
          
          // Delete existing thumbnail if it exists
          if (existingAsset.thumbnail_url) {
            try {
              const existingUrl = existingAsset.thumbnail_url;
              const urlParts = existingUrl.split('/ad-creatives/');
              if (urlParts.length > 1) {
                const existingPath = urlParts[1].split('?')[0];
                await supabase.storage.from('ad-creatives').remove([existingPath]);
              }
            } catch (deleteErr) {
              console.warn('Could not delete old thumbnail:', deleteErr);
            }
          }
          
          // Upload new custom thumbnail
          const timestamp = Date.now();
          const baseFileName = video.name.split('.')[0];
          const thumbnailFileName = `${baseFileName}_custom_thumbnail_${timestamp}.jpg`;
          const thumbnailPath = `${draftId}/${thumbnailFileName}`;
          
          const { data, error: uploadError } = await supabase.storage
            .from('ad-creatives')
            .upload(thumbnailPath, file, {
              cacheControl: '3600',
              upsert: false,
            });
          
          if (uploadError || !data) {
            throw new Error(`Upload failed: ${uploadError?.message || 'Unknown error'}`);
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('ad-creatives')
            .getPublicUrl(thumbnailPath);
          
          if (!publicUrl) {
            throw new Error('Failed to get public URL');
          }
          
          const cacheBustedUrl = `${publicUrl}?t=${timestamp}`;
          
          // Update database
          const { error: updateError } = await supabase
            .from('ad_draft_assets')
            .update({ 
              thumbnail_url: cacheBustedUrl,
              thumbnail_timestamp: null // Mark as custom upload
            })
            .eq('id', existingAsset.id);
          
          if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`);
          }
          
          console.log(`✅ Custom thumbnail uploaded for ${video.name}`);
          
        } catch (error) {
          console.error(`Failed to upload custom thumbnail for ${video.name}:`, error);
          throw error; // Re-throw to stop the process
        }
      }
      
      setCustomThumbnailUploaded(true);
      alert(`✅ Custom thumbnail uploaded successfully for ${relatedVideos.length} video(s)!`);
      
      // Update UI and close modal
      onThumbnailUpdated();
      onClose();
      
    } catch (error) {
      console.error('Custom thumbnail upload failed:', error);
      alert(`❌ Failed to upload custom thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveThumbnail = async () => {
    if (selectedTimestamp === null) {
      alert('Please select a frame by clicking on the timeline first');
      return;
    }

    setIsSaving(true);
    
    try {
      const supabase = createSPAClient();
      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];
      
      // Generate thumbnail for all related videos at the selected timestamp
      for (const video of relatedVideos) {
        try {
          console.log(`Generating thumbnail for ${video.name} at ${selectedTimestamp}s`);
          
          // Get existing asset info from database
          const { data: existingAssets, error: queryError } = await supabase
            .from('ad_draft_assets')
            .select('id, name, supabase_url, thumbnail_url')
            .eq('ad_draft_id', draftId)
            .eq('name', video.name)
            .eq('type', 'video');
          
          if (queryError) {
            throw new Error(`Database query failed: ${queryError.message}`);
          }
          
          const existingAsset = existingAssets?.find(asset => 
            asset.supabase_url === video.supabaseUrl || asset.name === video.name
          );
          
          if (!existingAsset) {
            throw new Error(`No database record found for ${video.name}`);
          }
          
          // Create temporary video element to capture frame
          const tempVideo = document.createElement('video');
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          
          if (!tempCtx) {
            throw new Error('Could not get canvas context');
          }
          
          await new Promise<void>((resolve, reject) => {
            tempVideo.crossOrigin = 'anonymous';
            tempVideo.muted = true;
            tempVideo.preload = 'metadata';
            
            const cleanup = () => {
              tempVideo.remove();
              tempCanvas.remove();
            };
            
            const timeout = setTimeout(() => {
              cleanup();
              reject(new Error('Timeout loading video'));
            }, 15000);
            
            tempVideo.addEventListener('loadedmetadata', () => {
              tempVideo.currentTime = Math.min(selectedTimestamp, tempVideo.duration);
            }, { once: true });
            
            tempVideo.addEventListener('seeked', async () => {
              try {
                // Capture frame
                tempCanvas.width = tempVideo.videoWidth;
                tempCanvas.height = tempVideo.videoHeight;
                tempCtx.drawImage(tempVideo, 0, 0, tempCanvas.width, tempCanvas.height);
                
                tempCanvas.toBlob(async (blob) => {
                  if (!blob) {
                    cleanup();
                    clearTimeout(timeout);
                    reject(new Error('Failed to create thumbnail blob'));
                    return;
                  }
                  
                  try {
                    // Delete existing thumbnail if it exists
                    if (existingAsset.thumbnail_url) {
                      try {
                        const existingUrl = existingAsset.thumbnail_url;
                        const urlParts = existingUrl.split('/ad-creatives/');
                        if (urlParts.length > 1) {
                          const existingPath = urlParts[1].split('?')[0];
                          await supabase.storage.from('ad-creatives').remove([existingPath]);
                        }
                      } catch (deleteErr) {
                        console.warn('Could not delete old thumbnail:', deleteErr);
                      }
                    }
                    
                    // Upload new thumbnail
                    const timestamp = Date.now();
                    const baseFileName = video.name.split('.')[0];
                    const thumbnailFileName = `${baseFileName}_thumbnail_${timestamp}.jpg`;
                    const thumbnailPath = `${draftId}/${thumbnailFileName}`;
                    
                    const { data, error: uploadError } = await supabase.storage
                      .from('ad-creatives')
                      .upload(thumbnailPath, blob, {
                        cacheControl: '3600',
                        upsert: false,
                      });
                    
                    if (uploadError || !data) {
                      throw new Error(`Upload failed: ${uploadError?.message || 'Unknown error'}`);
                    }
                    
                    // Get public URL
                    const { data: { publicUrl } } = supabase.storage
                      .from('ad-creatives')
                      .getPublicUrl(thumbnailPath);
                    
                    if (!publicUrl) {
                      throw new Error('Failed to get public URL');
                    }
                    
                    const cacheBustedUrl = `${publicUrl}?t=${timestamp}`;
                    
                    // Update database
                    const { error: updateError } = await supabase
                      .from('ad_draft_assets')
                      .update({ 
                        thumbnail_url: cacheBustedUrl,
                        thumbnail_timestamp: selectedTimestamp
                      })
                      .eq('id', existingAsset.id);
                    
                    if (updateError) {
                      throw new Error(`Database update failed: ${updateError.message}`);
                    }
                    
                    console.log(`✅ Thumbnail generated for ${video.name} at ${selectedTimestamp}s`);
                    cleanup();
                    clearTimeout(timeout);
                    resolve();
                    
                  } catch (error) {
                    cleanup();
                    clearTimeout(timeout);
                    reject(error);
                  }
                }, 'image/jpeg', 0.85);
                
              } catch (error) {
                cleanup();
                clearTimeout(timeout);
                reject(error);
              }
            }, { once: true });
            
                         tempVideo.addEventListener('error', () => {
               cleanup();
               clearTimeout(timeout);
               reject(new Error('Video load/seek error'));
             }, { once: true });
            
            tempVideo.src = video.supabaseUrl;
            tempVideo.load();
          });
          
          successCount++;
          
        } catch (error) {
          console.error(`Failed to generate thumbnail for ${video.name}:`, error);
          failureCount++;
          errors.push(`${video.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Show results
      if (successCount > 0) {
        const message = `✅ Successfully generated ${successCount} thumbnail(s) at ${selectedTimestamp.toFixed(2)}s` + 
              (failureCount > 0 ? `\n\n❌ Failed: ${failureCount} video(s)\nErrors:\n${errors.join('\n')}` : '');
        
        alert(message);
        
        // Update UI and close modal
        onThumbnailUpdated();
        onClose();
      } else {
        alert(`❌ Failed to generate any thumbnails:\n\n${errors.join('\n\n')}`);
      }
      
    } catch (error) {
      console.error('Error saving thumbnails:', error);
      alert(`❌ Failed to save thumbnails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Prevent closing without thumbnail selection
  const handleClose = () => {
    if (!hasThumbnailSelected && !customThumbnailUploaded) {
      const shouldClose = confirm(
        '⚠️ No thumbnail selected!\n\n' +
        'You must either:\n' +
        '• Use the timeline to select a frame, OR\n' +
        '• Upload a custom thumbnail image\n\n' +
        'Are you sure you want to close without setting a thumbnail?\n' +
        '(The video will not work properly in Meta ads without a thumbnail)'
      );
      
      if (!shouldClose) {
        return;
      }
    }
    
    onClose();
  };

  if (!isOpen || !videoAsset) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Select Video Thumbnail
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Concept: <span className="font-medium">{conceptName}</span> • 
              Related videos: {relatedVideos.length}
            </p>
            
            {/* Requirement notice */}
            <div className="mt-2 flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-orange-700 font-medium">
                Thumbnail selection is required - you cannot skip this step
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded"
            title="Close (requires thumbnail selection)"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            
            {/* Video Player Section */}
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  src={videoAsset.supabaseUrl}
                  className="w-full h-full object-contain"
                  muted
                  playsInline
                  preload="metadata"
                />
                
                {/* Video Controls Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-20">
                  <button
                    onClick={handlePlayPause}
                    className="bg-black bg-opacity-70 text-white p-4 rounded-full hover:bg-opacity-90 transition-all"
                  >
                    {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                  </button>
                </div>
              </div>

              {/* Timeline Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span className="font-mono">{formatTime(currentTime)}</span>
                  <span className="font-mono">{formatTime(duration)}</span>
                </div>
                
                <div className="relative">
                  <div 
                    ref={timelineRef}
                    className="relative h-8 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300 transition-colors shadow-inner"
                    onClick={handleTimelineClick}
                    onMouseDown={handleMouseDown}
                  >
                    {/* Progress bar */}
                    <div 
                      className="absolute top-0 left-0 h-full bg-blue-500 rounded-lg transition-all duration-100"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                    
                    {/* Selected timestamp marker */}
                    {selectedTimestamp !== null && duration > 0 && (
                      <div 
                        className="absolute top-0 h-full w-1 bg-red-500 rounded-full"
                        style={{ left: `${(selectedTimestamp / duration) * 100}%` }}
                      >
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                          Selected: {formatTime(selectedTimestamp)}
                        </div>
                      </div>
                    )}
                    
                    {/* Draggable handle */}
                    <div 
                      className={`absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-blue-600 rounded-full border-4 border-white shadow-lg cursor-grab ${isDragging ? 'cursor-grabbing scale-110 bg-blue-700' : ''} transition-transform hover:scale-105`}
                      style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Click anywhere on the timeline or drag the handle to select a frame
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePlayPause}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset to Start
                  </button>
                </div>

                {selectedTimestamp !== null && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100 px-3 py-2 rounded-md border border-green-200">
                    <Clock className="h-4 w-4" />
                    Frame selected: {formatTime(selectedTimestamp)}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Upload Section */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  Or Upload Custom Thumbnail
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Upload your own thumbnail image (JPG, PNG, etc.)
                </p>
                                 <input
                   ref={fileInputRef}
                   type="file"
                   accept="image/*"
                   onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) {
                       handleCustomThumbnailUpload(file);
                     }
                   }}
                   className="hidden"
                   aria-label="Upload custom thumbnail image"
                 />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Choose Custom Image
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Related Videos Info */}
            {relatedVideos.length > 1 && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Related Videos ({relatedVideos.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {relatedVideos.map((video, index) => (
                    <div key={index} className="text-sm text-blue-700 flex items-center gap-2">
                      <span className="w-1 h-1 bg-blue-400 rounded-full flex-shrink-0"></span>
                      <span className="truncate">{video.name}</span>
                      {video.aspectRatios && video.aspectRatios.length > 0 && (
                        <span className="text-xs text-blue-600 bg-white px-1 rounded flex-shrink-0">
                          {video.aspectRatios.join(', ')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                  <p className="text-xs text-blue-600 flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <span>
                      <strong>Smart Sync:</strong> The same thumbnail will be applied to all related videos for consistency across aspect ratios.
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-700">
              <p className="font-medium text-orange-700 mb-1">Thumbnail Required</p>
              <p>Either select a frame from the video timeline above or upload a custom image.</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {hasThumbnailSelected || customThumbnailUploaded ? 'Cancel' : 'Close (Skip)'}
            </button>
            
            <button
              onClick={handleSaveThumbnail}
              disabled={selectedTimestamp === null || isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Thumbnails...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Generate & Save Thumbnails
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 