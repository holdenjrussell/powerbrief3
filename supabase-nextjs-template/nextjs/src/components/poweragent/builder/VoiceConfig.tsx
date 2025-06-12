"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Mic, Volume2, Settings, Play, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBrand } from "@/lib/context/BrandContext";

interface VoiceConfigData {
  enabled?: boolean;
  provider?: string;
  tts?: {
    model: string;
    voice: string;
    speed: number;
    pitch: number;
  };
  stt?: {
    model: string;
    language: string;
  };
}

interface VoiceConfigProps {
  config: VoiceConfigData;
  onChange: (config: VoiceConfigData) => void;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
}

const voiceProviders = {
  openai: {
    name: "OpenAI",
    ttsModels: ["tts-1", "tts-1-hd"],
    voices: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
    sttModels: ["whisper-1"],
  },
  elevenlabs: {
    name: "ElevenLabs",
    ttsModels: ["eleven_monolingual_v1", "eleven_multilingual_v2", "eleven_flash_v2_5", "eleven_flash_v2"],
    voices: [], // Voices will be fetched dynamically from the API
    sttModels: [],
  },
  xsai: {
    name: "xsAI (Grok)",
    ttsModels: ["grok-tts-1"],
    voices: ["grok-default"],
    sttModels: ["grok-stt-1"],
  },
};

