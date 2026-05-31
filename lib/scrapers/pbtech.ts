import { Product } from "../types";
import { getBrowser } from "../browser";
import { retry } from "../utils/retry";
import { setupScraperPage } from "../utils/scraper-helpers";

export async function searchPBtech(query: string): Promise<Product[]> {
  const searchUrl = `https://www.pbtech.co.nz/search?sf=${encodeURIComponent(query)}`;
  console.log(`[PB Tech] Scraping: ${searchUrl}`);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Setup optimizations BEFORE navigation
    await setupScraperPage(page);

    await retry(async () => {
      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForSelector(".products-view", {
        timeout: 10000,
      });
    }, 2);

    const products = await page.evaluate(() => {
      const items: { title: string; price: number; url: string }[] = [];

      // products are direct children with class js-product-card
      const productElements = document.querySelectorAll(".js-product-card");

      for (let i = 0; i < Math.min(productElements.length, 10); i++) {
        const card = productElements[i];

        // Title: inside .product-title-holder -> .js-main-categoty-product-title-breakdown
        const titleElem = card.querySelector(
          ".js-main-categoty-product-title-breakdown",
        );
        const title = titleElem?.textContent?.trim().replace(/\s+/g, " ") || "";

        // Price: prefer .ginc (incl GST), fallback to .gex
        const priceBlock = card.querySelector(".item-price-amount");
        const gincPrice = priceBlock?.querySelector(".ginc .full-price");
        const gexPrice = priceBlock?.querySelector(".gex .full-price");
        const priceText =
          gincPrice?.textContent?.trim() || gexPrice?.textContent?.trim() || "";

        // Extract numeric price: handle $, commas, decimals
        const priceMatch = priceText.match(/\$?([\d,]+\.?\d{0,2})/);
        const price = priceMatch
          ? parseFloat(priceMatch[1].replace(/,/g, ""))
          : 0;

        // URL: from .js-product-link, handle relative paths
        const linkElem = card.querySelector("a.js-product-link");
        let url = linkElem?.getAttribute("href") || "";
        if (url && !url.startsWith("http")) {
          url = `https://www.pbtech.co.nz/${url}`;
        }

        if (title && price > 0 && url) {
          items.push({ title, price, url });
        }
      }
      return items;
    });

    return products.map((p) => ({
      site: "PB Tech",
      title: p.title,
      price: p.price,
      url: p.url,
      currency: "NZD",
    }));
  } catch (error) {
    console.error(`PB Tech error:`, error);
    return [];
  } finally {
    await page.close();
  }
}