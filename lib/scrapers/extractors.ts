/**
 * Pure DOM extractors, one per retailer platform. They take a parsed Document
 * (from page.content() via linkedom) so they can be unit-tested against saved
 * HTML without a browser. Selectors are carried over from the original
 * in-page scrapers; when a retailer changes its markup, this is the only file
 * that needs touching.
 */
import { RawProduct } from "../types";
import { absUrl, parsePrice } from "../utils/price";

const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

export function extractPbTech(doc: Document, max: number): RawProduct[] {
  const base = "https://www.pbtech.co.nz/";
  const items: RawProduct[] = [];

  for (const card of Array.from(doc.querySelectorAll(".js-product-card"))) {
    if (items.length >= max) break;

    const title = clean(card.querySelector(".js-main-categoty-product-title-breakdown")?.textContent);

    // Prefer GST-inclusive price, fall back to GST-exclusive.
    const block = card.querySelector(".item-price-amount");
    const priceText =
      block?.querySelector(".ginc .full-price")?.textContent?.trim() ||
      block?.querySelector(".gex .full-price")?.textContent?.trim() ||
      "";
    const price = parsePrice(priceText);

    const url = absUrl(card.querySelector("a.js-product-link")?.getAttribute("href"), base);

    if (title && price > 0 && url) items.push({ title, price, url });
  }
  return items;
}

export function extractJbHifi(doc: Document, max: number): RawProduct[] {
  const base = "https://www.jbhifi.co.nz";
  const items: RawProduct[] = [];

  for (const card of Array.from(doc.querySelectorAll(".ProductCard"))) {
    if (items.length >= max) break;

    const title = clean(card.querySelector('[data-testid="product-card-title"]')?.textContent);
    const price = parsePrice(card.querySelector('[data-testid="ticket-price"]')?.textContent);
    const url = absUrl(
      card.querySelector('.ProductCard_imageLink, a[href^="/products/"]')?.getAttribute("href"),
      base,
    );

    if (title && price > 0) items.push({ title, price, url });
  }
  return items;
}

export function extractHarveyNorman(doc: Document, max: number): RawProduct[] {
  const base = "https://www.harveynorman.co.nz";
  const items: RawProduct[] = [];

  for (const container of Array.from(doc.querySelectorAll(".hproduct-col"))) {
    if (items.length >= max) break;

    const titleLink = container.querySelector(".product-title");
    const title = clean(titleLink?.textContent);
    const price = parsePrice(container.querySelector(".price")?.textContent);
    const url = absUrl(titleLink?.getAttribute("href"), base);

    if (title && price > 0) items.push({ title, price, url });
  }
  return items;
}

/**
 * Woolworths NZ (Next.js storefront). Class names are CSS-module hashes
 * ("product-tile_description__jfRLo"), so we match on the stable prefix
 * and ignore the hash suffix, which changes on every site build.
 */
export function extractWoolworths(doc: Document, max: number): RawProduct[] {
  const base = "https://www.woolworths.co.nz";
  const items: RawProduct[] = [];

  for (const card of Array.from(doc.querySelectorAll('[class*="product-grid_productTileCell"]'))) {
    if (items.length >= max) break;

    const title = clean(
      card.querySelector('a[class*="product-tile_description"]')?.textContent ||
        card.querySelector('a[class*="product-tile_productImageLink"] img')?.getAttribute("alt"),
    );
    const price = parsePrice(card.querySelector('[class*="product-price_value"]')?.textContent);
    const url = absUrl(card.querySelector('a[href*="/shop/product-details/"]')?.getAttribute("href"), base);

    if (title && price > 0 && url) items.push({ title, price, url });
  }
  return items;
}

/** PAK'nSAVE and New World run the same Foodstuffs storefront; only the base URL differs. */
export function extractFoodstuffs(doc: Document, base: string, max: number): RawProduct[] {
  const items: RawProduct[] = [];

  for (const titleEl of Array.from(doc.querySelectorAll('[data-testid="product-title"]'))) {
    if (items.length >= max) break;

    // Walk up (max 6 levels) to the card container that holds the price. Stop
    // if we climb into an element holding several products: that's the grid,
    // and any price found there belongs to a different product (this happens
    // for unpriced/out-of-stock cards).
    let card: Element | null = titleEl.parentElement;
    for (let depth = 0; card && depth < 6; depth++) {
      if (card.querySelectorAll('[data-testid="product-title"]').length > 1) {
        card = null;
        break;
      }
      if (card.querySelector('[data-testid="price-dollars"]')) break;
      card = card.parentElement;
    }
    if (!card) continue;

    const title = clean(titleEl.textContent);

    const dollars = card.querySelector('[data-testid="price-dollars"]')?.textContent?.trim();
    const cents = card.querySelector('[data-testid="price-cents"]')?.textContent?.trim();
    const parsed = dollars && cents ? parseFloat(`${dollars}.${cents}`) : NaN;
    const price = Number.isFinite(parsed) ? parsed : 0;

    const url = absUrl(card.querySelector('a[href*="/product/"]')?.getAttribute("href"), base);

    if (title && price > 0 && url) items.push({ title, price, url });
  }
  return items;
}
