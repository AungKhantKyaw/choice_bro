import { Product } from "../types";
import { getBrowser } from "../browser";
import { retry } from "../utils/retry";
import { setupScraperPage, delay } from "../utils/scraper-helpers";

export async function searchPaknsave(query: string): Promise<Product[]> {
  const searchUrl = `https://www.paknsave.co.nz/shop/search?q=${encodeURIComponent(query)}&sf=shopping`;
  console.log(`[PAK'nSAVE] Scraping: ${searchUrl}`);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await setupScraperPage(page);

    await retry(async () => {
      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      // Wait for product titles or "no results" message to avoid timing out on empty searches
      await page.waitForFunction(() => {
        const hasProducts = document.querySelector('[data-testid="product-title"]') !== null;
        const bodyText = document.body.textContent || "";
        const hasNoResults = bodyText.includes("couldn't find") || bodyText.includes("couldn’t find") || bodyText.includes("no results");
        return hasProducts || hasNoResults;
      }, {
        timeout: 20000,
      });
    }, 2);

    await delay(2000);

    const products = await page.evaluate(() => {
      const items: { title: string; price: number; url: string }[] = [];
      const titleElements = document.querySelectorAll('[data-testid="product-title"]');

      titleElements.forEach((titleEl) => {
        // Traverse up to find the card container that contains the pricing
        let card = titleEl.parentElement;
        let depth = 0;
        while (card && depth < 6) {
          if (card.querySelector('[data-testid="price-dollars"]')) {
            break;
          }
          card = card.parentElement;
          depth++;
        }

        if (!card) return;

        // Title
        const title = titleEl.textContent?.trim().replace(/\s+/g, " ") || "";

        // Price
        const dollarsElem = card.querySelector('[data-testid="price-dollars"]');
        const centsElem = card.querySelector('[data-testid="price-cents"]');
        let price = 0;

        if (dollarsElem && centsElem) {
          const dollars = dollarsElem.textContent?.trim() || "";
          const cents = centsElem.textContent?.trim() || "";
          const parsed = parseFloat(`${dollars}.${cents}`);
          if (!isNaN(parsed)) {
            price = parsed;
          }
        }

        // Link
        const linkElem = card.querySelector('a[href*="/product/"]');
        let url = "";
        if (linkElem) {
          const href = linkElem.getAttribute("href") || "";
          url = href.startsWith("http") ? href : `https://www.paknsave.co.nz${href}`;
        }

        if (title && price > 0 && url) {
          items.push({ title, price, url });
        }
      });

      return items;
    });

    console.log(`[PAK'nSAVE] Found ${products.length} products`);

    return products.map((p) => ({
      site: "PAK'nSAVE",
      title: p.title,
      price: p.price,
      url: p.url,
      currency: "NZD",
    }));
  } catch (error) {
    console.error(`[PAK'nSAVE] Scraper error:`, error);
    return [];
  } finally {
    await page.close();
  }
}
