import { Product } from "../types";
import { getBrowser } from "../browser";
import { retry } from "../utils/retry";

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function searchJbhifi(query: string): Promise<Product[]> {
  const searchUrl = `https://www.jbhifi.co.nz/search?query=${encodeURIComponent(query)}`;
  console.log(`[JB Hi-Fi] Scraping: ${searchUrl}`);

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
       
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    
    await retry(async () => {
      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await page.waitForSelector(".ProductCard", {
        timeout: 10000,
      });
    }, 2);   

    await page.setRequestInterception(true);

    page.on("request", (req) => {
      const type = req.resourceType();

      if (
        ["image", "stylesheet", "font", "media"].includes(type)
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Give extra time for any lazy content – using custom delay
    await delay(2000);

    const products = await page.evaluate(() => {
      const items: { title: string; price: number; url: string }[] = [];

      // Each product is a div with class starting with "ProductCard"
      const productCards = document.querySelectorAll(".ProductCard");

      for (let i = 0; i < Math.min(productCards.length, 10); i++) {
        const card = productCards[i];

        // Find title using the data-testid attribute
        const titleElem = card.querySelector(
          '[data-testid="product-card-title"]',
        );
        const title = titleElem?.textContent?.trim() || "";

        // Find price using data-testid="ticket-price"
        const priceElem = card.querySelector('[data-testid="ticket-price"]');
        let price = 0;
        if (priceElem) {
          const priceText = priceElem.textContent?.trim() || "";
          // Price is numeric without dollar sign (e.g., "1648")
          const priceNum = parseInt(priceText.replace(/[^0-9]/g, ""), 10);
          if (!isNaN(priceNum)) price = priceNum;
        }

        // Find product link – look for anchor with href starting with "/products/"
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
