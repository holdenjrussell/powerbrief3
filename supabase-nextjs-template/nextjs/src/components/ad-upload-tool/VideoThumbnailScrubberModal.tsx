'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Save, Loader2, Clock } from 'lucide-react';
import { createSPAClient } from '@/lib/supabase/client';
import { AdDraftAsset } from './adUploadTypes';
import { parseFilename } from '@/lib/utils/aspectRatioDetection';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Enhanced grouping using shared utility
  const getConceptName = (filename: string) => {
    const { groupKey } = parseFilename(filename);
    return groupKey;
  };

  const conceptName = videoAsset ? getConceptName(videoAsset.name) : '';
  const relatedVideos = videoAsset ? allVideoAssets.filter(asset => 
    getConceptName(asset.name) === conceptName && asset.type === 'video'
  ) : [];

  const getTimeFromPosition = (clientX: number) => {
    const timeline = timelineRef.current;
    if (!timeline || duration === 0) return 0;

    const rect = timeline.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return percent * duration;
  };

  const seekToTime = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    const clampedTime = Math.max(0, Math.min(duration, time));
    video.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    setSelectedTimestamp(clampedTime);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const newTime = getTimeFromPosition(e.clientX);
    seekToTime(newTime);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    const newTime = getTimeFromPosition(e.clientX);
    seekToTime(newTime);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const newTime = getTimeFromPosition(e.clientX);
    seekToTime(newTime);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!isOpen || !videoAsset) return;

    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      
      // Check if the videoAsset has a saved thumbnail timestamp
      const savedTimestamp = videoAsset.thumbnailTimestamp;
      if (savedTimestamp !== undefined && savedTimestamp !== null && savedTimestamp > 0) {
        // Seek to the saved timestamp
        const clampedTime = Math.min(savedTimestamp, video.duration);
        
        // Set up a one-time event listener for when seeking is complete
        const handleSeeked = () => {
          setCurrentTime(video.currentTime);
          setSelectedTimestamp(video.currentTime);
          console.log(`Seeked to saved thumbnail timestamp: ${video.currentTime}s`);
          video.removeEventListener('seeked', handleSeeked);
        };
        
        video.addEventListener('seeked', handleSeeked, { once: true });
        video.currentTime = clampedTime;
      } else {
        // Default to start
        setCurrentTime(0);
        setSelectedTimestamp(null);
        video.currentTime = 0;
      }
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(video.currentTime);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [isOpen, isPlaying, videoAsset, isDragging]);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Early return after all hooks
  if (!isOpen || !videoAsset) return null;

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleReset = () => {
    const video = videoRef.current;
    if (!video) return;

    seekToTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveThumbnail = async () => {
    if (selectedTimestamp === null) {
      alert('Please select a frame by clicking on the timeline');
      return;
    }

    setIsSaving(true);
    
    try {
      const supabase = createSPAClient();
      const results = { successes: 0, failures: 0, errors: [] as string[] };
      
      // Generate thumbnail for all related videos at the same timestamp
      for (const video of relatedVideos) {
        try {
          console.log(`Generating thumbnail for ${video.name} at ${selectedTimestamp}s`);
          
          // First, get the existing thumbnail info from database to delete old file
          const { data: existingAsset } = await supabase
            .from('ad_draft_assets')
            .select('id, thumbnail_url, thumbnail_timestamp')
            .eq('ad_draft_id', draftId)
            .eq('supabase_url', video.supabaseUrl)
            .single();
          
          // Create a temporary video element for each video to capture frame
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
            
            tempVideo.addEventListener('loadedmetadata', () => {
              // Set the specific timestamp
              tempVideo.currentTime = Math.min(selectedTimestamp, tempVideo.duration);
              
              tempVideo.addEventListener('seeked', () => {
                // Capture frame at the specific timestamp
                tempCanvas.width = tempVideo.videoWidth;
                tempCanvas.height = tempVideo.videoHeight;
                tempCtx.drawImage(tempVideo, 0, 0, tempCanvas.width, tempCanvas.height);
                
                tempCanvas.toBlob(async (blob) => {
                  if (!blob) {
                    reject(new Error('Failed to create thumbnail blob'));
                    return;
                  }
                  
                  try {
                    // Use consistent file name without timestamp for overwriting
                    const thumbnailFileName = `${video.name.split('.')[0]}_thumbnail.jpg`;
                    const thumbnailPath = `${draftId}/${thumbnailFileName}`;
                    
                    // Delete existing thumbnail file if it exists
                    if (existingAsset && existingAsset.thumbnail_url) {
                      try {
                        // Extract the file path from the existing URL
                        const existingUrl = existingAsset.thumbnail_url;
                        const urlParts = existingUrl.split('/ad-creatives/');
                        if (urlParts.length > 1) {
                          const existingPath = urlParts[1].split('?')[0]; // Remove query params
                          console.log(`Deleting old thumbnail: ${existingPath}`);
                          
                          const { error: deleteError } = await supabase.storage
                            .from('ad-creatives')
                            .remove([existingPath]);
                          
                          if (deleteError) {
                            console.warn(`Could not delete old thumbnail: ${deleteError.message}`);
                          }
                        }
                      } catch (deleteErr) {
                        console.warn('Error deleting old thumbnail:', deleteErr);
                      }
                    }
                    
                    // Upload new thumbnail
                    const { data, error: uploadError } = await supabase.storage
                      .from('ad-creatives')
                      .upload(thumbnailPath, blob, {
                        cacheControl: '3600',
                        upsert: true, // Allow overwriting existing thumbnails
                      });
                    
                    if (uploadError || !data) {
                      throw new Error(`Upload failed: ${uploadError?.message}`);
                    }
                    
                    // Get public URL
                    const { data: { publicUrl } } = supabase.storage
                      .from('ad-creatives')
                      .getPublicUrl(thumbnailPath);
                    
                    if (publicUrl && existingAsset) {
                      // Update database with new thumbnail URL and timestamp
                      const { error: updateError } = await supabase
                        .from('ad_draft_assets')
                        .update({ 
                          thumbnail_url: publicUrl,
                          thumbnail_timestamp: selectedTimestamp
                        })
                        .eq('id', existingAsset.id);
                      
                      if (updateError) {
                        console.error(`Failed to update database for ${video.name}:`, updateError);
                        throw new Error(`Database update failed: ${updateError.message || JSON.stringify(updateError)}`);
                      } else {
                        console.log(`Thumbnail updated for ${video.name}: ${publicUrl}`);
                      }
                    } else if (!existingAsset) {
                      console.warn(`Could not find database record for ${video.name}`);
                      throw new Error(`No database record found for ${video.name}`);
                    }
                    
                    resolve();
                  } catch (error) {
                    reject(error);
                  }
                }, 'image/jpeg', 0.85);
              }, { once: true });
            }, { once: true });
            
            tempVideo.addEventListener('error', reject, { once: true });
            tempVideo.src = video.supabaseUrl;
            tempVideo.load();
            
            // Add timeout
            setTimeout(() => reject(new Error('Timeout loading video')), 10000);
          });
          
          results.successes++;
          
        } catch (error) {
          console.error(`Failed to generate thumbnail for ${video.name}:`, error);
          results.failures++;
          results.errors.push(`${video.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Show results and refresh regardless of some failures
      if (results.successes > 0) {
        alert(`Successfully updated ${results.successes} thumbnail(s) at ${selectedTimestamp.toFixed(2)}s` + 
              (results.failures > 0 ? `\n\nFailed: ${results.failures} video(s)` : ''));
        onThumbnailUpdated();
        onClose();
      } else {
        alert(`Failed to update any thumbnails:\n${results.errors.join('\n')}`);
      }
      
    } catch (error) {
      console.error('Error saving thumbnails:', error);
      alert('Failed to save thumbnails. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Select Video Thumbnail
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Concept: <span className="font-medium">{conceptName}</span> • 
              Related videos: {relatedVideos.length}
              {videoAsset.thumbnailTimestamp && videoAsset.thumbnailTimestamp > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  <Clock className="h-3 w-3" />
                  Saved: {formatTime(videoAsset.thumbnailTimestamp)}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Video Player Section */}
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  src={videoAsset.supabaseUrl}
                  className="w-full h-full object-contain"
                  muted
                  playsInline
                />
                
                {/* Video Controls Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    onClick={handlePlayPause}
                    className="bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-colors"
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </button>
                </div>
              </div>

              {/* Enhanced Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                
                <div 
                  ref={timelineRef}
                  className="relative h-6 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition-colors"
                  onClick={handleTimelineClick}
                  onMouseDown={handleMouseDown}
                >
                  {/* Progress bar */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-75"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                  
                  {/* Selected timestamp marker */}
                  {selectedTimestamp !== null && duration > 0 && (
                    <div 
                      className="absolute top-0 h-full w-1 bg-red-500 rounded-full transform -translate-x-0.5"
                      style={{ left: `${(selectedTimestamp / duration) * 100}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        {formatTime(selectedTimestamp)}
                      </div>
                    </div>
                  )}
                  
                  {/* Draggable handle */}
                  <div 
                    className={`absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg cursor-grab ${isDragging ? 'cursor-grabbing scale-110' : ''} transition-transform`}
                    style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
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
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                </div>

                {selectedTimestamp !== null && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-md">
                    <Clock className="h-4 w-4" />
                    Selected: {formatTime(selectedTimestamp)}
                  </div>
                )}
              </div>
            </div>

            {/* Related Videos Info */}
            {relatedVideos.length > 1 && (
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="text-sm font-medium text-blue-900 mb-2">
                  Related Videos ({relatedVideos.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {relatedVideos.map((video, index) => (
                    <div key={index} className="text-sm text-blue-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></span>
                      <span className="truncate">{video.name}</span>
                      {video.aspectRatios && video.aspectRatios.length > 0 && (
                        <span className="text-xs text-blue-600 bg-white px-1 rounded flex-shrink-0">
                          ({video.aspectRatios.join(', ')})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                  <p className="text-xs text-blue-600 flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <span>
                      <strong>Smart Thumbnail Sync:</strong> The same timestamp will be used to generate thumbnails for all related videos, ensuring consistency across different aspect ratios (4:5, 9:16, etc.).
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            <strong>Instructions:</strong> Drag the timeline handle or click anywhere on the timeline to select a frame, then save to generate thumbnails.
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSaveThumbnail}
              disabled={selectedTimestamp === null || isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Thumbnail
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hidden canvas for thumbnail generation */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
} 