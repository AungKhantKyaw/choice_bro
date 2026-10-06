import { filterByKeywords } from "./filters";
import { Retailer, resolveRetailer, retailersFor } from "./retailers";
import { scrapeRetailer } from "./scrape";
import { Category, Product, RetailerFailure, ScraperResult, SearchOutcome } from "./types";
import { fileCache } from "./utils/fileCache";
import { withDeadline } from "./utils/timeout";

/** Displayed results kept per retailer after filtering. */
export const RESULTS_PER_RETAILER = 10;

const inflight = new Map<string, Promise<ScraperResult>>();
let swept = false;

export const normalizeQuery = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * One retailer, one query. Order of precedence: file cache, an identical
 * scrape already in flight, a fresh scrape.
 *
 * Only successful scrapes are cached (an empty-but-successful result is a real
 * "nothing found" and is cached). Failures are never cached, so a blocked or
 * broken scrape can't poison the query for hours.
 */
export async function getRetailerResult(retailer: Retailer, query: string): Promise<ScraperResult> {
  const key = `${retailer.id}:${normalizeQuery(query)}`;

  const cached = await fileCache.get<Product[]>(key);
  if (cached) {
    console.log(`[Cache Hit] ${key}`);
    return { success: true, products: cached };
  }

  let pending = inflight.get(key);
  if (!pending) {
    console.log(`[Cache Miss] ${key}`);
    pending = (async (): Promise<ScraperResult> => {
      try {
        const products = await withDeadline(retailer.deadlineMs, (signal) =>
          scrapeRetailer(retailer, query, signal),
        );
        await fileCache.set(key, products);
        return { success: true, products };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`[${retailer.name}] Scrape failed: ${error}`);
        return { success: false, products: [], error };
      }
    })().finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return pending;
}

export interface SearchOptions {
  storePreference?: string | null;
  maxPrice?: number | null;
}

export async function searchCategory(
  category: Category,
  query: string,
  { storePreference, maxPrice }: SearchOptions = {},
): Promise<SearchOutcome> {
  if (!swept) {
    swept = true;
    fileCache.cleanExpired().catch(() => {});
  }

  const preferred = resolveRetailer(category, storePreference);
  const retailers = preferred ? [preferred] : retailersFor(category);
  const ignoredStorePreference =
    storePreference?.trim() && !preferred ? storePreference.trim() : undefined;

  const results = await Promise.all(retailers.map((r) => getRetailerResult(r, query)));

  const products: Product[] = [];
  const failures: RetailerFailure[] = [];

  results.forEach((result, i) => {
    if (!result.success) {
      failures.push({ retailer: retailers[i].name, error: result.error ?? "Unknown error" });
      return;
    }
    // Filter first, then cap, so the cap can't cut off the matching items.
    let list = result.products;
    if (category === "grocery") list = filterByKeywords(list, query);
    if (maxPrice != null && maxPrice > 0) list = list.filter((p) => p.price <= maxPrice);
    products.push(...list.slice(0, RESULTS_PER_RETAILER));
  });

  products.sort((a, b) => a.price - b.price);
  return { products, failures, ignoredStorePreference };
}
