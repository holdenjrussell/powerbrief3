'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Save, Volume2, RefreshCw, Pause } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Voice = {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
};

type VoiceGeneratorProps = {
  script: string;
  onVoiceGenerated?: (audioUrl: string) => void;
  className?: string;
  brandId?: string;
};

export default function VoiceGenerator({ script, onVoiceGenerated, className = '', brandId = '' }: VoiceGeneratorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Voice preview states
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewAudioElement, setPreviewAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [currentPreviewVoice, setCurrentPreviewVoice] = useState<string | null>(null);

  // Function to sort voices by priority: Cloned -> Professional -> Premade
  const sortVoicesByPriority = (voices: Voice[]) => {
    const categoryPriority = {
      'cloned': 1,
      'professional': 2,
      'premade': 3,
      'generated': 3, // Treat generated same as premade
    };

    return voices.sort((a, b) => {
      const categoryA = a.category?.toLowerCase() || 'premade';
      const categoryB = b.category?.toLowerCase() || 'premade';
      
      const priorityA = categoryPriority[categoryA] || 4;
      const priorityB = categoryPriority[categoryB] || 4;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same category, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  };

  // Function to group voices by category with custom ordering
  const groupVoicesByCategory = (voices: Voice[]) => {
    const sortedVoices = sortVoicesByPriority(voices);
    
    return sortedVoices.reduce((groups, voice) => {
      let category = voice.category || 'Premade';
      
      // Normalize category names for display
      if (category.toLowerCase() === 'cloned') {
        category = 'Cloned Voices';
      } else if (category.toLowerCase() === 'professional') {
        category = 'Professional Voices';
      } else if (category.toLowerCase() === 'premade' || category.toLowerCase() === 'generated') {
        category = 'Premade Voices';
      }
      
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(voice);
      return groups;
    }, {} as Record<string, Voice[]>);
  };

  const fetchVoices = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/elevenlabs${brandId ? `?brandId=${brandId}` : ''}`);
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      const sortedVoices = sortVoicesByPriority(data.voices);
      setVoices(sortedVoices);
      
      // Set default voice if available (first cloned voice, or first voice if no cloned)
      if (sortedVoices && sortedVoices.length > 0) {
        setSelectedVoice(sortedVoices[0].voice_id);
      }
    } catch (err) {
      console.error('Failed to fetch voices:', err);
      setError('Failed to load available voices. Please try again.');
    }
  };

  // Voice preview function
  const handleVoicePreview = async (voiceId: string) => {
    try {
      setPreviewLoading(voiceId);
      
      // Stop any currently playing preview
      if (previewAudioElement) {
        previewAudioElement.pause();
        setIsPreviewPlaying(false);
        setCurrentPreviewVoice(null);
      }
      
      const response = await fetch('/api/elevenlabs/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceId: voiceId,
          brandId: brandId || undefined
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      // Convert base64 to blob
      const audioData = atob(data.audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        uint8Array[i] = audioData.charCodeAt(i);
      }
      
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      setCurrentPreviewVoice(voiceId);
      
      // Create and play audio
      const audio = new Audio(url);
      setPreviewAudioElement(audio);
      
      audio.addEventListener('play', () => setIsPreviewPlaying(true));
      audio.addEventListener('pause', () => setIsPreviewPlaying(false));
      audio.addEventListener('ended', () => {
        setIsPreviewPlaying(false);
        setCurrentPreviewVoice(null);
      });
      
      audio.play();
    } catch (err) {
      console.error('Failed to preview voice:', err);
      setError('Failed to preview voice. Please try again.');
    } finally {
      setPreviewLoading(null);
    }
  };

  // Function to stop preview
  const stopPreview = () => {
    if (previewAudioElement) {
      previewAudioElement.pause();
      setIsPreviewPlaying(false);
      setCurrentPreviewVoice(null);
    }
  };

  useEffect(() => {
    fetchVoices();
  }, [brandId]);

  // Create audio element when URL changes
  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      setAudioElement(audio);
      
      // Cleanup on unmount
      return () => {
        audio.pause();
        URL.revokeObjectURL(audioUrl);
      };
    }
  }, [audioUrl]);

  const handleGenerateVoice = async () => {
    if (!script || !selectedVoice) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/elevenlabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: script,
          voiceId: selectedVoice,
          fileName: 'concept-voiceover.mp3',
          brandId: brandId || undefined
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      // Convert base64 to blob
      const audioData = atob(data.audio);
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        uint8Array[i] = audioData.charCodeAt(i);
      }
      
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      setAudioUrl(url);
      
      if (onVoiceGenerated) {
        onVoiceGenerated(url);
      }
    } catch (err) {
      console.error('Failed to generate voice:', err);
      setError('Failed to generate voice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = () => {
    if (audioElement) {
      audioElement.play();
    }
  };

  const handleSaveAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = 'concept-voiceover.mp3';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (!script) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="font-medium text-sm">Generate AI Voiceover</h3>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Voice Selection with Preview */}
      <div>
        <label className="text-xs text-gray-500 mb-2 block">Select Voice</label>
        <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto">
          {Object.entries(groupVoicesByCategory(voices)).map(([category, groupVoices]) => (
            <div key={category} className="mb-3 last:mb-0">
              <div className="text-xs font-semibold text-gray-600 mb-2 pb-1 border-b">
                {category}
              </div>
              <div className="space-y-1">
                {groupVoices.map(voice => (
                  <div 
                    key={voice.voice_id} 
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                      selectedVoice === voice.voice_id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedVoice(voice.voice_id)}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={selectedVoice === voice.voice_id}
                        onChange={() => setSelectedVoice(voice.voice_id)}
                        className="text-blue-600"
                        aria-label={`Select ${voice.name} voice`}
                      />
                      <span className="text-sm font-medium">{voice.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPreviewPlaying && currentPreviewVoice === voice.voice_id) {
                          stopPreview();
                        } else {
                          handleVoicePreview(voice.voice_id);
                        }
                      }}
                      disabled={previewLoading === voice.voice_id}
                      className="h-8 w-8 p-0"
                    >
                      {previewLoading === voice.voice_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isPreviewPlaying && currentPreviewVoice === voice.voice_id ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {voices.length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              No voices available. Click refresh to load voices.
            </div>
          )}
        </div>
        <div className="flex justify-end mt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchVoices} 
            title="Refresh voices"
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>
      
      <Button 
        onClick={handleGenerateVoice} 
        disabled={loading || !selectedVoice || !script}
        className="bg-primary-600 text-white hover:bg-primary-700"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Volume2 className="h-4 w-4 mr-2" />
            Generate Voice
          </>
        )}
      </Button>
      
      {audioUrl && (
        <div className="flex items-center space-x-2 mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePlayAudio}
          >
            <Play className="h-4 w-4 mr-1" />
            Play
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSaveAudio}
          >
            <Save className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      )}
    </div>
  );
} 