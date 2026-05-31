import { Product } from "../types";
import { getBrowser } from "../browser";
import { retry } from "../utils/retry";
import { setupScraperPage, delay } from "../utils/scraper-helpers";

export async function searchHarveyNorman(query: string): Promise<Product[]> {
  const searchUrl = `https://www.harveynorman.co.nz/index.php?subcats=Y&status=A&pshort=N&pfull=N&pname=Y&pkeywords=Y&search_performed=Y&q=${encodeURIComponent(query)}&dispatch=products.search`;
  console.log(`[Harvey Norman] Scraping: ${searchUrl}`);

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

      await page.waitForSelector(".hproduct-col", {
        timeout: 10000,
      });
    }, 2);

    await delay(2000);

    const products = await page.evaluate(() => {
      const items: { title: string; price: number; url: string }[] = [];

      const productContainers = document.querySelectorAll(".hproduct-col");

      for (let i = 0; i < Math.min(productContainers.length, 10); i++) {
        const container = productContainers[i];

        const titleLink = container.querySelector(".product-title");
        const title = titleLink?.textContent?.trim() || "";

        const priceSpan = container.querySelector(".price");
        let price = 0;
        if (priceSpan) {
          const priceText = priceSpan.textContent?.trim() || "";
          const match = priceText.match(/\$?([\d,]+\.?\d*)/);
          if (match) {
            price = parseFloat(match[1].replace(/,/g, ""));
          }
        }

        let url = "";
        if (titleLink) {
          const href = titleLink.getAttribute("href");
          if (href) {
            if (href.startsWith("//")) {
              url = `https:${href}`;
            } else if (href.startsWith("/")) {
              url = `https://www.harveynorman.co.nz${href}`;
            } else if (href.startsWith("http")) {
              url = href;
            }
          }
        }

        if (title && price > 0) {
          items.push({ title, price, url });
        }
      }

      return items;
    });

    console.log(`[Harvey Norman] Found ${products.length} products`);

    return products.map((p) => ({
      site: "Harvey Norman",
      title: p.title,
      price: p.price,
      url: p.url,
      currency: "NZD",
    }));
  } catch (error) {
    console.error(`Harvey Norman error:`, error);
    return [];
  } finally {
    await page.close();
  }
}