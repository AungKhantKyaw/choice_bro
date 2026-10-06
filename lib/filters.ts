import { Product } from "./types";

// Generic grocery words that don't identify a brand/variant. Everything else in
// the query must appear in a product title (e.g. "pams butter" -> require "pams").
const GENERIC_GROCERY_WORDS = new Set([
  "butter", "milk", "cheese", "bread", "water", "juice", "salt", "sugar",
  "flour", "oil", "sauce", "powder", "drink", "cereal", "egg", "eggs",
  "paper", "bag", "bags", "soap", "noodle", "noodles", "rice", "pasta",
  "tea", "coffee", "jam", "spread", "food", "fresh", "pure", "white",
  "blue", "green", "red", "gold", "light", "product", "products", "item", "items",
  "salted", "unsalted", "organic",
]);

const strip = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, "");

export function specificKeywords(query: string): string[] {
  return strip(query)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !GENERIC_GROCERY_WORDS.has(w));
}

/** Keeps products whose titles contain every brand/descriptor keyword in the query. */
export function filterByKeywords(products: Product[], query: string): Product[] {
  const keywords = specificKeywords(query);
  if (keywords.length === 0) return products;
  return products.filter((p) => {
    const title = strip(p.title);
    return keywords.every((k) => title.includes(k));
  });
}
