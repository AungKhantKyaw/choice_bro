import { Category, RawProduct } from "./types";
import {
  extractFoodstuffs,
  extractHarveyNorman,
  extractJbHifi,
  extractPbTech,
  extractWoolworths,
} from "./scrapers/extractors";

export type ReadyCheck =
  | { selector: string; timeout: number }
  /** A JS expression evaluated in the page; resolves when truthy. Used when "no results" is a valid page state. */
  | { expression: string; timeout: number };

export interface Retailer {
  /** Stable id used in cache keys and as the AI/store-preference value. */
  id: string;
  /** Display name, also stored on Product.site. */
  name: string;
  category: Category;
  /** Extra normalised spellings accepted for store preference (lowercase, alphanumeric only). */
  aliases: string[];
  searchUrl: (query: string) => string;
  gotoTimeout: number;
  ready: ReadyCheck;
  /** Fixed wait after ready for lazy content. Kept from the original scrapers. */
  settleMs: number;
  /** Whole-scrape deadline, including waiting for a free page slot. */
  deadlineMs: number;
  extract: (doc: Document, max: number) => RawProduct[];
}

const enc = encodeURIComponent;

const FOODSTUFFS_READY: ReadyCheck = {
  expression: `document.querySelector('[data-testid="product-title"]') !== null || /couldn.t find|no results/i.test(document.body.textContent || "")`,
  timeout: 20000,
};

export const RETAILERS: Retailer[] = [
  {
    id: "pbtech",
    name: "PB Tech",
    category: "tech",
    aliases: [],
    searchUrl: (q) => `https://www.pbtech.co.nz/search?sf=${enc(q)}`,
    gotoTimeout: 30000,
    ready: { selector: ".products-view", timeout: 10000 },
    settleMs: 0,
    deadlineMs: 25000,
    extract: extractPbTech,
  },
  {
    id: "jbhifi",
    name: "JB Hi-Fi",
    category: "tech",
    aliases: ["jb"],
    searchUrl: (q) => `https://www.jbhifi.co.nz/search?query=${enc(q)}`,
    gotoTimeout: 30000,
    ready: { selector: ".ProductCard", timeout: 10000 },
    settleMs: 2000,
    deadlineMs: 25000,
    extract: extractJbHifi,
  },
  {
    id: "harveynorman",
    name: "Harvey Norman",
    category: "tech",
    aliases: ["harvey"],
    searchUrl: (q) =>
      `https://www.harveynorman.co.nz/index.php?subcats=Y&status=A&pshort=N&pfull=N&pname=Y&pkeywords=Y&search_performed=Y&q=${enc(q)}&dispatch=products.search`,
    gotoTimeout: 30000,
    ready: { selector: ".hproduct-col", timeout: 10000 },
    settleMs: 2000,
    deadlineMs: 25000,
    extract: extractHarveyNorman,
  },
  {
    id: "woolworths",
    name: "Woolworths",
    category: "grocery",
    aliases: ["countdown"],
    searchUrl: (q) => `https://www.woolworths.co.nz/shop/search/products?search=${enc(q)}`,
    gotoTimeout: 15000,
    ready: {
      // "(^|\D)0 products" so that "10 Products" doesn't count as "no results".
      expression: `document.querySelector(".product-entry") !== null || /(^|\\D)0\\s+(products|items)/i.test(document.body.textContent || "")`,
      timeout: 30000,
    },
    settleMs: 2000,
    deadlineMs: 45000,
    extract: extractWoolworths,
  },
  {
    id: "paknsave",
    name: "PAK'nSAVE",
    category: "grocery",
    aliases: ["pns"],
    searchUrl: (q) => `https://www.paknsave.co.nz/shop/search?q=${enc(q)}&sf=shopping`,
    gotoTimeout: 15000,
    ready: FOODSTUFFS_READY,
    settleMs: 2000,
    deadlineMs: 45000,
    extract: (doc, max) => extractFoodstuffs(doc, "https://www.paknsave.co.nz", max),
  },
  {
    id: "newworld",
    name: "New World",
    category: "grocery",
    aliases: [],
    searchUrl: (q) => `https://www.newworld.co.nz/shop/search?q=${enc(q)}&sf=products`,
    gotoTimeout: 15000,
    ready: FOODSTUFFS_READY,
    settleMs: 2000,
    deadlineMs: 45000,
    extract: (doc, max) => extractFoodstuffs(doc, "https://www.newworld.co.nz", max),
  },
];

export const retailersFor = (category: Category) =>
  RETAILERS.filter((r) => r.category === category);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Maps free-text like "pak n save" / "PAK'nSAVE" / "JB Hi-Fi" to a retailer.
 * Returns null when it isn't a retailer we scrape for this category.
 */
export function resolveRetailer(category: Category, pref: string | null | undefined): Retailer | null {
  if (!pref) return null;
  const n = norm(pref);
  if (!n) return null;
  return (
    retailersFor(category).find((r) => r.id === n || norm(r.name) === n || r.aliases.includes(n)) ?? null
  );
}
