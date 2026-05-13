import express from "express";
import cors from "cors";
import { listings, locations, adverts, enquiries } from "./sampleData.js";

const app = express();
const port = process.env.PORT || 4200;
const pendingListings = [];
const approvalEmails = [];

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

app.get("/api/admin/pending-listings", (_req, res) => {
  res.json(pendingListings);
});

app.get("/api/admin/approval-emails", (_req, res) => {
  res.json(approvalEmails);
});

app.post("/api/listings", (req, res) => {
  const created = {
    id: `pending-${Date.now()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  pendingListings.unshift(created);
  res.status(201).json(created);
});

app.post("/api/admin/listings/:id/approve", (req, res) => {
  const pending = pendingListings.find((item) => item.id === req.params.id);
  if (!pending) {
    res.status(404).json({ message: "Pending listing not found" });
    return;
  }

  const approved = {
    ...pending,
    id: `approved-${Date.now()}`,
    status: "active",
    approvedAt: new Date().toISOString(),
    badges: [...new Set([...(pending.badges ?? []), "NamRent Approved"])],
  };
  listings.unshift(approved);
  pendingListings.splice(pendingListings.indexOf(pending), 1);

  const email = {
    id: `email-${Date.now()}`,
    to: pending.ownerEmail ?? pending.contact?.email,
    subject: "Your NamRent listing has been approved",
    message: `${pending.title} has been approved and is now live on NamRent.`,
    createdAt: new Date().toISOString(),
  };
  approvalEmails.unshift(email);

  res.json({ approved, email });
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
