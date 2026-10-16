import "server-only";
import { db } from "./db";

export type MedicineRow = {
  id: number;
  brand_name: string;
  type: string;
  dosage_form: string;
  form_group: string;
  generic_id: number | null;
  generic_name: string;
  generic_slug: string | null;
  strength: string | null;
  strength_key: string;
  manufacturer_id: number;
  manufacturer_name: string;
  manufacturer_slug: string;
  equiv_key: string;
  compare_price: number | null;
  compare_unit: string | null;
  list_price: number | null;
  list_label: string | null;
  stock: number;
  price_suspect: number;
  pack_id: number | null;
  /** Product photo URL, or null when no photo has been uploaded yet. */
  image: string | null;
};

/** SQL expression for a product photo URL from the inventory table aliased `inv`. */
export const IMAGE_SQL = "CASE WHEN inv.image IS NOT NULL THEN '/media/products/' || inv.image END";

export type Pack = { id: number; medicine_id: number; label: string; qty: number; price: number };

const MED_SELECT = `
  SELECT m.*, g.slug AS generic_slug, f.name AS manufacturer_name, f.slug AS manufacturer_slug,
         (SELECT p.id FROM packs p WHERE p.medicine_id = m.id ORDER BY p.sort LIMIT 1) AS pack_id,
         COALESCE(inv.stock, 0) AS stock, ${IMAGE_SQL} AS image
  FROM medicines m
  JOIN manufacturers f ON f.id = m.manufacturer_id
  LEFT JOIN generics g ON g.id = m.generic_id
  LEFT JOIN inventory inv ON inv.medicine_id = m.id`;

// Unpriced items go last; in-stock before out-of-stock at the same price.
const PRICE_ORDER = "m.compare_price IS NULL, m.compare_price, COALESCE(inv.stock, 0) = 0, m.brand_name";

/** Turns free text into a safe FTS5 prefix query: "napa ext" -> "napa"* "ext"* */
export function toFtsQuery(q: string) {
  const tokens = q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return tokens
    .slice(0, 8)
    .map((t) => `"${t}"*`)
    .join(" ");
}

export function getMedicine(id: number): MedicineRow | undefined {
  return db.prepare(`${MED_SELECT} WHERE m.id = ?`).get(id) as MedicineRow | undefined;
}

export function getPacks(medicineId: number): Pack[] {
  return db.prepare("SELECT * FROM packs WHERE medicine_id = ? ORDER BY sort").all(medicineId) as Pack[];
}

export function getPacksByIds(ids: number[]) {
  if (!ids.length) return [];
  return db
    .prepare(
      `SELECT p.id AS pack_id, p.label, p.qty, p.price, m.id AS medicine_id, m.brand_name, m.strength, m.dosage_form,
              m.generic_name, COALESCE(inv.stock, 0) AS stock, f.name AS manufacturer_name, ${IMAGE_SQL} AS image
       FROM packs p JOIN medicines m ON m.id = p.medicine_id JOIN manufacturers f ON f.id = m.manufacturer_id
       LEFT JOIN inventory inv ON inv.medicine_id = m.id
       WHERE p.id IN (${ids.map(() => "?").join(",")})`,
    )
    .all(...ids) as {
    pack_id: number;
    label: string;
    qty: number;
    price: number;
    medicine_id: number;
    brand_name: string;
    strength: string | null;
    dosage_form: string;
    generic_name: string;
    stock: number;
    manufacturer_name: string;
    image: string | null;
  }[];
}

/** All substitutable products (same generic, strength and form), cheapest first. */
export function getEquivalents(equivKey: string): MedicineRow[] {
  return db.prepare(`${MED_SELECT} WHERE m.equiv_key = ? ORDER BY ${PRICE_ORDER}`).all(equivKey) as MedicineRow[];
}

/** Other strengths / forms of the same generic, for quick switching. */
export function getVariants(genericName: string, excludeKey: string) {
  return db
    .prepare(
      `SELECT equiv_key, strength, form_group, COUNT(*) AS brands, MIN(compare_price) AS min_price,
              MIN(compare_unit) AS unit, MIN(id) AS any_id
       FROM medicines WHERE generic_name = ? AND equiv_key != ?
       GROUP BY equiv_key ORDER BY form_group, min_price LIMIT 30`,
    )
    .all(genericName, excludeKey) as {
    equiv_key: string;
    strength: string | null;
    form_group: string;
    brands: number;
    min_price: number | null;
    unit: string | null;
    any_id: number;
  }[];
}

