"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Loader2, 
  Copy, 
  RefreshCw, 
  Sparkles, 
  Clock,
  Eye
} from 'lucide-react';

interface AnimationFrame {
  id: string;
  frameNumber: number;
  duration: number; // in seconds
  description: string;
  elements: string[];
  transition: string;
  easing: string;
}

interface AnimationSequence {
  id: string;
  name: string;
  totalDuration: number;
  style: 'smooth' | 'energetic' | 'elegant' | 'playful' | 'professional';
  frames: AnimationFrame[];
  description: string;
  bestFor: string[];
}

interface AnimationSequenceSuggesterProps {
  contentElements?: string[];
  bannerDimensions?: string;
  onSequenceSelect?: (sequence: AnimationSequence) => void;
}

const ANIMATION_STYLES = [
  { value: 'smooth', label: 'Smooth & Flowing', description: 'Gentle transitions, professional feel' },
  { value: 'energetic', label: 'Energetic & Dynamic', description: 'Quick movements, attention-grabbing' },
  { value: 'elegant', label: 'Elegant & Sophisticated', description: 'Refined animations, luxury feel' },
  { value: 'playful', label: 'Playful & Fun', description: 'Bouncy effects, engaging interactions' },
  { value: 'professional', label: 'Professional & Clean', description: 'Minimal animations, business-focused' }
];

const COMMON_ELEMENTS = [
  'Logo', 'Headline', 'Product Image', 'CTA Button', 'Background', 
  'Price/Offer', 'Subheadline', 'Icons', 'Decorative Elements'
];

