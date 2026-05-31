import { Product } from "../types";
import { getBrowser } from "../browser";
import { retry } from "../utils/retry";
import { setupScraperPage, delay } from "../utils/scraper-helpers";

export async function searchJbhifi(query: string): Promise<Product[]> {
  const searchUrl = `https://www.jbhifi.co.nz/search?query=${encodeURIComponent(query)}`;
  console.log(`[JB Hi-Fi] Scraping: ${searchUrl}`);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // Setup optimizations BEFORE navigation (fixes race condition)
    await setupScraperPage(page);

    await retry(async () => {
      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForSelector(".ProductCard", {
        timeout: 10000,
      });
    }, 2);

    // Give extra time for any lazy content
    await delay(2000);

    const products = await page.evaluate(() => {
      const items: { title: string; price: number; url: string }[] = [];

      const productCards = document.querySelectorAll(".ProductCard");

      for (let i = 0; i < Math.min(productCards.length, 10); i++) {
        const card = productCards[i];

        const titleElem = card.querySelector('[data-testid="product-card-title"]');
        const title = titleElem?.textContent?.trim() || "";

        const priceElem = card.querySelector('[data-testid="ticket-price"]');
        let price = 0;
        if (priceElem) {
          const priceText = priceElem.textContent?.trim() || "";
          const priceNum = parseInt(priceText.replace(/[^0-9]/g, ""), 10);
          if (!isNaN(priceNum)) price = priceNum;
        }

        const linkElem = card.querySelector(
          '.ProductCard_imageLink, a[href^="/products/"]',
        );
        let url = "";
        if (linkElem) {
          const href = linkElem.getAttribute("href");
          if (href) {
            url = href.startsWith("http")
              ? href
              : `https://www.jbhifi.co.nz${href}`;
          }
        }

        if (title && price > 0) {
          items.push({ title, price, url });
        }
      }

      return items;
    });

    console.log(`[JB Hi-Fi] Found ${products.length} products`);

    return products.map((p) => ({
      site: "JB Hi-Fi",
      title: p.title,
      price: p.price,
      url: p.url,
      currency: "NZD",
    }));
  } catch (error) {
    console.error(`JB Hi-Fi error:`, error);
    return [];
  } finally {
    await page.close();
  }
}