import { normalizeListing } from "./normalize.js";

function buildQueryString(filters) {
  const params = new URLSearchParams();

  if (filters.make) params.set("make", filters.make);
  if (filters.model) params.set("model", filters.model);
  if (filters.postcode) params.set("postcode", filters.postcode);
  if (filters.minYear) params.set("year-from", String(filters.minYear));
  if (filters.maxPrice) params.set("price-to", String(filters.maxPrice));
  if (filters.maxMileage) params.set("mileage-to", String(filters.maxMileage));

  return params.toString();
}

async function scrapeCards(page, config, filters) {
  const url = config.buildUrl(filters);
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 45000
  });

  if (config.acceptCookies) {
    await config.acceptCookies(page);
  }

  await page.waitForTimeout(2500);

  if (config.waitFor) {
    await page.waitForSelector(config.waitFor, { timeout: 15000 }).catch(() => {});
  }

  const rawListings = await page.evaluate(({ cardSelector, fields, baseUrl, limit }) => {
    const text = (el, selector) => {
      if (!selector) return "";
      const node = el.querySelector(selector);
      return node ? node.textContent?.trim() ?? "" : "";
    };

    const attr = (el, selector, attribute) => {
      if (!selector || !attribute) return "";
      const node = el.querySelector(selector);
      return node ? node.getAttribute(attribute) ?? "" : "";
    };

    return Array.from(document.querySelectorAll(cardSelector))
      .slice(0, limit)
      .map((card, index) => {
        const href = attr(card, fields.link, "href");
        const src = attr(card, fields.image, "src") || attr(card, fields.image, "data-src");

        return {
          id: `${index}:${href}`,
          title: text(card, fields.title),
          subtitle: text(card, fields.subtitle),
          price: text(card, fields.price),
          mileage: text(card, fields.mileage),
          year: text(card, fields.year),
          fuelType: text(card, fields.fuelType),
          transmission: text(card, fields.transmission),
          location: text(card, fields.location),
          dealer: text(card, fields.dealer),
          details: text(card, fields.details),
          imageUrl: src,
          url: href ? new URL(href, baseUrl).toString() : ""
        };
      });
  }, {
    cardSelector: config.cardSelector,
    fields: config.fields,
    baseUrl: config.baseUrl,
    limit: filters.limit ?? 20
  });

  return rawListings.map((listing) => normalizeListing(config, listing));
}

function withFallbackUrl(baseUrl, path, filters) {
  const query = buildQueryString(filters);
  return query ? `${baseUrl}${path}?${query}` : `${baseUrl}${path}`;
}

export const providers = [
  {
    name: "autotrader",
    label: "Auto Trader",
    baseUrl: "https://www.autotrader.co.uk",
    buildUrl: (filters) => withFallbackUrl("https://www.autotrader.co.uk", "/car-search", filters),
    waitFor: "[data-testid='search-listing-card']",
    cardSelector: "[data-testid='search-listing-card']",
    fields: {
      title: "[data-testid='advert-title']",
      subtitle: "[data-testid='advert-subtitle']",
      price: "[data-testid='advert-price']",
      mileage: "[data-testid='advert-mileage']",
      year: "[data-testid='advert-registration-year']",
      fuelType: "[data-testid='advert-fuel-type']",
      transmission: "[data-testid='advert-transmission']",
      location: "[data-testid='seller-location']",
      dealer: "[data-testid='seller-name']",
      image: "img",
      link: "a",
      details: "[data-testid='search-listing-specs']"
    },
    acceptCookies: async (page) => {
      await page.getByRole("button", { name: /accept/i }).click().catch(() => {});
    },
    scrape: scrapeCards
  },
  {
    name: "motor",
    label: "Motor",
    baseUrl: "https://www.motor.co.uk",
    buildUrl: (filters) => withFallbackUrl("https://www.motor.co.uk", "/search", filters),
    waitFor: "[data-testid='vehicle-card'], article",
    cardSelector: "[data-testid='vehicle-card'], article",
    fields: {
      title: "h2, h3",
      subtitle: "[class*='spec'], [class*='subtitle']",
      price: "[class*='price']",
      mileage: "li, [class*='mileage']",
      year: "li, [class*='year']",
      fuelType: "li, [class*='fuel']",
      transmission: "li, [class*='transmission']",
      location: "[class*='location']",
      dealer: "[class*='dealer']",
      image: "img",
      link: "a",
      details: "ul"
    },
    acceptCookies: async (page) => {
      await page.getByRole("button", { name: /accept|agree/i }).click().catch(() => {});
    },
    scrape: scrapeCards
  },
  {
    name: "carzoo",
    label: "Carzoo",
    baseUrl: "https://www.carzoo.co.uk",
    buildUrl: (filters) => withFallbackUrl("https://www.carzoo.co.uk", "/used-cars", filters),
    waitFor: "article, [data-testid='listing-card']",
    cardSelector: "article, [data-testid='listing-card']",
    fields: {
      title: "h2, h3",
      subtitle: "[class*='variant'], [class*='subtitle']",
      price: "[class*='price']",
      mileage: "li, [class*='mileage']",
      year: "li, [class*='year']",
      fuelType: "li, [class*='fuel']",
      transmission: "li, [class*='transmission']",
      location: "[class*='location']",
      dealer: "[class*='dealer']",
      image: "img",
      link: "a",
      details: "ul"
    },
    acceptCookies: async (page) => {
      await page.getByRole("button", { name: /accept|allow/i }).click().catch(() => {});
    },
    scrape: scrapeCards
  },
  {
    name: "cinch",
    label: "Cinch",
    baseUrl: "https://www.cinch.co.uk",
    buildUrl: (filters) => withFallbackUrl("https://www.cinch.co.uk", "/used-cars", filters),
    waitFor: "article, [data-testid='listing-card']",
    cardSelector: "article, [data-testid='listing-card']",
    fields: {
      title: "h2, h3",
      subtitle: "[class*='description'], [class*='subtitle']",
      price: "[class*='price']",
      mileage: "li, [class*='mileage']",
      year: "li, [class*='year']",
      fuelType: "li, [class*='fuel']",
      transmission: "li, [class*='transmission']",
      location: "[class*='location']",
      dealer: "[class*='dealer']",
      image: "img",
      link: "a",
      details: "ul"
    },
    acceptCookies: async (page) => {
      await page.getByRole("button", { name: /accept|allow/i }).click().catch(() => {});
    },
    scrape: scrapeCards
  }
];
