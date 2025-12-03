import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

interface ScrapedContent {
  title: string;
  content: string;
  url: string;
}

export const scrapeWebPage = async (url: string, useJavaScript: boolean = false): Promise<ScrapedContent> => {
  try {
    if (useJavaScript) {
      return await scrapeWithPuppeteer(url);
    } else {
      return await scrapeWithCheerio(url);
    }
  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error(`Failed to scrape webpage: ${error}`);
  }
};

// Simple scraping with Cheerio (faster, no JavaScript execution)
const scrapeWithCheerio = async (url: string): Promise<ScrapedContent> => {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
    timeout: 10000,
  });

  const $ = cheerio.load(response.data);

  // Remove script and style elements
  $('script, style, nav, footer, header').remove();

  // Get title
  const title = $('title').text() || $('h1').first().text() || 'Untitled Page';

  // Get main content (try multiple strategies)
  let content = '';

  // Strategy 1: Look for main content area
  const mainContent = $('main, article, [role="main"], .content, #content').first();
  if (mainContent.length) {
    content = mainContent.text();
  } else {
    // Strategy 2: Get all paragraphs
    content = $('p').map((_, el) => $(el).text()).get().join('\n\n');
  }

  // Clean up whitespace
  content = content.replace(/\s+/g, ' ').trim();

  // Limit content length (to avoid token limits)
  const maxLength = 10000;
  if (content.length > maxLength) {
    content = content.substring(0, maxLength) + '...';
  }

  return {
    title: title.trim(),
    content,
    url,
  };
};

// Advanced scraping with Puppeteer (for JavaScript-heavy sites)
const scrapeWithPuppeteer = async (url: string): Promise<ScrapedContent> => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Get page content
    const data = await page.evaluate(() => {
      // Remove unwanted elements
      const unwantedSelectors = ['script', 'style', 'nav', 'footer', 'header', 'iframe'];
      unwantedSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
      });

      // Get title
      const title = document.title || document.querySelector('h1')?.textContent || 'Untitled Page';

      // Get main content
      const mainElement = document.querySelector('main, article, [role="main"], .content, #content');
      let content = '';

      if (mainElement) {
        content = mainElement.textContent || '';
      } else {
        // Fallback: get all paragraphs
        const paragraphs = Array.from(document.querySelectorAll('p'));
        content = paragraphs.map(p => p.textContent).join('\n\n');
      }

      return { title, content };
    });

    // Clean up whitespace
    let content = data.content.replace(/\s+/g, ' ').trim();

    // Limit content length
    const maxLength = 10000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...';
    }

    return {
      title: data.title.trim(),
      content,
      url,
    };
  } finally {
    await browser.close();
  }
};
