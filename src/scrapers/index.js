import { getBrowser } from "./browser.js";
import { applyFilters } from "./normalize.js";
import { providers } from "./providers.js";

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms);
    })
  ]);
}

export async function searchListings(filters) {
  const browser = await getBrowser();

  const providerResults = await Promise.all(
    providers.map(async (provider) => {
      const page = await browser.newPage({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      });

      try {
        await page.route("**/*", async (route) => {
          const type = route.request().resourceType();
          if (type === "image" || type === "media" || type === "font") {
            await route.abort();
            return;
          }
          await route.continue();
        });

        const listings = await withTimeout(
          provider.scrape(page, provider, filters),
          provider.timeoutMs ?? 60000,
          provider.label
        );
        const filteredListings = applyFilters(listings, filters);

        return {
          provider: provider.name,
          label: provider.label,
          ok: true,
          count: filteredListings.length,
          listings: filteredListings
        };
      } catch (error) {
        return {
          provider: provider.name,
          label: provider.label,
          ok: false,
          count: 0,
          listings: [],
          error: error instanceof Error ? error.message : String(error)
        };
      } finally {
        await page.close();
      }
    })
  );

  const listings = providerResults
    .flatMap((result) => result.listings)
    .sort((left, right) => (left.price ?? Number.MAX_SAFE_INTEGER) - (right.price ?? Number.MAX_SAFE_INTEGER));

  return {
    ok: true,
    filters,
    count: listings.length,
    providers: providerResults,
    listings
  };
}
