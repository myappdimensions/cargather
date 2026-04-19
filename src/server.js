import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { searchListings } from "./scrapers/index.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

app.use(express.json());
app.use(express.static(publicDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/search", async (req, res) => {
  try {
    const filters = {
      make: req.query.make ?? "",
      model: req.query.model ?? "",
      postcode: req.query.postcode ?? "",
      minYear: req.query.minYear ? Number(req.query.minYear) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      maxMileage: req.query.maxMileage ? Number(req.query.maxMileage) : undefined,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      fuelType: req.query.fuelType ?? "",
      transmission: req.query.transmission ?? "",
      limit: req.query.limit ? Number(req.query.limit) : 20
    };

    const results = await searchListings(filters);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      error: "Search failed",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, host, () => {
  console.log(`CarGather running on http://${host}:${port}`);
});
