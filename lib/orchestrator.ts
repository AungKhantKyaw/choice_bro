import { searchPBtech } from "./scrapers/pbtech";
import { searchHarveyNorman } from "./scrapers/harveyNorman";
import { searchJbhifi } from "./scrapers/jbhifi";
import { Product } from "./types";
import { withTimeout } from "./utils/timeout";
import { cache } from "./cache";

export async function searchAllRetailers(query: string): Promise<Product[]> {
  const scrapers = [searchPBtech, searchHarveyNorman, searchJbhifi];
  const cached = cache.get<Product[]>(query);

  if (cached) {
    return cached;
  }

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
  cache.set(query, allProducts);
  return allProducts;
}
