import { searchPBtech } from "./scrapers/pbtech";
import { searchHarveyNorman } from "./scrapers/harveyNorman";
import { searchJbhifi } from "./scrapers/jbhifi";
import { Product } from "./types";
import { withTimeout } from "./utils/timeout";
import { fileCache } from "./utils/fileCache";

export async function searchAllRetailers(query: string): Promise<Product[]> {
  const scrapers = [searchPBtech, searchHarveyNorman, searchJbhifi];
  
  // Normalize key by trimming and lowercasing
  const normalizedQuery = query.trim().toLowerCase();
  const cached = await fileCache.get<Product[]>(normalizedQuery);

  if (cached) {
    console.log(`[Cache Hit] Serving cached deals for: "${normalizedQuery}"`);
    return cached;
  }

  console.log(`[Cache Miss] Scanning live listings for: "${normalizedQuery}"`);
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
  await fileCache.set(normalizedQuery, allProducts);
  return allProducts;
}
