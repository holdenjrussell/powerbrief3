import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/lib/types/supabase';
import * as cheerio from 'cheerio';

interface TrustpilotReviewRequest {
  url: string;
  brandId: string;
  maxPages?: number; // Default to 20 pages
  brandType?: 'our_brand' | 'competitor' | 'neutral';
}

interface TrustpilotReview {
  id: string;
  rating: number;
  title: string;
  text: string;
  source: string;
  likes: number;
  language: string;
  consumer: {
    id: string;
    displayName: string;
    countryCode: string;
    numberOfReviews: number;
    hasImage: boolean;
  };
  dates: {
    experiencedDate: string;
    publishedDate: string;
  };
  reply?: {
    message: string;
    publishedDate: string;
  } | null;
}

interface TrustpilotApiResponse {
  props: {
    pageProps: {
      businessUnit: {
        id: string;
        displayName: string;
        identifyingName: string;
        numberOfReviews: number;
        trustScore: number;
        websiteUrl: string;
        isClaimed: boolean;
      };
      reviews: TrustpilotReview[];
      filters: {
        pagination: {
          page: number;
          perPage: number;
          totalCount: number;
          totalPages: number;
        };
      };
    };
  };
}

interface TrustpilotReviewData {
  companyName: string;
  companyUrl: string;
  trustScore: number;
  totalCompanyReviews: number;
  reviews: TrustpilotReview[];
  totalScrapedReviews: number;
  pagesScraped: number;
  timestamp: string;
}