export default function AnimationSequenceSuggester({
  contentElements = [],
  bannerDimensions = '',
  onSequenceSelect
}: AnimationSequenceSuggesterProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSequences, setGeneratedSequences] = useState<AnimationSequence[]>([]);
  const [selectedElements, setSelectedElements] = useState<string[]>(contentElements);
  const [customElement, setCustomElement] = useState('');
  const [animationStyle, setAnimationStyle] = useState<string>('');
  const [targetDuration, setTargetDuration] = useState('5');
  const [bannerType, setBannerType] = useState('');

  const generateSequences = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/ai/generate-animation-sequence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elements: selectedElements,
          style: animationStyle,
          duration: parseInt(targetDuration),
          dimensions: bannerDimensions,
          bannerType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate animation sequences');
      }

      const result = await response.json();
      setGeneratedSequences(result.sequences || []);
    } catch (error) {
      console.error('Error generating animation sequences:', error);
      // Fallback with sample sequences for demo
      setGeneratedSequences([
        {
          id: 'sample-1',
          name: 'Classic Reveal',
          totalDuration: 5,
          style: 'smooth',
          description: 'Elements appear sequentially with smooth transitions',
          bestFor: ['Product launches', 'Brand awareness', 'Professional services'],
          frames: [
            {
              id: 'frame-1',
              frameNumber: 1,
              duration: 1,
              description: 'Background fades in',
              elements: ['Background'],
              transition: 'Fade in',
              easing: 'ease-in'
            },
            {
              id: 'frame-2',
              frameNumber: 2,
              duration: 1.5,
              description: 'Logo slides in from left',
              elements: ['Logo'],
              transition: 'Slide from left',
              easing: 'ease-out'
            },
            {
              id: 'frame-3',
              frameNumber: 3,
              duration: 1.5,
              description: 'Headline types in',
              elements: ['Headline'],
              transition: 'Type writer effect',
              easing: 'linear'
            },
            {
              id: 'frame-4',
              frameNumber: 4,
              duration: 1,
              description: 'CTA button bounces in',
              elements: ['CTA Button'],
              transition: 'Bounce in',
              easing: 'ease-out'
            }
          ]
        },
        {
          id: 'sample-2',
          name: 'Dynamic Zoom',
          totalDuration: 4,
          style: 'energetic',
          description: 'High-energy sequence with zoom effects and quick transitions',
          bestFor: ['Sales promotions', 'Limited time offers', 'Youth brands'],
          frames: [
            {
              id: 'frame-5',
              frameNumber: 1,
              duration: 0.5,
              description: 'Product zooms in dramatically',
              elements: ['Product Image'],
              transition: 'Zoom in',
              easing: 'ease-in-out'
            },
            {
              id: 'frame-6',
              frameNumber: 2,
              duration: 1,
              description: 'Headline explodes in with particles',
              elements: ['Headline'],
              transition: 'Explode in',
              easing: 'ease-out'
            },
            {
              id: 'frame-7',
              frameNumber: 3,
              duration: 1.5,
              description: 'Price flashes with glow effect',
              elements: ['Price/Offer'],
              transition: 'Flash with glow',
              easing: 'ease-in-out'
            },
            {
              id: 'frame-8',
              frameNumber: 4,
              duration: 1,
              description: 'CTA pulses urgently',
              elements: ['CTA Button'],
              transition: 'Pulse',
              easing: 'ease-in-out'
            }
          ]
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const addCustomElement = () => {
    if (customElement.trim() && !selectedElements.includes(customElement.trim())) {
      setSelectedElements([...selectedElements, customElement.trim()]);
      setCustomElement('');
    }
  };

  const removeElement = (element: string) => {
    setSelectedElements(selectedElements.filter(e => e !== element));
  };

  const toggleElement = (element: string) => {
    if (selectedElements.includes(element)) {
      removeElement(element);
    } else {
      setSelectedElements([...selectedElements, element]);
    }
  };

  const copySequence = (sequence: AnimationSequence) => {
    const content = `
ANIMATION SEQUENCE: ${sequence.name}

Style: ${sequence.style}
Total Duration: ${sequence.totalDuration}s
Description: ${sequence.description}

Best For: ${sequence.bestFor.join(', ')}

FRAMES:
${sequence.frames.map(frame => 
  `Frame ${frame.frameNumber} (${frame.duration}s): ${frame.description}
  Elements: ${frame.elements.join(', ')}
  Transition: ${frame.transition}
  Easing: ${frame.easing}`
).join('\n\n')}
    `;

    navigator.clipboard.writeText(content);
  };

  const getStyleColor = (style: string) => {
    const colors: Record<string, string> = {
      'smooth': 'bg-blue-100 text-blue-800',
      'energetic': 'bg-red-100 text-red-800',
      'elegant': 'bg-purple-100 text-purple-800',
      'playful': 'bg-yellow-100 text-yellow-800',
      'professional': 'bg-gray-100 text-gray-800'
    };
    return colors[style] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Play className="h-5 w-5 mr-2 text-green-600" />
          Animation Sequence Suggester
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bannerType">Banner Type</Label>
              <Select value={bannerType} onValueChange={setBannerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select banner type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="display">Display Ad</SelectItem>
                  <SelectItem value="social">Social Media Banner</SelectItem>
                  <SelectItem value="web">Web Banner</SelectItem>
                  <SelectItem value="email">Email Header</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="targetDuration">Target Duration (seconds)</Label>
              <Input
                id="targetDuration"
                type="number"
                value={targetDuration}
                onChange={(e) => setTargetDuration(e.target.value)}
                min="2"
                max="15"
                placeholder="5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="animationStyle">Animation Style</Label>
            <Select value={animationStyle} onValueChange={setAnimationStyle}>
              <SelectTrigger>
                <SelectValue placeholder="Choose animation style" />
              </SelectTrigger>
              <SelectContent>
                {ANIMATION_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    <div>
                      <div className="font-medium">{style.label}</div>
                      <div className="text-xs text-gray-500">{style.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content Elements */}
          <div>
            <Label>Content Elements</Label>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {COMMON_ELEMENTS.map((element) => (
                  <Badge
                    key={element}
                    variant={selectedElements.includes(element) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleElement(element)}
                  >
                    {element}
                  </Badge>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={customElement}
                  onChange={(e) => setCustomElement(e.target.value)}
                  placeholder="Add custom element"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addCustomElement();
                    }
                  }}
                />
                <Button variant="outline" size="sm" onClick={addCustomElement}>
                  Add
                </Button>
              </div>
              
              {selectedElements.length > 0 && (
                <div className="text-sm text-gray-600">
                  Selected: {selectedElements.join(', ')}
                </div>
              )}
            </div>
          </div>
          
          <Button 
            onClick={generateSequences} 
            disabled={isGenerating || selectedElements.length === 0 || !animationStyle}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating Animation Sequences...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Animation Sequences
              </>
            )}
          </Button>
        </div>

        {/* Generated Sequences */}
        {generatedSequences.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Generated Animation Sequences</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={generateSequences}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>
            
            <div className="grid gap-6">
              {generatedSequences.map((sequence) => (
                <Card key={sequence.id} className="border-2 border-green-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CardTitle className="text-lg">{sequence.name}</CardTitle>
                        <Badge className={getStyleColor(sequence.style)}>
                          {sequence.style}
                        </Badge>
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          {sequence.totalDuration}s
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copySequence(sequence)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSequenceSelect?.(sequence)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Use This Sequence
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{sequence.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-gray-500">Best for:</span>
                      {sequence.bestFor.map((use, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {use}
                        </Badge>
                      ))}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <h4 className="font-medium">Animation Timeline</h4>
                      <div className="space-y-3">
                        {sequence.frames.map((frame) => (
                          <div key={frame.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-semibold">
                                  {frame.frameNumber}
                                </div>
                                <span className="font-medium text-sm">{frame.description}</span>
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="h-3 w-3 mr-1" />
                                {frame.duration}s
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="font-medium text-gray-700">Elements:</span>
                                <div className="text-gray-600">{frame.elements.join(', ')}</div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Transition:</span>
                                <div className="text-gray-600">{frame.transition}</div>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Easing:</span>
                                <div className="text-gray-600">{frame.easing}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-2">🎬 Animation Tips</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Keep animations under 10 seconds for web banners</li>
            <li>• Use easing functions for natural movement</li>
            <li>• Ensure key information is visible for at least 2 seconds</li>
            <li>• Test animations at different screen sizes</li>
            <li>• Consider accessibility - provide pause options for sensitive users</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}