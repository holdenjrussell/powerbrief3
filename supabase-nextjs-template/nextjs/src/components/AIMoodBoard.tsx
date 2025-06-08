"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Palette, 
  Loader2, 
  Download, 
  RefreshCw, 
  Sparkles, 
  Eye,
  Plus,
  X
} from 'lucide-react';

interface MoodBoardItem {
  id: string;
  type: 'image' | 'color' | 'typography' | 'pattern';
  url?: string;
  color?: string;
  title: string;
  description: string;
  source?: string;
}

interface MoodBoard {
  id: string;
  theme: string;
  items: MoodBoardItem[];
  colorPalette: string[];
  typographyStyles: string[];
  overallMood: string;
}

interface AIMoodBoardProps {
  lookAndFeelKeywords?: string[];
  onMoodBoardSelect?: (moodBoard: MoodBoard) => void;
  onColorPaletteSelect?: (colors: string[]) => void;
}

export default function AIMoodBoard({
  lookAndFeelKeywords = [],
  onMoodBoardSelect,
  onColorPaletteSelect
}: AIMoodBoardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMoodBoards, setGeneratedMoodBoards] = useState<MoodBoard[]>([]);
  const [customKeywords, setCustomKeywords] = useState<string[]>(lookAndFeelKeywords);
  const [newKeyword, setNewKeyword] = useState('');

  const generateMoodBoard = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/ai/generate-mood-board', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: customKeywords
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate mood board');
      }

      const result = await response.json();
      
      // Transform the response into MoodBoard objects
      const moodBoards: MoodBoard[] = result.moodBoards || [];
      setGeneratedMoodBoards(moodBoards);
    } catch (error) {
      console.error('Error generating mood board:', error);
      // Fallback with sample mood boards for demo
      setGeneratedMoodBoards([
        {
          id: 'sample-1',
          theme: 'Minimal & Clean',
          overallMood: 'Sophisticated, calming, and professional',
          colorPalette: ['#FFFFFF', '#F8F9FA', '#E9ECEF', '#6C757D', '#212529'],
          typographyStyles: ['Sans-serif', 'Light weight', 'Generous spacing'],
          items: [
            {
              id: 'item-1',
              type: 'color',
              color: '#FFFFFF',
              title: 'Pure White',
              description: 'Clean, spacious feeling'
            },
            {
              id: 'item-2',
              type: 'color',
              color: '#F8F9FA',
              title: 'Soft Gray',
              description: 'Subtle background tone'
            },
            {
              id: 'item-3',
              type: 'typography',
              title: 'Helvetica Light',
              description: 'Clean, readable sans-serif'
            }
          ]
        },
        {
          id: 'sample-2',
          theme: 'Bold & Energetic',
          overallMood: 'Dynamic, exciting, and attention-grabbing',
          colorPalette: ['#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#4ECDC4'],
          typographyStyles: ['Bold sans-serif', 'High contrast', 'Dynamic angles'],
          items: [
            {
              id: 'item-4',
              type: 'color',
              color: '#FF6B35',
              title: 'Vibrant Orange',
              description: 'Energy and enthusiasm'
            },
            {
              id: 'item-5',
              type: 'color',
              color: '#06FFA5',
              title: 'Electric Green',
              description: 'Fresh and modern'
            },
            {
              id: 'item-6',
              type: 'typography',
              title: 'Montserrat Bold',
              description: 'Strong, impactful headlines'
            }
          ]
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !customKeywords.includes(newKeyword.trim())) {
      setCustomKeywords([...customKeywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (index: number) => {
    setCustomKeywords(customKeywords.filter((_, i) => i !== index));
  };

  const downloadMoodBoard = (moodBoard: MoodBoard) => {
    // Create a simple text representation for download
    const content = `
MOOD BOARD: ${moodBoard.theme}

Overall Mood: ${moodBoard.overallMood}

Color Palette:
${moodBoard.colorPalette.map(color => `- ${color}`).join('\n')}

Typography Styles:
${moodBoard.typographyStyles.map(style => `- ${style}`).join('\n')}

Elements:
${moodBoard.items.map(item => `- ${item.title}: ${item.description}`).join('\n')}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mood-board-${moodBoard.theme.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Palette className="h-5 w-5 mr-2 text-purple-600" />
          AI-Powered Mood Board Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Keywords Input */}
        <div className="space-y-4">
          <div>
            <Label>Look & Feel Keywords</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {customKeywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {keyword}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeKeyword(index)}
                  />
                </Badge>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Add keyword (e.g., Minimal, Bold, Luxurious)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addKeyword();
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={addKeyword}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={generateMoodBoard} 
            disabled={isGenerating || customKeywords.length === 0}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating Mood Board...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Mood Board
              </>
            )}
          </Button>
        </div>

        {/* Generated Mood Boards */}
        {generatedMoodBoards.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Generated Mood Boards</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={generateMoodBoard}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>
            
            <div className="grid gap-6">
              {generatedMoodBoards.map((moodBoard) => (
                <Card key={moodBoard.id} className="border-2 border-purple-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{moodBoard.theme}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadMoodBoard(moodBoard)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onMoodBoardSelect?.(moodBoard)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Use This Board
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{moodBoard.overallMood}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Color Palette */}
                    <div>
                      <h4 className="font-medium mb-2">Color Palette</h4>
                      <div className="flex flex-wrap gap-2">
                        {moodBoard.colorPalette.map((color, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div
                              className="w-8 h-8 rounded border border-gray-300"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm font-mono">{color}</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => onColorPaletteSelect?.(moodBoard.colorPalette)}
                      >
                        Apply Color Palette
                      </Button>
                    </div>

                    {/* Typography Styles */}
                    <div>
                      <h4 className="font-medium mb-2">Typography Styles</h4>
                      <div className="flex flex-wrap gap-2">
                        {moodBoard.typographyStyles.map((style, index) => (
                          <Badge key={index} variant="outline">
                            {style}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Mood Board Items */}
                    <div>
                      <h4 className="font-medium mb-2">Visual Elements</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {moodBoard.items.map((item) => (
                          <div key={item.id} className="border rounded-lg p-3">
                            <div className="flex items-center space-x-3">
                              {item.type === 'color' && item.color && (
                                <div
                                  className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                              )}
                              <div className="flex-1">
                                <h5 className="font-medium text-sm">{item.title}</h5>
                                <p className="text-xs text-gray-600">{item.description}</p>
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
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-900 mb-2">🎨 Mood Board Tips</h4>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Use 3-5 keywords for best results</li>
            <li>• Combine contrasting styles for unique aesthetics</li>
            <li>• Consider your target audience when selecting moods</li>
            <li>• Save multiple variations to compare options</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}