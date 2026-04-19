import { chromium } from "playwright";

let browserPromise;

export async function getBrowser() {
  if (!browserPromise) {
    const isContainer = process.env.NODE_ENV === "production" || process.env.PLAYWRIGHT_DISABLE_SANDBOX === "true";

    browserPromise = chromium.launch({
      headless: process.env.HEADFUL !== "true",
      args: isContainer ? ["--no-sandbox", "--disable-setuid-sandbox"] : []
    });
  }

  return browserPromise;
}
