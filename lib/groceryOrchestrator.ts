import { searchWoolworths } from "./scrapers/woolworths";
import { searchPaknsave } from "./scrapers/paknsave";
import { searchNewWorld } from "./scrapers/newworld";
import { Product } from "./types";
import { withTimeout } from "./utils/timeout";
import { fileCache } from "./utils/fileCache";

export async function searchAllGroceries(query: string, storePreference?: string | null): Promise<Product[]> {
  // Dynamically select target scrapers based on user store preference
  let scrapers = [
    { name: "woolworths", search: searchWoolworths },
    { name: "paknsave", search: searchPaknsave },
    { name: "newworld", search: searchNewWorld }
  ];

  const pref = storePreference?.trim().toLowerCase();

  if (pref) {
    if (pref === "woolworths") {
      scrapers = [ { name: "woolworths", search: searchWoolworths } ];
    } else if (pref === "paknsave" || pref === "pak n save" || pref === "pak'nsave") {
      scrapers = [ { name: "paknsave", search: searchPaknsave } ];
    } else if (pref === "newworld" || pref === "new world") {
      scrapers = [ { name: "newworld", search: searchNewWorld } ];
    }
  }

  // Segment cache key by query and store preference (with a grocery prefix to distinguish from electronics)
  const cacheKey = pref ? `grocery:${query.trim().toLowerCase()}:${pref}` : `grocery:${query.trim().toLowerCase()}`;
  const cached = await fileCache.get<Product[]>(cacheKey);

  if (cached) {
    console.log(`[Grocery Cache Hit] Serving cached grocery deals for key: "${cacheKey}"`);
    return cached;
  }

  console.log(`[Grocery Cache Miss] Scanning live grocery listings for key: "${cacheKey}" using ${scrapers.length} scraper(s)`);
  
  const results = await Promise.allSettled(
    scrapers.map((s) =>
      withTimeout(s.search(query), 18000)
    )
  );

  const allProducts: Product[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allProducts.push(...result.value);
    } else {
      console.error("Grocery scraper failed:", result.reason);
    }
  }

  // Sort by price ascending
  allProducts.sort((a, b) => a.price - b.price);

  // Save cache (expires in 4 hours)
  await fileCache.set(cacheKey, allProducts);
  return allProducts;
}
