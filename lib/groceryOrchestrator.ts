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
      withTimeout(s.search(query), 45000)
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

  // Define generic grocery words to ignore when extracting brand/specific keywords
  const GENERIC_GROCERY_WORDS = new Set([
    "butter", "milk", "cheese", "bread", "water", "juice", "salt", "sugar", 
    "flour", "oil", "sauce", "powder", "drink", "cereal", "egg", "eggs", 
    "paper", "bag", "bags", "soap", "noodle", "noodles", "rice", "pasta", 
    "tea", "coffee", "jam", "spread", "food", "fresh", "pure", "white", 
    "blue", "green", "red", "gold", "light", "product", "products", "item", "items",
    "salted", "unsalted", "organic"
  ]);

  // Clean the query into lowercase words, stripping common punctuation
  const queryWords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Identify specific keywords in the search (e.g. brand names or specific descriptors)
  const specificKeywords = queryWords.filter((w) => !GENERIC_GROCERY_WORDS.has(w));

  // Filter products: if user searched for specific keywords (like "pams"), ensure they are present in the title
  let filteredProducts = allProducts;
  if (specificKeywords.length > 0) {
    console.log(`[Grocery Filter] Requiring titles to contain: ${JSON.stringify(specificKeywords)}`);
    filteredProducts = allProducts.filter((p) => {
      const titleLower = p.title.toLowerCase().replace(/[^\w\s]/g, "");
      return specificKeywords.every((keyword) => titleLower.includes(keyword));
    });
  }

  // Sort by price ascending
  filteredProducts.sort((a, b) => a.price - b.price);

  // Save cache (expires in 4 hours)
  await fileCache.set(cacheKey, filteredProducts);
  return filteredProducts;
}
