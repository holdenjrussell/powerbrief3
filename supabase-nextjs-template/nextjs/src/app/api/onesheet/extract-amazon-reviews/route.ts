import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import * as cheerio from 'cheerio';
import { Database } from '@/lib/types/supabase';

interface AmazonReviewRequest {
  url: string;
  brandId: string;
  maxPages?: number; // Default to 10 pages
  brandType?: 'our_brand' | 'competitor' | 'neutral';
}

interface AmazonReview {
  title: string;
  content: string;
  author: string;
  rating: string;
  date: string;
  variant?: string;
  verified: boolean;
  images: string[];
}

interface AmazonReviewData {
  productTitle: string;
  productUrl: string;
  reviews: AmazonReview[];
  totalReviews: number;
  pagesScraped: number;
  timestamp: string;
}

// Amazon CSS Selectors (provided by user)
const AMAZON_SELECTORS = {
  product_title: 'h1 a[data-hook="product-link"]',
  reviews: 'div.review div.a-section.celwidget',
  review_title: 'a.review-title',
  review_content: 'div.a-row.review-data span.review-text',
  review_date: 'span.a-size-base.a-color-secondary',
  review_variant: 'a.a-size-mini',
  review_images: 'img.review-image-tile',
  review_verified: 'span[data-hook="avp-badge"]',
  review_author: 'span.a-profile-name',
  review_rating: 'div.a-row > a > i > span',
  next_page: 'li.a-last a'
};

