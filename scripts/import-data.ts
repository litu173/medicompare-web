/**
 * Builds data/medicare.db from the open-source Bangladesh medicine dataset in data/raw.
 * Catalog tables are rebuilt every run; user/order tables are preserved.
 *
 *   npm run db:import
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { parse } from "csv-parse/sync";
import { CATALOG_SCHEMA, migrate } from "../src/lib/schema";
import { comparePrice, unitNoun, type PackPrice } from "../src/lib/pricing";

const ROOT = path.resolve(__dirname, "..");
const RAW = path.join(ROOT, "data/raw");
const DB_PATH = path.join(ROOT, "data/medicare.db");

type Row = Record<string, string>;
const readCsv = (file: string): Row[] =>
  parse(fs.readFileSync(path.join(RAW, file)), { columns: true, skip_empty_lines: true, relax_quotes: true });

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** MedEx monographs are HTML; store readable plain text only. */
function htmlToText(html?: string): string | null {
  if (!html) return null;
  const text = html
    .replace(/<\s*(br|\/p|\/li|\/div|\/h\d)[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
  return text || null;
}

const SEGMENT = /([^:,()]+?):\s*৳\s*([\d,]+(?:\.\d+)?)(?:\s*,?\s*\((\d+)'s pack:\s*৳\s*([\d,]+(?:\.\d+)?)\))?/g;
const num = (s: string) => Number(s.replace(/,/g, ""));

/** Parses strings like "Unit Price: ৳ 15.00,(30's pack: ৳ 450.00)," or "100 ml bottle: ৳ 40.12" into packs. */
function parsePacks(text: string, form: string): PackPrice[] {
  const packs: PackPrice[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(SEGMENT)) {
    const label = m[1].trim();
    const price = num(m[2]);
    if (!(price > 0)) continue;
    const packQty = m[3] ? Number(m[3]) : null;
    const packPrice = m[4] ? num(m[4]) : null;
    const key = `${label}|${price}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (/^unit price$/i.test(label)) {
      const noun = unitNoun(form);
      packs.push({ label: `1 ${noun}`, qty: 1, price });
      if (packQty && packPrice) packs.push({ label: `Box of ${packQty} ${noun}s`, qty: packQty, price: packPrice });
    } else {
      // "100's blister", "1000's tin", "30 tablet pack" hold several pieces.
      const count = label.match(/^(\d+)(?:'s\b|\s+(?:tablet|capsule)s?\b)/i);
      packs.push({ label, qty: count && Number(count[1]) > 1 ? Number(count[1]) : 1, price });
      if (packQty && packPrice) packs.push({ label: `Pack of ${packQty} × ${label}`, qty: packQty, price: packPrice });
    }
  }
  return packs;
}

const formGroup = (form: string) => form.replace(/\s*\((Film|Sugar) Coated\)/i, "").trim();
const strengthKey = (s: string) => s.toLowerCase().replace(/\s+/g, "");

/** Deterministic demo inventory (~8% out of stock) until a real inventory feed exists. */
function demoStock(id: number) {
  const h = (id * 2654435761) % 4294967296;
  return h % 100 < 8 ? 0 : 50 + (h % 1950);
}

function main() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`DROP TABLE IF EXISTS medicines_fts; DROP TABLE IF EXISTS packs; DROP TABLE IF EXISTS medicines;
           DROP TABLE IF EXISTS generics; DROP TABLE IF EXISTS manufacturers;`);
  db.exec(CATALOG_SCHEMA);
  migrate(db);

  const manufacturers = readCsv("manufacturer.csv");
  const generics = readCsv("generic.csv");
  const medicines = readCsv("medicine.csv");

  const mfrByName = new Map<string, number>();
  const genByName = new Map<string, number>();

  db.transaction(() => {
    const insM = db.prepare("INSERT INTO manufacturers (id,name,slug) VALUES (?,?,?)");
    for (const m of manufacturers) {
      const id = Number(m["manufacturer id"]);
      insM.run(id, m["manufacturer name"], `${slugify(m["manufacturer name"])}-${id}`);
      mfrByName.set(m["manufacturer name"], id);
    }

    const insG =
      db.prepare(`INSERT INTO generics (id,name,slug,drug_class,indication,indication_desc,pharmacology,dosage,
      administration,interaction,contraindications,side_effects,pregnancy,precautions,pediatric,overdose,storage)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const g of generics) {
      const id = Number(g["generic id"]);
      insG.run(
        id,
        g["generic name"],
        `${slugify(g["generic name"])}-${id}`,
        g["drug class"] || null,
        g["indication"] || null,
        htmlToText(g["indication description"]),
        htmlToText(g["pharmacology description"]),
        htmlToText(g["dosage description"]),
        htmlToText(g["administration description"]),
        htmlToText(g["interaction description"]),
        htmlToText(g["contraindications description"]),
        htmlToText(g["side effects description"]),
        htmlToText(g["pregnancy and lactation description"]),
        htmlToText(g["precautions description"]),
        htmlToText(g["pediatric usage description"]),
        htmlToText(g["overdose effects description"]),
        htmlToText(g["storage conditions description"]),
      );
      genByName.set(g["generic name"].toLowerCase(), id);
    }

    const insMed =
      db.prepare(`INSERT INTO medicines (id,brand_name,type,dosage_form,form_group,generic_id,generic_name,strength,
      strength_key,manufacturer_id,equiv_key,compare_price,compare_unit,list_price,list_label,price_text)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    // Stable ids (medicine id * 10 + position) so carts and order history survive re-imports.
    const insPack = db.prepare("INSERT INTO packs (id,medicine_id,label,qty,price,sort) VALUES (?,?,?,?,?,?)");
    // Demo stock only for medicines that have no inventory row yet; real counts are never overwritten.
    const seedStock = db.prepare("INSERT OR IGNORE INTO inventory (medicine_id, stock) VALUES (?, ?)");
    const insFts = db.prepare(
      "INSERT INTO medicines_fts (rowid,brand_name,generic_name,manufacturer) VALUES (?,?,?,?)",
    );

    let priced = 0;
    for (const r of medicines) {
      const id = Number(r["brand id"]);
      const form = r["dosage form"].trim();
      const generic = r["generic"].trim();
      const strength = (r["strength"] || "").trim();
      const fg = formGroup(form);
      const sk = strengthKey(strength);
      const packs = parsePacks(r["package container"] || "", form).slice(0, 10);
      const cmp = comparePrice(packs, form);
      if (packs.length) priced++;
      const first = packs[0];
      const mfrId = mfrByName.get(r["manufacturer"])!;
      insMed.run(
        id,
        r["brand name"].trim(),
        r["type"],
        form,
        fg,
        genByName.get(generic.toLowerCase()) ?? null,
        generic,
        strength || null,
        sk,
        mfrId,
        `${generic.toLowerCase()}|${sk}|${fg.toLowerCase()}`,
        cmp?.value ?? null,
        cmp?.unit ?? null,
        first?.price ?? null,
        first?.label ?? null,
        r["package container"] || null,
      );
      if (packs.length) seedStock.run(id, demoStock(id));
      packs.forEach((p, i) => insPack.run(id * 10 + i, id, p.label, p.qty, p.price, i));
      insFts.run(id, r["brand name"], generic, r["manufacturer"]);
    }

    // Flag prices wildly off the median of their equivalence group (data-entry errors in the source).
    const groups = db
      .prepare(
        "SELECT equiv_key, GROUP_CONCAT(compare_price) AS prices FROM medicines WHERE compare_price > 0 GROUP BY equiv_key HAVING COUNT(*) >= 5",
      )
      .all() as { equiv_key: string; prices: string }[];
    const flag = db.prepare(
      "UPDATE medicines SET price_suspect = 1 WHERE equiv_key = ? AND (compare_price < ? OR compare_price > ?)",
    );
    let flagged = 0;
    for (const g of groups) {
      const sorted = g.prices
        .split(",")
        .map(Number)
        .sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      flagged += flag.run(g.equiv_key, median / 4, median * 4).changes;
    }
    console.log(`Flagged ${flagged} outlier prices for review.`);

    // Re-apply admin price edits on top of the fresh catalog.
    const overrides = db.prepare("SELECT pack_id, price FROM price_overrides").all() as {
      pack_id: number;
      price: number;
    }[];
    const setPack = db.prepare("UPDATE packs SET price = ? WHERE id = ?");
    for (const o of overrides) setPack.run(o.price, o.pack_id);
    const touched = new Set(overrides.map((o) => Math.floor(o.pack_id / 10)));
    const medPacks = db.prepare("SELECT label, qty, price, sort FROM packs WHERE medicine_id = ? ORDER BY sort");
    const medForm = db.prepare("SELECT dosage_form FROM medicines WHERE id = ?");
    const setMed = db.prepare("UPDATE medicines SET compare_price = ?, compare_unit = ?, list_price = ? WHERE id = ?");
    for (const id of touched) {
      const ps = medPacks.all(id) as PackPrice[];
      const row = medForm.get(id) as { dosage_form: string } | undefined;
      if (!row || !ps.length) continue;
      const cmp = comparePrice(ps, row.dosage_form);
      setMed.run(cmp?.value ?? null, cmp?.unit ?? null, ps[0].price, id);
    }
    if (overrides.length) console.log(`Re-applied ${overrides.length} admin price edits.`);

    db.exec(`
      UPDATE manufacturers SET
        brand_count = (SELECT COUNT(*) FROM medicines m WHERE m.manufacturer_id = manufacturers.id),
        generic_count = (SELECT COUNT(DISTINCT generic_name) FROM medicines m WHERE m.manufacturer_id = manufacturers.id);
      UPDATE generics SET brand_count = (SELECT COUNT(*) FROM medicines m WHERE m.generic_id = generics.id);
    `);
    console.log(
      `Imported ${manufacturers.length} manufacturers, ${generics.length} generics, ${medicines.length} medicines (${priced} priced).`,
    );
  })();

  db.exec("INSERT INTO medicines_fts(medicines_fts) VALUES('optimize'); ANALYZE;");
  db.close();
  console.log(`Database written to ${path.relative(process.cwd(), DB_PATH)}`);
}

main();
