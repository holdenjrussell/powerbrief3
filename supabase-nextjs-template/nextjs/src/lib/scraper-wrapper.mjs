// ES module wrapper for the scraper functions
// Using multiple strategies to handle different deployment environments

// Cache the imported scraper to avoid re-importing on every function call
let scraperCache = null;

async function getScraper() {
  if (!scraperCache) {
    try {
      // Strategy 1: Try createRequire approach (works locally)
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      scraperCache = require('./fongsi-scraper/index.js');
      console.log('Loaded scraper using createRequire');
    } catch (error) {
      console.log('createRequire failed, trying alternative approach:', error.message);
      
      try {
        // Strategy 2: Try direct file import (might work on Vercel)
        const scraperPath = new URL('./fongsi-scraper/index.js', import.meta.url).pathname;
        const scraperModule = await import(scraperPath);
        scraperCache = scraperModule.default || scraperModule;
        console.log('Loaded scraper using direct import');
      } catch (error2) {
        console.error('All scraper loading strategies failed:', error2);
        
        // Strategy 3: Fallback with simplified error handling
        throw new Error(`Scraper module not available. Original error: ${error.message}, Fallback error: ${error2.message}`);
      }
    }
  }
  return scraperCache;
}

// Export async wrapper functions for the specific functions we need
export const facebook = async (url) => {
  try {
    const scraper = await getScraper();
    return await scraper.Facebook(url);
  } catch (error) {
    console.error('Facebook scraper error:', error);
    throw error;
  }
};

export const instagram = async (url) => {
  try {
    const scraper = await getScraper();
    return await scraper.Instagram(url);
  } catch (error) {
    console.error('Instagram scraper error:', error);
    throw error;
  }
};

export const tiktok = async (url) => {
  try {
    const scraper = await getScraper();
    return await scraper.TiktokVideo(url);
  } catch (error) {
    console.error('TikTok scraper error:', error);
    throw error;
  }
}; 