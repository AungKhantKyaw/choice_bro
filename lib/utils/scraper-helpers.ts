import { Page } from "puppeteer";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
];

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
 * Configures a page with performance and stealth optimizations common to all scrapers
 * Must be called before navigation for request interception and overrides to work
 */
export async function setupScraperPage(page: Page): Promise<void> {
  // Rotate through standard desktop user agents
  const randomUserAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  await page.setUserAgent(randomUserAgent);

  // Set realistic desktop request headers to look like a standard browser request
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": randomUserAgent.includes("Macintosh") ? '"macOS"' : '"Windows"',
  });

  // Inject stealth overrides before the document loads
  await page.evaluateOnNewDocument(() => {
    // Evade 'navigator.webdriver' headless checks
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });

    // Mock chrome runtime features
    (window as any).chrome = {
      runtime: {},
    };

    // Override browser languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });

    // Mock plugins list
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });
  });

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