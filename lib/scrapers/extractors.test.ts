import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import {
  extractFoodstuffs,
  extractHarveyNorman,
  extractJbHifi,
  extractPbTech,
  extractWoolworths,
} from "./extractors";

const load = (name: string) =>
  parseHTML(readFileSync(join(__dirname, "__fixtures__", name), "utf8")).document as unknown as Document;

describe("extractPbTech", () => {
  const items = extractPbTech(load("pbtech.html"), 24);

  it("prefers GST-inclusive price and collapses whitespace in titles", () => {
    expect(items[0]).toEqual({
      title: "Sony WH-1000XM5 Headphones",
      price: 549,
      url: "https://www.pbtech.co.nz/product/HEADSON123/Sony-WH-1000XM5",
    });
  });

  it("falls back to GST-exclusive, handles thousands separators and absolute paths", () => {
    expect(items[1].price).toBe(1299.5);
    expect(items[1].url).toBe("https://www.pbtech.co.nz/product/CABLE1/Cable");
  });

  it("skips cards without a price", () => {
    expect(items).toHaveLength(2);
  });

  it("respects max", () => {
    expect(extractPbTech(load("pbtech.html"), 1)).toHaveLength(1);
  });
});

describe("extractJbHifi", () => {
  const items = extractJbHifi(load("jbhifi.html"), 24);

  it("keeps cents (the old parseInt turned $12.95 into 1295)", () => {
    expect(items.find((i) => i.title === "HDMI Cable")?.price).toBe(12.95);
  });

  it("parses whole-dollar and comma prices", () => {
    expect(items.find((i) => i.title === "Sony WH-1000XM5")?.price).toBe(549);
    expect(items.find((i) => i.title === '55" TV')?.price).toBe(1299);
  });

  it("resolves relative and absolute URLs, skips priceless cards", () => {
    expect(items[0].url).toBe("https://www.jbhifi.co.nz/products/sony-wh-1000xm5");
    expect(items[2].url).toBe("https://www.jbhifi.co.nz/products/tv");
    expect(items).toHaveLength(3);
  });
});

describe("extractHarveyNorman", () => {
  const items = extractHarveyNorman(load("harveynorman.html"), 24);

  it("resolves protocol-relative and root-relative hrefs", () => {
    expect(items[0].url).toBe("https://www.harveynorman.co.nz/sony-headphones.html");
    expect(items[1].url).toBe("https://www.harveynorman.co.nz/lg-tv.html");
  });

  it("parses prices and skips priceless cards", () => {
    expect(items.map((i) => i.price)).toEqual([499, 1999.99]);
  });
});

describe("extractWoolworths", () => {
  const items = extractWoolworths(load("woolworths.html"), 24);

  it("reads title, price and absolute URL from a real product tile", () => {
    expect(items[0]).toEqual({
      title: "Woolworths Fresh Broccoli Head",
      price: 2,
      url: "https://www.woolworths.co.nz/shop/product-details/281082/woolworths-fresh-broccoli-head",
    });
  });

  it("parses the other captured tiles, including a per-kg deli price", () => {
    expect(items.map((i) => [i.title, i.price])).toEqual([
      ["Woolworths Fresh Broccoli Head", 2],
      ["Woolworths Frozen Broccoli Florets 450g Bag", 3.5],
      ["Wattie's Mixed Vegetables Broccoli & Cauliflower Medley 650g", 5.99],
      ["Woolworths Instore Deli Fresh Salad Broccoli & Cranberry", 34.9], // sold per kg
    ]);
  });

  it("skips tiles without a price", () => {
    expect(items.some((i) => i.title === "Out Of Stock Broccoli")).toBe(false);
    expect(items).toHaveLength(4);
  });

  it("ignores the hashed suffix on class names", () => {
    const doc = parseHTML(
      `<div class="product-grid_productTileCell__ZZZZZ"><a class="product-tile_description__ZZZZZ" href="/shop/product-details/1/x">X</a><span class="product-price_value__ZZZZZ">$1.50</span></div>`,
    ).document as unknown as Document;
    expect(extractWoolworths(doc, 24)).toHaveLength(1);
  });
});

describe("extractFoodstuffs", () => {
  const items = extractFoodstuffs(load("foodstuffs.html"), "https://www.paknsave.co.nz", 24);

  it("finds the price by walking up from the title, and normalises whitespace", () => {
    expect(items[0]).toEqual({
      title: "Pams Butter Salted 500g",
      price: 6.49,
      url: "https://www.paknsave.co.nz/shop/product/5001234_ea_000pns",
    });
  });

  it("keeps absolute URLs and zero cents", () => {
    expect(items[1].price).toBe(4);
    expect(items[1].url).toBe("https://www.paknsave.co.nz/shop/product/999_ea_000pns");
  });

  it("skips cards with no price", () => {
    expect(items).toHaveLength(2);
  });

  it("uses the base URL it is given (New World)", () => {
    const nw = extractFoodstuffs(load("foodstuffs.html"), "https://www.newworld.co.nz", 24);
    expect(nw[0].url).toBe("https://www.newworld.co.nz/shop/product/5001234_ea_000pns");
  });
});
