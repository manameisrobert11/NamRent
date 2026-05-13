import express from "express";
import cors from "cors";
import { listings, locations, adverts, enquiries } from "./sampleData.js";

const app = express();
const port = process.env.PORT || 4200;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "NamRent API" });
});

app.get("/api/listings", (req, res) => {
  const { location, type, category, minPrice, maxPrice, q } = req.query;
  let results = [...listings];

  if (location) {
    results = results.filter((item) => item.location.toLowerCase() === String(location).toLowerCase());
  }
  if (type) {
    results = results.filter((item) => item.propertyType.toLowerCase() === String(type).toLowerCase());
  }
  if (category) {
    results = results.filter((item) => item.category.toLowerCase().includes(String(category).toLowerCase()));
  }
  if (minPrice) {
    results = results.filter((item) => item.price >= Number(minPrice));
  }
  if (maxPrice) {
    results = results.filter((item) => item.price <= Number(maxPrice));
  }
  if (q) {
    const needle = String(q).toLowerCase();
    results = results.filter((item) =>
      [item.title, item.description, item.location, item.propertyType, item.category].some((field) =>
        field.toLowerCase().includes(needle),
      ),
    );
  }

  res.json(results);
});

app.get("/api/listings/:id", (req, res) => {
  const listing = listings.find((item) => item.id === req.params.id);
  if (!listing) {
    res.status(404).json({ message: "Listing not found" });
    return;
  }
  res.json(listing);
});

app.get("/api/locations", (_req, res) => {
  res.json(locations);
});

app.get("/api/adverts", (_req, res) => {
  res.json(adverts);
});

app.post("/api/listings", (req, res) => {
  const created = {
    id: `pending-${Date.now()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  res.status(201).json(created);
});

app.post("/api/enquiries", (req, res) => {
  const enquiry = {
    id: `enquiry-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  enquiries.push(enquiry);
  res.status(201).json(enquiry);
});

app.listen(port, () => {
  console.log(`NamRent API running on http://127.0.0.1:${port}`);
});
