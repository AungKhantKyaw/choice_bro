import { searchPBtech } from "./scrapers/pbtech";
import { searchHarveyNorman } from "./scrapers/harveyNorman";
import { searchJbhifi } from "./scrapers/jbhifi";
import { Product } from "./types";

export async function searchAllRetailers(query: string): Promise<Product[]> {
  const scrapers = [searchPBtech, searchHarveyNorman, searchJbhifi];

  const results = await Promise.allSettled(
    scrapers.map((scraper) => scraper(query)),
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
  return allProducts;
}