async function scrapeAmazonReviews(url: string, maxPages: number = 10): Promise<AmazonReviewData> {
  const allReviews: AmazonReview[] = [];
  let currentUrl = url;
  let pageCount = 0;
  let productTitle = '';

  console.log(`[AmazonScraper] Starting Amazon review scraping for: ${url}`);

  while (currentUrl && pageCount < maxPages) {
    try {
      console.log(`[AmazonScraper] Scraping page ${pageCount + 1}: ${currentUrl}`);
      
      // Add delay between requests to be respectful to Amazon
      if (pageCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }

      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => {
        controller.abort();
      }, 30000); // 30 second timeout per request
      
      const response = await fetch(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0',
        },
        signal: controller.signal
      });
      
      clearTimeout(fetchTimeout);

      if (!response.ok) {
        console.warn(`[AmazonScraper] Failed to fetch ${currentUrl}: ${response.status}`);
        break;
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Get product title (only on first page)
      if (pageCount === 0) {
        productTitle = $(AMAZON_SELECTORS.product_title).first().text().trim() ||
                      $('h1 span[id="productTitle"]').text().trim() ||
                      $('h1').first().text().trim() ||
                      'Amazon Product Reviews';
        console.log(`[AmazonScraper] Product title: ${productTitle}`);
      }

      // Extract reviews from current page
      const reviewElements = $(AMAZON_SELECTORS.reviews);
      console.log(`[AmazonScraper] Found ${reviewElements.length} review elements on page ${pageCount + 1}`);

      reviewElements.each((_, element) => {
        const $review = $(element);
        
        // Extract review data using provided selectors
        const title = $review.find(AMAZON_SELECTORS.review_title).text().trim();
        const content = $review.find(AMAZON_SELECTORS.review_content).text().trim();
        const author = $review.find(AMAZON_SELECTORS.review_author).text().trim();
        const rating = $review.find(AMAZON_SELECTORS.review_rating).text().trim();
        const date = $review.find(AMAZON_SELECTORS.review_date).text().trim();
        const variant = $review.find(AMAZON_SELECTORS.review_variant).text().trim();
        const verified = $review.find(AMAZON_SELECTORS.review_verified).length > 0;
        
        // Extract review images
        const images: string[] = [];
        $review.find(AMAZON_SELECTORS.review_images).each((_, img) => {
          const src = $(img).attr('src');
          if (src) {
            images.push(src);
          }
        });

        // Only add review if it has meaningful content
        if (title || content) {
          allReviews.push({
            title: title || 'No Title',
            content: content || 'No Content',
            author: author || 'Anonymous',
            rating: rating || 'No Rating',
            date: date || 'No Date',
            variant: variant || undefined,
            verified,
            images
          });
        }
      });

      console.log(`[AmazonScraper] Extracted ${reviewElements.length} reviews from page ${pageCount + 1}`);

      // Look for next page link
      const nextPageLink = $(AMAZON_SELECTORS.next_page).attr('href');
      
      if (nextPageLink && pageCount < maxPages - 1) {
        // Construct full URL for next page
        const baseUrl = new URL(currentUrl);
        currentUrl = new URL(nextPageLink, baseUrl.origin).toString();
        console.log(`[AmazonScraper] Found next page: ${currentUrl}`);
      } else {
        console.log(`[AmazonScraper] No more pages found or reached max pages limit`);
        currentUrl = '';
      }

      pageCount++;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[AmazonScraper] Request timeout for page ${pageCount + 1} - stopping scrape`);
      } else {
        console.error(`[AmazonScraper] Error scraping page ${pageCount + 1}:`, error);
      }
      break;
    }
  }

  return {
    productTitle,
    productUrl: url,
    reviews: allReviews,
    totalReviews: allReviews.length,
    pagesScraped: pageCount,
    timestamp: new Date().toISOString()
  };
}

async function convertReviewsToMarkdown(reviewData: AmazonReviewData, brandType: string = 'neutral'): Promise<string> {
  const { productTitle, productUrl, reviews, totalReviews, pagesScraped } = reviewData;
  
  let markdown = `# Amazon Reviews: ${productTitle}\n\n`;
  markdown += `**Product URL:** ${productUrl}\n`;
  markdown += `**Brand Type:** ${brandType === 'our_brand' ? 'Our Brand' : brandType === 'competitor' ? 'Competitor' : 'Neutral'}\n`;
  markdown += `**Total Reviews Scraped:** ${totalReviews}\n`;
  markdown += `**Pages Scraped:** ${pagesScraped}\n`;
  markdown += `**Scraped on:** ${new Date(reviewData.timestamp).toLocaleString()}\n\n`;
  markdown += `---\n\n`;

  reviews.forEach((review, index) => {
    markdown += `## Review ${index + 1}\n\n`;
    markdown += `**Title:** ${review.title}\n\n`;
    markdown += `**Rating:** ${review.rating}\n`;
    markdown += `**Author:** ${review.author}\n`;
    markdown += `**Date:** ${review.date}\n`;
    
    if (review.variant) {
      markdown += `**Variant:** ${review.variant}\n`;
    }
    
    if (review.verified) {
      markdown += `**Verified Purchase:** ✅ Yes\n`;
    }
    
    markdown += `\n**Review Content:**\n`;
    markdown += `${review.content}\n\n`;
    
    if (review.images.length > 0) {
      markdown += `**Images:** ${review.images.length} image(s) attached\n\n`;
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

    const body: AmazonReviewRequest = await request.json();
    const { url, brandId, maxPages = 10, brandType = 'neutral' } = body;

    if (!url || !brandId) {
      return NextResponse.json({ error: 'URL and brand ID are required' }, { status: 400 });
    }

    // Validate it's an Amazon URL
    if (!url.includes('amazon.')) {
      return NextResponse.json({ 
        error: 'Invalid URL - please provide an Amazon product URL' 
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

    console.log(`[AmazonReviewsAPI] Starting Amazon review extraction for brand: ${brand.name}`);

    // Scrape Amazon reviews
    const reviewData = await scrapeAmazonReviews(url, maxPages);

    if (reviewData.reviews.length === 0) {
      return NextResponse.json({
        error: 'No reviews found',
        message: 'Unable to extract reviews from the provided Amazon URL. The page might not have reviews or the selectors may need updating.'
      }, { status: 404 });
    }

    // Convert to markdown
    const markdown = await convertReviewsToMarkdown(reviewData, brandType);

    console.log(`[AmazonReviewsAPI] Successfully scraped ${reviewData.totalReviews} reviews from ${reviewData.pagesScraped} pages`);

    return NextResponse.json({
      success: true,
      result: {
        url: url,
        title: `${reviewData.productTitle} - Amazon Reviews`,
        markdown: markdown,
        timestamp: reviewData.timestamp,
        metadata: {
          productTitle: reviewData.productTitle,
          totalReviews: reviewData.totalReviews,
          pagesScraped: reviewData.pagesScraped,
          brandType: brandType,
          source: 'amazon',
          extractionMethod: 'amazon-reviews-scraper'
        }
      },
      totalReviews: reviewData.totalReviews,
      pagesScraped: reviewData.pagesScraped,
      method: 'amazon-reviews'
    });

  } catch (error) {
    console.error('[AmazonReviewsAPI] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to extract Amazon reviews', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 