import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseHTML } from "linkedom";
import type { Page } from "puppeteer";
import { withPage } from "./browser";
import { Retailer } from "./retailers";
import { Product } from "./types";
import { retry } from "./utils/retry";
import { delay } from "./utils/scraper-helpers";
import { parseSize, unitPriceFor } from "./utils/units";

/** Cards pulled per retailer before filtering. Higher than the displayed cap so filters keep recall. */
export const MAX_CARDS = 24;

const DEBUG_DIR = join(process.cwd(), ".debug");

/**
 * On a failed attempt, log what the browser actually saw and save the latest
 * HTML + screenshot to .debug/<retailer>.{html,png}. This is how you tell a
 * bot-block / captcha page apart from changed selectors or a slow load.
 * Never throws, and each step is time-boxed so a frozen page can't hang it.
 */
async function dumpDiagnostics(page: Page, retailer: Retailer, err: unknown) {
  const box = <T>(p: Promise<T>) =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("diag timeout")), 3000))]);
  try {
    const title = await box(page.title()).catch(() => "?");
    const body = await box(page.evaluate("document.body ? document.body.innerText.slice(0, 200) : ''"))
      .catch(() => "?");
    console.warn(
      `[${retailer.name}] attempt failed: ${err instanceof Error ? err.message : err}\n` +
        `  url:   ${page.url()}\n  title: ${title}\n  body:  ${String(body).replace(/\s+/g, " ")}`,
    );
    await mkdir(DEBUG_DIR, { recursive: true });
    await box(page.content()).then((html) => writeFile(join(DEBUG_DIR, `${retailer.id}.html`), html)).catch(() => {});
    await box(page.screenshot({ path: join(DEBUG_DIR, `${retailer.id}.png`) })).catch(() => {});
  } catch {
    /* diagnostics are best-effort */
  }
}

/**
 * Scrapes one retailer. THROWS on any failure (navigation, timeout, selector
 * never appeared, abort). An empty array means the page loaded and genuinely
 * had no matching products.
 */
export async function scrapeRetailer(
  retailer: Retailer,
  query: string,
  signal: AbortSignal,
): Promise<Product[]> {
  const url = retailer.searchUrl(query);
  console.log(`[${retailer.name}] Scraping: ${url}`);

  const html = await withPage(signal, async (page) => {
    await retry(
      async () => {
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: retailer.gotoTimeout });
          if ("selector" in retailer.ready) {
            await page.waitForSelector(retailer.ready.selector, { timeout: retailer.ready.timeout });
          } else {
            await page.waitForFunction(retailer.ready.expression, { timeout: retailer.ready.timeout });
          }
        } catch (err) {
          if (!signal.aborted) await dumpDiagnostics(page, retailer, err);
          throw err;
        }
      },
      2,
      signal,
    );
    if (retailer.settleMs) await delay(retailer.settleMs);
    return page.content();
  });

  const { document } = parseHTML(html);
  const raw = retailer.extract(document as unknown as Document, MAX_CARDS);
  console.log(`[${retailer.name}] Found ${raw.length} products`);

  return raw.map((p): Product => {
    const base: Product = {
      site: retailer.name,
      title: p.title,
      price: p.price,
      url: p.url || null,
      currency: "NZD",
    };
    if (retailer.category !== "grocery") return base;

    const size = parseSize(p.title);
    return { ...base, size: size?.label ?? null, unitPrice: unitPriceFor(p.price, size) };
  });
}
