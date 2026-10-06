import puppeteer, { Browser, Page } from "puppeteer";
import { setupScraperPage } from "./utils/scraper-helpers";
import { Semaphore } from "./utils/semaphore";

/** Max pages open at once across all searches. Override with SCRAPER_MAX_PAGES. */
const MAX_PAGES = Number(process.env.SCRAPER_MAX_PAGES) || 4;
const pageSlots = new Semaphore(MAX_PAGES);

let browser: Browser | null = null;
let launching: Promise<Browser> | null = null;
let handlersRegistered = false;

async function cleanup() {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}

function registerHandlers() {
  if (handlersRegistered) return;
  handlersRegistered = true;

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, async () => {
      await cleanup();
      process.exit(0);
    });
  }
}

export async function getBrowser(): Promise<Browser> {
  if (browser?.connected) return browser;

  // Concurrent callers share one launch instead of each spawning a Chromium.
  if (!launching) {
    launching = puppeteer
      .launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
      .then((b) => {
        browser = b;
        b.on("disconnected", () => {
          browser = null;
        });
        registerHandlers();
        return b;
      })
      .finally(() => {
        launching = null;
      });
  }
  return launching;
}

/**
 * Runs `fn` with a fresh, stealth-configured page.
 * - Waits for a free page slot (bounded concurrency).
 * - If `signal` aborts, the page is closed immediately so in-flight
 *   navigation/waits reject instead of running on in the background.
 * - The page and the slot are always released.
 */
export async function withPage<T>(
  signal: AbortSignal,
  fn: (page: Page) => Promise<T>,
): Promise<T> {
  await pageSlots.acquire(signal);

  let page: Page | null = null;
  const onAbort = () => {
    page?.close().catch(() => {});
  };
  signal.addEventListener("abort", onAbort, { once: true });

  try {
    signal.throwIfAborted();
    const b = await getBrowser();
    page = await b.newPage();
    signal.throwIfAborted();
    await setupScraperPage(page);
    return await fn(page);
  } finally {
    signal.removeEventListener("abort", onAbort);
    await page?.close().catch(() => {});
    pageSlots.release();
  }
}
