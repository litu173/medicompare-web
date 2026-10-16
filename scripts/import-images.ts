/**
 * Bulk-attaches product photos. Name each file after the medicine (brand) id, e.g. 10452.jpg,
 * so every photo is linked to exactly one product:
 *
 *   npm run images:import -- /path/to/photos
 *
 * The id is shown on each product's admin inventory page and in its URL (/medicine/10452).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { migrate } from "../src/lib/schema";

const ROOT = path.resolve(__dirname, "..");
const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) {
  console.error("Usage: npm run images:import -- <folder of <medicineId>.jpg|png|webp files>");
  process.exit(1);
}
const OUT = path.join(ROOT, "data/uploads/products");
fs.mkdirSync(OUT, { recursive: true });

const db = new Database(path.join(ROOT, "data/medicare.db"));
migrate(db);
const exists = db.prepare("SELECT 1 FROM medicines WHERE id = ?");
const old = db.prepare("SELECT image FROM inventory WHERE medicine_id = ?");
const ensure = db.prepare("INSERT OR IGNORE INTO inventory (medicine_id, stock) VALUES (?, 0)");
const set = db.prepare("UPDATE inventory SET image = ?, updated_at = datetime('now') WHERE medicine_id = ?");

let ok = 0;
const skipped: string[] = [];
for (const f of fs.readdirSync(dir)) {
  const m = f.match(/^(\d+)\.(jpe?g|png|webp)$/i);
  if (!m || !exists.get(Number(m[1]))) {
    skipped.push(f);
    continue;
  }
  const id = Number(m[1]);
  const ext = m[2].toLowerCase() === "jpeg" ? "jpg" : m[2].toLowerCase();
  const name = `${id}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  fs.copyFileSync(path.join(dir, f), path.join(OUT, name));
  ensure.run(id);
  const prev = (old.get(id) as { image: string | null } | undefined)?.image;
  set.run(name, id);
  if (prev) fs.rmSync(path.join(OUT, prev), { force: true });
  ok++;
}
console.log(
  `Attached ${ok} photos.${skipped.length ? ` Skipped ${skipped.length}: ${skipped.slice(0, 10).join(", ")}` : ""}`,
);
