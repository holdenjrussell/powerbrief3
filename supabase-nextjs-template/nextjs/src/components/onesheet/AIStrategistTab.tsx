import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Brain, Play, RefreshCw, TrendingUp, TrendingDown, AlertCircle, ChevronRight, BarChart3, Video, Image, X } from 'lucide-react';
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
  const [selectedVideo, setSelectedVideo] = React.useState<{ videoId: string; thumbnailUrl: string; adName: string } | null>(null);
  const [selectedImage, setSelectedImage] = React.useState<{ imageUrl: string; adName: string } | null>(null);

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
          <Card className="border-2 border-purple-100">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
              <CardTitle className="text-xl text-purple-900">Strategic Insights</CardTitle>
              <CardDescription className="text-purple-700">
                AI-generated recommendations based on your ad performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-purple-500">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-purple-800">
                  <ChevronRight className="h-4 w-4" />
                  Strategic Summary
                </h4>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {strategistOpinion.summary}
                </p>
              </div>

              {/* Recommendations */}
              <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
                  <ChevronRight className="h-4 w-4" />
                  Recommendations
                </h4>
                <div className="space-y-3">
                  {strategistOpinion.recommendations.map((rec, index) => (
                    <div key={index} className="bg-white rounded-md p-3 shadow-sm border">
                      <div className="flex items-start gap-3">
                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full shrink-0 ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-800 border border-red-200' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {rec.priority.toUpperCase()}
                        </span>
                        <p className="text-gray-700 leading-relaxed">{rec.recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Creative Patterns */}
              {strategistOpinion.creativePatterns && (
                <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-800">
                    <ChevronRight className="h-4 w-4" />
                    Creative Patterns
                  </h4>
                  <div className="space-y-4">
                    {strategistOpinion.creativePatterns.winningElements && strategistOpinion.creativePatterns.winningElements.length > 0 && (
                      <div className="bg-white rounded-md p-3 shadow-sm border">
                        <p className="font-semibold text-sm text-green-800 mb-2">✅ Winning Elements</p>
                        <div className="flex flex-wrap gap-2">
                          {strategistOpinion.creativePatterns.winningElements.map((element, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium border border-green-200"
                            >
                              {element}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {strategistOpinion.creativePatterns.losingElements && strategistOpinion.creativePatterns.losingElements.length > 0 && (
                      <div className="bg-white rounded-md p-3 shadow-sm border">
                        <p className="font-semibold text-sm text-red-800 mb-2">❌ Losing Elements</p>
                        <div className="flex flex-wrap gap-2">
                          {strategistOpinion.creativePatterns.losingElements.map((element, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium border border-red-200"
                            >
                              {element}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {strategistOpinion.creativePatterns.bestPerformingHooks && strategistOpinion.creativePatterns.bestPerformingHooks.length > 0 && (
                      <div className="bg-white rounded-md p-3 shadow-sm border">
                        <p className="font-semibold text-sm text-blue-800 mb-2">🎯 Best Performing Hooks</p>
                        <div className="flex flex-wrap gap-2">
                          {strategistOpinion.creativePatterns.bestPerformingHooks.map((hook, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200"
                            >
                              {hook}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {strategistOpinion.creativePatterns.optimalSitInProblemRange && (
                      <div className="bg-white rounded-md p-3 shadow-sm border">
                        <p className="font-semibold text-sm text-purple-800 mb-2">⏱️ Optimal Sit-in-Problem Range</p>
                        <p className="text-sm text-purple-700 px-3 py-2 bg-purple-50 rounded-md font-medium">
                          {strategistOpinion.creativePatterns.optimalSitInProblemRange}
                        </p>
                      </div>
                    )}
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
                <div className="space-y-4">
                  {strategistOpinion.topPerformers.map((ad, index) => (
                    <div key={ad.adId} className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start gap-4">
                        {/* Ad Preview */}
                        <div className="shrink-0">
                          <div 
                            className="relative w-20 h-16 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center group cursor-pointer shadow-sm border"
                            onClick={() => {
                              if (ad.videoId && (ad.thumbnailUrl || ad.imageUrl)) {
                                setSelectedVideo({
                                  videoId: ad.videoId,
                                  thumbnailUrl: ad.assetUrl || ad.thumbnailUrl || ad.imageUrl || '',
                                  adName: ad.adName
                                });
                              } else if (ad.thumbnailUrl || ad.imageUrl) {
                                setSelectedImage({
                                  imageUrl: ad.assetUrl || ad.imageUrl || ad.thumbnailUrl || '',
                                  adName: ad.adName
                                });
                              }
                            }}
                          >
                            {ad.thumbnailUrl || ad.imageUrl ? (
                              <>
                                <img
                                  src={ad.thumbnailUrl || ad.imageUrl || ''}
                                  alt={`Preview of ${ad.adName}`}
                                  className="w-full h-full object-cover transition-opacity group-hover:opacity-80"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (nextElement) {
                                      nextElement.style.display = 'flex';
                                    }
                                  }}
                                />
                                <div className="hidden w-full h-full items-center justify-center">
                                  {ad.assetType === 'video' ? (
                                    <Video className="h-6 w-6 text-blue-500" />
                                  ) : (
                                    <Image className="h-6 w-6 text-green-500" />
                                  )}
                                </div>
                                {/* Play overlay for videos */}
                                {ad.videoId && (
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                                    <div className="bg-white bg-opacity-90 rounded-full p-1.5 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                                      <Play className="h-3 w-3 text-blue-600 fill-current" />
                                    </div>
                                  </div>
                                )}
                                {/* Image overlay for images */}
                                {!ad.videoId && (ad.thumbnailUrl || ad.imageUrl) && (
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                                    <div className="bg-white bg-opacity-90 rounded-full p-1.5 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                                      <Image className="h-3 w-3 text-green-600" />
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {ad.assetType === 'video' ? (
                                  <Video className="h-6 w-6 text-blue-500" />
                                ) : ad.assetType === 'image' ? (
                                  <Image className="h-6 w-6 text-green-500" />
                                ) : (
                                  <div className="h-6 w-6 rounded bg-gray-300" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Ad Details */}
                        <div className="flex-1">
                          <p className="font-semibold text-green-900 text-base">
                            #{index + 1} {ad.adName}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-green-700">
                            <span className="bg-green-100 px-2 py-1 rounded-md">ROAS: {ad.roas}</span>
                            <span className="bg-green-100 px-2 py-1 rounded-md">Hook: {ad.hookRate || 0}%</span>
                            <span className="bg-green-100 px-2 py-1 rounded-md">Hold: {ad.holdRate || 0}%</span>
                            <span className="bg-green-100 px-2 py-1 rounded-md">Spend: ${ad.spend}</span>
                          </div>
                          {ad.keySuccessFactors && ad.keySuccessFactors.length > 0 && (
                            <div className="mt-3 text-sm text-gray-700">
                              <strong className="text-green-800">Success Factors:</strong>
                              <ul className="mt-1 space-y-1 ml-2">
                                {ad.keySuccessFactors.map((factor, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-green-600 mt-0.5">•</span>
                                    <span>{factor}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
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
                <div className="space-y-4">
                  {strategistOpinion.lowPerformers.map((ad, index) => (
                    <div key={ad.adId} className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-4">
                        {/* Ad Preview */}
                        <div className="shrink-0">
                          <div 
                            className="relative w-20 h-16 bg-gray-100 rounded-md overflow-hidden flex items-center justify-center group cursor-pointer shadow-sm border"
                            onClick={() => {
                              if (ad.videoId && (ad.thumbnailUrl || ad.imageUrl)) {
                                setSelectedVideo({
                                  videoId: ad.videoId,
                                  thumbnailUrl: ad.assetUrl || ad.thumbnailUrl || ad.imageUrl || '',
                                  adName: ad.adName
                                });
                              } else if (ad.thumbnailUrl || ad.imageUrl) {
                                setSelectedImage({
                                  imageUrl: ad.assetUrl || ad.imageUrl || ad.thumbnailUrl || '',
                                  adName: ad.adName
                                });
                              }
                            }}
                          >
                            {ad.thumbnailUrl || ad.imageUrl ? (
                              <>
                                <img
                                  src={ad.thumbnailUrl || ad.imageUrl || ''}
                                  alt={`Preview of ${ad.adName}`}
                                  className="w-full h-full object-cover transition-opacity group-hover:opacity-80"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (nextElement) {
                                      nextElement.style.display = 'flex';
                                    }
                                  }}
                                />
                                <div className="hidden w-full h-full items-center justify-center">
                                  {ad.assetType === 'video' ? (
                                    <Video className="h-6 w-6 text-blue-500" />
                                  ) : (
                                    <Image className="h-6 w-6 text-green-500" />
                                  )}
                                </div>
                                {/* Play overlay for videos */}
                                {ad.videoId && (
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                                    <div className="bg-white bg-opacity-90 rounded-full p-1.5 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                                      <Play className="h-3 w-3 text-blue-600 fill-current" />
                                    </div>
                                  </div>
                                )}
                                {/* Image overlay for images */}
                                {!ad.videoId && (ad.thumbnailUrl || ad.imageUrl) && (
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                                    <div className="bg-white bg-opacity-90 rounded-full p-1.5 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                                      <Image className="h-3 w-3 text-green-600" />
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {ad.assetType === 'video' ? (
                                  <Video className="h-6 w-6 text-blue-500" />
                                ) : ad.assetType === 'image' ? (
                                  <Image className="h-6 w-6 text-green-500" />
                                ) : (
                                  <div className="h-6 w-6 rounded bg-gray-300" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Ad Details */}
                        <div className="flex-1">
                          <p className="font-semibold text-amber-900 text-base">
                            #{index + 1} {ad.adName}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-amber-700">
                            <span className="bg-amber-100 px-2 py-1 rounded-md">ROAS: {ad.roas}</span>
                            <span className="bg-amber-100 px-2 py-1 rounded-md">Hook: {ad.hookRate || 0}%</span>
                            <span className="bg-amber-100 px-2 py-1 rounded-md">Hold: {ad.holdRate || 0}%</span>
                            <span className="bg-amber-100 px-2 py-1 rounded-md">Spend: ${ad.spend}</span>
                          </div>
                          {ad.issues && ad.issues.length > 0 && (
                            <div className="mt-3 text-sm text-gray-700">
                              <strong className="text-amber-800">Issues:</strong>
                              <ul className="mt-1 space-y-1 ml-2">
                                {ad.issues.map((issue, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-amber-600 mt-0.5">•</span>
                                    <span>{issue}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setSelectedVideo(null)}>
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] w-full mx-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold truncate">{selectedVideo.adName}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVideo(null)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
              {/* Check if we have a local video URL stored in Supabase */}
              {selectedVideo.thumbnailUrl && (selectedVideo.thumbnailUrl.includes('supabase') || selectedVideo.thumbnailUrl.includes('.mp4')) ? (
                // Local video stored in Supabase or direct video URL - use HTML5 video player
                <video
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                  onError={() => {
                    console.error('Video playback failed, falling back to Facebook iframe');
                    // Could add fallback logic here
                  }}
                >
                  <source src={selectedVideo.thumbnailUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                // External video - use Facebook iframe fallback
                <iframe
                  src={`https://www.facebook.com/plugins/video.php?height=480&href=https%3A%2F%2Fwww.facebook.com%2Fvideo.php%3Fv%3D${selectedVideo.videoId}&show_text=false&width=854&t=0`}
                  width="100%"
                  height="100%"
                  style={{ border: 'none', overflow: 'hidden' }}
                  scrolling="no"
                  frameBorder="0"
                  allowFullScreen={true}
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
              )}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Click outside the video or press the X button to close
            </p>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] w-full mx-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold truncate">{selectedImage.adName}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[75vh] bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
              <img
                src={selectedImage.imageUrl}
                alt={`Full size preview of ${selectedImage.adName}`}
                className="max-w-full max-h-full object-contain"
                onError={(event) => {
                  console.error('Image failed to load:', selectedImage.imageUrl);
                  (event.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NSA4NUwxMTUgMTE1TTE4NSA4NUwxMTUgMTE1TDE4NSAxMTVNODUgMTE1TDExNSA4NU04NSA4NUwxMTUgMTE1IiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjwvdGV4dD4KPC9zdmc+';
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Click outside the image or press the X button to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 