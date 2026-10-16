import "server-only";
import { db } from "./db";
import { IMAGE_SQL } from "./catalog";
import { comparePrice, type PackPrice } from "./pricing";

export type StockReason = "order" | "cancel" | "restock" | "adjust" | "count";

/** Changes stock by `delta` units and records why. Never goes below zero. */
export function adjustStock(
  medicineId: number,
  delta: number,
  reason: StockReason,
  opts: { ref?: string | null; note?: string | null; userId?: number | null } = {},
) {
  if (!delta) return;
  db.prepare("INSERT OR IGNORE INTO inventory (medicine_id, stock) VALUES (?, 0)").run(medicineId);
  db.prepare("UPDATE inventory SET stock = MAX(0, stock + ?), updated_at = datetime('now') WHERE medicine_id = ?").run(
    delta,
    medicineId,
  );
  db.prepare("INSERT INTO stock_movements (medicine_id, delta, reason, ref, note, user_id) VALUES (?,?,?,?,?,?)").run(
    medicineId,
    delta,
    reason,
    opts.ref ?? null,
    opts.note ?? null,
    opts.userId ?? null,
  );
}

/** Sets stock to an exact counted value (e.g. after a shelf count). */
export function setStockCount(medicineId: number, count: number, userId: number, note?: string) {
  db.transaction(() => {
    const cur = db.prepare("SELECT stock FROM inventory WHERE medicine_id = ?").get(medicineId) as
      { stock: number } | undefined;
    adjustStock(medicineId, count - (cur?.stock ?? 0), "count", { userId, note: note || "Stock count" });
  })();
}

export function setLowStockAt(medicineId: number, value: number) {
  db.prepare("INSERT OR IGNORE INTO inventory (medicine_id, stock) VALUES (?, 0)").run(medicineId);
  db.prepare("UPDATE inventory SET low_stock_at = ? WHERE medicine_id = ?").run(Math.max(0, value), medicineId);
}

export function setImage(medicineId: number, file: string | null) {
  db.prepare("INSERT OR IGNORE INTO inventory (medicine_id, stock) VALUES (?, 0)").run(medicineId);
  const old = db.prepare("SELECT image FROM inventory WHERE medicine_id = ?").get(medicineId) as {
    image: string | null;
  };
  db.prepare("UPDATE inventory SET image = ?, updated_at = datetime('now') WHERE medicine_id = ?").run(
    file,
    medicineId,
  );
  return old?.image ?? null;
}

/** Updates a pack price (kept across catalog re-imports) and re-ranks the medicine. */
export function setPackPrice(packId: number, price: number) {
  db.transaction(() => {
    const pack = db.prepare("SELECT medicine_id FROM packs WHERE id = ?").get(packId) as
      { medicine_id: number } | undefined;
    if (!pack) return;
    db.prepare("UPDATE packs SET price = ? WHERE id = ?").run(price, packId);
    db.prepare(
      "INSERT INTO price_overrides (pack_id, price) VALUES (?, ?) ON CONFLICT(pack_id) DO UPDATE SET price = excluded.price, updated_at = datetime('now')",
    ).run(packId, price);
    const packs = db
      .prepare("SELECT label, qty, price FROM packs WHERE medicine_id = ? ORDER BY sort")
      .all(pack.medicine_id) as PackPrice[];
    const form = (
      db.prepare("SELECT dosage_form FROM medicines WHERE id = ?").get(pack.medicine_id) as {
        dosage_form: string;
      }
    ).dosage_form;
    const cmp = comparePrice(packs, form);
    // An admin-confirmed price is no longer an unverified outlier.
    db.prepare(
      "UPDATE medicines SET compare_price = ?, compare_unit = ?, list_price = ?, price_suspect = 0 WHERE id = ?",
    ).run(cmp?.value ?? null, cmp?.unit ?? null, packs[0]?.price ?? null, pack.medicine_id);
  })();
}

export type InventoryRow = {
  id: number;
  brand_name: string;
  strength: string | null;
  dosage_form: string;
  generic_name: string;
  manufacturer_name: string;
  stock: number;
  low_stock_at: number;
  image: string | null;
  list_price: number | null;
  list_label: string | null;
  reserved: number;
};

