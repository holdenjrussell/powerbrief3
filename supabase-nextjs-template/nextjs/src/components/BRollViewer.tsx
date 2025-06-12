'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Play, Eye, Folder, Trash2, AlertTriangle } from 'lucide-react';

interface GeneratedVideo {
  visual_description: string;
  gemini_prompt: string;
  video_urls: string[];
  storage_paths: string[];
}

interface BRollViewerProps {
  brollData: GeneratedVideo[];
  conceptTitle?: string;
  isPublicView?: boolean;
  conceptId?: string;
  onVideosDeleted?: () => void;
}

export default function BRollViewer({ brollData, conceptTitle, isPublicView = false, conceptId, onVideosDeleted }: BRollViewerProps) {
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; description: string; prompt: string } | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [deletingVideo, setDeletingVideo] = useState<{ visualIndex: number; videoIndex?: number } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  if (!brollData || brollData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Folder className="h-5 w-5 mr-2" />
            B-Roll Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No B-roll videos generated yet.</p>
            {!isPublicView && (
              <p className="text-sm">Generate B-roll videos from your concept visuals.</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalVideos = brollData
    .filter(item => item && item.video_urls) // Filter out null/undefined items
    .reduce((sum, item) => sum + item.video_urls.length, 0);

  const handleVideoPlay = (url: string, description: string, prompt: string) => {
    setSelectedVideo({ url, description, prompt });
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading video:', error);
    }
  };

  const handleDownloadAll = async () => {
    const validBrollItems = brollData.filter(item => item && item.video_urls);
    for (const brollItem of validBrollItems) {
      for (let i = 0; i < brollItem.video_urls.length; i++) {
        const url = brollItem.video_urls[i];
        const fileName = `broll_${validBrollItems.indexOf(brollItem) + 1}_video_${i + 1}.mp4`;
        await handleDownload(url, fileName);
        // Add delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const handleDeleteVideo = async (visualIndex: number, videoIndex?: number) => {
    if (!conceptId) return;

    try {
      const response = await fetch('/api/powerbrief/delete-broll', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId,
          visualIndex,
          videoIndex
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete video');
      }

      // Call the callback to refresh data
      if (onVideosDeleted) {
        onVideosDeleted();
      }

      setDeletingVideo(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  const handleDeleteAllBRoll = async () => {
    if (!conceptId) return;

    try {
      const response = await fetch('/api/powerbrief/delete-broll', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete all videos');
      }

      // Call the callback to refresh data
      if (onVideosDeleted) {
        onVideosDeleted();
      }

      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting all videos:', error);
    }
  };

  const confirmDelete = (visualIndex: number, videoIndex?: number) => {
    setDeletingVideo({ visualIndex, videoIndex });
    setShowDeleteConfirm(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Folder className="h-5 w-5 mr-2" />
              B-Roll Library
              {conceptTitle && (
                <span className="text-sm font-normal text-gray-500 ml-2">for {conceptTitle}</span>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {totalVideos} videos generated
              </Badge>
              {!isPublicView && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleDownloadAll}
                    className="flex items-center"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download All
                  </Button>
                  {conceptId && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => confirmDelete(-1)}
                      className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete All
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brollData
              .filter(item => item && item.video_urls) // Filter out null/undefined items
              .map((brollItem, brollIndex) => (
              <div key={brollIndex} className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Visual {brollIndex + 1}
                  </h4>
                  <p className="text-xs text-gray-600 mb-3 line-clamp-3">
                    {brollItem.visual_description}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {brollItem.video_urls.map((videoUrl, videoIndex) => (
                      <div key={videoIndex} className="relative group">
                        <video
                          src={videoUrl}
                          className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleVideoPlay(videoUrl, brollItem.visual_description, brollItem.gemini_prompt)}
                          poster="" // This will show the first frame
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/50 rounded-full p-2">
                            <Play className="h-4 w-4 text-white" />
                          </div>
                        </div>
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(videoUrl, `broll_visual_${brollIndex + 1}_video_${videoIndex + 1}.mp4`);
                            }}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          {!isPublicView && conceptId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 bg-red-500/80 hover:bg-red-600/90 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(brollIndex, videoIndex);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!isPublicView && (
                    <div className="flex gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          setSelectedVideo({ 
                            url: brollItem.video_urls[0], 
                            description: brollItem.visual_description, 
                            prompt: brollItem.gemini_prompt 
                          });
                          setShowPrompt(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View AI Prompt
                      </Button>
                      {conceptId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => confirmDelete(brollIndex)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete Visual
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Video Player Dialog */}
      <Dialog 
        open={!!selectedVideo && !showPrompt} 
        onOpenChange={() => setSelectedVideo(null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>B-Roll Video Player</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="space-y-4">
              <div className="relative">
                <video
                  src={selectedVideo.url}
                  controls
                  autoPlay
                  className="w-full h-auto rounded-lg"
                  style={{ maxHeight: '70vh' }}
                />
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Visual Description:</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedVideo.description}
                </p>
              </div>
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => handleDownload(selectedVideo.url, 'broll_video.mp4')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Video
                </Button>
                {!isPublicView && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowPrompt(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View AI Prompt
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Prompt Dialog */}
      <Dialog 
        open={!!selectedVideo && showPrompt} 
        onOpenChange={() => setShowPrompt(false)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generated AI Prompt</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Original Visual Description:</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedVideo.description}
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Generated Veo 2 Prompt:</h4>
                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded border-l-4 border-blue-400 font-mono">
                  {selectedVideo.prompt}
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowPrompt(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {deletingVideo?.visualIndex === -1 
                ? 'Are you sure you want to delete ALL B-roll videos? This action cannot be undone.'
                : deletingVideo?.videoIndex !== undefined
                ? `Are you sure you want to delete this video from Visual ${(deletingVideo?.visualIndex || 0) + 1}?`
                : `Are you sure you want to delete all videos from Visual ${(deletingVideo?.visualIndex || 0) + 1}?`
              }
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deletingVideo?.visualIndex === -1) {
                    handleDeleteAllBRoll();
                  } else if (deletingVideo) {
                    handleDeleteVideo(deletingVideo.visualIndex, deletingVideo.videoIndex);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 