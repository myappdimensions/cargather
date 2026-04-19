import { normalizeListing } from "./normalize.js";

function buildAutotraderQuery(filters) {
  const params = new URLSearchParams();

  params.set("channel", "cars");
  params.set("exclude-writeoff-categories", "on");
  params.set("sort", "relevance");

  if (filters.make) params.set("make", filters.make);
  if (filters.model) params.set("model", filters.model);
  if (filters.postcode) params.set("postcode", filters.postcode);
  if (filters.fuelType) params.set("fuel-type", filters.fuelType);
  if (filters.transmission) params.set("transmission", filters.transmission);
  if (filters.minYear) params.set("year-from", String(filters.minYear));
  if (filters.minPrice) params.set("price-from", String(filters.minPrice));
  if (filters.maxPrice) params.set("price-to", String(filters.maxPrice));
  if (filters.maxMileage) params.set("maximum-mileage", String(filters.maxMileage));

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

  const rawListings = await page.evaluate(({ cardSelector, fields, baseUrl, limit, fallbackCardSelectors }) => {
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

    const cardNodes = document.querySelectorAll(cardSelector).length
      ? document.querySelectorAll(cardSelector)
      : document.querySelectorAll(fallbackCardSelectors.join(", "));

    return Array.from(cardNodes)
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
    limit: filters.limit ?? 20,
    fallbackCardSelectors: config.fallbackCardSelectors ?? []
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

function buildAutotraderUrl(filters) {
  const query = buildAutotraderQuery(filters);
  return query
    ? `https://www.autotrader.co.uk/car-search?${query}`
    : "https://www.autotrader.co.uk/car-search?channel=cars&exclude-writeoff-categories=on&sort=relevance";
}

export const providers = [
  {
    name: "autotrader",
    label: "Auto Trader",
    baseUrl: "https://www.autotrader.co.uk",
    buildUrl: (filters) => buildAutotraderUrl(filters),
    waitFor: "[data-testid='search-listing-card']",
    gotoTimeout: 70000,
    waitForTimeout: 25000,
    settleDelay: 5000,
    timeoutMs: 70000,
    cardSelector: "[data-testid='search-listing-card']",
    fallbackCardSelectors: [
      "[data-testid*='listing']",
      "[data-testid*='advert']",
      "article"
    ],
    fields: {
      title: "[data-testid='advert-title'], h2, h3",
      subtitle: "[data-testid='advert-subtitle']",
      price: "[data-testid='advert-price'], [class*='price']",
      mileage: "[data-testid='advert-mileage'], [class*='mileage']",
      year: "[data-testid='advert-registration-year'], [class*='year']",
      fuelType: "[data-testid='advert-fuel-type'], [class*='fuel']",
      transmission: "[data-testid='advert-transmission'], [class*='transmission']",
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
  }
];
