import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';

interface ExtractRequest {
  url: string;
  crawlLinks?: boolean;
  maxPages?: number;
  brandId: string;
}

interface ScrapedData {
  url: string;
  title: string;
  content: string;
  links: string[];
  timestamp: string;
  method: 'http';
}

// Lightweight HTTP-based scraping (Vercel compatible)
async function scrapeWithHTTP(url: string, crawlLinks: boolean = false, maxPages: number = 3): Promise<ScrapedData[]> {
  const results: ScrapedData[] = [];
  const processedUrls = new Set<string>();
  const urlsToProcess = [url];

  console.log(`[HTTPScraper] Starting extraction for: ${url} (max ${maxPages} pages)`);

  while (urlsToProcess.length > 0 && results.length < maxPages) {
    const currentUrl = urlsToProcess.shift()!;
    
    if (processedUrls.has(currentUrl)) continue;
    processedUrls.add(currentUrl);

    try {
      console.log(`[HTTPScraper] Fetching: ${currentUrl}`);
      
      const response = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        console.warn(`[HTTPScraper] Failed to fetch ${currentUrl}: ${response.status}`);
        continue;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove script and style elements
      $('script, style, nav, footer, header, .nav, .menu, .sidebar, .advertisement, .ads').remove();

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
          content = element.text();
          if (content.length > 100) break;
        }
      }

      // Clean up content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/[\r\n]+/g, '\n')
        .trim()
        .substring(0, 10000);

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
              
              if (linkUrl.hostname === baseUrl.hostname && 
                  !processedUrls.has(absoluteUrl) && 
                  !urlsToProcess.includes(absoluteUrl) &&
                  discoveredLinks.length < 10) {
                discoveredLinks.push(absoluteUrl);
              }
            } catch {
              // Skip invalid URLs
            }
          }
        });

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
      console.error(`[HTTPScraper] Error scraping ${currentUrl}:`, error);
      continue;
    }
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[ExtractV2] Starting extraction with direct Supabase client...');
    
    // Use direct Supabase client instead of auth helpers
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get Authorization header instead of cookies
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.log('[ExtractV2] No authorization header found');
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Set the auth token directly
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log('[ExtractV2] Auth failed:', authError?.message);
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }

    console.log('[ExtractV2] User authenticated:', user.id);

    const body: ExtractRequest = await request.json();
    const { url, crawlLinks = false, maxPages = 3, brandId } = body;

    if (!url || !brandId) {
      return NextResponse.json({ error: 'URL and brand ID are required' }, { status: 400 });
    }

    // Check brand access with proper auth
    const { data: brand } = await supabase
      .from('brands')
      .select('elevenlabs_api_key')
      .eq('id', brandId)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 404 });
    }

    // Initialize Gemini
    const geminiApiKey = brand.elevenlabs_api_key || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: 'Google API key not configured' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-thinking-exp' });

    console.log(`[ExtractV2] Starting HTTP-based extraction for: ${url}`);

    const scrapedData = await scrapeWithHTTP(url, crawlLinks, maxPages);

    console.log(`[ExtractV2] Scraped ${scrapedData.length} pages using HTTP method`);

    // Convert scraped content to markdown using Gemini
    const markdownResults = [];
    
    for (const scraped of scrapedData) {
      try {
        const prompt = `Convert the following web content to clean, well-structured markdown. 
        Remove navigation elements, ads, and footer content. Focus on the main content.
        Include the title as an H1 heading.
        
        URL: ${scraped.url}
        Title: ${scraped.title}
        
        Content:
        ${scraped.content}
        
        Return only the markdown content, no explanations:`;

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
        
        console.log(`[ExtractV2] Converted ${scraped.url} to markdown`);
      } catch (error) {
        console.error(`[ExtractV2] Error converting ${scraped.url} to markdown:`, error);
        
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

    return NextResponse.json({
      success: true,
      results: markdownResults,
      totalPages: scrapedData.length,
      crawledLinks: crawlLinks,
      method: 'http',
      vercelCompatible: true,
      authMethod: 'direct-client'
    });

  } catch (error) {
    console.error('[ExtractV2] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to extract content', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 