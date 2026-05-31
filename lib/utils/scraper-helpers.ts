import { Page } from "puppeteer";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Resources to block for faster page loads
const BLOCKED_RESOURCE_TYPES = ["image", "stylesheet", "font", "media"];

/**
 * Configures a page with performance optimizations common to all scrapers
 * Must be called before navigation for request interception to work
 */
export async function setupScraperPage(page: Page): Promise<void> {
  await page.setUserAgent(USER_AGENT);
  await page.setRequestInterception(true);

  page.on("request", (req) => {
    const type = req.resourceType();
    if (BLOCKED_RESOURCE_TYPES.includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

/**
 * Delay helper for waiting on lazy-loaded content
 */
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));