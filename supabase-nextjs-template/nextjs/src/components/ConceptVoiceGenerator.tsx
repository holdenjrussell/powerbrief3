'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Save, Volume2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scene } from '@/lib/types/powerbrief';

type Voice = {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
};

type ConceptVoiceGeneratorProps = {
  scenes: Scene[];
  spokenHooks?: string;
  ctaScript?: string;
  className?: string;
};

export default function ConceptVoiceGenerator({ 
  scenes, 
  spokenHooks = '',
  ctaScript = '', 
  className = '' 
}: ConceptVoiceGeneratorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [combinedScript, setCombinedScript] = useState<string>('');

  // Add the fetchVoices function here
  const fetchVoices = async () => {
    try {
      setError(null);
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

  // Create the combined script from all scenes, hooks, and CTA
  useEffect(() => {
    // Start with hooks if available
    let fullScript = '';
    
    if (spokenHooks && spokenHooks.trim()) {
      // Use the first hook only (assuming hooks are separated by newlines)
      const firstHook = spokenHooks.split('\n')[0]?.trim();
      if (firstHook) {
        fullScript += `${firstHook}\n\n`;
      }
    }
    
    // Add scene scripts
    if (scenes && scenes.length > 0) {
      const scriptParts = scenes.map(scene => {
        if (!scene.script) return '';
        return `${scene.script.trim()}\n\n`;
      });
      
      fullScript += scriptParts.join('').trim();
    }
    
    // Add CTA at the end if available
    if (ctaScript && ctaScript.trim()) {
      fullScript += `\n\n${ctaScript.trim()}`;
    }
    
    setCombinedScript(fullScript.trim());
  }, [scenes, spokenHooks, ctaScript]);
  
  // Add the useEffect to fetch voices on component mount
  useEffect(() => {
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
    if (!combinedScript || !selectedVoice) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/elevenlabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: combinedScript,
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

  // If there are no scenes with script content, don't render anything
  if (!combinedScript) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="font-medium text-sm">Generate AI Voiceover for Entire Concept</h3>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center">
        <Select value={selectedVoice} onValueChange={setSelectedVoice} disabled={loading || voices.length === 0}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select voice" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {/* Group voices by category */}
            {Object.entries(
              voices.reduce((groups, voice) => {
                // Create a default category if none exists
                const category = voice.category || 'Other';
                if (!groups[category]) {
                  groups[category] = [];
                }
                groups[category].push(voice);
                return groups;
              }, {} as Record<string, Voice[]>)
            ).map(([category, groupVoices]) => (
              <div key={category} className="mb-2">
                <div className="pl-2 py-1.5 text-xs font-semibold text-gray-500 border-b">
                  {category}
                </div>
                {groupVoices.map(voice => (
                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={fetchVoices} 
          className="ml-1" 
          title="Refresh voices"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      
      <Button 
        onClick={handleGenerateVoice} 
        disabled={loading || !selectedVoice || !combinedScript}
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
            Generate Full Concept Voice
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