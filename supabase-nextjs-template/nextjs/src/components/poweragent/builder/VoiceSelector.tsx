"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Voice {
  id: string;
  name: string;
  description: string;
  gender: string;
  accent?: string;
  useCase?: string;
  preview?: string;
}

interface VoiceSelectorProps {
  provider: string;
  selectedVoice: string;
  onSelect: (voiceId: string) => void;
}

const voiceDatabase: Record<string, Voice[]> = {
  openai: [
    { id: "alloy", name: "Alloy", description: "Neutral and balanced", gender: "neutral" },
    { id: "echo", name: "Echo", description: "Warm and engaging", gender: "male" },
    { id: "fable", name: "Fable", description: "Expressive British accent", gender: "neutral", accent: "British" },
    { id: "onyx", name: "Onyx", description: "Deep and authoritative", gender: "male" },
    { id: "nova", name: "Nova", description: "Friendly and warm", gender: "female" },
    { id: "shimmer", name: "Shimmer", description: "Clear and energetic", gender: "female" },
  ],
  elevenlabs: [
    { id: "rachel", name: "Rachel", description: "Natural American voice", gender: "female", accent: "American", useCase: "narration" },
    { id: "domi", name: "Domi", description: "Young and energetic", gender: "female", useCase: "assistant" },
    { id: "bella", name: "Bella", description: "Warm and friendly", gender: "female", useCase: "customer service" },
    { id: "antoni", name: "Antoni", description: "Professional male voice", gender: "male", accent: "American" },
    { id: "elli", name: "Elli", description: "Clear and articulate", gender: "female", accent: "American" },
    { id: "josh", name: "Josh", description: "Deep and confident", gender: "male", useCase: "narration" },
    { id: "arnold", name: "Arnold", description: "Authoritative and strong", gender: "male" },
    { id: "adam", name: "Adam", description: "Natural conversational", gender: "male" },
    { id: "sam", name: "Sam", description: "Versatile and clear", gender: "male" },
  ],
  xsai: [
    { id: "grok-default", name: "Grok", description: "AI assistant voice", gender: "neutral", useCase: "assistant" },
  ],
};

export function VoiceSelector({ provider, selectedVoice, onSelect }: VoiceSelectorProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const voices = voiceDatabase[provider] || [];

  const playPreview = (voiceId: string) => {
    if (playingVoice === voiceId) {
      setPlayingVoice(null);
      // Stop audio playback
    } else {
      setPlayingVoice(voiceId);
      // Start audio playback
      setTimeout(() => setPlayingVoice(null), 3000); // Simulate 3s preview
    }
  };

  const getGenderIcon = (gender: string) => {
    switch (gender) {
      case "male":
        return <User className="h-3 w-3" />;
      case "female":
        return <User className="h-3 w-3" />;
      default:
        return <Sparkles className="h-3 w-3" />;
    }
  };

  const getGenderColor = (gender: string) => {
    switch (gender) {
      case "male":
        return "bg-blue-100 text-blue-800";
      case "female":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-purple-100 text-purple-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice Gallery</CardTitle>
        <CardDescription>
          Preview and select from available voices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {voices.map((voice) => (
            <div
              key={voice.id}
              className={cn(
                "relative p-4 border rounded-lg cursor-pointer transition-all",
                selectedVoice === voice.id
                  ? "border-primary bg-primary/5"
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => onSelect(voice.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-medium">{voice.name}</h4>
                  <p className="text-sm text-muted-foreground">{voice.description}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    playPreview(voice.id);
                  }}
                >
                  {playingVoice === voice.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex gap-2 mt-3">
                <Badge variant="secondary" className={cn("text-xs", getGenderColor(voice.gender))}>
                  <span className="flex items-center gap-1">
                    {getGenderIcon(voice.gender)}
                    {voice.gender}
                  </span>
                </Badge>
                {voice.accent && (
                  <Badge variant="outline" className="text-xs">
                    {voice.accent}
                  </Badge>
                )}
                {voice.useCase && (
                  <Badge variant="outline" className="text-xs">
                    {voice.useCase}
                  </Badge>
                )}
              </div>

              {selectedVoice === voice.id && (
                <div className="absolute top-2 right-2">
                  <Badge className="text-xs">Selected</Badge>
                </div>
              )}
            </div>
          ))}
        </div>

        {voices.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No voices available for this provider
          </div>
        )}
      </CardContent>
    </Card>
  );
} 