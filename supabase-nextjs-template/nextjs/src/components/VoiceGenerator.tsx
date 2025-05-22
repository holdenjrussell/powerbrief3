'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Save, Volume2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Voice = {
  voice_id: string;
  name: string;
  category?: string;
};

type VoiceGeneratorProps = {
  script: string;
  onVoiceGenerated?: (audioUrl: string) => void;
  className?: string;
};

export default function VoiceGenerator({ script, onVoiceGenerated, className = '' }: VoiceGeneratorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Fetch available voices on component mount
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const response = await fetch('/api/elevenlabs');
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }
        
        setVoices(data.voices);
        
        // Set default voice if available
        if (data.voices && data.voices.length > 0) {
          setSelectedVoice(data.voices[0].voice_id);
        }
      } catch (err) {
        console.error('Failed to fetch voices:', err);
        setError('Failed to load available voices. Please try again.');
      }
    };

    fetchVoices();
  }, []);

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
          fileName: 'concept-voiceover.mp3'
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
      
      <div className="flex items-center space-x-2">
        <Select value={selectedVoice} onValueChange={setSelectedVoice} disabled={loading || voices.length === 0}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select voice" />
          </SelectTrigger>
          <SelectContent>
            {voices.map(voice => (
              <SelectItem key={voice.voice_id} value={voice.voice_id}>
                {voice.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
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
      </div>
      
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