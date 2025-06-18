"use client";

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Textarea,
  Progress,
  Alert,
  AlertDescription,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Separator
} from '@/components/ui';
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  FileText,
  Search,
  MessageSquare,
  Globe,
  TrendingUp,
  Youtube,
  Target,
  Brain,
  Lightbulb,
  Copy,
  Plus,
  ExternalLink,
  Info,
  Play,
  Zap
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { OneSheet } from '@/lib/types/onesheet';

interface GuidedOneSheetFlowProps {
  onesheet: OneSheet;
  onUpdate: (updates: Partial<OneSheet>) => void;
  onAutoSave: (field: string, value: any) => void;
}

interface ResearchStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'in-progress' | 'completed';
  automatedPrompts?: string[];
}

export function GuidedOneSheetFlow({ onesheet, onUpdate, onAutoSave }: GuidedOneSheetFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [researchSteps, setResearchSteps] = useState<ResearchStep[]>([
    {
      id: 'basic-info',
      title: 'Basic Information',
      description: 'Product details and URLs for automated research',
      icon: <FileText className="h-5 w-5" />,
      status: onesheet.product && onesheet.landing_page_url ? 'completed' : 'pending'
    },
    {
      id: 'my-knowledge',
      title: 'My Knowledge',
      description: 'Document your initial assumptions and hypotheses',
      icon: <Brain className="h-5 w-5" />,
      status: onesheet.angles.length > 0 ? 'completed' : 'pending'
    },
    {
      id: 'ai-research',
      title: 'AI Market Research',
      description: 'Understand the wider market context and general pain points',
      icon: <Sparkles className="h-5 w-5" />,
      status: 'pending',
      automatedPrompts: ['market_analysis', 'category_benefits', 'category_pain_points']
    },
    {
      id: 'voc-analysis',
      title: 'Voice of Customer Analysis',
      description: 'Extract insights from reviews, surveys, and support tickets',
      icon: <MessageSquare className="h-5 w-5" />,
      status: 'pending',
      automatedPrompts: ['review_analysis', 'customer_language', 'objections_failed_solutions']
    },
    {
      id: 'social-listening',
      title: 'Social Listening',
      description: 'Analyze Reddit, Quora, and ad comments for unfiltered opinions',
      icon: <Search className="h-5 w-5" />,
      status: 'pending'
    },
    {
      id: 'article-research',
      title: 'Article & Authority Research',
      description: 'Find statistics and third-party validation',
      icon: <Globe className="h-5 w-5" />,
      status: 'pending',
      automatedPrompts: ['article_statistics', 'authority_sources']
    },
    {
      id: 'organic-inspiration',
      title: 'Organic Content Inspiration',
      description: 'Discover viral TikTok and YouTube content for ad ideas',
      icon: <Youtube className="h-5 w-5" />,
      status: 'pending'
    },
    {
      id: 'competitor-analysis',
      title: 'Competitor Deep Dive',
      description: 'Find gaps and positioning opportunities',
      icon: <Target className="h-5 w-5" />,
      status: onesheet.competitor_analysis.length > 0 ? 'completed' : 'pending',
      automatedPrompts: ['competitor_gaps', 'positioning_opportunities']
    },
    {
      id: 'creative-synthesis',
      title: 'Creative Synthesis',
      description: 'Generate concepts, hooks, and visuals from all research',
      icon: <Lightbulb className="h-5 w-5" />,
      status: 'pending',
      automatedPrompts: ['concept_generation', 'hook_extraction', 'visual_ideas']
    }
  ]);

  const [showExplanation, setShowExplanation] = useState(true);

  // Auto-advance when basic info is complete
  useEffect(() => {
    if (onesheet.product && onesheet.landing_page_url && onesheet.customer_reviews_url) {
      const updatedSteps = [...researchSteps];
      updatedSteps[0].status = 'completed';
      setResearchSteps(updatedSteps);
      
      // Automatically start the research process
      if (currentStep === 0) {
        handleStartAutomatedResearch();
      }
    }
  }, [onesheet.product, onesheet.landing_page_url, onesheet.customer_reviews_url]);

  const handleStartAutomatedResearch = async () => {
    setIsProcessing(true);
    setCurrentStep(1);
    
    // Simulate automated research process
    // In reality, this would chain multiple AI calls
    toast({
      title: "🚀 Automated Research Started",
      description: "AI is now analyzing your product across multiple sources...",
    });

    // Move through automated steps
    for (let i = 2; i <= 6; i++) {
      if (researchSteps[i].automatedPrompts) {
        await simulateStepCompletion(i);
      }
    }

    setIsProcessing(false);
  };

  const simulateStepCompletion = async (stepIndex: number) => {
    const updatedSteps = [...researchSteps];
    updatedSteps[stepIndex].status = 'in-progress';
    setResearchSteps(updatedSteps);
    setCurrentStep(stepIndex);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    updatedSteps[stepIndex].status = 'completed';
    setResearchSteps(updatedSteps);
  };

  const getCurrentStepContent = () => {
    const step = researchSteps[currentStep];

    switch (step.id) {
      case 'basic-info':
        return <BasicInfoStep onesheet={onesheet} onUpdate={onAutoSave} />;
      case 'my-knowledge':
        return <MyKnowledgeStep onesheet={onesheet} onUpdate={onUpdate} />;
      case 'social-listening':
        return <SocialListeningStep onesheet={onesheet} onUpdate={onUpdate} />;
      case 'organic-inspiration':
        return <OrganicInspirationStep onesheet={onesheet} onUpdate={onUpdate} />;
      case 'creative-synthesis':
        return <CreativeSynthesisStep onesheet={onesheet} />;
      default:
        return <AutomatedStepDisplay step={step} onesheet={onesheet} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Intelligent Introduction */}
      {showExplanation && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Welcome to Your Intelligent OneSheet Generator
            </CardTitle>
            <CardDescription>
              Based on Alex Cooper's proven process for never running out of Facebook ad ideas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              This isn't just a form—it's an automated research engine. Simply provide your basic information, 
              and our AI will conduct comprehensive market research, analyze customer language, find competitor gaps, 
              and generate ready-to-test creative concepts.
            </p>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <strong>Time to complete:</strong> ~15 minutes (mostly automated)
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowExplanation(false)}
              >
                Got it, let's start
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Research Progress</h3>
            <Badge variant="secondary">
              {researchSteps.filter(s => s.status === 'completed').length} of {researchSteps.length} steps
            </Badge>
          </div>
          <Progress 
            value={(researchSteps.filter(s => s.status === 'completed').length / researchSteps.length) * 100} 
            className="mb-4"
          />
          
          {/* Step Indicators */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {researchSteps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => !isProcessing && setCurrentStep(index)}
                disabled={isProcessing}
                className={`
                  relative p-3 rounded-lg border transition-all text-left
                  ${currentStep === index ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}
                  ${step.status === 'completed' ? 'bg-green-50 border-green-200' : ''}
                  ${step.status === 'in-progress' ? 'bg-blue-50 border-blue-200 animate-pulse' : ''}
                  ${!isProcessing ? 'hover:border-gray-300 cursor-pointer' : 'cursor-not-allowed opacity-60'}
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : step.status === 'in-progress' ? (
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  ) : (
                    <div className="text-gray-400">{step.icon}</div>
                  )}
                  <span className="text-xs font-medium">{index + 1}</span>
                </div>
                <p className="text-xs font-medium line-clamp-1">{step.title}</p>
                {step.automatedPrompts && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card className="min-h-[400px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {researchSteps[currentStep].icon}
                {researchSteps[currentStep].title}
              </CardTitle>
              <CardDescription>
                {researchSteps[currentStep].description}
              </CardDescription>
            </div>
            {researchSteps[currentStep].status === 'in-progress' && (
              <Badge variant="secondary" className="animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                AI Processing...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {getCurrentStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0 || isProcessing}
        >
          Previous
        </Button>
        
        {currentStep === 0 && onesheet.product && onesheet.landing_page_url ? (
          <Button
            onClick={handleStartAutomatedResearch}
            disabled={isProcessing}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Automated Research...
              </>
            ) : (
              <>
                Start AI Research
                <Sparkles className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentStep(Math.min(researchSteps.length - 1, currentStep + 1))}
            disabled={currentStep === researchSteps.length - 1 || isProcessing}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Step Components
function BasicInfoStep({ onesheet, onUpdate }: { onesheet: OneSheet; onUpdate: (field: string, value: string) => void }) {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This is the only significant input required. Once you provide these URLs, 
          our AI will automatically conduct comprehensive research across all channels.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        <div>
          <Label htmlFor="product">Product Name*</Label>
          <Input
            id="product"
            placeholder="e.g., Huel Daily Greens"
            value={onesheet.product || ''}
            onChange={(e) => onUpdate('product', e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="landing_page_url">Product Landing Page URL*</Label>
          <Input
            id="landing_page_url"
            type="url"
            placeholder="https://yourproduct.com"
            value={onesheet.landing_page_url || ''}
            onChange={(e) => onUpdate('landing_page_url', e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            AI will analyze your entire website for benefits, features, and positioning
          </p>
        </div>

        <div>
          <Label htmlFor="customer_reviews_url">Customer Reviews URL*</Label>
          <Input
            id="customer_reviews_url"
            type="url"
            placeholder="https://trustpilot.com/yourproduct"
            value={onesheet.customer_reviews_url || ''}
            onChange={(e) => onUpdate('customer_reviews_url', e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Trustpilot, Google Reviews, or your testimonials page
          </p>
        </div>

        <div>
          <Label htmlFor="raw_reviews">Additional Reviews/Survey Data (Optional)</Label>
          <Textarea
            id="raw_reviews"
            placeholder="Paste any additional customer reviews, survey responses, or support tickets here..."
            rows={4}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            The more Voice of Customer data you provide, the better the AI insights
          </p>
        </div>
      </div>
    </div>
  );
}

function MyKnowledgeStep({ onesheet, onUpdate }: { onesheet: OneSheet; onUpdate: (updates: Partial<OneSheet>) => void }) {
  const [newAngle, setNewAngle] = useState({ title: '', description: '' });

  const addAngle = () => {
    if (newAngle.title) {
      const angle = {
        id: crypto.randomUUID(),
        title: newAngle.title,
        description: newAngle.description,
        priority: onesheet.angles.length + 1
      };
      onUpdate({ angles: [...onesheet.angles, angle] });
      setNewAngle({ title: '', description: '' });
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Brain className="h-4 w-4" />
        <AlertDescription>
          Document your initial hypotheses about marketing angles. These will be validated 
          or challenged by the AI research that follows.
        </AlertDescription>
      </Alert>

      <div>
        <h4 className="font-medium mb-3">Your Initial Marketing Angles</h4>
        <div className="space-y-3 mb-4">
          {onesheet.angles.map((angle) => (
            <div key={angle.id} className="p-3 border rounded-lg">
              <h5 className="font-medium">{angle.title}</h5>
              {angle.description && (
                <p className="text-sm text-gray-600 mt-1">{angle.description}</p>
              )}
            </div>
          ))}
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          <Input
            placeholder="Angle title (e.g., Time & Convenience)"
            value={newAngle.title}
            onChange={(e) => setNewAngle({ ...newAngle, title: e.target.value })}
          />
          <Textarea
            placeholder="Why do you think this angle will resonate?"
            value={newAngle.description}
            onChange={(e) => setNewAngle({ ...newAngle, description: e.target.value })}
            rows={2}
          />
          <Button onClick={addAngle} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Angle
          </Button>
        </div>
      </div>
    </div>
  );
}

function SocialListeningStep({ onesheet, onUpdate }: { onesheet: OneSheet; onUpdate: (updates: Partial<OneSheet>) => void }) {
  const [platform, setPlatform] = useState('reddit');
  const [postContent, setPostContent] = useState('');

  return (
    <div className="space-y-6">
      <Alert>
        <Search className="h-4 w-4" />
        <AlertDescription>
          Paste Reddit threads, Quora discussions, or ad comments. AI will extract customer language, 
          objections, and unfiltered opinions.
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div>
          <Label>Platform</Label>
          <select 
            className="w-full mt-1 p-2 border rounded-md"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="reddit">Reddit</option>
            <option value="quora">Quora</option>
            <option value="ad_comments">Ad Comments</option>
          </select>
        </div>

        <div>
          <Label>Paste Content</Label>
          <Textarea
            placeholder="Paste the entire thread or comments here..."
            rows={8}
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            className="mt-1"
          />
        </div>

        <Button className="w-full">
          <Sparkles className="h-4 w-4 mr-2" />
          Analyze with AI
        </Button>
      </div>

      <div className="text-sm text-gray-600">
        <p className="font-medium mb-2">Where to find content:</p>
        <ul className="space-y-1">
          <li>• Search Reddit for: "{onesheet.product} review", "alternatives to {onesheet.product}"</li>
          <li>• Check r/supplements, r/mealprep, or relevant subreddits</li>
          <li>• Look at competitor Facebook ad comments</li>
        </ul>
      </div>
    </div>
  );
}

function OrganicInspirationStep({ onesheet, onUpdate }: { onesheet: OneSheet; onUpdate: (updates: Partial<OneSheet>) => void }) {
  return (
    <div className="space-y-6">
      <Alert>
        <Youtube className="h-4 w-4" />
        <AlertDescription>
          Find viral organic content about your product category. What works organically often 
          translates to successful paid ads.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        <div>
          <Label>TikTok/YouTube URLs</Label>
          <Textarea
            placeholder="Paste URLs of high-performing organic videos (one per line)"
            rows={4}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Look for videos with high engagement about your product or category
          </p>
        </div>

        <Button className="w-full">
          <Sparkles className="h-4 w-4 mr-2" />
          Extract Ad Concepts
        </Button>
      </div>

      <div className="text-sm text-gray-600">
        <p className="font-medium mb-2">Search suggestions:</p>
        <ul className="space-y-1">
          <li>• TikTok: #{onesheet.product?.toLowerCase().replace(' ', '')}</li>
          <li>• YouTube Shorts: "{onesheet.product} review", "day in my life healthy"</li>
          <li>• Look for transformation videos, unboxings, comparisons</li>
        </ul>
      </div>
    </div>
  );
}

function CreativeSynthesisStep({ onesheet }: { onesheet: OneSheet }) {
  return (
    <div className="space-y-6">
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Your OneSheet is complete! AI has synthesized all research into actionable creative assets.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="concepts">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="concepts">Concepts</TabsTrigger>
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
          <TabsTrigger value="visuals">Visuals</TabsTrigger>
        </TabsList>

        <TabsContent value="concepts" className="space-y-3">
          {onesheet.concepts.map((concept) => (
            <Card key={concept.id}>
              <CardHeader>
                <CardTitle className="text-lg">{concept.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{concept.description}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>Angle: {concept.angle}</span>
                  <span>Format: {concept.format}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="hooks" className="space-y-2">
          {onesheet.hooks.map((hook) => (
            <div key={hook.id} className="flex items-center justify-between p-3 border rounded-lg group">
              <p className="text-sm">{hook.text}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(hook.text);
                  toast({ title: "Copied!", description: "Hook copied to clipboard" });
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="visuals" className="space-y-3">
          {onesheet.visuals.map((visual) => (
            <Card key={visual.id}>
              <CardContent className="pt-4">
                <Badge className="mb-2">{visual.type}</Badge>
                <p className="text-sm">{visual.description}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AutomatedStepDisplay({ step, onesheet }: { step: ResearchStep; onesheet: OneSheet }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">AI is conducting research...</h3>
          <p className="text-sm text-gray-600 max-w-md">
            {step.description}
          </p>
        </div>
      </div>

      {/* Show preview of what's being analyzed */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-sm mb-2">Currently analyzing:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• {onesheet.landing_page_url}</li>
          <li>• {onesheet.customer_reviews_url}</li>
          {step.automatedPrompts?.map((prompt) => (
            <li key={prompt}>• Running: {prompt.replace('_', ' ')}</li>
          ))}
        </ul>
      </div>
    </div>
  );
} 