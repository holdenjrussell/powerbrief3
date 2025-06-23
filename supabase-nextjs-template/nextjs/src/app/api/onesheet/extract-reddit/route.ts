import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface RedditExtractRequest {
  url: string;
  crawlPosts?: boolean;
  maxPosts?: number;
  includeComments?: boolean;
  brandId: string;
}

interface RedditScrapedData {
  url: string;
  title: string;
  content: string;
  author: string;
  score: number;
  comments: string[];
  timestamp: string;
  subreddit: string;
  method: string;
}

// Reddit scraping function
async function scrapeReddit(url: string, crawlPosts: boolean = false, maxPosts: number = 5, includeComments: boolean = true): Promise<RedditScrapedData[]> {
  const results: RedditScrapedData[] = [];
  
  console.log(`[RedditScraper] Starting extraction for: ${url} (max ${maxPosts} posts, comments: ${includeComments})`);

  try {
    // Determine if it's a subreddit URL or individual post URL
    const isSubreddit = url.includes('/r/') && !url.includes('/comments/');
    const isPost = url.includes('/comments/');
    
    if (isSubreddit && crawlPosts) {
      // Scrape multiple posts from subreddit
      await scrapeSubredditPosts(url, maxPosts, includeComments, results);
    } else if (isSubreddit && !crawlPosts) {
      // User provided subreddit URL but didn't enable crawling - inform them
      throw new Error('This appears to be a subreddit URL. Please enable "Crawl multiple posts from subreddit" to extract posts, or provide a specific post URL.');
    } else if (isPost) {
      // Scrape individual post
      await scrapeRedditPost(url, includeComments, results);
    } else {
      // Default to treating as single post/page
      await scrapeRedditPost(url, includeComments, results);
    }
    
  } catch (error) {
    console.error('[RedditScraper] Error:', error);
    throw error;
  }

  return results;
}

async function scrapeSubredditPosts(subredditUrl: string, maxPosts: number, includeComments: boolean, results: RedditScrapedData[]) {
  // Clean the URL and convert to JSON feed URL for easier parsing
  let cleanUrl = subredditUrl.replace(/\/$/, '');
  
  // Remove query parameters like ?t=all, ?sort=top, etc.
  cleanUrl = cleanUrl.split('?')[0];
  
  // Remove /top, /hot, /new suffixes and replace with base subreddit
  cleanUrl = cleanUrl.replace(/\/(top|hot|new|rising|controversial)$/, '');
  
  const jsonUrl = cleanUrl + '.json?limit=' + Math.min(maxPosts, 25);
  
  console.log(`[RedditScraper] Cleaned URL: ${cleanUrl}`);
  console.log(`[RedditScraper] Fetching subreddit JSON: ${jsonUrl}`);
  
  const response = await fetch(jsonUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/html, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  let data;
  
  if (!response.ok) {
    console.error(`[RedditScraper] Subreddit fetch failed with status ${response.status}. Trying alternative method...`);
    
    // Try alternative approach with old.reddit.com
    const oldRedditUrl = jsonUrl.replace('reddit.com', 'old.reddit.com');
    console.log(`[RedditScraper] Trying old Reddit: ${oldRedditUrl}`);
    
    const fallbackResponse = await fetch(oldRedditUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PowerBrief/1.0; +https://powerbrief.ai)',
        'Accept': 'application/json',
      },
    });
    
    if (!fallbackResponse.ok) {
      throw new Error(`Failed to fetch subreddit from both reddit.com (${response.status}) and old.reddit.com (${fallbackResponse.status}). Reddit may be blocking requests.`);
    }
    
    data = await fallbackResponse.json();
    console.log(`[RedditScraper] Successfully fetched from old.reddit.com`);
  } else {
    data = await response.json();
  }
  const posts = data.data?.children || [];

  console.log(`[RedditScraper] Found ${posts.length} posts in subreddit`);

  for (let i = 0; i < Math.min(posts.length, maxPosts); i++) {
    const post = posts[i].data;
    
    const postData: RedditScrapedData = {
      url: `https://reddit.com${post.permalink}`,
      title: post.title || 'Untitled Post',
      content: post.selftext || post.url || '',
      author: post.author || 'Unknown',
      score: post.score || 0,
      comments: [],
      timestamp: new Date(post.created_utc * 1000).toISOString(),
      subreddit: post.subreddit_name_prefixed || 'Unknown',
      method: 'reddit-json'
    };

    // Get comments if requested
    if (includeComments && post.num_comments > 0) {
      try {
        const commentsData = await fetchPostComments(`https://reddit.com${post.permalink}`);
        postData.comments = commentsData;
      } catch (error) {
        console.warn(`[RedditScraper] Failed to fetch comments for post ${post.id}:`, error);
      }
    }

    results.push(postData);
    console.log(`[RedditScraper] Scraped post: ${postData.title} (${postData.comments.length} comments)`);
  }
}

