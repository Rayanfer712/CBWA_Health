import express from "express";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDatabase } from "./src/database.js";
import { validateQuotePayload } from "./src/quote-validation.js";
import { calculateQuotePremium } from "./src/quote-calculation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const database = createDatabase();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(resolve(__dirname, "public")));

app.get("/", (_request, response) => {
  response.sendFile(resolve(__dirname, "public/index.html"));
});

app.get("/api/quotes", (_request, response) => {
  const rows = database.prepare(`
    SELECT * FROM quotes ORDER BY updated_at DESC, id DESC
  `).all();
  response.json(rows.map((row) => serializeQuote(row)));
});

app.get("/api/quotes/:id", (request, response) => {
  const row = database.prepare("SELECT * FROM quotes WHERE id = ?").get(Number(request.params.id));
  if (!row) return response.status(404).json({ error: "Quote not found." });
  return response.json(serializeQuote(row));
});

app.post("/api/quotes", (request, response) => {
  const validation = validateQuotePayload(request.body);
  if (!validation.valid) return response.status(400).json({ error: "Invalid quote data.", errors: validation.errors });

  const data = validation.normalized;
  const result = database.prepare(`
    INSERT INTO quotes (
      customer_name, cover_type, applicant_1_age, applicant_2_age, applicant_3_age, applicant_4_age,
      applicant_1_history, applicant_2_history, applicant_3_history, applicant_4_history,
      hospital_cover_level, extra_cover_level, payment_frequency, annual_discount_pct, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.customerName,
    data.coverType,
    data.applicant1Age,
    data.applicant2Age,
    data.applicant3Age,
    data.applicant4Age,
    data.applicant1History,
    data.applicant2History,
    data.applicant3History,
    data.applicant4History,
    data.hospitalCoverLevel,
    data.extraCoverLevel,
    data.paymentFrequency,
    data.annualDiscountPct,
    data.notes,
    now(),
    now()
  );

  const quote = database.prepare("SELECT * FROM quotes WHERE id = ?").get(result.lastInsertRowid);
  return response.status(201).json(serializeQuote(quote));
});

app.put("/api/quotes/:id", (request, response) => {
  const validation = validateQuotePayload(request.body);
  if (!validation.valid) return response.status(400).json({ error: "Invalid quote data.", errors: validation.errors });

  const data = validation.normalized;
  const id = Number(request.params.id);
  const existing = database.prepare("SELECT * FROM quotes WHERE id = ?").get(id);
  if (!existing) return response.status(404).json({ error: "Quote not found." });

  database.prepare(`
    UPDATE quotes SET customer_name = ?, cover_type = ?, applicant_1_age = ?, applicant_2_age = ?, applicant_3_age = ?, applicant_4_age = ?,
      applicant_1_history = ?, applicant_2_history = ?, applicant_3_history = ?, applicant_4_history = ?,
      hospital_cover_level = ?, extra_cover_level = ?, payment_frequency = ?, annual_discount_pct = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    data.customerName,
    data.coverType,
    data.applicant1Age,
    data.applicant2Age,
    data.applicant3Age,
    data.applicant4Age,
    data.applicant1History,
    data.applicant2History,
    data.applicant3History,
    data.applicant4History,
    data.hospitalCoverLevel,
    data.extraCoverLevel,
    data.paymentFrequency,
    data.annualDiscountPct,
    data.notes,
    now(),
    id
  );

  const updated = database.prepare("SELECT * FROM quotes WHERE id = ?").get(id);
  return response.json(serializeQuote(updated));
});

app.delete("/api/quotes/:id", (request, response) => {
  const id = Number(request.params.id);
  const result = database.prepare("DELETE FROM quotes WHERE id = ?").run(id);
  if (result.changes === 0) return response.status(404).json({ error: "Quote not found." });
  return response.status(204).send();
});

app.get("/api/calculator/preview", (request, response) => {
  const validation = validateQuotePayload(request.query);
  if (!validation.valid) return response.status(400).json({ error: "Invalid quote data.", errors: validation.errors });
  const premium = calculateQuotePremium(validation.normalized);
  return response.json(premium);
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Unexpected server error." });
});

const server = app.listen(port, () => {
  console.log(`HealthCover Quote System running at http://localhost:${port}`);
});

function now() {
  return new Date().toISOString();
}

function serializeQuote(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    coverType: row.cover_type,
    applicant1Age: row.applicant_1_age,
    applicant2Age: row.applicant_2_age,
    applicant3Age: row.applicant_3_age,
    applicant4Age: row.applicant_4_age,
    applicant1History: row.applicant_1_history,
    applicant2History: row.applicant_2_history,
    applicant3History: row.applicant_3_history,
    applicant4History: row.applicant_4_history,
    hospitalCoverLevel: row.hospital_cover_level,
    extraCoverLevel: row.extra_cover_level,
    paymentFrequency: row.payment_frequency,
    annualDiscountPct: row.annual_discount_pct,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
