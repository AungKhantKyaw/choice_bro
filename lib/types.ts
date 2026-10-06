export type Category = "tech" | "grocery";

export interface UnitPrice {
  value: number;
  per: "100g" | "100ml";
}

export interface Product {
  site: string;
  title: string;
  price: number;
  url: string | null;
  currency: "NZD";
  /** Grocery only, best-effort parse from the title (e.g. "500g"). */
  size?: string | null;
  /** Grocery only, derived from price and size. */
  unitPrice?: UnitPrice | null;
}

/** What an extractor pulls out of a results page, before enrichment. */
export interface RawProduct {
  title: string;
  price: number;
  url: string;
}

export interface ScraperResult {
  success: boolean;
  products: Product[];
  error?: string;
}

export interface RetailerFailure {
  retailer: string;
  error: string;
}

export interface SearchOutcome {
  products: Product[];
  /** Retailers that errored or timed out. Distinct from "searched, found nothing". */
  failures: RetailerFailure[];
  /** Set when the requested store isn't a known retailer for this category. */
  ignoredStorePreference?: string;
}
