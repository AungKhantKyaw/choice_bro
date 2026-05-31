import puppeteer, { Browser } from "puppeteer";

let browser: Browser | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browser) return browser;

  browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  // Setup graceful shutdown handlers
  const cleanup = async () => {
    if (browser) {
      await browser.close();
      browser = null;
    }
  };

  process.on("exit", cleanup);
  process.on("SIGINT", async () => {
    await cleanup();
    process.exit();
  });
  process.on("SIGTERM", async () => {
    await cleanup();
    process.exit();
  });

  return browser;
}