'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Play, Eye, Folder } from 'lucide-react';

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
}

export default function BRollViewer({ brollData, conceptTitle, isPublicView = false }: BRollViewerProps) {
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; description: string; prompt: string } | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

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

  const totalVideos = brollData.reduce((sum, item) => sum + item.video_urls.length, 0);

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
    for (const brollItem of brollData) {
      for (let i = 0; i < brollItem.video_urls.length; i++) {
        const url = brollItem.video_urls[i];
        const fileName = `broll_${brollData.indexOf(brollItem) + 1}_video_${i + 1}.mp4`;
        await handleDownload(url, fileName);
        // Add delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
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
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDownloadAll}
                  className="flex items-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {brollData.map((brollItem, brollIndex) => (
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
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        </div>
                      </div>
                    ))}
                  </div>
                  {!isPublicView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs"
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
    </div>
  );
} 