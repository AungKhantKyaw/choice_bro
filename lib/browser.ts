import puppeteer, { Browser } from "puppeteer";

let browser: Browser | null = null;
let handlersRegistered = false;

async function cleanup() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

function registerHandlers() {
  if (handlersRegistered) return;

  handlersRegistered = true;

  process.on("SIGINT", async () => {
    await cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await cleanup();
    process.exit(0);
  });
}

export async function getBrowser(): Promise<Browser> {
  if (browser?.connected) {
    return browser;
  }

  browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  browser.on("disconnected", () => {
    browser = null;
  });

  registerHandlers();

  return browser;
}