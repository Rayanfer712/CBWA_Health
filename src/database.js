import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.DATABASE_PATH || resolve(__dirname, "../data/quotes.sqlite");

export function createDatabase(databasePathOverride = databasePath) {
  const parentDirectory = dirname(databasePathOverride);
  mkdirSync(parentDirectory, { recursive: true });
  const database = new Database(databasePathOverride);
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      cover_type TEXT NOT NULL,
      applicant_1_age TEXT NOT NULL,
      applicant_2_age TEXT,
      applicant_3_age TEXT,
      applicant_4_age TEXT,
      applicant_1_history TEXT,
      applicant_2_history TEXT,
      applicant_3_history TEXT,
      applicant_4_history TEXT,
      hospital_cover_level TEXT NOT NULL,
      extra_cover_level TEXT NOT NULL,
      payment_frequency TEXT NOT NULL,
      annual_discount_pct REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  return database;
}

export function getDatabase() {
  return createDatabase();
}
