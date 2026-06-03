import { Product } from "../types";
import { getBrowser } from "../browser";
import { retry } from "../utils/retry";
import { setupScraperPage, delay } from "../utils/scraper-helpers";

export async function searchWoolworths(query: string): Promise<Product[]> {
  const searchUrl = `https://www.woolworths.co.nz/shop/searchproducts?search=${encodeURIComponent(query)}`;
  console.log(`[Woolworths] Scraping: ${searchUrl}`);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await setupScraperPage(page);

    await retry(async () => {
      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForSelector(".product-entry", {
        timeout: 15000,
      });
    }, 2);

    await delay(2000);

    const products = await page.evaluate(() => {
      const items: { title: string; price: number; url: string }[] = [];
      const cards = document.querySelectorAll(".product-entry");

      for (let i = 0; i < Math.min(cards.length, 10); i++) {
        const card = cards[i];

        // Title
        const titleElem = card.querySelector('h3[id*="-title"]');
        const title = titleElem?.textContent?.trim().replace(/\s+/g, " ") || "";

        // Price from presentPrice aria-label
        const priceElem = card.querySelector("h3.presentPrice");
        let price = 0;
        if (priceElem) {
          const ariaLabel = priceElem.getAttribute("aria-label") || ""; // e.g. "$8.19 each."
          const match = ariaLabel.match(/\$?([\d,]+\.?\d*)/);
          if (match) {
            price = parseFloat(match[1].replace(/,/g, ""));
          } else {
            // Fallback: em (dollars) + span (cents)
            const dollarsText = card.querySelector("h3.presentPrice em")?.textContent?.trim() || "";
            const centsText = card.querySelector("h3.presentPrice span")?.textContent?.trim() || "";
            const cleanedCents = centsText.replace(/[^0-9]/g, "");
            const combined = `${dollarsText}.${cleanedCents || "00"}`;
            const parsed = parseFloat(combined);
            if (!isNaN(parsed)) {
              price = parsed;
            }
          }
        }

        // Link
        const linkElem = card.querySelector('a[href*="productdetails"]');
        let url = "";
        if (linkElem) {
          const href = linkElem.getAttribute("href") || "";
          url = href.startsWith("http") ? href : `https://www.woolworths.co.nz${href}`;
        }

        if (title && price > 0 && url) {
          items.push({ title, price, url });
        }
      }
      return items;
    });

    console.log(`[Woolworths] Found ${products.length} products`);

    return products.map((p) => ({
      site: "Woolworths",
      title: p.title,
      price: p.price,
      url: p.url,
      currency: "NZD",
    }));
  } catch (error) {
    console.error(`[Woolworths] Scraper error:`, error);
    return [];
  } finally {
    await page.close();
  }
}
