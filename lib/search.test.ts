import { beforeEach, describe, expect, it, vi } from "vitest";
import { Product } from "./types";

const store = new Map<string, unknown>();
vi.mock("./utils/fileCache", () => ({
  fileCache: {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    set: vi.fn(async (k: string, v: unknown) => void store.set(k, v)),
    cleanExpired: vi.fn(async () => {}),
  },
}));

const scrapeRetailer = vi.fn();
vi.mock("./scrape", () => ({ scrapeRetailer: (...a: unknown[]) => scrapeRetailer(...a) }));

import { searchCategory } from "./search";

const prod = (site: string, title: string, price: number): Product => ({
  site, title, price, url: `https://x/${title}`, currency: "NZD",
});

beforeEach(() => {
  store.clear();
  scrapeRetailer.mockReset();
});

describe("searchCategory", () => {
  it("reports failures separately and does not cache them", async () => {
    scrapeRetailer.mockImplementation(async (r: { id: string }) => {
      if (r.id === "jbhifi") throw new Error("blocked");
      return r.id === "pbtech" ? [prod("PB Tech", "A", 100)] : [];
    });

    const out = await searchCategory("tech", "keyboard");
    expect(out.failures).toEqual([{ retailer: "JB Hi-Fi", error: "blocked" }]);
    expect(out.products).toHaveLength(1);
    expect(store.has("jbhifi:keyboard")).toBe(false);
    expect(store.has("pbtech:keyboard")).toBe(true);
    // A genuine "searched, found nothing" IS cached.
    expect(store.get("harveynorman:keyboard")).toEqual([]);

    // Retrying only re-scrapes the retailer that failed.
    scrapeRetailer.mockClear();
    scrapeRetailer.mockResolvedValue([prod("JB Hi-Fi", "B", 50)]);
    const again = await searchCategory("tech", "keyboard");
    expect(scrapeRetailer).toHaveBeenCalledTimes(1);
    expect(again.failures).toEqual([]);
    expect(again.products.map((p) => p.price)).toEqual([50, 100]);
  });

  it("dedupes identical concurrent searches into one scrape", async () => {
    let calls = 0;
    scrapeRetailer.mockImplementation(async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 10));
      return [];
    });
    await Promise.all([
      searchCategory("tech", "Monitor", { storePreference: "pbtech" }),
      searchCategory("tech", "  monitor ", { storePreference: "pbtech" }),
    ]);
    expect(calls).toBe(1);
  });

  it("scrapes only the preferred store, and reuses its cache for an all-stores search", async () => {
    scrapeRetailer.mockResolvedValue([prod("PB Tech", "A", 10)]);
    await searchCategory("tech", "mouse", { storePreference: "pbtech" });
    expect(scrapeRetailer).toHaveBeenCalledTimes(1);

    scrapeRetailer.mockClear();
    scrapeRetailer.mockResolvedValue([]);
    await searchCategory("tech", "mouse");
    expect(scrapeRetailer).toHaveBeenCalledTimes(2); // pbtech came from cache
  });

  it("ignores a store we don't scrape instead of returning nothing", async () => {
    scrapeRetailer.mockResolvedValue([prod("X", "A", 10)]);
    const out = await searchCategory("tech", "mouse", { storePreference: "noelleeming" });
    expect(out.ignoredStorePreference).toBe("noelleeming");
    expect(scrapeRetailer).toHaveBeenCalledTimes(3);
    expect(out.products.length).toBeGreaterThan(0);
  });

  it("applies maxPrice server-side without re-scraping", async () => {
    scrapeRetailer.mockResolvedValue([prod("X", "cheap", 20), prod("X", "dear", 200)]);
    const out = await searchCategory("tech", "cable", { storePreference: "pbtech", maxPrice: 50 });
    expect(out.products.map((p) => p.title)).toEqual(["cheap"]);
    expect(store.get("pbtech:cable")).toHaveLength(2); // cache holds the unfiltered list
  });

  it("filters grocery brand keywords BEFORE capping, so matches past the cap survive", async () => {
    const junk = Array.from({ length: 15 }, (_, i) => prod("Woolworths", `Anchor Butter ${i}`, 5));
    scrapeRetailer.mockResolvedValue([...junk, prod("Woolworths", "Pams Butter 500g", 4)]);
    const out = await searchCategory("grocery", "Pams butter", { storePreference: "woolworths" });
    expect(out.products.map((p) => p.title)).toEqual(["Pams Butter 500g"]);
  });
});
