import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { Database } from '@/lib/types/supabase';

interface ExtractRequest {
  url: string;
  crawlLinks?: boolean;
  maxPages?: number;
  brandId: string;
  useFullBrowser?: boolean; // Option for local development
}

interface ScrapedData {
  url: string;
  title: string;
  content: string;
  links: string[];
  timestamp: string;
  method: 'http' | 'browser';
}

// Lightweight HTTP-based scraping (Vercel compatible)
async function scrapeWithHTTP(url: string, crawlLinks: boolean = false, maxPages: number = 3): Promise<ScrapedData[]> {
  const results: ScrapedData[] = [];
  const processedUrls = new Set<string>();
  const contentHashes = new Set<string>(); // Track content to avoid duplicates
  const urlsToProcess = [url];

  console.log(`[HTTPScraper] Starting extraction for: ${url} (max ${maxPages} pages)`);

  while (urlsToProcess.length > 0 && results.length < maxPages) {
    const currentUrl = urlsToProcess.shift()!;
    
    if (processedUrls.has(currentUrl)) continue;
    processedUrls.add(currentUrl);

    try {
      console.log(`[HTTPScraper] Fetching: ${currentUrl}`);
      
      // Create a reasonable timeout for individual requests (60 seconds)
      // This prevents individual slow requests from hanging while allowing overall function to run longer
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => {
        controller.abort();
      }, 60000); // 60 second timeout per request
      
      // Use fetch with proper headers to appear like a real browser
      const response = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: controller.signal
      });
      
      // Clear the timeout since request completed
      clearTimeout(fetchTimeout);

      if (!response.ok) {
        console.warn(`[HTTPScraper] Failed to fetch ${currentUrl}: ${response.status}`);
        continue;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove script, style, media, and navigation elements
      $('script, style, nav, footer, header, .nav, .menu, .sidebar, .advertisement, .ads, img, video, iframe, embed, object, svg, picture, source').remove();
      
      // Remove elements with image/video related classes and attributes
      $('[class*="image"], [class*="video"], [class*="media"], [class*="gallery"], [class*="carousel"], [class*="slider"]').remove();
      $('[src*=".jpg"], [src*=".jpeg"], [src*=".png"], [src*=".gif"], [src*=".webp"], [src*=".mp4"], [src*=".webm"]').remove();

      // Extract title
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

      // Extract main content using multiple selectors (priority order)
      const contentSelectors = [
        'main',
        'article', 
        '[role="main"]',
        '.content',
        '#content',
        '.post-content',
        '.entry-content',
        '.main-content',
        'body'
      ];

      let content = '';
      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          // Get text content and clean it up
          content = element.text();
          if (content.length > 100) break; // Use first meaningful content
        }
      }

      // Clean up content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, '\n')
        .trim();
        // Remove character limit to capture full content

      // Create a simple hash of content to detect duplicates
      const contentHash = content.slice(0, 500) + content.length; // Simple hash using first 500 chars + length
      
      // Skip if we've already processed this content
      if (contentHashes.has(contentHash)) {
        console.log(`[HTTPScraper] Skipping duplicate content for: ${currentUrl}`);
        continue;
      }
      contentHashes.add(contentHash);

      // Extract links for crawling
      const discoveredLinks: string[] = [];
      if (crawlLinks && results.length < maxPages - 1) {
        $('a[href]').each((_, element) => {
          const href = $(element).attr('href');
          if (href) {
            try {
              const absoluteUrl = new URL(href, currentUrl).toString();
              const baseUrl = new URL(url);
              const linkUrl = new URL(absoluteUrl);
              
              // Special handling for Archive.org URLs
              const isArchiveUrl = baseUrl.hostname.includes('web.archive.org');
              
              if (isArchiveUrl) {
                // For Archive.org, only follow links that are also archived versions of the original domain
                // Skip Archive.org internal links like screenshots, calendars, etc.
                const skipPatterns = [
                  '/screenshot/',
                  '/web/*/http://web.archive.org/',
                  '*/http://web.archive.org/',
                  'web.archive.org/save/',
                  'web.archive.org/web/timemap/',
                  '#close',
                  '#expand'
                ];
                
                const shouldSkip = skipPatterns.some(pattern => absoluteUrl.includes(pattern));
                
                // Only include if it's an archived page of the original domain and not an internal Archive.org feature
                if (!shouldSkip && 
                    absoluteUrl.includes('web.archive.org/web/') && 
                    !processedUrls.has(absoluteUrl) && 
                    !urlsToProcess.includes(absoluteUrl) &&
                    discoveredLinks.length < 10) {
                  
                  // Extract the original URL from the archive URL to check if it's the same domain
                  const archiveMatch = absoluteUrl.match(/web\.archive\.org\/web\/\d+\*?\/(https?:\/\/.+)/);
                  if (archiveMatch) {
                    try {
                      const originalUrl = new URL(archiveMatch[1]);
                      const targetDomain = url.includes('web.archive.org/web/') 
                        ? url.match(/web\.archive\.org\/web\/\d+\*?\/(https?:\/\/[^\/]+)/)?.[1]
                        : baseUrl.origin;
                      
                      if (targetDomain && originalUrl.origin === new URL(targetDomain).origin) {
                        discoveredLinks.push(absoluteUrl);
                      }
                    } catch {
                      // Skip malformed URLs
                    }
                  }
                }
              } else {
                // Regular domain logic for non-archive URLs
                if (linkUrl.hostname === baseUrl.hostname && 
                    !processedUrls.has(absoluteUrl) && 
                    !urlsToProcess.includes(absoluteUrl) &&
                    discoveredLinks.length < 10) {
                  discoveredLinks.push(absoluteUrl);
                }
              }
            } catch {
              // Skip invalid URLs
            }
          }
        });

        // Add discovered links to processing queue
        urlsToProcess.push(...discoveredLinks.slice(0, maxPages - results.length - 1));
      }

      results.push({
        url: currentUrl,
        title,
        content,
        links: discoveredLinks,
        timestamp: new Date().toISOString(),
        method: 'http'
      });

      console.log(`[HTTPScraper] Successfully scraped: ${currentUrl} (${content.length} chars)`);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[HTTPScraper] Request timeout (60s) for ${currentUrl} - skipping and continuing with other pages`);
      } else {
        console.error(`[HTTPScraper] Error scraping ${currentUrl}:`, error);
      }
      continue; // Continue with next URL even if this one fails
    }
  }

  return results;
}

// Note: Browser-based scraping removed due to Next.js dependency conflicts
// The system now uses only HTTP-based scraping which is Vercel compatible

// Helper function to create a timeout promise
const createTimeoutPromise = (timeoutMs: number) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Function timeout approaching (${timeoutMs}ms). Consider reducing maxPages or trying a simpler URL.`));
    }, timeoutMs);
  });
};

