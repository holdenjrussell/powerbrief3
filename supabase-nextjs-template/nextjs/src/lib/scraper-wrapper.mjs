// ES module wrapper for the CommonJS scraper
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import the scraper functions from the main index
const scraper = require('./fongsi-scraper/index.js');

// Export the specific functions we need
export const facebook = scraper.Facebook;
export const instagram = scraper.Instagram;
export const tiktok = scraper.TiktokVideo; 