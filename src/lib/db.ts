import "server-only";
import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { APP_SCHEMA } from "./schema";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data/medicare.db");

declare global {
  var __medicareDb: Database.Database | undefined;
}

function open() {
  if (!fs.existsSync(/*turbopackIgnore: true*/ DB_PATH)) {
    throw new Error(`Database not found at ${DB_PATH}. Run "npm run db:import" first.`);
  }
  const db = new Database(/*turbopackIgnore: true*/ DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(APP_SCHEMA);
  return db;
}

// Reuse one connection across hot reloads in dev.
export const db: Database.Database = globalThis.__medicareDb ?? (globalThis.__medicareDb = open());
