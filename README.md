# CarGather

CarGather is a small Node.js web app that aggregates used car listings from JavaScript-heavy marketplaces into one searchable UI.

## What it does

- Serves a single-page search interface
- Scrapes multiple providers with Playwright so client-rendered listing pages can load before extraction
- Normalizes listing data into one shape with comparable `price`, `year`, `mileage`, `fuelType`, and `transmission` fields
- Applies shared filters across all providers before returning the combined result set

## Providers included

- Auto Trader
- Motor
- Cinch

## Run locally

```bash
npm install
npx playwright install chromium
npm run dev
```

Then open `http://127.0.0.1:3000`.

## Deploy on the internet

The easiest production path for this app is a Docker-based host because Playwright needs a browser runtime.

### Render

1. Push this folder to a GitHub repo.
2. In Render, create a new `Blueprint` deployment from that repo.
3. Render will pick up `render.yaml` and `Dockerfile`.
4. After the first deploy, your app will be available at a public `onrender.com` URL.

### Railway or Fly.io

- Point the service at this repo and deploy using the included `Dockerfile`.
- The app listens on `PORT` automatically in production.

## API

`GET /api/search`

Example query:

```text
/api/search?make=BMW&model=3%20Series&minYear=2020&maxPrice=20000&maxMileage=60000&transmission=Automatic&limit=12
```

## Notes

- The provider selectors are intentionally isolated in `src/scrapers/providers.js` so each marketplace can be updated independently when markup changes.
- Some marketplaces may block automation, rate-limit requests, or require selector maintenance over time, especially from shared cloud hosting.
- Each provider is time-boxed so one slow marketplace does not block the whole aggregated search.
- Production hosting should use the included Docker image because Playwright needs a bundled browser environment.
- The current build is an MVP and does not yet add caching, deduplication, pagination, or a database.