async function scrapeRedditPost(postUrl: string, includeComments: boolean, results: RedditScrapedData[]) {
  // Convert to JSON URL for easier parsing
  const jsonUrl = postUrl.replace(/\/$/, '') + '.json';
  
  console.log(`[RedditScraper] Fetching post JSON: ${jsonUrl}`);
  
  const response = await fetch(jsonUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/html, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
  });

  if (!response.ok) {
    // Try with old.reddit.com as fallback
    const oldRedditUrl = jsonUrl.replace('reddit.com', 'old.reddit.com');
    console.log(`[RedditScraper] Trying old Reddit for post: ${oldRedditUrl}`);
    
    const fallbackResponse = await fetch(oldRedditUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PowerBrief/1.0; +https://powerbrief.ai)',
        'Accept': 'application/json',
      },
    });
    
    if (!fallbackResponse.ok) {
      throw new Error(`Failed to fetch post from both reddit.com (${response.status}) and old.reddit.com (${fallbackResponse.status})`);
    }
    
    const data = await fallbackResponse.json();
    const post = data[0]?.data?.children?.[0]?.data;
    
    if (!post) {
      throw new Error('No post data found');
    }

    const postData: RedditScrapedData = {
      url: postUrl,
      title: post.title || 'Untitled Post',
      content: post.selftext || post.url || '',
      author: post.author || 'Unknown',
      score: post.score || 0,
      comments: [],
      timestamp: new Date(post.created_utc * 1000).toISOString(),
      subreddit: post.subreddit_name_prefixed || 'Unknown',
      method: 'reddit-json-fallback'
    };

    // Get comments if requested
    if (includeComments && post.num_comments > 0) {
      try {
        const commentsData = data[1]?.data?.children || [];
        postData.comments = extractCommentsFromData(commentsData);
      } catch (error) {
        console.warn(`[RedditScraper] Failed to extract comments:`, error);
      }
    }

    results.push(postData);
    console.log(`[RedditScraper] Scraped post from fallback: ${postData.title} (${postData.comments.length} comments)`);
    return;
  }

  const data = await response.json();
  const post = data[0]?.data?.children?.[0]?.data;
  
  if (!post) {
    throw new Error('No post data found');
  }

  const postData: RedditScrapedData = {
    url: postUrl,
    title: post.title || 'Untitled Post',
    content: post.selftext || post.url || '',
    author: post.author || 'Unknown',
    score: post.score || 0,
    comments: [],
    timestamp: new Date(post.created_utc * 1000).toISOString(),
    subreddit: post.subreddit_name_prefixed || 'Unknown',
    method: 'reddit-json'
  };

  // Get comments if requested
  if (includeComments && post.num_comments > 0) {
    try {
      const commentsData = data[1]?.data?.children || [];
      postData.comments = extractCommentsFromData(commentsData);
    } catch (error) {
      console.warn(`[RedditScraper] Failed to extract comments:`, error);
    }
  }

  results.push(postData);
  console.log(`[RedditScraper] Scraped post: ${postData.title} (${postData.comments.length} comments)`);
}

async function fetchPostComments(postUrl: string): Promise<string[]> {
  const jsonUrl = postUrl.replace(/\/$/, '') + '.json';
  
  const response = await fetch(jsonUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/html, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    },
  });

  if (!response.ok) {
    // Try fallback with old.reddit.com
    const oldRedditUrl = jsonUrl.replace('reddit.com', 'old.reddit.com');
    const fallbackResponse = await fetch(oldRedditUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PowerBrief/1.0; +https://powerbrief.ai)',
        'Accept': 'application/json',
      },
    });
    
    if (!fallbackResponse.ok) {
      return [];
    }
    
    const data = await fallbackResponse.json();
    const commentsData = data[1]?.data?.children || [];
    return extractCommentsFromData(commentsData);
  }

  const data = await response.json();
  const commentsData = data[1]?.data?.children || [];
  
  return extractCommentsFromData(commentsData);
}

interface RedditComment {
  data?: {
    body?: string;
    author?: string;
    score?: number;
    replies?: {
      data?: {
        children?: RedditComment[];
      };
    };
  };
}