export type InventoryFilter = "all" | "low" | "out" | "nophoto" | "ordered";

/** Inventory list for admins. "ordered" = products in orders that still need packing. */
export function listInventory(opts: { q?: string; filter?: InventoryFilter; page?: number; size?: number }) {
  const where: string[] = ["m.list_price IS NOT NULL"];
  const args: unknown[] = [];
  if (opts.q?.trim()) {
    const like = `%${opts.q.trim()}%`;
    where.push("(m.brand_name LIKE ? OR m.generic_name LIKE ? OR f.name LIKE ?)");
    args.push(like, like, like);
  }
  if (opts.filter === "low")
    where.push("COALESCE(inv.stock,0) > 0 AND COALESCE(inv.stock,0) <= COALESCE(inv.low_stock_at,30)");
  if (opts.filter === "out") where.push("COALESCE(inv.stock,0) = 0");
  if (opts.filter === "nophoto") where.push("inv.image IS NULL");
  const size = opts.size ?? 30;
  const page = Math.max(1, opts.page ?? 1);
  const base = `FROM (
      SELECT m.*, f.name AS manufacturer_name, COALESCE(inv.stock,0) AS stock, COALESCE(inv.low_stock_at,30) AS low_stock_at,
             ${IMAGE_SQL} AS image,
             (SELECT COALESCE(SUM(i.qty * COALESCE(p.qty,1)),0) FROM order_items i JOIN orders o ON o.id = i.order_id
                LEFT JOIN packs p ON p.id = i.pack_id
                WHERE i.medicine_id = m.id AND o.status IN ('placed','confirmed')) AS reserved
      FROM medicines m JOIN manufacturers f ON f.id = m.manufacturer_id
      LEFT JOIN inventory inv ON inv.medicine_id = m.id
      WHERE ${where.join(" AND ")}
    ) x ${opts.filter === "ordered" ? "WHERE reserved > 0" : ""}`;
  const total = (db.prepare(`SELECT COUNT(*) AS n ${base}`).get(...args) as { n: number }).n;
  const order =
    opts.filter === "low" || opts.filter === "out"
      ? "stock ASC, brand_name"
      : opts.filter === "ordered"
        ? "reserved DESC"
        : "brand_name, strength_key";
  const rows = db
    .prepare(`SELECT * ${base} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .all(...args, size, (page - 1) * size) as InventoryRow[];
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / size)) };
}

export function inventoryStats() {
  return db
    .prepare(
      `SELECT
         SUM(CASE WHEN COALESCE(inv.stock,0) = 0 THEN 1 ELSE 0 END) AS out_of_stock,
         SUM(CASE WHEN COALESCE(inv.stock,0) > 0 AND inv.stock <= COALESCE(inv.low_stock_at,30) THEN 1 ELSE 0 END) AS low_stock,
         SUM(CASE WHEN inv.image IS NULL THEN 1 ELSE 0 END) AS no_photo,
         COUNT(*) AS products
       FROM medicines m LEFT JOIN inventory inv ON inv.medicine_id = m.id WHERE m.list_price IS NOT NULL`,
    )
    .get() as { out_of_stock: number; low_stock: number; no_photo: number; products: number };
}

export function getMovements(medicineId: number, limit = 30) {
  return db
    .prepare(
      `SELECT s.*, u.name AS user_name FROM stock_movements s LEFT JOIN users u ON u.id = s.user_id
       WHERE s.medicine_id = ? ORDER BY s.id DESC LIMIT ?`,
    )
    .all(medicineId, limit) as {
    id: number;
    delta: number;
    reason: string;
    ref: string | null;
    note: string | null;
    user_name: string | null;
    created_at: string;
  }[];
}

export function getInventoryRow(medicineId: number) {
  return db.prepare("SELECT * FROM inventory WHERE medicine_id = ?").get(medicineId) as
    { medicine_id: number; stock: number; low_stock_at: number; image: string | null; updated_at: string } | undefined;
}
