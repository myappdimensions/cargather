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
    timeout: config.gotoTimeout ?? 60000
  });

  if (config.acceptCookies) {
    await config.acceptCookies(page);
  }

  await page.waitForTimeout(config.settleDelay ?? 3500);

  if (config.waitFor) {
    await page.waitForSelector(config.waitFor, { timeout: config.waitForTimeout ?? 20000 }).catch(() => {});
  }

  const diagnostics = await page.evaluate(({ cardSelector }) => {
    const bodyText = document.body?.innerText?.replace(/\s+/g, " ").trim() ?? "";
    const title = document.title ?? "";
    const cardCount = document.querySelectorAll(cardSelector).length;
    return {
      title,
      cardCount,
      bodySnippet: bodyText.slice(0, 240)
    };
  }, {
    cardSelector: config.cardSelector
  });

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

  if (!rawListings.length) {
    const blockedTerms = [
      "captcha",
      "verify you are human",
      "verify you are a human",
      "access denied",
      "forbidden",
      "unusual traffic",
      "robot",
      "blocked",
      "please enable cookies",
      "temporarily unavailable",
      "challenge"
    ];
    const combinedText = `${diagnostics.title} ${diagnostics.bodySnippet}`.toLowerCase();
    const blocked = blockedTerms.find((term) => combinedText.includes(term));

    throw new Error(
      blocked
        ? `${config.label} appears to be blocking automated traffic (${blocked})`
        : `${config.label} returned no listing cards for selector ${config.cardSelector}`
    );
  }

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
    gotoTimeout: 70000,
    waitForTimeout: 25000,
    settleDelay: 5000,
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
    gotoTimeout: 70000,
    waitForTimeout: 25000,
    settleDelay: 4500,
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
    name: "cinch",
    label: "Cinch",
    baseUrl: "https://www.cinch.co.uk",
    buildUrl: (filters) => withFallbackUrl("https://www.cinch.co.uk", "/used-cars", filters),
    waitFor: "article, [data-testid='listing-card']",
    gotoTimeout: 70000,
    waitForTimeout: 25000,
    settleDelay: 4500,
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
