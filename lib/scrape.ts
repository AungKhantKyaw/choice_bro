import { parseHTML } from "linkedom";
import { withPage } from "./browser";
import { Retailer } from "./retailers";
import { Product } from "./types";
import { retry } from "./utils/retry";
import { delay } from "./utils/scraper-helpers";
import { parseSize, unitPriceFor } from "./utils/units";

/** Cards pulled per retailer before filtering. Higher than the displayed cap so filters keep recall. */
export const MAX_CARDS = 24;

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
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: retailer.gotoTimeout });
        if ("selector" in retailer.ready) {
          await page.waitForSelector(retailer.ready.selector, { timeout: retailer.ready.timeout });
        } else {
          await page.waitForFunction(retailer.ready.expression, { timeout: retailer.ready.timeout });
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
