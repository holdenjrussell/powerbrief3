# Crawlee Web Scraping & Vercel Serverless Compatibility

## Overview

This document explains how the web scraping integration works in the OneSheet Context Hub and addresses Vercel serverless deployment compatibility.

## How the Crawler Works

### Architecture Components

1. **[Crawlee Framework](https://github.com/apify/crawlee)**: Web scraping and automation library
2. **Playwright/Puppeteer**: Browser automation engines
3. **Cheerio**: Server-side HTML parsing (jQuery-like)
4. **Gemini AI**: Content processing and markdown conversion

### Extraction Process

1. **URL Input**: User provides a website URL
2. **Content Extraction**: System extracts main content using CSS selectors
3. **Link Discovery**: Optionally finds additional pages on the same domain
4. **Content Processing**: AI converts raw content to structured markdown
5. **Data Storage**: Results saved to `onesheet_context_data` table

## Vercel Serverless Compatibility Issues

### ❌ **Original Implementation Problems**

| Issue | Description | Vercel Limit | Impact |
|-------|------------|--------------|---------|
| **Bundle Size** | Playwright browser binaries | 50MB max | ❌ Deployment fails |
| **Function Timeout** | Browser automation overhead | 10-30s limit | ❌ Timeouts on crawling |
| **Memory Usage** | Browser instances | 1GB max | ❌ Out of memory errors |
| **Cold Starts** | Browser initialization delay | N/A | ❌ Poor performance |

### ✅ **Hybrid Solution Implementation**

## Dual-Method Approach

The system now uses **two scraping methods** with automatic detection:

### 1. HTTP-Based Scraping (Vercel Compatible) ✅

**When Used**: 
- Automatically on Vercel (`process.env.VERCEL === '1'`)
- Manual selection via `useFullBrowser: false`

**How It Works**:
```typescript
// Lightweight HTTP requests with browser headers
const response = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...',
    'Accept': 'text/html,application/xhtml+xml,application/xml...',
    // ... more browser-like headers
  },
  signal: AbortSignal.timeout(10000) // 10s timeout
});

// Parse HTML with Cheerio (server-side jQuery)
const $ = cheerio.load(html);
$('script, style, nav, footer').remove(); // Clean content
const content = $('main, article, .content').text(); // Extract main content
```

**Benefits**:
- ✅ **Small Bundle**: Only ~2MB vs 100MB+ for browsers
- ✅ **Fast**: No browser startup overhead
- ✅ **Memory Efficient**: ~50MB vs 500MB+ for browsers
- ✅ **Vercel Compatible**: Fits within all serverless limits

**Limitations**:
- ❌ No JavaScript execution (static content only)
- ❌ Can't handle SPAs or dynamic content
- ❌ Some anti-bot measures may block requests

### 2. Browser-Based Scraping (Local Development) 🖥️

**When Used**:
- Local development environments
- Manual selection via `useFullBrowser: true`
- Fallback when HTTP method fails

**How It Works**:
```typescript
// Dynamic import to avoid bundling in production
const { PlaywrightCrawler } = await import('crawlee');

const crawler = new PlaywrightCrawler({
  async requestHandler({ page, enqueueLinks }) {
    await page.waitForLoadState('domcontentloaded');
    const content = await page.locator('main').textContent();
    // ... extract content and discover links
  }
});
```

**Benefits**:
- ✅ **JavaScript Execution**: Handles SPAs and dynamic content
- ✅ **Complete Rendering**: Sees exactly what users see
- ✅ **Advanced Automation**: Can interact with complex sites

**Limitations**:
- ❌ **Large Bundle**: 100MB+ browser binaries
- ❌ **Resource Intensive**: High memory and CPU usage
- ❌ **Not Vercel Compatible**: Exceeds serverless limits

## Implementation Details

### Automatic Method Selection

```typescript
// Detect environment and choose method
const isVercel = process.env.VERCEL === '1';
const useHTTP = isVercel || !useFullBrowser;

const scrapedData = useHTTP 
  ? await scrapeWithHTTP(url, crawlLinks, maxPages)
  : await scrapeWithBrowser(url, crawlLinks, maxPages);
```

### Content Extraction Strategy

Both methods use the same content extraction priority:

```typescript
const contentSelectors = [
  'main',           // Semantic main content
  'article',        // Article content
  '[role="main"]',  // ARIA main landmark
  '.content',       // Common content class
  '#content',       // Common content ID
  '.post-content',  // Blog post content
  '.entry-content', // WordPress content
  '.main-content',  // Generic main content
  'body'           // Fallback to body
];
```

### Link Discovery & Crawling

```typescript
// HTTP Method - Using Cheerio
$('a[href]').each((_, element) => {
  const href = $(element).attr('href');
  const absoluteUrl = new URL(href, currentUrl).toString();
  const baseUrl = new URL(url);
  const linkUrl = new URL(absoluteUrl);
  
  // Only crawl same domain
  if (linkUrl.hostname === baseUrl.hostname) {
    discoveredLinks.push(absoluteUrl);
  }
});

// Browser Method - Using Playwright
await enqueueLinks({
  selector: 'a[href]',
  transformRequestFunction: (req) => {
    const baseUrl = new URL(url);
    const targetUrl = new URL(req.url);
    return targetUrl.hostname === baseUrl.hostname ? req : false;
  }
});
```

## Safety & Performance Features

### Resource Limits
- **Page Limit**: Maximum 10 pages per crawl
- **Content Limit**: 10,000 characters per page
- **Link Limit**: 10 discovered links per page
- **Timeout**: 10 seconds per page (HTTP) / 20 seconds (browser)

### Domain Restrictions
- Only crawls pages from the same domain
- Prevents crawling external sites
- Protects against infinite crawling

### Error Handling
- Graceful failure handling
- Automatic fallback to HTTP method
- Manual editing capability if extraction fails

## Deployment Recommendations

### For Vercel Deployment ✅
- Use default HTTP-based scraping
- Works reliably within serverless limits
- Handles most static websites effectively

### For Self-Hosted/Docker 🐳
- Can use full browser capabilities
- Better for JavaScript-heavy sites
- Higher resource requirements

### For Development 💻
- Both methods available
- Browser method for testing complex sites
- HTTP method for faster iteration

## API Usage Examples

### Basic Website Scraping
```typescript
POST /api/onesheet/extract
{
  "url": "https://example.com",
  "brandId": "brand-uuid",
  "crawlLinks": false,
  "maxPages": 1
}
```

### Multi-Page Crawling
```typescript
POST /api/onesheet/extract
{
  "url": "https://example.com",
  "brandId": "brand-uuid", 
  "crawlLinks": true,
  "maxPages": 5,
  "useFullBrowser": false // Force HTTP method
}
```

### Response Format
```typescript
{
  "success": true,
  "results": [
    {
      "url": "https://example.com",
      "title": "Page Title",
      "markdown": "# Page Title\n\nContent...",
      "links": ["https://example.com/about"],
      "method": "http", // or "browser"
      "timestamp": "2025-01-17T..."
    }
  ],
  "totalPages": 1,
  "crawledLinks": false,
  "method": "http",
  "vercelCompatible": true
}
```

## Performance Comparison

| Method | Bundle Size | Memory Usage | Cold Start | JavaScript Support | Vercel Compatible |
|--------|-------------|--------------|------------|-------------------|------------------|
| **HTTP** | ~2MB | ~50MB | ~100ms | ❌ | ✅ |
| **Browser** | ~100MB | ~500MB | ~2-5s | ✅ | ❌ |

## Conclusion

The hybrid approach provides:
- ✅ **Vercel Compatibility**: HTTP method works within all serverless limits
- ✅ **Flexibility**: Browser method available for complex sites in development
- ✅ **Reliability**: Automatic fallbacks and error handling
- ✅ **Performance**: Optimized for each deployment environment

This solution ensures the OneSheet Context Hub works reliably on Vercel while maintaining advanced capabilities for development and self-hosted deployments. 