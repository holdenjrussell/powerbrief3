"use client";

import React, { useState } from 'react';
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
  Globe,
  Hash,
  Share2,
  Loader2,
  Download,
  Copy,
  CheckCircle,
  Link2,
  FileText,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import ReactMarkdown from 'react-markdown';

interface ExtractedResult {
  url: string;
  title: string;
  markdown: string;
  links: string[];
  timestamp: string;
}

interface UrlToMarkdownProps {
  brandId: string;
}

export function UrlToMarkdown({ brandId }: UrlToMarkdownProps) {
  const [activeTab, setActiveTab] = useState('websites');
  const [sourceUrl, setSourceUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedContent, setExtractedContent] = useState('');
  const [extractedResults, setExtractedResults] = useState<ExtractedResult[]>([]);
  
  // Website-specific options
  const [crawlLinks, setCrawlLinks] = useState(false);
  const [maxPages, setMaxPages] = useState(3);
  
  // Reddit-specific options
  const [crawlPosts, setCrawlPosts] = useState(false);
  const [maxPosts, setMaxPosts] = useState(5);
  const [includeComments, setIncludeComments] = useState(true);
  
  // Social media batch processing
  const [, setIsBatchMode] = useState(false);

  const handleExtract = async () => {
    if (!sourceUrl.trim()) {
      toast({
        title: 'URL Required',
        description: 'Please enter a URL to extract content from.',
        variant: 'destructive',
      });
      return;
    }

    setExtracting(true);
    setExtractedContent('');
    setExtractedResults([]);

    try {
      if (activeTab === 'websites') {
        // Website extraction
        const response = await fetch('/api/onesheet/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: sourceUrl,
            brandId,
            crawlLinks,
            maxPages: crawlLinks ? maxPages : 1,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.results) {
          setExtractedResults(data.results);
          const combinedContent = data.results
            .map((result: ExtractedResult) => `## ${result.title}\nSource: ${result.url}\n\n${result.markdown}`)
            .join('\n\n---\n\n');
          setExtractedContent(combinedContent);
        } else {
          setExtractedContent(data.content || data.markdown || '');
        }

        toast({
          title: 'Content Extracted',
          description: data.results 
            ? `Successfully extracted content from ${data.results.length} page(s).`
            : 'Successfully extracted and converted to markdown.',
        });

      } else if (activeTab === 'reddit') {
        // Reddit extraction
        const response = await fetch('/api/onesheet/extract-reddit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: sourceUrl,
            brandId,
            crawlPosts,
            maxPosts: crawlPosts ? maxPosts : 1,
            includeComments,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data.results) {
          setExtractedResults(data.results);
          const combinedContent = data.results
            .map((result: ExtractedResult) => `## ${result.title}\nSource: ${result.url}\n\n${result.markdown}`)
            .join('\n\n---\n\n');
          setExtractedContent(combinedContent);
        } else {
          setExtractedContent(data.content || data.markdown || '');
        }

        toast({
          title: 'Reddit Content Extracted',
          description: `Successfully extracted content from ${data.results?.length || 1} post(s).`,
        });

      } else if (activeTab === 'social') {
        // Social media extraction
        const urls = sourceUrl.split('\n').map(url => url.trim()).filter(Boolean);
        
        if (urls.length > 1) {
          setIsBatchMode(true);
          // Batch processing
          const response = await fetch('/api/onesheet/analyze-social-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              urls,
              sourceType: 'social_media',
              brandId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          
          let combinedContent = `# Batch Social Media Analysis\n\n**Total URLs:** ${urls.length}\n**Successful:** ${data.successful}\n**Failed:** ${data.failed}\n\n---\n\n`;
          
          data.results.forEach((result: { url: string; data?: { result?: { title?: string; markdown?: string } } }, index: number) => {
            combinedContent += `## ${index + 1}. ${result.data?.result?.title || 'Social Media Post'}\n\n`;
            combinedContent += `**URL:** ${result.url}\n\n`;
            if (result.data?.result?.markdown) {
              combinedContent += result.data.result.markdown + '\n\n---\n\n';
            }
          });

          if (data.errors.length > 0) {
            combinedContent += `## Failed URLs\n\n`;
            data.errors.forEach((error: { url: string; error: string }) => {
              combinedContent += `- **${error.url}:** ${error.error}\n`;
            });
          }

          setExtractedContent(combinedContent);
          
          toast({
            title: 'Batch Analysis Complete',
            description: `Processed ${urls.length} URLs. ${data.successful} successful, ${data.failed} failed.`,
          });

        } else {
          setIsBatchMode(false);
          // Single URL processing
          const response = await fetch('/api/onesheet/analyze-social', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: sourceUrl,
              sourceType: 'social_media',
              brandId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          const result = data.result;
          setExtractedContent(result.markdown || result.content || '');
          
          toast({
            title: 'Social Media Content Analyzed',
            description: 'Successfully extracted and analyzed the social media content.',
          });
        }
      }

         } catch (error) {
       console.error('Extraction error:', error);
       
       // Check if it's a known problematic domain
       const problematicDomains = [
         'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'x.com',
         'amazon.com', 'ebay.com', 'paypal.com', 'google.com', 'microsoft.com'
       ];
       
       const isProblematicDomain = problematicDomains.some(domain => 
         sourceUrl.toLowerCase().includes(domain)
       );
       
       let errorMessage = error instanceof Error ? error.message : 'Failed to extract content.';
       
       if (isProblematicDomain) {
         errorMessage = `This site (${new URL(sourceUrl).hostname}) likely blocks automated scraping. Try copying the content manually or use a different approach.`;
       } else if (errorMessage.includes('400') || errorMessage.includes('403') || errorMessage.includes('blocked')) {
         errorMessage = 'This website is blocking automated access. Try copying the content manually instead.';
       }
       
       toast({
         title: 'Extraction Failed',
         description: errorMessage,
         variant: 'destructive',
       });
     } finally {
       setExtracting(false);
     }
  };

  const handleCopy = () => {
    if (extractedContent) {
      navigator.clipboard.writeText(extractedContent);
      toast({
        title: 'Copied!',
        description: 'Markdown content copied to clipboard.',
      });
    }
  };

  const handleDownload = () => {
    if (extractedContent) {
      const blob = new Blob([extractedContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `extracted-content-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Downloaded!',
        description: 'Markdown file downloaded successfully.',
      });
    }
  };

  const handleClear = () => {
    setSourceUrl('');
    setExtractedContent('');
    setExtractedResults([]);
    setCrawlLinks(false);
    setMaxPages(3);
    setCrawlPosts(false);
    setMaxPosts(5);
    setIncludeComments(true);
    setIsBatchMode(false);
  };

  const charCount = extractedContent.length;
  const wordCount = extractedContent.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            URL to Markdown Converter
          </CardTitle>
          <CardDescription>
            Extract and convert web content to clean, structured markdown format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="websites" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Websites
              </TabsTrigger>
              <TabsTrigger value="reddit" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Reddit
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Social Media
              </TabsTrigger>
            </TabsList>

            <TabsContent value="websites" className="space-y-4">
                             <Alert>
                 <Globe className="h-4 w-4" />
                 <AlertDescription>
                   Extract content from any website. Enable crawling to follow links and extract multiple pages.
                   <br />
                   <strong>Note:</strong> Some sites (Facebook, Instagram, LinkedIn, etc.) block automated scraping.
                 </AlertDescription>
               </Alert>

               <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                 <h4 className="font-semibold text-blue-900 mb-2">🛠️ Workarounds for Blocked Sites:</h4>
                 <ul className="text-sm text-blue-800 space-y-1">
                   <li>• <strong>Add delays:</strong> Enable &quot;Slow Mode&quot; below to add random delays between requests</li>
                   <li>• <strong>Try archive.org:</strong> Use <code>https://web.archive.org/web/ORIGINAL_URL</code></li>
                   <li>• <strong>Use cached versions:</strong> Try <code>https://webcache.googleusercontent.com/search?q=cache:ORIGINAL_URL</code></li>
                   <li>• <strong>Browser method:</strong> Open site in private browser, copy content manually</li>
                   <li>• <strong>Mobile versions:</strong> Try adding <code>m.</code> prefix (e.g., m.facebook.com)</li>
                 </ul>
               </div>

                             <div className="space-y-4">
                 <div>
                   <Label htmlFor="website-url">Website URL</Label>
                   <Input
                     id="website-url"
                     type="url"
                     placeholder="https://example.com"
                     value={sourceUrl}
                     onChange={(e) => setSourceUrl(e.target.value)}
                     disabled={extracting}
                   />
                                        <p className="text-sm text-gray-500 mt-1">
                       <strong>Tip:</strong> If extraction fails due to anti-bot protection, you can copy the content manually 
                       and paste it in the &quot;Manual Entry&quot; section below.
                     </p>
                   </div>

                   {/* URL Transformation Helpers */}
                   <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                     <h4 className="font-medium text-gray-900 mb-2">Quick URL Transformations:</h4>
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => {
                           try {
                             new URL(sourceUrl); // Validate URL
                             const archiveUrl = `https://web.archive.org/web/${sourceUrl}`;
                             setSourceUrl(archiveUrl);
                             toast({
                               title: 'URL Transformed',
                               description: 'Switched to Wayback Machine archived version',
                             });
                           } catch {
                             toast({
                               title: 'Invalid URL',
                               description: 'Please enter a valid URL first',
                               variant: 'destructive',
                             });
                           }
                         }}
                         disabled={!sourceUrl.trim() || extracting}
                       >
                         Try Archive.org
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => {
                           try {
                             new URL(sourceUrl); // Validate URL
                             const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${sourceUrl}`;
                             setSourceUrl(cacheUrl);
                             toast({
                               title: 'URL Transformed',
                               description: 'Switched to Google cached version',
                             });
                           } catch {
                             toast({
                               title: 'Invalid URL',
                               description: 'Please enter a valid URL first',
                               variant: 'destructive',
                             });
                           }
                         }}
                         disabled={!sourceUrl.trim() || extracting}
                       >
                         Try Google Cache
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => {
                           try {
                             const url = new URL(sourceUrl);
                             if (!url.hostname.startsWith('m.')) {
                               url.hostname = 'm.' + url.hostname;
                               setSourceUrl(url.toString());
                               toast({
                                 title: 'URL Transformed',
                                 description: 'Switched to mobile version',
                               });
                             } else {
                               toast({
                                 title: 'Already Mobile',
                                 description: 'URL already appears to be mobile version',
                               });
                             }
                           } catch {
                             toast({
                               title: 'Invalid URL',
                               description: 'Please enter a valid URL first',
                               variant: 'destructive',
                             });
                           }
                         }}
                         disabled={!sourceUrl.trim() || extracting}
                       >
                         Try Mobile Version
                       </Button>
                     </div>
                   </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="crawl-links"
                    checked={crawlLinks}
                    onCheckedChange={(checked) => setCrawlLinks(checked as boolean)}
                    disabled={extracting}
                  />
                  <Label htmlFor="crawl-links" className="cursor-pointer">
                    Crawl additional pages from this domain
                  </Label>
                </div>

                {crawlLinks && (
                  <div>
                    <Label htmlFor="max-pages">Maximum pages to crawl (1-50)</Label>
                    <Input
                      id="max-pages"
                      type="number"
                      min="1"
                      max="50"
                      value={maxPages}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 1 && value <= 50) {
                          setMaxPages(value);
                        } else if (e.target.value === '') {
                          setMaxPages(1);
                        }
                      }}
                      disabled={extracting}
                      placeholder="Enter number of pages (1-50)"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Enter a number between 1 and 50. Higher numbers may take longer to process.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reddit" className="space-y-4">
              <Alert>
                <Hash className="h-4 w-4" />
                <AlertDescription>
                  Extract Reddit threads and discussions. Include comments for full context.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="reddit-url">Reddit URL</Label>
                  <Input
                    id="reddit-url"
                    type="url"
                    placeholder="https://reddit.com/r/..."
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    disabled={extracting}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="crawl-posts"
                    checked={crawlPosts}
                    onCheckedChange={(checked) => setCrawlPosts(checked as boolean)}
                    disabled={extracting}
                  />
                  <Label htmlFor="crawl-posts" className="cursor-pointer">
                    Extract multiple posts from subreddit
                  </Label>
                </div>

                {crawlPosts && (
                  <div>
                    <Label htmlFor="max-posts">Maximum posts to extract (1-50)</Label>
                    <Input
                      id="max-posts"
                      type="number"
                      min="1"
                      max="50"
                      value={maxPosts}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value >= 1 && value <= 50) {
                          setMaxPosts(value);
                        } else if (e.target.value === '') {
                          setMaxPosts(1);
                        }
                      }}
                      disabled={extracting}
                      placeholder="Enter number of posts (1-50)"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Enter a number between 1 and 50. Higher numbers may take longer to process.
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-comments"
                    checked={includeComments}
                    onCheckedChange={(checked) => setIncludeComments(checked as boolean)}
                    disabled={extracting}
                  />
                  <Label htmlFor="include-comments" className="cursor-pointer">
                    Include comments in extraction
                  </Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="social" className="space-y-4">
              <Alert>
                <Share2 className="h-4 w-4" />
                <AlertDescription>
                  Analyze social media posts from Facebook, Instagram, TikTok, YouTube, etc. 
                  Paste multiple URLs (one per line) for batch processing.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="social-urls">Social Media URL(s)</Label>
                  <Textarea
                    id="social-urls"
                    placeholder="https://www.tiktok.com/@user/video/...
https://www.instagram.com/p/...
https://www.youtube.com/watch?v=..."
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    disabled={extracting}
                    rows={5}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Enter one URL per line for batch processing
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

                     <div className="flex gap-2 mt-6">
             <Button
               onClick={handleExtract}
               disabled={extracting || !sourceUrl.trim()}
               className="flex-1"
             >
               {extracting ? (
                 <>
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   Extracting...
                 </>
               ) : (
                 <>
                   <Globe className="mr-2 h-4 w-4" />
                   Extract Content
                 </>
               )}
             </Button>
             <Button
               variant="outline"
               onClick={handleClear}
               disabled={extracting}
             >
               Clear
             </Button>
           </div>

           {/* Manual Entry Section */}
           <div className="mt-8 pt-6 border-t">
             <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
               <FileText className="h-5 w-5" />
               Manual Entry
             </h3>
             <p className="text-sm text-gray-600 mb-4">
               If automatic extraction fails, you can manually copy and paste content here. 
               Click &quot;Convert to Markdown&quot; to use Gemini AI to clean and structure your content into professional markdown format.
             </p>
             <div className="space-y-4">
               <div>
                 <Label htmlFor="manual-content">Paste Content Here</Label>
                 <Textarea
                   id="manual-content"
                   placeholder="Paste your copied content here..."
                   value={extractedContent}
                   onChange={(e) => setExtractedContent(e.target.value)}
                   rows={10}
                   className="mt-1"
                 />
               </div>
               <div className="flex gap-2">
                 <Button
                   onClick={async () => {
                     if (!extractedContent.trim()) return;
                     
                     setExtracting(true);
                     try {
                       const response = await fetch('/api/onesheet/convert-to-markdown', {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ 
                           text: extractedContent,
                           brandId 
                         }),
                       });

                       if (!response.ok) {
                         const errorData = await response.json().catch(() => ({}));
                         throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                       }

                       const data = await response.json();
                       setExtractedContent(data.markdown || data.content || '');
                       
                       toast({
                         title: 'Converted to Markdown',
                         description: 'Your content has been converted to well-structured markdown format.',
                       });
                     } catch (error) {
                       console.error('Markdown conversion error:', error);
                       toast({
                         title: 'Conversion Failed',
                         description: error instanceof Error ? error.message : 'Failed to convert text to markdown.',
                         variant: 'destructive',
                       });
                     } finally {
                       setExtracting(false);
                     }
                   }}
                   disabled={!extractedContent.trim() || extracting}
                   variant="outline"
                 >
                   {extracting ? (
                     <>
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       Converting...
                     </>
                   ) : (
                     'Convert to Markdown'
                   )}
                 </Button>
               </div>
             </div>
           </div>
        </CardContent>
      </Card>

      {extractedContent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Extracted Content
              </CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex gap-2 text-sm text-gray-500">
                  <Badge variant="secondary">{charCount} chars</Badge>
                  <Badge variant="secondary">{wordCount} words</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{extractedContent}</ReactMarkdown>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {extractedResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Extracted Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {extractedResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{result.title}</p>
                    <p className="text-xs text-gray-500">{result.url}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {result.markdown.length} chars
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 