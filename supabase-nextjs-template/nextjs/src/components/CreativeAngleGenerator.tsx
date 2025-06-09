"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Loader2, Copy, RefreshCw, Sparkles } from 'lucide-react';

interface CreativeAngle {
  id: string;
  angle: string;
  rationale: string;
  targetEmotion: string;
  suggestedVisuals: string;
}

interface CreativeAngleGeneratorProps {
  productInfo?: string;
  offer?: string;
  targetAudience?: string;
  onAngleSelect?: (angle: CreativeAngle) => void;
}

export default function CreativeAngleGenerator({
  productInfo = '',
  offer = '',
  targetAudience = '',
  onAngleSelect
}: CreativeAngleGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAngles, setGeneratedAngles] = useState<CreativeAngle[]>([]);
  const [customProduct, setCustomProduct] = useState(productInfo);
  const [customOffer, setCustomOffer] = useState(offer);
  const [customAudience, setCustomAudience] = useState(targetAudience);

  const generateAngles = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/ai/generate-creative-angles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productInfo: customProduct,
          offer: customOffer,
          targetAudience: customAudience
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate creative angles');
      }

      const result = await response.json();
      
      // Transform the response into CreativeAngle objects
      const angles: CreativeAngle[] = result.angles?.map((angle: {
        hook?: string;
        angle?: string;
        rationale?: string;
        reasoning?: string;
        emotion?: string;
        target_emotion?: string;
        visuals?: string;
        suggested_visuals?: string;
      }, index: number) => ({
        id: `angle-${Date.now()}-${index}`,
        angle: angle.hook || angle.angle || '',
        rationale: angle.rationale || angle.reasoning || '',
        targetEmotion: angle.emotion || angle.target_emotion || 'Engagement',
        suggestedVisuals: angle.visuals || angle.suggested_visuals || ''
      })) || [];

      setGeneratedAngles(angles);
    } catch (error) {
      console.error('Error generating creative angles:', error);
      // Fallback with sample angles for demo
      setGeneratedAngles([
        {
          id: 'sample-1',
          angle: 'Transform your daily routine with our game-changing solution',
          rationale: 'Appeals to desire for improvement and positions product as transformative',
          targetEmotion: 'Aspiration',
          suggestedVisuals: 'Before/after scenarios, transformation imagery'
        },
        {
          id: 'sample-2',
          angle: 'Join thousands who have already discovered the secret',
          rationale: 'Uses social proof and curiosity to drive engagement',
          targetEmotion: 'FOMO',
          suggestedVisuals: 'Community imagery, testimonials, numbers/stats'
        },
        {
          id: 'sample-3',
          angle: 'Finally, a solution that actually works',
          rationale: 'Addresses frustration with existing solutions and promises reliability',
          targetEmotion: 'Relief',
          suggestedVisuals: 'Problem-solving imagery, satisfied customers'
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      'Aspiration': 'bg-blue-100 text-blue-800',
      'FOMO': 'bg-orange-100 text-orange-800',
      'Relief': 'bg-green-100 text-green-800',
      'Excitement': 'bg-purple-100 text-purple-800',
      'Trust': 'bg-indigo-100 text-indigo-800',
      'Curiosity': 'bg-yellow-100 text-yellow-800',
      'Urgency': 'bg-red-100 text-red-800',
      'Engagement': 'bg-gray-100 text-gray-800'
    };
    return colors[emotion] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lightbulb className="h-5 w-5 mr-2 text-yellow-600" />
          AI Creative Angle Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="productInfo">Product Information</Label>
            <Textarea
              id="productInfo"
              value={customProduct}
              onChange={(e) => setCustomProduct(e.target.value)}
              placeholder="Describe your product, its key features, and benefits..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="offer">Current Offer</Label>
              <Input
                id="offer"
                value={customOffer}
                onChange={(e) => setCustomOffer(e.target.value)}
                placeholder="e.g., 20% off, Buy one get one free"
              />
            </div>
            
            <div>
              <Label htmlFor="audience">Target Audience</Label>
              <Input
                id="audience"
                value={customAudience}
                onChange={(e) => setCustomAudience(e.target.value)}
                placeholder="e.g., Busy professionals, New parents"
              />
            </div>
          </div>
          
          <Button 
            onClick={generateAngles} 
            disabled={isGenerating || !customProduct.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating Creative Angles...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Creative Angles
              </>
            )}
          </Button>
        </div>

        {/* Generated Angles */}
        {generatedAngles.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Generated Creative Angles</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={generateAngles}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>
            
            <div className="grid gap-4">
              {generatedAngles.map((angle) => (
                <Card key={angle.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Main Angle */}
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-gray-900 flex-1">
                          &ldquo;{angle.angle}&rdquo;
                        </h4>
                        <div className="flex items-center space-x-2 ml-4">
                          <Badge className={getEmotionColor(angle.targetEmotion)}>
                            {angle.targetEmotion}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(angle.angle)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Rationale */}
                      <div>
                        <p className="text-sm text-gray-600">
                          <strong>Why this works:</strong> {angle.rationale}
                        </p>
                      </div>
                      
                      {/* Suggested Visuals */}
                      {angle.suggestedVisuals && (
                        <div>
                          <p className="text-sm text-gray-600">
                            <strong>Visual suggestions:</strong> {angle.suggestedVisuals}
                          </p>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAngleSelect?.(angle)}
                        >
                          Use This Angle
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(`${angle.angle}\n\nRationale: ${angle.rationale}\nVisuals: ${angle.suggestedVisuals}`)}
                        >
                          Copy Full Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Tips for Better Angles</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Be specific about your product&apos;s unique value proposition</li>
            <li>• Include emotional benefits, not just functional features</li>
            <li>• Mention your target audience&apos;s pain points or desires</li>
            <li>• Consider seasonal or trending topics relevant to your audience</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}