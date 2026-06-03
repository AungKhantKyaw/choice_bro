import { Product } from "../types";
import { getBrowser } from "../browser";
import { retry } from "../utils/retry";
import { setupScraperPage, delay } from "../utils/scraper-helpers";

export async function searchPaknsave(query: string): Promise<Product[]> {
  const searchUrl = `https://www.paknsave.co.nz/shop/search?q=${encodeURIComponent(query)}`;
  console.log(`[PAK'nSAVE] Scraping: ${searchUrl}`);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await setupScraperPage(page);

    await retry(async () => {
      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForSelector(".owfhtz0", {
        timeout: 15000,
      });
    }, 2);

    await delay(2000);

    const products = await page.evaluate(() => {
      const items: { title: string; price: number; url: string }[] = [];
      const cards = document.querySelectorAll(".owfhtz0");

      for (let i = 0; i < Math.min(cards.length, 10); i++) {
        const card = cards[i];

        // Title
        const titleElem = card.querySelector('p.owfhtz4, p.owfhtz6, p[class*="owfhtz"]');
        const title = titleElem?.textContent?.trim().replace(/\s+/g, " ") || "";

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
      }
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
