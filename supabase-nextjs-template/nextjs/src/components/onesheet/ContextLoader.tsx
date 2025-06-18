"use client";

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Textarea,
  Label,
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Checkbox,
} from '@/components/ui';
import { 
  Link2,
  FileText,
  Loader2,
  Save,
  Trash2,
  ExternalLink,
  Video,
  CheckCircle,
  Info,
  Globe,
  LinkIcon,
  Wand2,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { ContextData } from '@/lib/types/onesheet';

interface ContextLoaderProps {
  sourceType: string;
  title: string;
  description: string;
  instructions: string;
  existingData: ContextData[];
  onSave: (data: Partial<ContextData>) => void;
  onUpdate: (id: string, data: Partial<ContextData>) => void;
  onDelete: (id: string, sourceType: string) => void;
  loading?: boolean;
  brandId: string;
}

interface ExtractedResult {
  url: string;
  title: string;
  markdown: string;
  links: string[];
  timestamp: string;
}

export function ContextLoader({ 
  sourceType, 
  title, 
  description, 
  instructions,
  existingData,
  onSave,
  onUpdate,
  onDelete,
  loading,
  brandId
}: ContextLoaderProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'url' | 'text'>('text');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [contentText, setContentText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [crawlLinks, setCrawlLinks] = useState(false);
  const [maxPages, setMaxPages] = useState(3);
  const [crawlPosts, setCrawlPosts] = useState(false);
  const [maxPosts, setMaxPosts] = useState(5);
  const [includeComments, setIncludeComments] = useState(true);
  const [extractedResults, setExtractedResults] = useState<ExtractedResult[]>([]);
  const [convertingToMarkdown, setConvertingToMarkdown] = useState(false);
  const [convertedToMarkdown, setConvertedToMarkdown] = useState(false);

  const isWebsiteSource = ['brand_website', 'competitor_website', 'articles'].includes(sourceType);
  const isVideoSource = ['tiktok', 'youtube'].includes(sourceType);
  const isCompetitorAds = sourceType === 'competitor_ads';
  const isRedditSource = sourceType === 'reddit';
  const isSocialSource = ['organic_social', 'paid_social'].includes(sourceType);

  const handleConvertToMarkdown = async () => {
    if (!contentText.trim()) {
      toast({
        title: 'No Content',
        description: 'Please enter some text to convert to markdown.',
        variant: 'destructive',
      });
      return;
    }

    setConvertingToMarkdown(true);
    
    try {
      const response = await fetch('/api/onesheet/convert-to-markdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: contentText,
          brandId 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setContentText(data.markdown || data.content || '');
      setConvertedToMarkdown(true);
      
      toast({
        title: 'Converted to Markdown',
        description: 'Your text has been converted to well-structured markdown format.',
      });
    } catch (error) {
      console.error('Markdown conversion error:', error);
      toast({
        title: 'Conversion Failed',
        description: error instanceof Error ? error.message : 'Failed to convert text to markdown.',
        variant: 'destructive',
      });
    } finally {
      setConvertingToMarkdown(false);
    }
  };

  const handleExtract = async () => {
    if (!sourceUrl) {
      toast({
        title: 'URL Required',
        description: 'Please enter a URL to extract content from.',
        variant: 'destructive',
      });
      return;
    }

    setExtracting(true);
    
    let endpoint = '';
    let body = {};

    try {
      if (isWebsiteSource || isCompetitorAds) {
        // Use HTTP scraping for website scraping
        endpoint = '/api/onesheet/extract';
        body = { 
          url: sourceUrl, 
          brandId,
          crawlLinks: isWebsiteSource ? crawlLinks : false,
          maxPages: crawlLinks ? maxPages : 1
        };
      } else if (isVideoSource) {
        // Use Gemini for video analysis
        endpoint = '/api/onesheet/analyze-video';
        body = { url: sourceUrl, platform: sourceType, brandId };
      } else if (isRedditSource) {
        // Use Reddit scraping for Reddit URLs
        endpoint = '/api/onesheet/extract-reddit';
        body = { 
          url: sourceUrl, 
          brandId,
          crawlPosts: crawlPosts,
          maxPosts: crawlPosts ? maxPosts : 1,
          includeComments: includeComments
        };
      } else if (isSocialSource) {
        // Use social media analysis for organic/paid social
        endpoint = '/api/onesheet/analyze-social';
        body = { 
          url: sourceUrl, 
          sourceType: sourceType,
          brandId
        };
      }

      if (endpoint) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.results) {
          // Multiple pages extracted (Reddit)
          setExtractedResults(data.results);
          const combinedContent = data.results
            .map((result: ExtractedResult) => `## ${result.title}\nSource: ${result.url}\n\n${result.markdown}`)
            .join('\n\n---\n\n');
          setContentText(combinedContent);
        } else if (data.result) {
          // Single social media analysis result
          const result = data.result;
          setContentText(result.markdown || result.content || '');
          setExtractedResults([{
            url: result.url,
            title: result.title,
            markdown: result.markdown || '',
            links: [],
            timestamp: result.timestamp
          }]);
        } else {
          // Single result (website/video)
          setContentText(data.content || data.markdown || '');
        }
        
        setExtracted(true);
        
        toast({
          title: 'Content Extracted',
          description: data.results 
            ? `Successfully extracted content from ${data.results.length} page(s).`
            : data.result && data.adripper_integrated
            ? 'Successfully analyzed social media content and saved to AdRipper.'
            : 'Successfully extracted and analyzed the content.',
        });
      }
    } catch (error) {
      console.error('Extraction error:', error);
      
      // Log additional debugging info  
      console.error('Extraction details:', {
        sourceUrl,
        endpoint,
        body,
        isWebsiteSource,
        isVideoSource,
        brandId,
        sourceType,
        error: error instanceof Error ? error.message : error
      });
      
      toast({
        title: 'Extraction Failed',
        description: error instanceof Error ? error.message : 'Failed to extract content. Please try copying manually.',
        variant: 'destructive',
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = () => {
    if (!contentText && !sourceUrl) {
      toast({
        title: 'Content Required',
        description: 'Please add either a URL or paste content before saving.',
        variant: 'destructive',
      });
      return;
    }

    if (editingId) {
      onUpdate(editingId, {
        source_name: sourceName,
        source_url: sourceUrl,
        content_text: contentText,
        extracted_data: extracted ? { 
          extracted: true, 
          crawlLinks,
          maxPages,
          results: extractedResults 
        } : undefined,
      });
      setEditingId(null);
    } else {
      onSave({
        source_name: sourceName,
        source_url: sourceUrl,
        content_text: contentText,
        extracted_data: extracted ? { 
          extracted: true, 
          crawlLinks,
          maxPages,
          results: extractedResults 
        } : undefined,
      });
    }
    
    handleClear();
    setShowAddForm(false);
  };

  const handleClear = () => {
    setSourceName('');
    setSourceUrl('');
    setContentText('');
    setExtracted(false);
    setExtractedResults([]);
    setConvertedToMarkdown(false);
    setCrawlPosts(false);
    setMaxPosts(5);
    setIncludeComments(true);
    setEditingId(null);
  };

  const handleEdit = (item: ContextData) => {
    setEditingId(item.id);
    setSourceName(item.source_name || '');
    setSourceUrl(item.source_url || '');
    setContentText(item.content_text || '');
    setExtracted(!!item.extracted_data);
    setExtractedResults([]);
    setShowAddForm(true);
  };

  const handleDelete = (item: ContextData) => {
    if (confirm('Are you sure you want to delete this context item?')) {
      onDelete(item.id, item.source_type);
    }
  };

  const charCount = contentText.length;
  const wordCount = contentText.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isWebsiteSource && <Globe className="h-5 w-5" />}
            {isVideoSource && <Video className="h-5 w-5" />}
            {isCompetitorAds && <LinkIcon className="h-5 w-5" />}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
          <Alert className="mt-2">
            <Info className="h-4 w-4" />
            <AlertDescription>{instructions}</AlertDescription>
          </Alert>
        </CardHeader>
      </Card>

      {/* Existing Sources List */}
      {existingData.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Saved Sources ({existingData.length})</h3>
          {existingData.map((item) => (
            <Card key={item.id} className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm">
                        {item.source_name || 'Untitled Source'}
                      </h4>
                      {item.source_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(item.source_url!, '_blank')}
                          className="h-6 w-6 p-0"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {item.source_url && (
                      <div className="text-xs text-blue-600 mb-2">
                        {item.source_url}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 max-h-20 overflow-y-auto">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>
                          {item.content_text?.substring(0, 300) + '...' || ''}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {item.content_text?.length || 0} chars
                      </Badge>
                      {item.extracted_data && (
                        <Badge variant="outline" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Extracted
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      className="h-8 w-8 p-0"
                      title="Edit"
                    >
                      <FileText className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add New Button */}
      {!showAddForm && (
        <Button
          onClick={() => setShowAddForm(true)}
          variant="outline"
          className="w-full"
        >
          <Globe className="h-4 w-4 mr-2" />
          Add New {title}
        </Button>
      )}

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Edit' : 'Add New'} {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Source Name */}
            <div>
              <Label htmlFor="source-name">Source Name (Optional)</Label>
              <Input
                id="source-name"
                placeholder={`e.g., "${title} Main Page" or "Competitor X"`}
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Input Mode Tabs */}
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'url' | 'text')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-2" />
                  Paste Text
                </TabsTrigger>
                <TabsTrigger value="url">
                  <Link2 className="h-4 w-4 mr-2" />
                  Add URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
                <div>
                  <Label htmlFor="content-text">Content</Label>
                  <div className="mt-1 bg-gray-50 rounded-lg border">
                    {/* Header with character count */}
                    <div className="flex items-center justify-between p-3 border-b bg-gray-100 rounded-t-lg">
                      <Label className="text-sm font-medium">Content Text</Label>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>{charCount.toLocaleString()} characters</span>
                        <span>{wordCount.toLocaleString()} words</span>
                      </div>
                    </div>
                    
                    {/* Scrollable textarea */}
                    <div className="p-0">
                      <Textarea
                        id="content-text"
                        placeholder="Paste your content here..."
                        value={contentText}
                        onChange={(e) => {
                          setContentText(e.target.value);
                          setConvertedToMarkdown(false); // Reset conversion state when text changes
                        }}
                        className="min-h-[300px] max-h-80 overflow-y-auto border-0 rounded-none rounded-b-lg font-mono text-sm resize-none"
                      />
                    </div>
                  </div>
                  
                  {/* Convert to Markdown Button */}
                  {contentText.trim() && (
                    <Button
                      variant="outline"
                      onClick={handleConvertToMarkdown}
                      disabled={convertingToMarkdown}
                      className="w-full"
                    >
                      {convertingToMarkdown ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Converting to Markdown...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Convert to Markdown with AI
                        </>
                      )}
                    </Button>
                  )}

                  {/* Show converted markdown preview if available */}
                  {convertedToMarkdown && contentText && (
                    <div>
                      <Label>Converted Markdown Preview</Label>
                      <div className="mt-1 bg-gray-50 rounded-lg border">
                        {/* Header with badges */}
                        <div className="flex items-center justify-between p-3 border-b bg-gray-100 rounded-t-lg">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              <Wand2 className="h-3 w-3 mr-1" />
                              Converted to Markdown
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500">
                            {contentText.length.toLocaleString()} characters
                          </div>
                        </div>
                        
                        {/* Scrollable content area */}
                        <div className="p-4 max-h-80 overflow-y-auto">
                          <div className="prose prose-sm max-w-none text-gray-700">
                            <ReactMarkdown>
                              {contentText}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                <div>
                  <Label htmlFor="source-url">URL</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="source-url"
                      type="url"
                      placeholder="https://example.com"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      className="flex-1"
                    />
                    {sourceUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(sourceUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Crawling Options for Website Sources */}
                {isWebsiteSource && (
                  <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="crawl-links"
                        checked={crawlLinks}
                        onCheckedChange={(checked) => setCrawlLinks(!!checked)}
                      />
                      <Label htmlFor="crawl-links" className="text-sm font-medium">
                        Crawl additional pages from this website
                      </Label>
                    </div>
                    
                    {crawlLinks && (
                      <div className="ml-6">
                        <Label htmlFor="max-pages" className="text-sm">
                          Maximum pages to crawl: {maxPages}
                        </Label>
                        <Input
                          id="max-pages"
                          type="number"
                          min="1"
                          max="10"
                          value={maxPages}
                          onChange={(e) => setMaxPages(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="mt-1 w-20"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          This will automatically discover and extract content from linked pages on the same domain.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Crawling Options for Reddit Sources */}
                {isRedditSource && (
                  <div className="space-y-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="crawl-posts"
                        checked={crawlPosts}
                        onCheckedChange={(checked) => setCrawlPosts(!!checked)}
                      />
                      <Label htmlFor="crawl-posts" className="text-sm font-medium">
                        Crawl multiple posts from subreddit
                      </Label>
                    </div>
                    
                    {crawlPosts && (
                      <div className="ml-6 space-y-3">
                        <div>
                          <Label htmlFor="max-posts" className="text-sm">
                            Maximum posts to crawl: {maxPosts}
                          </Label>
                          <Input
                            id="max-posts"
                            type="number"
                            min="1"
                            max="20"
                            value={maxPosts}
                            onChange={(e) => setMaxPosts(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                            className="mt-1 w-20"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="include-comments"
                        checked={includeComments}
                        onCheckedChange={(checked) => setIncludeComments(!!checked)}
                      />
                      <Label htmlFor="include-comments" className="text-sm font-medium">
                        Include top comments from posts
                      </Label>
                    </div>
                    
                    <p className="text-xs text-gray-600">
                      {crawlPosts 
                        ? `This will extract the top ${maxPosts} posts from the subreddit${includeComments ? ' along with their top comments' : ''}.`
                        : `This will extract the single post${includeComments ? ' along with its top comments' : ''}.`
                      }
                    </p>
                  </div>
                )}

                {/* Extract Button */}
                <Button
                  variant="outline"
                  onClick={handleExtract}
                  disabled={extracting || !sourceUrl}
                  className="w-full"
                >
                  {extracting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isWebsiteSource ? 'Scraping Website...' : 
                       isVideoSource ? 'Analyzing Video...' : 
                       isRedditSource ? 'Scraping Reddit...' : 
                       isSocialSource ? 'Analyzing Social Media...' :
                       'Extracting...'}
                    </>
                  ) : extracted ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      {extractedResults.length > 1 ? `Extracted ${extractedResults.length} ${isRedditSource ? 'Posts' : 'Pages'}` : 'Content Extracted'}
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4 mr-2" />
                      {isWebsiteSource ? 'Scrape Website' : 
                       isVideoSource ? 'Analyze Video' : 
                       isRedditSource ? 'Scrape Reddit' : 
                       isSocialSource ? 'Analyze Social Media' :
                       'Extract Content'}
                    </>
                  )}
                </Button>

                {/* Show extracted content preview if available */}
                {extracted && contentText && (
                  <div>
                    <Label>Extracted Content Preview</Label>
                    <div className="mt-1 bg-gray-50 rounded-lg border">
                      {/* Header with badges */}
                      <div className="flex items-center justify-between p-3 border-b bg-gray-100 rounded-t-lg">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Content Extracted
                          </Badge>
                          {extractedResults.length > 1 && (
                            <Badge variant="outline">
                              {extractedResults.length} Pages
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {contentText.length.toLocaleString()} characters
                        </div>
                      </div>
                      
                      {/* Scrollable content area */}
                      <div className="p-4 max-h-80 overflow-y-auto">
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <ReactMarkdown>
                            {contentText}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual text input as fallback */}
                <div>
                  <Label htmlFor="url-content">
                    {extracted ? 'Edit Extracted Content' : 'Content from URL (paste manually if extraction fails)'}
                  </Label>
                  <div className="mt-1 bg-gray-50 rounded-lg border">
                    {/* Header with character count */}
                    <div className="flex items-center justify-between p-3 border-b bg-gray-100 rounded-t-lg">
                      <Label className="text-sm font-medium">
                        {extracted ? 'Edit Content' : 'Manual Content Entry'}
                      </Label>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>{charCount.toLocaleString()} characters</span>
                        <span>{wordCount.toLocaleString()} words</span>
                      </div>
                    </div>
                    
                    {/* Scrollable textarea */}
                    <div className="p-0">
                      <Textarea
                        id="url-content"
                        placeholder={extracted ? 'Edit the extracted content...' : 'If the URL doesn\'t auto-extract, paste the content here...'}
                        value={contentText}
                        onChange={(e) => setContentText(e.target.value)}
                        className="min-h-[200px] max-h-80 border-0 rounded-none rounded-b-lg font-mono text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  handleClear();
                  setShowAddForm(false);
                }}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={handleClear}
                  disabled={!sourceName && !sourceUrl && !contentText}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading || (!contentText && !sourceUrl)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingId ? 'Update' : 'Save'} Context
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  );
} 