import { searchPBtech } from "./scrapers/pbtech";
import { searchHarveyNorman } from "./scrapers/harveyNorman";
import { searchJbhifi } from "./scrapers/jbhifi";
import { Product } from "./types";
import { withTimeout } from "./utils/timeout";
import { fileCache } from "./utils/fileCache";

export async function searchAllRetailers(query: string, storePreference?: string | null): Promise<Product[]> {
  // Dynamically select target scrapers based on user store preference
  let scrapers = [searchPBtech, searchHarveyNorman, searchJbhifi];
  const pref = storePreference?.trim().toLowerCase();

  if (pref) {
    if (pref === "pbtech") {
      scrapers = [searchPBtech];
    } else if (pref === "jbhifi") {
      scrapers = [searchJbhifi];
    } else if (pref === "harveynorman") {
      scrapers = [searchHarveyNorman];
    }
  }
  
  // Segment cache key by query and store preference
  const cacheKey = pref ? `${query.trim().toLowerCase()}:${pref}` : query.trim().toLowerCase();
  const cached = await fileCache.get<Product[]>(cacheKey);

  if (cached) {
    console.log(`[Cache Hit] Serving cached deals for key: "${cacheKey}"`);
    return cached;
  }

  console.log(`[Cache Miss] Scanning live listings for key: "${cacheKey}" using ${scrapers.length} scraper(s)`);
  const results = await Promise.allSettled(
    scrapers.map((scraper) =>
      withTimeout(scraper(query), 15000)
    )
  );

  const allProducts: Product[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allProducts.push(...result.value);
    } else {
      console.error("Scraper failed:", result.reason);
    }
  }

  // Sort by price ascending
  allProducts.sort((a, b) => a.price - b.price);
  
  // Save cache (expires in 4 hours)
  await fileCache.set(cacheKey, allProducts);
  return allProducts;
}
