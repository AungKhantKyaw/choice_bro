import { Page } from "puppeteer";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Resources to block for faster page loads
const BLOCKED_RESOURCE_TYPES = ["image", "stylesheet", "font", "media", "websocket", "eventsource"];

// URL keywords related to tracking, analytics, ads, and social embeds to block
const BLOCKED_URL_PATTERNS = [
  "google-analytics",
  "googletagmanager",
  "doubleclick",
  "adsystem",
  "adservice",
  "analytics",
  "facebook.net",
  "facebook.com",
  "hotjar",
  "sentry.io",
  "optimizely",
  "criteo",
  "tiktok.com",
  "pinterest.com",
  "hubspot",
  "mixpanel",
  "segment.io",
];

/**
 * Configures a page with performance optimizations common to all scrapers
 * Must be called before navigation for request interception to work
 */
export async function setupScraperPage(page: Page): Promise<void> {
  await page.setUserAgent(USER_AGENT);
  await page.setRequestInterception(true);

  page.on("request", (req) => {
    const type = req.resourceType();
    const url = req.url().toLowerCase();

    // Check if resource type should be blocked
    if (BLOCKED_RESOURCE_TYPES.includes(type)) {
      req.abort();
      return;
    }

    // Check if the URL matches common tracking/ads patterns
    const shouldBlockUrl = BLOCKED_URL_PATTERNS.some((pattern) =>
      url.includes(pattern)
    );

    if (shouldBlockUrl) {
      req.abort();
      return;
    }

    req.continue();
  });
}

/**
 * Delay helper for waiting on lazy-loaded content
 */
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));