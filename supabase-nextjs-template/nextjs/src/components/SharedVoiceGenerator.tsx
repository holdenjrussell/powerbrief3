'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Save, Volume2, RefreshCw, Pause, Database, FileAudio } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scene } from '@/lib/types/powerbrief';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Voice = {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
};

// Define available models
type VoiceModel = {
  id: string;
  name: string;
  description: string;
  isDiscounted?: boolean;
};

const VOICE_MODELS: VoiceModel[] = [
  {
    id: 'eleven_multilingual_v2',
    name: 'Eleven Multilingual v2',
    description: 'High Quality - Our most life-like, emotionally rich model for voice overs and content creation',
  },
  {
    id: 'eleven_turbo_v2',
    name: 'Eleven Turbo v2',
    description: '50% cheaper - High quality, low latency model for developer use cases',
    isDiscounted: true,
  },
  {
    id: 'eleven_multilingual_v1',
    name: 'Eleven Multilingual v1',
    description: 'Original multilingual model',
  },
  {
    id: 'eleven_monolingual_v1',
    name: 'Eleven Monolingual v1',
    description: 'Original English-only model',
  },
  {
    id: 'eleven_turbo_v2.5',
    name: 'Eleven Turbo v2.5',
    description: '50% cheaper - High quality, low latency model in 32 languages',
    isDiscounted: true,
  },
  {
    id: 'eleven_flash_v2.5',
    name: 'Eleven Flash v2.5',
    description: '50% cheaper - Ultra low latency model in 32 languages',
    isDiscounted: true,
  }
];

type SavedVoiceover = {
  name: string;
  url: string;
  created_at: string;
  size: number;
};

type SharedVoiceGeneratorProps = {
  scenes: Scene[];
  spokenHooks?: string;
  ctaScript?: string;
  className?: string;
  conceptId: string;
  isEditable?: boolean;
  brandId?: string;
};