export async function POST(request: NextRequest) {
  // Vercel timeout is 880 seconds (880,000ms) for Pro plans, 10 seconds for Hobby
  // We'll set our timeout to 870 seconds (870,000ms) to handle gracefully before Vercel cuts us off
  const FUNCTION_TIMEOUT_MS = 870000; // 870 seconds
  
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore if called from Server Component
            }
          },
        }
      }
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ExtractRequest = await request.json();
    const { url, crawlLinks = false, maxPages = 3, brandId } = body;

    if (!url || !brandId) {
      return NextResponse.json({ error: 'URL and brand ID are required' }, { status: 400 });
    }

    // Verify user has access to this brand (check owned and shared brands)
    const { data: brand } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', brandId)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 404 });
    }

    // Use environment variable for Gemini API key (same as PowerBrief approach)
    const geminiApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('ERROR: No API key found in environment variables. Check .env.local for GOOGLE_API_KEY or GEMINI_API_KEY');
      return NextResponse.json({ 
        error: 'Gemini API key not configured in environment variables (GOOGLE_API_KEY or GEMINI_API_KEY)' 
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-thinking-exp' });

    console.log(`[WebScraper] Starting HTTP-based extraction for: ${url}`);

    // Wrap the main processing in a timeout handler
    const mainProcessing = async () => {
      // Use only HTTP-based scraping (Vercel compatible)
      const scrapedData = await scrapeWithHTTP(url, crawlLinks, maxPages);

      console.log(`[WebScraper] Scraped ${scrapedData.length} pages using HTTP method`);

      // Convert scraped content to markdown using Gemini
      const markdownResults = [];
      
      for (const scraped of scrapedData) {
        try {
          const prompt = `Convert the following web content to clean, well-structured markdown. 
          
          IMPORTANT INSTRUCTIONS:
          - Remove all navigation elements, ads, footer content, and sidebar content
          - Remove ALL image references, video links, srcset attributes, and media URLs
          - Remove HTML tags and attributes completely
          - Focus ONLY on the main textual content (headings, paragraphs, lists, product descriptions, etc.)
          - Include the title as an H1 heading
          - Structure content with proper markdown headings (H2, H3, etc.)
          - Keep only meaningful text content that describes the product/service/content
          
          URL: ${scraped.url}
          Title: ${scraped.title}
          
          Content:
          ${scraped.content}
          
          Return only clean markdown content with no HTML, no image URLs, no video links, and no explanations:`;

          const result = await model.generateContent(prompt);
          const markdownContent = result.response.text();
          
          markdownResults.push({
            url: scraped.url,
            title: scraped.title,
            originalContent: scraped.content,
            markdown: markdownContent,
            links: scraped.links,
            timestamp: scraped.timestamp,
            method: scraped.method
          });
          
          console.log(`[WebScraper] Converted ${scraped.url} to markdown`);
        } catch (error) {
          console.error(`[WebScraper] Error converting ${scraped.url} to markdown:`, error);
          
          // Fallback: return original content as markdown
          markdownResults.push({
            url: scraped.url,
            title: scraped.title,
            originalContent: scraped.content,
            markdown: `# ${scraped.title}\n\n${scraped.content}`,
            links: scraped.links,
            timestamp: scraped.timestamp,
            method: scraped.method
          });
        }
      }

      return {
        success: true,
        results: markdownResults,
        totalPages: scrapedData.length,
        crawledLinks: crawlLinks,
        method: 'http',
        vercelCompatible: true
      };
    };

    // Race between main processing and timeout
    try {
      const result = await Promise.race([
        mainProcessing(),
        createTimeoutPromise(FUNCTION_TIMEOUT_MS)
      ]);
      
      return NextResponse.json(result);
    } catch (timeoutError) {
      // Handle timeout gracefully
      if (timeoutError instanceof Error && timeoutError.message.includes('timeout approaching')) {
        console.warn('[WebScraper] Function timeout approaching, returning partial results');
        return NextResponse.json({
          success: false,
          error: 'Function timeout approaching',
          message: 'The extraction process took too long. Try reducing the number of pages (maxPages) or use a simpler URL.',
          suggestions: [
            'Reduce maxPages to 1 for single page extraction',
            'Disable crawlLinks to avoid following additional links',
            'Try extracting specific product/content pages instead of home pages'
          ],
          timeoutMs: FUNCTION_TIMEOUT_MS,
          vercelTimeout: true
        }, { status: 408 }); // 408 Request Timeout
      }
      throw timeoutError;
    }

  } catch (error) {
    console.error('[WebScraper] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to extract content', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 