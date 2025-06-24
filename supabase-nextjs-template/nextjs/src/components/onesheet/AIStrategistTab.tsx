import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Brain, Play, RefreshCw, TrendingUp, TrendingDown, AlertCircle, ChevronRight, BarChart3 } from 'lucide-react';
import type { AIStrategistOpinion } from '@/lib/types/onesheet';

interface AIStrategistTabProps {
  onesheetId: string;
  brandId: string;
  analyzedAdsCount: number;
  totalAdsCount: number;
  hasAds: boolean;
  strategistOpinion: AIStrategistOpinion | null;
  onRunStrategist: () => Promise<void>;
  isRunning: boolean;
}

export function AIStrategistTab({ 
  onesheetId, 
  analyzedAdsCount, 
  totalAdsCount,
  hasAds,
  strategistOpinion,
  onRunStrategist,
  isRunning
}: AIStrategistTabProps) {
  const { toast } = useToast();
  const [iterationCount, setIterationCount] = React.useState(5);
  const [lowPerformerCriteria, setLowPerformerCriteria] = React.useState({
    minSpend: 50,
    maxSpend: 500,
    maxRoas: 1.0,
    enabled: true
  });

  // Load settings from AI instructions
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/onesheet/ai-instructions?onesheet_id=${onesheetId}`);
        if (response.ok) {
          const result = await response.json();
          const instructions = result.data;
          
          if (instructions?.iteration_settings?.default_count) {
            setIterationCount(instructions.iteration_settings.default_count);
          }
          
          if (instructions?.low_performer_criteria) {
            setLowPerformerCriteria({
              minSpend: instructions.low_performer_criteria.min_spend || 50,
              maxSpend: instructions.low_performer_criteria.max_spend || 500,
              maxRoas: instructions.low_performer_criteria.max_roas || 1.0,
              enabled: instructions.low_performer_criteria.enabled !== false
            });
          }
        }
      } catch (error) {
        console.error('Error loading strategist settings:', error);
      }
    };
    
    loadSettings();
  }, [onesheetId]);

  const handleRunAnalysis = async () => {
    if (!hasAds || analyzedAdsCount === 0) {
      toast({
        title: "No analyzed ads",
        description: "Please analyze your ads first before running the AI strategist",
        variant: "destructive"
      });
      return;
    }
    
    await onRunStrategist();
  };

  if (!hasAds) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No ads to analyze</h3>
          <p className="text-gray-600">Import ads first to use the AI Strategist</p>
        </CardContent>
      </Card>
    );
  }

  if (analyzedAdsCount === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ads need analysis first</h3>
          <p className="text-gray-600 mb-4">
            You need to run AI analysis on your ads before the strategist can provide insights
          </p>
          <p className="text-sm text-gray-500">
            {totalAdsCount} ads imported, but none have been analyzed yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analysis Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Strategist Settings</CardTitle>
          <CardDescription>
            Configure how the AI strategist analyzes your ad performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="iteration-count">Top Ads for Iterations</Label>
            <Input
              id="iteration-count"
              type="number"
              min="1"
              max="10"
              value={iterationCount}
              onChange={(e) => setIterationCount(parseInt(e.target.value) || 5)}
              className="w-32 mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Number of top performing ads to generate iteration suggestions for
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Low Performer Criteria</Label>
              <Switch
                checked={lowPerformerCriteria.enabled}
                onCheckedChange={(checked) => 
                  setLowPerformerCriteria({...lowPerformerCriteria, enabled: checked})
                }
              />
            </div>
            {lowPerformerCriteria.enabled && (
              <div className="grid grid-cols-3 gap-4 pl-4">
                <div>
                  <Label htmlFor="min-spend" className="text-sm">Min Spend ($)</Label>
                  <Input
                    id="min-spend"
                    type="number"
                    value={lowPerformerCriteria.minSpend}
                    onChange={(e) => setLowPerformerCriteria({
                      ...lowPerformerCriteria,
                      minSpend: parseFloat(e.target.value) || 0
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="max-spend" className="text-sm">Max Spend ($)</Label>
                  <Input
                    id="max-spend"
                    type="number"
                    value={lowPerformerCriteria.maxSpend}
                    onChange={(e) => setLowPerformerCriteria({
                      ...lowPerformerCriteria,
                      maxSpend: parseFloat(e.target.value) || 0
                    })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="max-roas" className="text-sm">Max ROAS</Label>
                  <Input
                    id="max-roas"
                    type="number"
                    step="0.1"
                    value={lowPerformerCriteria.maxRoas}
                    onChange={(e) => setLowPerformerCriteria({
                      ...lowPerformerCriteria,
                      maxRoas: parseFloat(e.target.value) || 0
                    })}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">
                {analyzedAdsCount} of {totalAdsCount} ads have been analyzed
              </p>
              {strategistOpinion && (
                <p className="text-xs text-green-600 mt-1">
                  Last analysis: {new Date(strategistOpinion.analyzedAt).toLocaleString()}
                </p>
              )}
            </div>
            <Button 
              onClick={handleRunAnalysis}
              disabled={isRunning}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {strategistOpinion ? 'Re-run Analysis' : 'Run Analysis'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {strategistOpinion && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Strategic Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-900">{strategistOpinion.totalAdsAnalyzed}</p>
                  <p className="text-sm text-blue-700">Ads Analyzed</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-900">{strategistOpinion.topPerformers.length}</p>
                  <p className="text-sm text-green-700">Top Performers</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-lg">
                  <TrendingDown className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-900">{strategistOpinion.lowPerformers.length}</p>
                  <p className="text-sm text-amber-700">Low Performers</p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">Analysis Summary</h4>
                <div className="text-sm text-gray-700">
                  <p>{strategistOpinion.executiveSummary}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Strategic Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Strategic Insights</CardTitle>
              <CardDescription>
                AI-generated recommendations based on your ad performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Strategic Summary
                </h4>
                <p className="text-gray-700 whitespace-pre-wrap pl-6">
                  {strategistOpinion.summary}
                </p>
              </div>

              {/* Recommendations */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Recommendations
                </h4>
                <ul className="space-y-2 pl-6">
                  {strategistOpinion.recommendations.map((rec, index) => (
                    <li key={index} className="text-gray-700">
                      <span className={`inline-block px-2 py-1 text-xs rounded mr-2 ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {rec.priority.toUpperCase()}
                      </span>
                      {rec.recommendation}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Creative Patterns */}
              {strategistOpinion.creativePatterns && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Creative Patterns
                  </h4>
                  <div className="pl-6 space-y-3">
                    {Object.entries(strategistOpinion.creativePatterns).map(([category, patterns]) => (
                      <div key={category}>
                        <p className="font-medium text-sm text-gray-600 capitalize mb-1">
                          {category.replace(/([A-Z])/g, ' $1').trim()}:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(patterns as string[]).map((pattern, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
                            >
                              {pattern}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Performers */}
          {strategistOpinion.topPerformers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Top Performing Ads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {strategistOpinion.topPerformers.map((ad, index) => (
                    <div key={ad.adId} className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-green-900">
                            {index + 1}. {ad.adName}
                          </p>
                          <div className="flex gap-4 mt-1 text-sm text-green-700">
                            <span>ROAS: {ad.roas}</span>
                            <span>Hook: {ad.hookRate || 0}%</span>
                            <span>Hold: {ad.holdRate || 0}%</span>
                            <span>Spend: ${ad.spend}</span>
                          </div>
                        </div>
                      </div>
                      {ad.keySuccessFactors && ad.keySuccessFactors.length > 0 && (
                        <div className="mt-2 text-sm text-gray-700">
                          <strong>Success Factors:</strong>
                          <ul className="mt-1 space-y-1">
                            {ad.keySuccessFactors.map((factor, idx) => (
                              <li key={idx}>• {factor}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Performers */}
          {strategistOpinion.lowPerformers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-amber-600" />
                  Low Performing Ads
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {strategistOpinion.lowPerformers.map((ad, index) => (
                    <div key={ad.adId} className="p-3 bg-amber-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-amber-900">
                            {index + 1}. {ad.adName}
                          </p>
                          <div className="flex gap-4 mt-1 text-sm text-amber-700">
                            <span>ROAS: {ad.roas}</span>
                            <span>Hook: {ad.hookRate || 0}%</span>
                            <span>Hold: {ad.holdRate || 0}%</span>
                            <span>Spend: ${ad.spend}</span>
                          </div>
                        </div>
                      </div>
                      {ad.issues && ad.issues.length > 0 && (
                        <div className="mt-2 text-sm text-gray-700">
                          <strong>Issues:</strong>
                          <ul className="mt-1 space-y-1">
                            {ad.issues.map((issue, idx) => (
                              <li key={idx}>• {issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
} 