export default function SharedVoiceGenerator({ 
  scenes, 
  spokenHooks = '',
  ctaScript = '', 
  className = '',
  conceptId,
  isEditable = false,
  brandId = ''
}: SharedVoiceGeneratorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [combinedScript, setCombinedScript] = useState<string>('');
  const [editableScript, setEditableScript] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [savingToSupabase, setSavingToSupabase] = useState<boolean>(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('generate');
  const [savedVoiceovers, setSavedVoiceovers] = useState<SavedVoiceover[]>([]);
  const [loadingSaved, setLoadingSaved] = useState<boolean>(false);
  const [currentPlayingUrl, setCurrentPlayingUrl] = useState<string | null>(null);
  
  // New voice settings
  const [speed, setSpeed] = useState<number>(1);
  const [stability, setStability] = useState<number>(0.5);
  const [similarity, setSimilarity] = useState<number>(0.75);
  const [selectedModel, setSelectedModel] = useState<string>('eleven_multilingual_v2');

  // Add the fetchVoices function here
  const fetchVoices = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/elevenlabs${brandId ? `?brandId=${brandId}` : ''}`);
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

  // Fetch saved voiceovers
  const fetchSavedVoiceovers = async () => {
    try {
      setLoadingSaved(true);
      const response = await fetch(`/api/supabase/get-saved-audio?conceptId=${conceptId}`);
      const data = await response.json();
      
      if (data.error) {
        console.error('Error fetching saved voiceovers:', data.error);
        return;
      }
      
      setSavedVoiceovers(data.files || []);
    } catch (err) {
      console.error('Failed to fetch saved voiceovers:', err);
    } finally {
      setLoadingSaved(false);
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
    setEditableScript(fullScript.trim());
  }, [scenes, spokenHooks, ctaScript]);
  
  // Add the useEffect to fetch voices on component mount
  useEffect(() => {
    fetchVoices();
    fetchSavedVoiceovers();
  }, [conceptId]);

  // Create audio element when URL changes
  useEffect(() => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      
      // Add event listeners to update isPlaying state
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('ended', () => setIsPlaying(false));
      
      setAudioElement(audio);
      
      // Cleanup on unmount
      return () => {
        audio.pause();
        URL.revokeObjectURL(audioUrl);
        
        // Remove event listeners
        audio.removeEventListener('play', () => setIsPlaying(true));
        audio.removeEventListener('pause', () => setIsPlaying(false));
        audio.removeEventListener('ended', () => setIsPlaying(false));
      };
    }
  }, [audioUrl]);

  const handleGenerateVoice = async () => {
    if (!editableScript || !selectedVoice) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/elevenlabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: editableScript,
          voiceId: selectedVoice,
          fileName: 'concept-voiceover.mp3',
          // Include the new voice settings
          speed,
          stability,
          similarity,
          modelId: selectedModel,
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
      setSavedUrl(null); // Reset saved URL when generating new audio
      setCurrentPlayingUrl(url);
    } catch (err) {
      console.error('Failed to generate voice:', err);
      setError('Failed to generate voice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = (url: string = audioUrl || '') => {
    if (!url) return;
    
    // If it's the current audio element
    if (audioElement && url === audioUrl) {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
      return;
    }
    
    // If it's a saved voiceover URL
    if (url !== audioUrl) {
      // Stop current audio if playing
      if (audioElement) {
        audioElement.pause();
        setIsPlaying(false);
      }
      
      // Create new audio element
      const audio = new Audio(url);
      setAudioElement(audio); // Store the audio element reference
      
      audio.addEventListener('play', () => {
        setIsPlaying(true);
        setCurrentPlayingUrl(url);
      });
      
      audio.addEventListener('pause', () => {
        setIsPlaying(false);
        setCurrentPlayingUrl(null);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentPlayingUrl(null);
      });
      
      audio.play();
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
  
  const handleSaveToSupabase = async () => {
    if (!audioUrl || !conceptId) return;
    
    try {
      setSavingToSupabase(true);
      setError(null);
      
      // Create a blob from the audio URL
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', blob, 'concept-voiceover.mp3');
      formData.append('conceptId', conceptId);
      
      // Send the file to the server
      const saveResponse = await fetch('/api/supabase/save-audio', {
        method: 'POST',
        body: formData,
      });
      
      const saveData = await saveResponse.json();
      
      if (saveData.error) {
        setError(saveData.error);
        return;
      }
      
      // Set the saved URL
      setSavedUrl(saveData.url);
      
      // Refresh the saved voiceovers list
      fetchSavedVoiceovers();
    } catch (err) {
      console.error('Failed to save to Supabase:', err);
      setError('Failed to save audio to Supabase. Please try again.');
    } finally {
      setSavingToSupabase(false);
    }
  };
  
  const handleResetValues = () => {
    setSpeed(1);
    setStability(0.5);
    setSimilarity(0.75);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (!conceptId) {
    return <div>Concept ID is required</div>;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="font-medium text-lg mb-2">AI Voiceover Generator</h3>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="generate">Generate Voice</TabsTrigger>
          <TabsTrigger value="saved">Saved Voiceovers</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate" className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Editable Script */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Script</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={editableScript}
                onChange={e => setEditableScript(e.target.value)}
                placeholder="Enter or edit script for voiceover..."
                rows={10}
                className="w-full"
              />
            </CardContent>
          </Card>
          
          <div className="flex items-center space-x-2">
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
          
          {/* Model Selection */}
          <div className="mt-2">
            <label className="text-xs text-gray-500 mb-1 block">Select Model</label>
            <Select 
              value={selectedModel} 
              onValueChange={setSelectedModel} 
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {VOICE_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} {model.isDiscounted && (
                      <span className="ml-2 text-xs bg-emerald-100 text-emerald-800 rounded px-1.5 py-0.5">
                        50% cheaper
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Display the selected model description separately */}
            {selectedModel && (
              <div className="text-xs text-gray-500 mt-1">
                {VOICE_MODELS.find(m => m.id === selectedModel)?.description}
              </div>
            )}
          </div>
          
          {/* Voice settings sliders */}
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Speed</span>
                <div className="flex justify-between w-full">
                  <span className="ml-4">Slower</span>
                  <span>Faster</span>
                </div>
              </div>
              <Slider
                value={[speed]}
                min={0.5}
                max={2.0}
                step={0.05}
                onValueChange={(values) => setSpeed(values[0])}
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Stability</span>
                <div className="flex justify-between w-full">
                  <span className="ml-4">More variable</span>
                  <span>More stable</span>
                </div>
              </div>
              <Slider
                value={[stability]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={(values) => setStability(values[0])}
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Similarity</span>
                <div className="flex justify-between w-full">
                  <span className="ml-4">Low</span>
                  <span>High</span>
                </div>
              </div>
              <Slider
                value={[similarity]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={(values) => setSimilarity(values[0])}
                disabled={loading}
              />
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleResetValues}
                disabled={loading}
                className="text-xs"
              >
                Reset values
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={handleGenerateVoice} 
            disabled={loading || !selectedVoice || !editableScript}
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
                onClick={() => handlePlayAudio()}
              >
                {isPlaying && currentPlayingUrl === audioUrl ? (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Play
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSaveAudio}
              >
                <Save className="h-4 w-4 mr-1" />
                Download
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSaveToSupabase}
                disabled={savingToSupabase}
              >
                {savingToSupabase ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-1" />
                    Save to Library
                  </>
                )}
              </Button>
            </div>
          )}
          
          {/* Display saved URL if available */}
          {savedUrl && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
              <div className="font-medium text-green-700">Audio saved to library</div>
              <p className="text-xs text-green-600">
                This voiceover has been saved to your library and will be available in the "Saved Voiceovers" tab.
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="saved" className="space-y-4">
          {loadingSaved ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : savedVoiceovers.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded">
              <FileAudio className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No saved voiceovers yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Generate a voice and click "Save to Library" to save it here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {savedVoiceovers.map((voiceover, index) => (
                <Card key={index} className="overflow-hidden">
                  <div className="flex items-center p-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{voiceover.name.split('-').pop()}</h4>
                      <div className="flex space-x-4 text-xs text-gray-500 mt-1">
                        <span>{formatDate(voiceover.created_at)}</span>
                        <span>{formatFileSize(voiceover.size)}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePlayAudio(voiceover.url)}
                      >
                        {isPlaying && currentPlayingUrl === voiceover.url ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            Play
                          </>
                        )}
                      </Button>
                      <a 
                        href={voiceover.url}
                        download
                        target="_blank"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchSavedVoiceovers}
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 