function extractCommentsFromData(commentsData: RedditComment[]): string[] {
  const comments: string[] = [];
  
  function extractComment(comment: RedditComment) {
    if (comment?.data?.body && comment.data.body !== '[deleted]' && comment.data.body !== '[removed]') {
      const commentText = `${comment.data.author}: ${comment.data.body} (${comment.data.score} points)`;
      comments.push(commentText);
      
      // Extract replies (limit depth to avoid too much nesting)
      if (comment.data.replies?.data?.children && comments.length < 20) {
        comment.data.replies.data.children.forEach((reply: RedditComment) => {
          if (reply.data && reply.data.body) {
            extractComment(reply);
          }
        });
      }
    }
  }
  
  // Get top comments (limit to 10 to avoid too much content)
  commentsData.slice(0, 10).forEach(extractComment);
  
  return comments;
}

export async function POST(request: NextRequest) {
  try {
    const { url, crawlPosts = false, maxPosts = 5, includeComments = true }: RedditExtractRequest = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate Reddit URL
    if (!url.includes('reddit.com')) {
      return NextResponse.json(
        { error: 'Please provide a valid Reddit URL' },
        { status: 400 }
      );
    }

    // Get Gemini API key
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Missing Gemini API key');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-thinking-exp' });

    console.log(`[RedditExtract] Starting Reddit extraction for: ${url}`);

    const scrapedData = await scrapeReddit(url, crawlPosts, maxPosts, includeComments);

    console.log(`[RedditExtract] Scraped ${scrapedData.length} Reddit posts`);

    // Convert scraped content to markdown using Gemini
    const markdownResults = [];
    
    for (const scraped of scrapedData) {
      try {
        const commentsSection = scraped.comments.length > 0 
          ? `\n\n## Top Comments\n${scraped.comments.map(c => `- ${c}`).join('\n')}`
          : '';

        const prompt = `Convert the following Reddit content to clean, well-structured markdown. 
        Focus on extracting valuable customer insights, opinions, and language patterns.
        
        IMPORTANT INSTRUCTIONS:
        - Structure the content with clear headings
        - Preserve the authentic voice and language used
        - Highlight key insights, pain points, and customer language
        - Include post metadata (author, score, subreddit)
        - Format comments as a bulleted list under "Top Comments" section
        - Remove any promotional or spam content
        - Focus on genuine customer feedback and discussions
        
        Reddit Post Details:
        Title: ${scraped.title}
        Author: u/${scraped.author}
        Subreddit: ${scraped.subreddit}
        Score: ${scraped.score} points
        URL: ${scraped.url}
        
        Post Content:
        ${scraped.content}
        ${commentsSection}
        
        Return only clean markdown content with no explanations:`;

        // Add retry logic for Gemini API
        let markdownContent = '';
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            const result = await model.generateContent(prompt);
            markdownContent = result.response.text();
            break; // Success, exit retry loop
          } catch (apiError) {
            retryCount++;
            console.warn(`[RedditExtract] Gemini API attempt ${retryCount} failed for post ${scraped.title}:`, apiError);
            
            if (retryCount > maxRetries) {
              throw apiError; // Re-throw after max retries
            }
            
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
        
        markdownResults.push({
          url: scraped.url,
          title: scraped.title,
          originalContent: scraped.content,
          markdown: markdownContent,
          links: [],
          timestamp: scraped.timestamp,
          method: scraped.method,
          metadata: {
            author: scraped.author,
            score: scraped.score,
            subreddit: scraped.subreddit,
            commentsCount: scraped.comments.length
          }
        });
        
        console.log(`[RedditExtract] Converted Reddit post to markdown: ${scraped.title}`);
      } catch (error) {
        console.error(`[RedditExtract] Error converting post to markdown:`, error);
        
        // Fallback to basic markdown
        const commentsSection = scraped.comments.length > 0 
          ? `\n\n## Top Comments\n${scraped.comments.map(c => `- ${c}`).join('\n')}`
          : '';
          
        markdownResults.push({
          url: scraped.url,
          title: scraped.title,
          originalContent: scraped.content,
          markdown: `# ${scraped.title}\n\n**Author:** u/${scraped.author} | **Score:** ${scraped.score} points | **Subreddit:** ${scraped.subreddit}\n\n${scraped.content}${commentsSection}`,
          links: [],
          timestamp: scraped.timestamp,
          method: scraped.method,
          metadata: {
            author: scraped.author,
            score: scraped.score,
            subreddit: scraped.subreddit,
            commentsCount: scraped.comments.length
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      results: markdownResults,
      totalPosts: scrapedData.length,
      crawledPosts: crawlPosts,
      includeComments: includeComments,
      method: 'reddit-json'
    });

  } catch (error) {
    console.error('[RedditExtract] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to extract Reddit content', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 