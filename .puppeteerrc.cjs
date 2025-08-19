const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Use local cache directory to avoid permission issues
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  
  // Skip downloading Chrome during npm install in production if using system Chrome
  skipDownload: process.env.NODE_ENV === 'production' && (
    process.env.CHROME_EXECUTABLE_PATH || 
    process.env.PUPPETEER_EXECUTABLE_PATH
  ),
};
