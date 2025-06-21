'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Save, Volume2, RefreshCw, Pause, Database, FileAudio, ChevronDown, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scene } from '@/lib/types/powerbrief';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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

type ConceptVoiceGeneratorProps = {
  scenes: Scene[];
  spokenHooks?: string;
  ctaScript?: string;
  className?: string;
  conceptId?: string;
  brandId?: string;
};

export default function ConceptVoiceGenerator({ 
  scenes, 
  spokenHooks = '',
  ctaScript = '', 
  className = '',
  conceptId = '',
  brandId = ''
}: ConceptVoiceGeneratorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [combinedScript, setCombinedScript] = useState<string>('');
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

  // Voice preview states
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [previewAudioElement, setPreviewAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [currentPreviewVoice, setCurrentPreviewVoice] = useState<string | null>(null);

  // NEW: Collapsible state and initialization tracking
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);

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

  // Modified fetchVoices function to be called only when needed
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

  // Modified fetchSavedVoiceovers function
  const fetchSavedVoiceovers = async () => {
    if (!conceptId) return;
    
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

  // NEW: Initialize data only when expanded for the first time
  const initializeElevenLabsData = async () => {
    if (hasInitialized) return;
    
    setHasInitialized(true);
    await Promise.all([
      fetchVoices(),
      conceptId ? fetchSavedVoiceovers() : Promise.resolve()
    ]);
  };

  // Handle expansion toggle
  const handleToggleExpansion = async () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    
    // Initialize data when expanding for the first time
    if (newExpandedState && !hasInitialized) {
      await initializeElevenLabsData();
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
      
      setPreviewAudioUrl(url);
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
  
  const handleResetValues = () => {
    setSpeed(1);
    setStability(0.5);
    setSimilarity(0.75);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
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

  // If there are no scenes with script content, don't render anything
  if (!combinedScript) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Collapsible open={isExpanded} onOpenChange={handleToggleExpansion}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between p-0 h-auto font-medium text-sm hover:bg-transparent"
          >
            <div className="flex items-center space-x-2">
              <Volume2 className="h-4 w-4" />
              <span>AI Voiceover Generator</span>
              {savedVoiceovers.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {savedVoiceovers.length} saved
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-4 pt-3">
          {!hasInitialized && isExpanded && (
            <div className="flex justify-center p-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading ElevenLabs voices...</span>
              </div>
            </div>
          )}
          
          {hasInitialized && (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="generate">Generate Voice</TabsTrigger>
          {conceptId && <TabsTrigger value="saved">Saved Voiceovers</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="generate" className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-3">
            {/* Voice Selection with Preview */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Select Voice</label>
              <div className="border rounded-md p-3 max-h-[300px] overflow-y-auto">
                {Object.entries(groupVoicesByCategory(voices)).map(([category, groupVoices]) => (
                  <div key={category} className="mb-4 last:mb-0">
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
              
              {conceptId && (
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
              )}
            </div>
          )}
          
          {/* Display saved URL if available */}
          {savedUrl && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
              <div className="font-medium text-green-700">Audio saved to library</div>
              <p className="text-xs text-green-600">
                This voiceover has been saved to your library and will be available in the &quot;Saved Voiceovers&quot; tab.
              </p>
            </div>
          )}
        </TabsContent>
        
        {conceptId && (
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
                  Generate a voice and click &quot;Save to Library&quot; to save it here
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
        )}
      </Tabs>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
} 