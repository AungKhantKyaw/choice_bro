import puppeteer from "puppeteer";
import { Product } from "../types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function searchHarveyNorman(query: string): Promise<Product[]> {
  // Full working search URL with all parameters
  const searchUrl = `https://www.harveynorman.co.nz/index.php?subcats=Y&status=A&pshort=N&pfull=N&pname=Y&pkeywords=Y&search_performed=Y&q=${encodeURIComponent(query)}&dispatch=products.search`;
  console.log(`[Harvey Norman] Scraping: ${searchUrl}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for at least one product container to load
    await page
      .waitForSelector(".hproduct-col", { timeout: 15000 })
      .catch(() => null);

    await delay(2000);

    const products = await page.evaluate(() => {
      const items: { title: string; price: number; url: string }[] = [];

      // Each product is inside a div with class "hproduct-col product-col clearfix"
      const productContainers = document.querySelectorAll(".hproduct-col");

      for (let i = 0; i < Math.min(productContainers.length, 10); i++) {
        const container = productContainers[i];

        // Title – inside <a class="product-title product_link_...">
        const titleLink = container.querySelector(".product-title");
        const title = titleLink?.textContent?.trim() || "";

        // Price – inside <span class="price"> or <span class="price special-active">
        const priceSpan = container.querySelector(".price");
        let price = 0;
        if (priceSpan) {
          // Price text can be like "$1,347" or "$699" inside .price-num spans
          // The .price element contains multiple spans, but we can get its full text
          const priceText = priceSpan.textContent?.trim() || "";
          // Extract numeric value (handles $1,347, $699, $1,284.00)
          const match = priceText.match(/\$?([\d,]+\.?\d*)/);
          if (match) {
            price = parseFloat(match[1].replace(/,/g, ""));
          }
        }

        // URL – from the same title link
        let url = "";
        if (titleLink) {
          const href = titleLink.getAttribute("href");
          if (href) {
            // Handle protocol-relative URLs (//example.com/path)
            if (href.startsWith("//")) {
              url = `https:${href}`;
            }
            // Handle relative URLs (/path)
            else if (href.startsWith("/")) {
              url = `https://www.harveynorman.co.nz${href}`;
            }
            // Already absolute URL
            else if (href.startsWith("http")) {
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
    if (browser) await browser.close();
  }
}