function extractCompanyIdentifier(url: string): string {
  // Extract company identifier from Trustpilot URL
  // Examples: 
  // https://www.trustpilot.com/review/company-name.com -> company-name.com
  // https://trustpilot.com/review/company-name.com -> company-name.com
  const match = url.match(/trustpilot\.com\/review\/([^/?#]+)/);
  if (!match) {
    throw new Error('Invalid Trustpilot URL format. Expected format: https://www.trustpilot.com/review/company-name.com');
  }
  return match[1];
}

async function fetchTrustpilotPage(companyIdentifier: string, page: number = 1): Promise<TrustpilotApiResponse> {
  const url = page === 1 
    ? `https://www.trustpilot.com/review/${companyIdentifier}`
    : `https://www.trustpilot.com/review/${companyIdentifier}?page=${page}`;

  console.log(`[TrustpilotScraper] Fetching page ${page}: ${url}`);

  // First attempt: Try with the x-nextjs-data header for JSON response
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html, */*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
        // THE CRUCIAL HEADER: This tells Trustpilot to return JSON data instead of HTML
        'x-nextjs-data': '1'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log(`[TrustpilotScraper] Response content-type: ${contentType}`);

    try {
      const jsonData: TrustpilotApiResponse = await response.json();
      
      // Validate that we got the expected structure
      if (!jsonData.props?.pageProps?.reviews) {
        console.warn(`[TrustpilotScraper] Invalid JSON structure from page ${page}, trying HTML fallback`);
        throw new Error('Invalid JSON structure');
      }

      console.log(`[TrustpilotScraper] Successfully parsed JSON for page ${page}`);
      return jsonData;
    } catch (jsonError) {
      console.warn(`[TrustpilotScraper] JSON parsing failed for page ${page}:`, jsonError);
      throw new Error('Failed to parse JSON response');
    }
  } catch (error) {
    console.error(`[TrustpilotScraper] Primary fetch failed for page ${page}:`, error);
    
    // Fallback: Try without special headers to get HTML and parse it
    console.log(`[TrustpilotScraper] Attempting HTML fallback for page ${page}`);
    return await fetchTrustpilotPageHtmlFallback(companyIdentifier, page);
  }
}

// New fallback function to parse HTML when JSON API fails
async function fetchTrustpilotPageHtmlFallback(companyIdentifier: string, page: number = 1): Promise<TrustpilotApiResponse> {
  
  const url = page === 1 
    ? `https://www.trustpilot.com/review/${companyIdentifier}`
    : `https://www.trustpilot.com/review/${companyIdentifier}?page=${page}`;

  console.log(`[TrustpilotScraper] HTML fallback for page ${page}: ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Trustpilot page ${page}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Try to extract data from script tags containing __NEXT_DATA__
  const nextDataScript = $('script').filter((i, el) => {
    const text = $(el).html();
    return text && text.includes('__NEXT_DATA__');
  }).first();

  if (nextDataScript.length > 0) {
    try {
      const scriptContent = nextDataScript.html();
      const match = scriptContent?.match(/__NEXT_DATA__\s*=\s*({.+})/);
      if (match) {
        const nextData = JSON.parse(match[1]);
        console.log(`[TrustpilotScraper] Successfully extracted __NEXT_DATA__ from HTML for page ${page}`);
        
        // Transform to expected structure
        if (nextData.props?.pageProps?.reviews) {
          return nextData as TrustpilotApiResponse;
        }
      }
    } catch (parseError) {
      console.error(`[TrustpilotScraper] Failed to parse __NEXT_DATA__ for page ${page}:`, parseError);
    }
  }

  // If JSON extraction fails, try to parse HTML structure manually
  console.log(`[TrustpilotScraper] Attempting manual HTML parsing for page ${page}`);
  return await parseHtmlReviews($, companyIdentifier, page);
}

// Function to manually parse HTML when JSON methods fail
async function parseHtmlReviews($: cheerio.CheerioAPI, companyIdentifier: string, page: number): Promise<TrustpilotApiResponse> {
  const reviews: TrustpilotReview[] = [];
  
  // Try to find review containers with various selectors
  const reviewSelectors = [
    'article[data-service-review-target]',
    'div[data-service-review-target]', 
    '.review',
    '[data-review-target]'
  ];
  
  let reviewElements: cheerio.Cheerio<cheerio.AnyNode> | null = null;
  for (const selector of reviewSelectors) {
    reviewElements = $(selector);
    if (reviewElements.length > 0) {
      console.log(`[TrustpilotScraper] Found ${reviewElements.length} reviews using selector: ${selector}`);
      break;
    }
  }

  if (!reviewElements || reviewElements.length === 0) {
    console.warn(`[TrustpilotScraper] No review elements found on page ${page}`);
    throw new Error(`No reviews found on page ${page} using HTML parsing`);
  }

  // Extract business info
  const businessName = $('h1').first().text().trim() || 
                      $('[data-business-unit-name]').text().trim() ||
                      'Unknown Business';
  
  const trustScore = parseFloat($('[data-rating-value]').first().text()) || 0;

  reviewElements.each((i: number, element: cheerio.AnyNode) => {
    const $review = $(element);
    
    try {
      // Extract review data with multiple fallback selectors
      const rating = parseInt($review.find('[data-service-review-rating]').first().text()) ||
                    parseInt($review.find('.star-rating').first().attr('data-rating')) ||
                    parseInt($review.find('[data-rating]').first().text()) || 0;

      const title = $review.find('h3, h4, .review-title, [data-service-review-title]').first().text().trim() || '';
      const text = $review.find('.review-content, [data-service-review-text], p').first().text().trim() || '';
      const authorName = $review.find('.consumer-name, [data-consumer-name]').first().text().trim() || 'Anonymous';
      
      // Extract dates
      const dateElement = $review.find('time, [data-service-review-date]').first();
      const publishedDate = dateElement.attr('datetime') || dateElement.text().trim() || new Date().toISOString();

      if (rating > 0 && (title || text)) {
        reviews.push({
          id: `html-${page}-${i}`,
          rating,
          title: title || 'No Title',
          text: text || 'No Content',
          source: 'trustpilot',
          likes: 0,
          language: 'en',
          consumer: {
            id: `consumer-${i}`,
            displayName: authorName,
            countryCode: 'Unknown',
            numberOfReviews: 1,
            hasImage: false
          },
          dates: {
            experiencedDate: publishedDate,
            publishedDate: publishedDate
          },
          reply: null
        });
      }
    } catch (reviewError) {
      console.warn(`[TrustpilotScraper] Error parsing review ${i} on page ${page}:`, reviewError);
    }
  });

  console.log(`[TrustpilotScraper] Extracted ${reviews.length} reviews from HTML on page ${page}`);

  return {
    props: {
      pageProps: {
        businessUnit: {
          id: companyIdentifier,
          displayName: businessName,
          identifyingName: companyIdentifier,
          numberOfReviews: reviews.length * 10, // Estimate
          trustScore: trustScore,
          websiteUrl: '',
          isClaimed: false
        },
        reviews,
        filters: {
          pagination: {
            page: page,
            perPage: reviews.length,
            totalCount: reviews.length * 10, // Estimate
            totalPages: Math.max(1, Math.ceil(reviews.length * 10 / 20)) // Estimate
          }
        }
      }
    }
  };
}

async function scrapeTrustpilotReviews(url: string, maxPages: number = 20): Promise<TrustpilotReviewData> {
  const companyIdentifier = extractCompanyIdentifier(url);
  console.log(`[TrustpilotScraper] Starting Trustpilot review scraping for: ${companyIdentifier}`);

  // Fetch the first page to get pagination info and company details
  const firstPageData = await fetchTrustpilotPage(companyIdentifier, 1);
  const { businessUnit, reviews: firstPageReviews, filters } = firstPageData.props.pageProps;
  const { totalPages, totalCount, perPage } = filters.pagination;

  console.log(`[TrustpilotScraper] Company: ${businessUnit.displayName}`);
  console.log(`[TrustpilotScraper] Total reviews: ${totalCount}, Total pages: ${totalPages}, Per page: ${perPage}`);

  // Collect all reviews starting with the first page
  let allReviews: TrustpilotReview[] = [...firstPageReviews];
  const pagesToScrape = Math.min(totalPages, maxPages);

  console.log(`[TrustpilotScraper] Will scrape ${pagesToScrape} pages (requested max: ${maxPages})`);

  // Fetch remaining pages if there are any
  if (pagesToScrape > 1) {
    // Create array of page numbers to fetch (2, 3, 4, etc.)
    const pageNumbers = Array.from({ length: pagesToScrape - 1 }, (_, i) => i + 2);
    
    // Fetch all pages concurrently for efficiency (but with some rate limiting)
    const pagePromises = pageNumbers.map(async (pageNum) => {
      // Add small delay between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, 500 * (pageNum - 2))); // 500ms * index
      
      try {
        const pageData = await fetchTrustpilotPage(companyIdentifier, pageNum);
        return pageData.props.pageProps.reviews;
      } catch (error) {
        console.error(`[TrustpilotScraper] Error fetching page ${pageNum}:`, error);
        return []; // Return empty array on error to continue with other pages
      }
    });

    // Wait for all pages to complete
    const additionalReviews = await Promise.all(pagePromises);
    
    // Flatten and add all additional reviews
    additionalReviews.forEach(reviews => {
      allReviews.push(...reviews);
    });
  }

  console.log(`[TrustpilotScraper] Successfully scraped ${allReviews.length} reviews from ${pagesToScrape} pages`);

  return {
    companyName: businessUnit.displayName,
    companyUrl: businessUnit.websiteUrl || url,
    trustScore: businessUnit.trustScore,
    totalCompanyReviews: businessUnit.numberOfReviews,
    reviews: allReviews,
    totalScrapedReviews: allReviews.length,
    pagesScraped: pagesToScrape,
    timestamp: new Date().toISOString()
  };
}

async function convertTrustpilotReviewsToMarkdown(reviewData: TrustpilotReviewData, brandType: string = 'neutral'): Promise<string> {
  const { companyName, companyUrl, trustScore, totalCompanyReviews, reviews, totalScrapedReviews, pagesScraped } = reviewData;
  
  let markdown = `# Trustpilot Reviews: ${companyName}\n\n`;
  markdown += `**Company URL:** ${companyUrl}\n`;
  markdown += `**Trustpilot Trust Score:** ${trustScore}/5 ⭐\n`;
  markdown += `**Total Company Reviews:** ${totalCompanyReviews.toLocaleString()}\n`;
  markdown += `**Brand Type:** ${brandType === 'our_brand' ? 'Our Brand' : brandType === 'competitor' ? 'Competitor' : 'Neutral'}\n`;
  markdown += `**Reviews Scraped:** ${totalScrapedReviews} from ${pagesScraped} page(s)\n`;
  markdown += `**Scraped on:** ${new Date(reviewData.timestamp).toLocaleString()}\n\n`;
  markdown += `---\n\n`;

  reviews.forEach((review, index) => {
    markdown += `## Review ${index + 1}\n\n`;
    markdown += `**Rating:** ${'⭐'.repeat(review.rating)} (${review.rating}/5)\n`;
    markdown += `**Title:** ${review.title}\n\n`;
    markdown += `**Reviewer:** ${review.consumer.displayName}`;
    
    if (review.consumer.countryCode) {
      markdown += ` (${review.consumer.countryCode})`;
    }
    
    if (review.consumer.numberOfReviews > 1) {
      markdown += ` • ${review.consumer.numberOfReviews} reviews`;
    }
    markdown += `\n`;
    
    markdown += `**Published:** ${new Date(review.dates.publishedDate).toLocaleDateString()}\n`;
    
    if (review.dates.experiencedDate && review.dates.experiencedDate !== review.dates.publishedDate) {
      markdown += `**Experience Date:** ${new Date(review.dates.experiencedDate).toLocaleDateString()}\n`;
    }
    
    markdown += `**Source:** ${review.source}\n`;
    
    if (review.likes > 0) {
      markdown += `**Helpful Votes:** ${review.likes}\n`;
    }
    
    markdown += `\n**Review:**\n`;
    markdown += `${review.text}\n\n`;
    
    // Add company reply if it exists
    if (review.reply && review.reply.message) {
      markdown += `**Company Reply** (${new Date(review.reply.publishedDate).toLocaleDateString()}):\n`;
      markdown += `${review.reply.message}\n\n`;
    }
    
    markdown += `---\n\n`;
  });

  return markdown;
}

export async function POST(request: NextRequest) {
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

    const body: TrustpilotReviewRequest = await request.json();
    const { url, brandId, maxPages = 20, brandType = 'neutral' } = body;

    if (!url || !brandId) {
      return NextResponse.json({ error: 'URL and brand ID are required' }, { status: 400 });
    }

    // Validate it's a Trustpilot URL
    if (!url.includes('trustpilot.com/review/')) {
      return NextResponse.json({ 
        error: 'Invalid URL - please provide a Trustpilot company review URL (e.g., https://www.trustpilot.com/review/company-name.com)' 
      }, { status: 400 });
    }

    // Verify user has access to this brand
    const { data: brand } = await supabase
      .from('brands')
      .select('id, name')
      .eq('id', brandId)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found or access denied' }, { status: 404 });
    }

    console.log(`[TrustpilotReviewsAPI] Starting Trustpilot review extraction for brand: ${brand.name}`);

    // Scrape Trustpilot reviews
    const reviewData = await scrapeTrustpilotReviews(url, maxPages);

    if (reviewData.reviews.length === 0) {
      return NextResponse.json({
        error: 'No reviews found',
        message: 'Unable to extract reviews from the provided Trustpilot URL. The company might not have reviews or the URL format is incorrect.'
      }, { status: 404 });
    }

    // Convert to markdown
    const markdown = await convertTrustpilotReviewsToMarkdown(reviewData, brandType);

    console.log(`[TrustpilotReviewsAPI] Successfully scraped ${reviewData.totalScrapedReviews} reviews from ${reviewData.pagesScraped} pages`);

    return NextResponse.json({
      success: true,
      result: {
        url: url,
        title: `${reviewData.companyName} - Trustpilot Reviews`,
        markdown: markdown,
        timestamp: reviewData.timestamp,
        metadata: {
          companyName: reviewData.companyName,
          companyUrl: reviewData.companyUrl,
          trustScore: reviewData.trustScore,
          totalCompanyReviews: reviewData.totalCompanyReviews,
          totalScrapedReviews: reviewData.totalScrapedReviews,
          pagesScraped: reviewData.pagesScraped,
          brandType: brandType,
          source: 'trustpilot',
          extractionMethod: 'trustpilot-api-scraper'
        }
      },
      totalReviews: reviewData.totalScrapedReviews,
      pagesScraped: reviewData.pagesScraped,
      trustScore: reviewData.trustScore,
      method: 'trustpilot-reviews'
    });

  } catch (error) {
    console.error('[TrustpilotReviewsAPI] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to extract Trustpilot reviews', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 