export type SearchGroup = {
  equivKey: string;
  genericName: string;
  genericSlug: string | null;
  strength: string | null;
  form: string;
  total: number;
  minPrice: number | null;
  maxPrice: number | null;
  unit: string | null;
  items: MedicineRow[];
  matchedIds: number[];
};

export function search(q: string, opts: { form?: string; limit?: number } = {}) {
  const fts = toFtsQuery(q);
  if (!fts) return { groups: [] as SearchGroup[], generics: [], forms: [] as { form: string; n: number }[] };

  // 1. Text match on brand / generic / company name, best first.
  const hits = db
    .prepare(
      `SELECT rowid AS id FROM medicines_fts WHERE medicines_fts MATCH ? ORDER BY bm25(medicines_fts, 10.0, 5.0, 1.0) LIMIT 400`,
    )
    .all(fts) as { id: number }[];
  if (!hits.length) return { groups: [], generics: [], forms: [] };

  const rank = new Map(hits.map((h, i) => [h.id, i]));
  const ids = hits.map((h) => h.id);
  const ph = ids.map(() => "?").join(",");

  // 2. Expand each hit to its whole equivalence group so cheaper alternatives always show up.
  const keyRows = db.prepare(`SELECT id, equiv_key, form_group FROM medicines WHERE id IN (${ph})`).all(...ids) as {
    id: number;
    equiv_key: string;
    form_group: string;
  }[];

  const formCounts = new Map<string, number>();
  const keyRank = new Map<string, { rank: number; matched: number[] }>();
  for (const r of keyRows) {
    formCounts.set(r.form_group, (formCounts.get(r.form_group) ?? 0) + 1);
    if (opts.form && r.form_group !== opts.form) continue;
    const cur = keyRank.get(r.equiv_key) ?? { rank: Infinity, matched: [] };
    cur.rank = Math.min(cur.rank, rank.get(r.id)!);
    cur.matched.push(r.id);
    keyRank.set(r.equiv_key, cur);
  }

  const keys = [...keyRank.entries()].sort((a, b) => a[1].rank - b[1].rank).slice(0, opts.limit ?? 25);
  const stmt = db.prepare(`${MED_SELECT} WHERE m.equiv_key = ? ORDER BY ${PRICE_ORDER}`);
  const groups: SearchGroup[] = keys.map(([key, info]) => {
    const items = stmt.all(key) as MedicineRow[];
    const priced = items.filter((i) => i.compare_price !== null && !i.price_suspect);
    const first = items[0];
    return {
      equivKey: key,
      genericName: first.generic_name,
      genericSlug: first.generic_slug,
      strength: first.strength,
      form: first.form_group,
      total: items.length,
      minPrice: priced[0]?.compare_price ?? null,
      maxPrice: priced.at(-1)?.compare_price ?? null,
      unit: priced[0]?.compare_unit ?? null,
      items,
      matchedIds: info.matched,
    };
  });

  const generics = db
    .prepare(
      `SELECT DISTINCT g.id, g.name, g.slug, g.brand_count FROM medicines m JOIN generics g ON g.id = m.generic_id
       WHERE m.id IN (${ph}) ORDER BY g.brand_count DESC LIMIT 6`,
    )
    .all(...ids) as { id: number; name: string; slug: string; brand_count: number }[];

  const forms = [...formCounts.entries()]
    .map(([form, n]) => ({ form, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10);
  return { groups, generics, forms };
}

/** Lightweight typeahead: brands and generics. */
export function suggest(q: string) {
  const fts = toFtsQuery(q);
  if (!fts) return { brands: [], generics: [] };
  const brands = db
    .prepare(
      `SELECT m.id, m.brand_name, m.strength, m.dosage_form, m.generic_name, m.list_price, m.list_label,
              ${IMAGE_SQL} AS image
       FROM medicines_fts JOIN medicines m ON m.id = medicines_fts.rowid
       LEFT JOIN inventory inv ON inv.medicine_id = m.id
       WHERE medicines_fts MATCH ? ORDER BY bm25(medicines_fts, 10.0, 5.0, 1.0) LIMIT 6`,
    )
    .all(`{brand_name}: ${fts}`);
  const like = q.trim().toLowerCase() + "%";
  const generics = db
    .prepare(
      `SELECT id, name, slug, brand_count FROM generics WHERE lower(name) LIKE ? AND brand_count > 0
       ORDER BY brand_count DESC LIMIT 4`,
    )
    .all(like);
  return { brands, generics };
}

export type Generic = {
  id: number;
  name: string;
  slug: string;
  drug_class: string | null;
  indication: string | null;
  indication_desc: string | null;
  pharmacology: string | null;
  dosage: string | null;
  administration: string | null;
  interaction: string | null;
  contraindications: string | null;
  side_effects: string | null;
  pregnancy: string | null;
  precautions: string | null;
  pediatric: string | null;
  overdose: string | null;
  storage: string | null;
  brand_count: number;
};

export function getGeneric(slug: string) {
  return db.prepare("SELECT * FROM generics WHERE slug = ?").get(slug) as Generic | undefined;
}

export function getGenericById(id: number) {
  return db.prepare("SELECT * FROM generics WHERE id = ?").get(id) as Generic | undefined;
}

/** Every product of a generic grouped by strength + form, each group cheapest first. */
export function getGenericGroups(genericId: number) {
  const rows = db
    .prepare(`${MED_SELECT} WHERE m.generic_id = ? ORDER BY m.form_group, m.strength_key, ${PRICE_ORDER}`)
    .all(genericId) as MedicineRow[];
  const groups = new Map<string, MedicineRow[]>();
  for (const r of rows) {
    if (!groups.has(r.equiv_key)) groups.set(r.equiv_key, []);
    groups.get(r.equiv_key)!.push(r);
  }
  return [...groups.values()].sort((a, b) => b.length - a.length);
}

export function getManufacturer(slug: string) {
  return db.prepare("SELECT * FROM manufacturers WHERE slug = ?").get(slug) as
    { id: number; name: string; slug: string; brand_count: number; generic_count: number } | undefined;
}

export function getManufacturers() {
  return db.prepare("SELECT * FROM manufacturers WHERE brand_count > 0 ORDER BY brand_count DESC").all() as {
    id: number;
    name: string;
    slug: string;
    brand_count: number;
    generic_count: number;
  }[];
}

export function getManufacturerMedicines(id: number, page: number, size = 40) {
  const items = db
    .prepare(`${MED_SELECT} WHERE m.manufacturer_id = ? ORDER BY m.brand_name, m.strength_key LIMIT ? OFFSET ?`)
    .all(id, size, (page - 1) * size) as MedicineRow[];
  // How many cheaper equivalents exist for each product (the company-overpricing signal).
  const cheaper = db.prepare(
    "SELECT COUNT(*) AS n FROM medicines WHERE equiv_key = ? AND compare_price < ? AND manufacturer_id != ? AND price_suspect = 0",
  );
  return items.map((m) => ({
    ...m,
    cheaperCount: m.compare_price === null ? 0 : (cheaper.get(m.equiv_key, m.compare_price, id) as { n: number }).n,
  }));
}

export function getStats() {
  return db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM medicines) AS medicines, (SELECT COUNT(*) FROM generics WHERE brand_count > 0) AS generics,
              (SELECT COUNT(*) FROM manufacturers WHERE brand_count > 0) AS companies`,
    )
    .get() as { medicines: number; generics: number; companies: number };
}

/** Commonly bought groups where the price gap between brands is largest. */
export function getBiggestGaps(limit = 6) {
  return db
    .prepare(
      `SELECT equiv_key, generic_name, strength, form_group, COUNT(*) AS brands,
              MIN(compare_price) AS min_price, MAX(compare_price) AS max_price, MIN(compare_unit) AS unit,
              (SELECT id FROM medicines x WHERE x.equiv_key = m.equiv_key AND x.price_suspect = 0 ORDER BY compare_price DESC LIMIT 1) AS top_id
       FROM medicines m WHERE compare_price > 0 AND price_suspect = 0 AND form_group IN ('Tablet','Capsule')
       GROUP BY equiv_key HAVING brands >= 15
       ORDER BY (MAX(compare_price) - MIN(compare_price)) / MAX(compare_price) * brands DESC LIMIT ?`,
    )
    .all(limit) as {
    equiv_key: string;
    generic_name: string;
    strength: string | null;
    form_group: string;
    brands: number;
    min_price: number;
    max_price: number;
    unit: string;
    top_id: number;
  }[];
}

export const POPULAR_SEARCHES = [
  "Paracetamol",
  "Omeprazole",
  "Esomeprazole",
  "Metformin",
  "Amlodipine",
  "Cetirizine",
  "Montelukast",
  "Azithromycin",
  "Losartan",
  "Fexofenadine",
  "Pantoprazole",
  "Rosuvastatin",
];
