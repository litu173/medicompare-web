/**
 * Creates (or resets the password of) an admin account.
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run db:admin
 * Values are read from the environment or .env.local.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { APP_SCHEMA } from "../src/lib/schema";

const ROOT = path.resolve(__dirname, "..");
const envFile = path.join(ROOT, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const email = process.env.ADMIN_EMAIL?.toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 8) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) in the environment or .env.local");
  process.exit(1);
}

const db = new Database(path.join(ROOT, "data/medicare.db"));
db.exec(APP_SCHEMA);
const hash = bcrypt.hashSync(password, 10);
const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number } | undefined;
if (existing) {
  db.prepare("UPDATE users SET password_hash = ?, role = 'admin' WHERE id = ?").run(hash, existing.id);
} else {
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Admin', ?, ?, 'admin')").run(email, hash);
}
console.log(`Admin ready: ${email}`);
