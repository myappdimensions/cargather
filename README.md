# CarGather

CarGather is a small Node.js web app that scrapes Auto Trader listings into one searchable UI.

## What it does

- Serves a single-page search interface
- Scrapes Auto Trader with Playwright so client-rendered listing pages can load before extraction
- Normalizes listing data into one shape with comparable `price`, `year`, `mileage`, `fuelType`, and `transmission` fields
- Applies shared filters across all providers before returning the combined result set

## Provider included

- Auto Trader

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
/api/search?make=Mazda&model=Mazda3&postcode=BH1%204PZ&fuelType=Petrol&maxMileage=60000&maxPrice=11000&limit=12
```

## Notes

- The provider selectors are intentionally isolated in `src/scrapers/providers.js` so each marketplace can be updated independently when markup changes.
- Auto Trader may still block automation or rate-limit requests from shared cloud hosting.
- The Auto Trader scrape is time-boxed so one slow request does not hang the app.
- Production hosting should use the included Docker image because Playwright needs a bundled browser environment.
- The current build is an MVP and does not yet add caching, deduplication, pagination, or a database.
