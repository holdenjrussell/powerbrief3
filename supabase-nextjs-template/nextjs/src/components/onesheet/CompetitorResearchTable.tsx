"use client";

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
  Label,
  Input,
} from '@/components/ui';
import { 
  Plus, 
  Trash2, 
  Edit, 
  ExternalLink,
  Sparkles,
  Eye,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { CompetitorResearchData, CompetitorData } from '@/lib/types/onesheet';

interface CompetitorResearchTableProps {
  onesheetId: string;
  brandId: string;
}

export function CompetitorResearchTable({ onesheetId, brandId }: CompetitorResearchTableProps) {
  const [competitorData, setCompetitorData] = useState<CompetitorResearchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<CompetitorData | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorData | null>(null);

  // Load existing competitor research
  useEffect(() => {
    fetchCompetitorResearch();
  }, [onesheetId]);

  const fetchCompetitorResearch = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/onesheet/competitor-research?onesheet_id=${onesheetId}`);
      if (response.ok) {
        const data = await response.json();
        setCompetitorData(data);
      }
    } catch (error) {
      console.error('Error fetching competitor research:', error);
      toast({
        title: 'Error',
        description: 'Failed to load competitor research',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Extract competitors from context
  const handleExtractCompetitors = async () => {
    setExtracting(true);
    try {
      const response = await fetch('/api/onesheet/competitor-research/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onesheet_id: onesheetId })
      });

      if (!response.ok) throw new Error('Failed to extract competitors');

      const data = await response.json();
      setCompetitorData(data);
      toast({
        title: 'Success',
        description: `Extracted ${data.competitors?.length || 0} competitors from context`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to extract competitors from context',
        variant: 'destructive'
      });
    } finally {
      setExtracting(false);
    }
  };

  // Deep analyze a competitor
  const handleAnalyzeCompetitor = async (competitor: CompetitorData) => {
    setAnalyzing(true);
    try {
      const response = await fetch('/api/onesheet/competitor-research/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          onesheet_id: onesheetId,
          competitor_id: competitor.id 
        })
      });

      if (!response.ok) throw new Error('Failed to analyze competitor');

      const data = await response.json();
      
      // Update the competitor with deep analysis
      if (competitorData) {
        const updatedCompetitors = competitorData.competitors.map(c => 
          c.id === competitor.id ? { ...c, ...data } : c
        );
        setCompetitorData({
          ...competitorData,
          competitors: updatedCompetitors
        });
      }
      
      toast({
        title: 'Success',
        description: 'Deep analysis completed'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to analyze competitor',
        variant: 'destructive'
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Save competitor (add or update)
  const handleSaveCompetitor = async (competitor: Partial<CompetitorData>) => {
    try {
      const response = await fetch('/api/onesheet/competitor-research', {
        method: competitor.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onesheet_id: onesheetId,
          competitor
        })
      });

      if (!response.ok) throw new Error('Failed to save competitor');

      await fetchCompetitorResearch();
      setEditingCompetitor(null);
      setShowAddDialog(false);
      
      toast({
        title: 'Success',
        description: `Competitor ${competitor.id ? 'updated' : 'added'} successfully`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save competitor',
        variant: 'destructive'
      });
    }
  };

  // Delete competitor
  const handleDeleteCompetitor = async (competitorId: string) => {
    try {
      const response = await fetch(`/api/onesheet/competitor-research?onesheet_id=${onesheetId}&competitor_id=${competitorId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete competitor');

      await fetchCompetitorResearch();
      toast({
        title: 'Success',
        description: 'Competitor deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete competitor',
        variant: 'destructive'
      });
    }
  };

  const CompetitorForm = ({ competitor, onSave }: { competitor?: CompetitorData | null, onSave: (data: Partial<CompetitorData>) => void }) => {
    const [formData, setFormData] = useState<Partial<CompetitorData>>({
      name: competitor?.name || '',
      website: competitor?.website || '',
      similarities: competitor?.similarities || [],
      differences: competitor?.differences || [],
      opportunities: competitor?.opportunities || { formats: [], messaging: [] },
      landingPages: competitor?.landingPages || [],
      adLinks: competitor?.adLinks || []
    });

    return (
      <div className="space-y-4">
        <div>
          <Label>Competitor Name</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Brand X"
          />
        </div>

        <div>
          <Label>Website</Label>
          <Input
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://example.com"
          />
        </div>

        <div>
          <Label>Similarities to Our Product</Label>
          <Textarea
            value={formData.similarities?.join('\n')}
            onChange={(e) => setFormData({ ...formData, similarities: e.target.value.split('\n').filter(Boolean) })}
            placeholder="One similarity per line"
            rows={3}
          />
        </div>

        <div>
          <Label>Key Differences</Label>
          <Textarea
            value={formData.differences?.join('\n')}
            onChange={(e) => setFormData({ ...formData, differences: e.target.value.split('\n').filter(Boolean) })}
            placeholder="One difference per line"
            rows={3}
          />
        </div>

        <div>
          <Label>Format Opportunities</Label>
          <Textarea
            value={formData.opportunities?.formats?.join('\n') || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              opportunities: {
                ...formData.opportunities,
                formats: e.target.value.split('\n').filter(Boolean),
                messaging: formData.opportunities?.messaging || []
              }
            })}
            placeholder="One format opportunity per line"
            rows={2}
          />
        </div>

        <div>
          <Label>Messaging Opportunities</Label>
          <Textarea
            value={formData.opportunities?.messaging?.join('\n') || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              opportunities: {
                ...formData.opportunities,
                messaging: e.target.value.split('\n').filter(Boolean),
                formats: formData.opportunities?.formats || []
              }
            })}
            placeholder="One messaging opportunity per line"
            rows={2}
          />
        </div>

        <div>
          <Label>Landing Pages Used in Ads</Label>
          <Textarea
            value={formData.landingPages?.map(lp => `${lp.url}|${lp.description || ''}`).join('\n') || ''}
            onChange={(e) => {
              const pages = e.target.value.split('\n').filter(Boolean).map(line => {
                const [url, description] = line.split('|');
                return { url: url?.trim() || '', description: description?.trim() || '' };
              });
              setFormData({ ...formData, landingPages: pages });
            }}
            placeholder="Format: https://example.com/page|Description (one per line)"
            rows={2}
          />
        </div>

        <div>
          <Label>Ad Links</Label>
          <Textarea
            value={formData.adLinks?.map(ad => `${ad.platform}|${ad.url}|${ad.description || ''}`).join('\n') || ''}
            onChange={(e) => {
              const ads = e.target.value.split('\n').filter(Boolean).map(line => {
                const [platform, url, description] = line.split('|');
                return { 
                  platform: (platform?.trim().toLowerCase() as 'facebook' | 'instagram' | 'tiktok' | 'youtube') || 'facebook',
                  url: url?.trim() || '', 
                  description: description?.trim() 
                };
              });
              setFormData({ ...formData, adLinks: ads });
            }}
            placeholder="Format: facebook|https://facebook.com/ads/...|Description (one per line)"
            rows={2}
          />
        </div>

        <Button 
          onClick={() => onSave(formData)}
          className="w-full"
        >
          {competitor?.id ? 'Update' : 'Add'} Competitor
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Who are our competitors?</CardTitle>
              <CardDescription>
                Identify what customers are dissatisfied with competitors so we can position ourselves as the solution
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExtractCompetitors}
                disabled={extracting}
                variant="outline"
              >
                {extracting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Extract from Context
              </Button>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Competitor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Competitor</DialogTitle>
                    <DialogDescription>
                      Manually add a competitor to analyze
                    </DialogDescription>
                  </DialogHeader>
                  <CompetitorForm onSave={handleSaveCompetitor} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!competitorData?.competitors?.length ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No competitors analyzed yet
              </p>
              <Button onClick={handleExtractCompetitors} disabled={extracting}>
                {extracting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Extract Competitors from Context
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Who are our competitors?</TableHead>
                  <TableHead>Similarities</TableHead>
                  <TableHead>Differences</TableHead>
                  <TableHead>Landing Pages used in ads</TableHead>
                  <TableHead>Ad Links</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {competitorData.competitors.map((competitor) => (
                  <TableRow key={competitor.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{competitor.name}</p>
                        {competitor.website && (
                          <a 
                            href={competitor.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                          >
                            Visit site
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {competitor.similarities?.slice(0, 2).map((sim, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {sim}
                          </Badge>
                        ))}
                        {competitor.similarities && competitor.similarities.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{competitor.similarities.length - 2} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {competitor.differences?.slice(0, 2).map((diff, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {diff}
                          </Badge>
                        ))}
                        {competitor.differences && competitor.differences.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{competitor.differences.length - 2} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {competitor.landingPages?.length > 0 ? (
                          competitor.landingPages.slice(0, 2).map((lp, idx) => (
                            <a 
                              key={idx}
                              href={lp.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline block"
                            >
                              {lp.description || 'Landing Page'}
                            </a>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Add manually</span>
                        )}
                        {competitor.landingPages && competitor.landingPages.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{competitor.landingPages.length - 2} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {competitor.adLinks?.length > 0 ? (
                          competitor.adLinks.slice(0, 2).map((ad, idx) => (
                            <a 
                              key={idx}
                              href={ad.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                            >
                              <Badge variant="outline" className="text-xs">{ad.platform}</Badge>
                            </a>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Add manually</span>
                        )}
                        {competitor.adLinks && competitor.adLinks.length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{competitor.adLinks.length - 2} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setSelectedCompetitor(competitor)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>{competitor.name} - Deep Analysis</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 mt-4">
                              <div>
                                <h4 className="font-medium mb-2">Similarities</h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {competitor.similarities?.map((sim, idx) => (
                                    <li key={idx} className="text-sm">{sim}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Key Differences</h4>
                                <ul className="list-disc list-inside space-y-1">
                                  {competitor.differences?.map((diff, idx) => (
                                    <li key={idx} className="text-sm">{diff}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Opportunities</h4>
                                <div className="space-y-2">
                                  {competitor.opportunities?.formats && competitor.opportunities.formats.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium">Format Opportunities:</span>
                                      <ul className="list-disc list-inside space-y-1 ml-4">
                                        {competitor.opportunities.formats.map((opp, idx) => (
                                          <li key={idx} className="text-sm">{opp}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {competitor.opportunities?.messaging && competitor.opportunities.messaging.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium">Messaging Opportunities:</span>
                                      <ul className="list-disc list-inside space-y-1 ml-4">
                                        {competitor.opportunities.messaging.map((opp, idx) => (
                                          <li key={idx} className="text-sm">{opp}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Format Strategies</h4>
                                <div className="flex flex-wrap gap-2">
                                  {competitor.deepAnalysis?.formatStrategies?.map((strategy, idx) => (
                                    <Badge key={idx} variant="secondary">{strategy}</Badge>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2">Creator Approaches</h4>
                                <div className="flex flex-wrap gap-2">
                                  {competitor.deepAnalysis?.creatorApproaches?.map((approach, idx) => (
                                    <Badge key={idx} variant="outline">{approach}</Badge>
                                  ))}
                                </div>
                              </div>
                              {competitor.deepAnalysis && (
                                <div>
                                  <h4 className="font-medium mb-2">Deep Analysis</h4>
                                  {competitor.deepAnalysis.isHigherQuality && (
                                    <div className="mb-2">
                                      <span className="text-sm font-medium">Quality Analysis:</span>
                                      <p className="text-sm text-muted-foreground">{competitor.deepAnalysis.isHigherQuality}</p>
                                    </div>
                                  )}
                                  {competitor.deepAnalysis.whyBetterChoice && (
                                    <div>
                                      <span className="text-sm font-medium">Why We&apos;re Better:</span>
                                      <p className="text-sm text-muted-foreground">{competitor.deepAnalysis.whyBetterChoice}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              <Button
                                onClick={() => handleAnalyzeCompetitor(competitor)}
                                disabled={analyzing}
                                className="w-full"
                              >
                                {analyzing ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Sparkles className="h-4 w-4 mr-2" />
                                )}
                                Run Deep Analysis
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setEditingCompetitor(competitor)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Competitor</DialogTitle>
                            </DialogHeader>
                            <CompetitorForm 
                              competitor={competitor} 
                              onSave={(data) => handleSaveCompetitor({ ...data, id: competitor.id })} 
                            />
                          </DialogContent>
                        </Dialog>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCompetitor(competitor.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Strategic Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Analysis</CardTitle>
          <CardDescription>
            Key questions to answer about your competitive positioning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-medium mb-2">Is our product better quality than each competitor? Why? How?</h4>
            <p className="text-sm text-muted-foreground">
              {competitorData?.deepAnalysis?.qualityComparison?.summary || 
               'Analyze competitor products to identify quality differences and advantages'}
            </p>
          </div>
          
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-medium mb-2">What would make your product the best choice above all competitors and substitutes?</h4>
            <p className="text-sm text-muted-foreground">
              {competitorData?.competitors?.length > 0 
                ? 'Look for gaps in competitor offerings and customer dissatisfaction points'
                : 'Extract competitors from context to identify positioning opportunities'}
            </p>
          </div>
          
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-medium mb-2">How are they approaching formats? Strategies?</h4>
            <p className="text-sm text-muted-foreground">
              {competitorData?.deepAnalysis?.formatStrategies?.summary || 
               'Analyze paid and organic social content to identify format patterns (podcast, AI voiceover, animation, explainer, long-form, etc.)'}
            </p>
            {competitorData?.competitors?.some(c => c.deepAnalysis?.formatStrategies?.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from(new Set(
                  competitorData.competitors.flatMap(c => c.deepAnalysis?.formatStrategies || [])
                )).map((strategy, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{strategy}</Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="border-l-4 border-orange-500 pl-4">
            <h4 className="font-medium mb-2">How are they approaching creators and talent?</h4>
            <p className="text-sm text-muted-foreground">
              {competitorData?.deepAnalysis?.creatorApproaches?.summary || 
               'Identify creator strategies (B-roll with voiceovers, variety of creators, organic style with minimal editing, etc.)'}
            </p>
            {competitorData?.competitors?.some(c => c.deepAnalysis?.creatorApproaches?.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from(new Set(
                  competitorData.competitors.flatMap(c => c.deepAnalysis?.creatorApproaches || [])
                )).map((approach, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">{approach}</Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="border-l-4 border-red-500 pl-4">
            <h4 className="font-medium mb-2">Can you detect any learnings over time?</h4>
            <p className="text-sm text-muted-foreground">
              {competitorData?.deepAnalysis?.learningsOverTime?.length > 0
                ? `${competitorData.deepAnalysis.learningsOverTime.length} learnings identified`
                : 'Track competitor evolution and strategy changes over time'}
            </p>
            {competitorData?.deepAnalysis?.learningsOverTime?.slice(0, 3).map((learning, idx) => (
              <div key={idx} className="mt-2 p-2 bg-muted rounded text-xs">
                <span className="font-medium">{learning.date}:</span> {learning.learning}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 