export function VoiceConfig({ config, onChange }: VoiceConfigProps) {
  const { selectedBrand } = useBrand();
  const [enabled, setEnabled] = useState(config?.enabled ?? false);
  const [provider, setProvider] = useState(config?.provider || "openai");
  const [ttsConfig, setTtsConfig] = useState({
    model: config?.tts?.model || "tts-1",
    voice: config?.tts?.voice || "alloy",
    speed: config?.tts?.speed || 1.0,
    pitch: config?.tts?.pitch || 1.0,
  });
  const [sttConfig, setSttConfig] = useState({
    model: config?.stt?.model || "whisper-1",
    language: config?.stt?.language || "en",
  });
  const [elevenLabsVoices, setElevenLabsVoices] = useState<ElevenLabsVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [testingVoice, setTestingVoice] = useState(false);

  // Fetch ElevenLabs voices when provider changes to ElevenLabs
  useEffect(() => {
    if (provider === "elevenlabs" && selectedBrand?.id) {
      fetchElevenLabsVoices();
    } else {
      setElevenLabsVoices([]);
      setVoiceError(null);
    }
  }, [provider, selectedBrand?.id]);

  const fetchElevenLabsVoices = async () => {
    if (!selectedBrand?.id) return;

    setLoadingVoices(true);
    setVoiceError(null);

    try {
      const response = await fetch(`/api/elevenlabs?brandId=${selectedBrand.id}`);
      const data = await response.json();

      if (data.error) {
        setVoiceError(data.error);
        setElevenLabsVoices([]);
      } else {
        setElevenLabsVoices(data.voices || []);
        
        // If we have voices and current voice is not valid, set the first one
        if (data.voices?.length > 0 && !data.voices.find((v: ElevenLabsVoice) => v.voice_id === ttsConfig.voice)) {
          handleTtsChange("voice", data.voices[0].voice_id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch ElevenLabs voices:", error);
      setVoiceError("Failed to fetch available voices. Please check your network connection.");
      setElevenLabsVoices([]);
    } finally {
      setLoadingVoices(false);
    }
  };

  const updateConfig = () => {
    onChange({
      enabled,
      provider,
      tts: ttsConfig,
      stt: sttConfig,
    });
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const providerData = voiceProviders[newProvider as keyof typeof voiceProviders];
    
    // Reset to provider defaults
    setTtsConfig({
      model: providerData.ttsModels[0] || "",
      voice: providerData.voices[0] || "",
      speed: 1.0,
      pitch: 1.0,
    });
    setSttConfig({
      model: providerData.sttModels[0] || "",
      language: "en",
    });
    updateConfig();
  };

  const handleTtsChange = (field: string, value: string | number) => {
    const newConfig = { ...ttsConfig, [field]: value };
    setTtsConfig(newConfig);
    updateConfig();
  };

  const handleSttChange = (field: string, value: string) => {
    const newConfig = { ...sttConfig, [field]: value };
    setSttConfig(newConfig);
    updateConfig();
  };

  const testVoice = async () => {
    setTestingVoice(true);
    
    if (provider === "elevenlabs" && selectedBrand?.id && ttsConfig.voice) {
      try {
        const response = await fetch('/api/elevenlabs/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            voiceId: ttsConfig.voice,
            brandId: selectedBrand.id
          })
        });
        
        const data = await response.json();
        if (data.audio) {
          // Convert base64 to audio blob and play
          const audioData = atob(data.audio);
          const arrayBuffer = new ArrayBuffer(audioData.length);
          const uint8Array = new Uint8Array(arrayBuffer);
          
          for (let i = 0; i < audioData.length; i++) {
            uint8Array[i] = audioData.charCodeAt(i);
          }
          
          const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.play();
          
          // Cleanup after playing
          audio.onended = () => {
            URL.revokeObjectURL(url);
            setTestingVoice(false);
          };
        }
      } catch (error) {
        console.error("ElevenLabs voice test failed:", error);
        setTestingVoice(false);
      }
    } else if (provider === "openai" && ttsConfig.voice) {
      try {
        const response = await fetch('/api/openai-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: "Hello, this is a preview of the OpenAI voice. How does it sound?",
            voice: ttsConfig.voice,
            model: ttsConfig.model,
            speed: ttsConfig.speed
          })
        });
        
        const data = await response.json();
        if (data.audio) {
          // Convert base64 to audio blob and play
          const audioData = atob(data.audio);
          const arrayBuffer = new ArrayBuffer(audioData.length);
          const uint8Array = new Uint8Array(arrayBuffer);
          
          for (let i = 0; i < audioData.length; i++) {
            uint8Array[i] = audioData.charCodeAt(i);
          }
          
          const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.play();
          
          // Cleanup after playing
          audio.onended = () => {
            URL.revokeObjectURL(url);
            setTestingVoice(false);
          };
        } else if (data.error) {
          console.error("OpenAI TTS error:", data.error);
          setTestingVoice(false);
        }
      } catch (error) {
        console.error("OpenAI voice test failed:", error);
        setTestingVoice(false);
      }
    } else {
      // For other providers or missing configuration, just log
      console.log("Testing voice with config:", { provider, tts: ttsConfig });
    }
    
    setTestingVoice(false);
  };

  const currentProvider = voiceProviders[provider as keyof typeof voiceProviders];

  return (
    <div className="space-y-6">
      {/* Voice Enable/Disable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Voice Integration
          </CardTitle>
          <CardDescription>
            Give your agent a voice! Configure text-to-speech and speech-to-text capabilities to enable natural voice interactions with users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Voice Features</Label>
              <p className="text-sm text-muted-foreground">
                Allow your agent to speak and listen
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(checked) => {
                setEnabled(checked);
                updateConfig();
              }}
            />
          </div>
        </CardContent>
      </Card>

      {enabled && (
        <>
          {/* Provider Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Voice Provider</CardTitle>
              <CardDescription>
                Choose your voice service provider
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={provider} onValueChange={handleProviderChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    <SelectItem value="xsai">xsAI (Grok)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {provider === "elevenlabs" 
                    ? "ElevenLabs integration will use the API key configured in your brand settings. If no key is configured, it will fall back to environment variables."
                    : `Make sure you have configured API keys for ${currentProvider.name} in your environment variables.`
                  }
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Text-to-Speech Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                Text-to-Speech (TTS)
              </CardTitle>
              <CardDescription>
                Configure how your agent speaks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentProvider.ttsModels.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <Label>TTS Model</Label>
                    <Select
                      value={ttsConfig.model}
                      onValueChange={(value) => handleTtsChange("model", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentProvider.ttsModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Voice</Label>
                    {provider === "elevenlabs" ? (
                      <>
                        {loadingVoices ? (
                          <div className="flex items-center justify-center p-4 border rounded-md">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">Loading voices...</span>
                          </div>
                        ) : voiceError ? (
                          <div className="space-y-2">
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>{voiceError}</AlertDescription>
                            </Alert>
                            <Button 
                              onClick={fetchElevenLabsVoices} 
                              variant="outline" 
                              size="sm"
                              className="w-full"
                            >
                              Retry
                            </Button>
                          </div>
                        ) : elevenLabsVoices.length > 0 ? (
                          <Select
                            value={ttsConfig.voice}
                            onValueChange={(value) => handleTtsChange("voice", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {elevenLabsVoices.map((voice) => (
                                <SelectItem key={voice.voice_id} value={voice.voice_id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{voice.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">
                                      {voice.category}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              No ElevenLabs API key configured for this brand. Please configure it in Brand Settings.
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    ) : (
                      <Select
                        value={ttsConfig.voice}
                        onValueChange={(value) => handleTtsChange("voice", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currentProvider.voices.map((voice) => (
                            <SelectItem key={voice} value={voice}>
                              {voice.charAt(0).toUpperCase() + voice.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Speed ({ttsConfig.speed}x)</Label>
                    <Slider
                      value={[ttsConfig.speed]}
                      onValueChange={([value]) => handleTtsChange("speed", value)}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pitch ({ttsConfig.pitch}x)</Label>
                    <Slider
                      value={[ttsConfig.pitch]}
                      onValueChange={([value]) => handleTtsChange("pitch", value)}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                    />
                  </div>

                  <Button 
                    onClick={testVoice} 
                    variant="outline" 
                    className="w-full"
                    disabled={testingVoice}
                  >
                    {testingVoice ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {testingVoice ? "Testing..." : "Test Voice"}
                  </Button>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {currentProvider.name} does not support text-to-speech.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Speech-to-Text Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Speech-to-Text (STT)
              </CardTitle>
              <CardDescription>
                Configure how your agent listens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentProvider.sttModels.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <Label>STT Model</Label>
                    <Select
                      value={sttConfig.model}
                      onValueChange={(value) => handleSttChange("model", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentProvider.sttModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={sttConfig.language}
                      onValueChange={(value) => handleSttChange("language", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                        <SelectItem value="ko">Korean</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {currentProvider.name} does not support speech-to-text.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Settings
              </CardTitle>
              <CardDescription>
                Fine-tune voice behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Voice features require proper API configuration and may incur additional costs.
                  Check your provider&apos;s pricing before enabling.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
} 