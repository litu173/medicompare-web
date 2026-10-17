import "server-only";
import { db } from "./db";

/**
 * Money saved on orders compared with the typical price of the same medicine: the median per-unit price of
 * every brand with the same generic, strength and form. A line costing less than typical counts as savings;
 * paying more never counts as negative. Cancelled orders are ignored.
 */
export function savingsFor(orderIds: number[]) {
  if (!orderIds.length) return { total: 0, orders: 0, items: 0, byOrder: {} as Record<string, number> };
  const rows = db
    .prepare(
      `SELECT o.code, i.unit_price * i.qty AS paid, m.compare_price AS own, m.equiv_key
       FROM order_items i JOIN orders o ON o.id = i.order_id JOIN medicines m ON m.id = i.medicine_id
       WHERE o.id IN (${orderIds.map(() => "?").join(",")}) AND o.status != 'cancelled' AND m.compare_price > 0`,
    )
    .all(...orderIds) as { code: string; paid: number; own: number; equiv_key: string }[];

  const typicalStmt = db.prepare(
    "SELECT compare_price AS p FROM medicines WHERE equiv_key = ? AND compare_price > 0 AND price_suspect = 0 ORDER BY compare_price",
  );
  const typical = new Map<string, number>();
  const median = (key: string) => {
    if (!typical.has(key)) {
      const ps = (typicalStmt.all(key) as { p: number }[]).map((r) => r.p);
      typical.set(key, ps.length ? ps[Math.floor(ps.length / 2)] : 0);
    }
    return typical.get(key)!;
  };

  const byOrder: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const t = median(r.equiv_key);
    const saved = t > r.own ? r.paid * (t / r.own - 1) : 0;
    byOrder[r.code] = Math.round(((byOrder[r.code] ?? 0) + saved) * 100) / 100;
    total += saved;
  }
  return { total: Math.round(total), orders: Object.keys(byOrder).length, items: rows.length, byOrder };
}

export function orderIdsFor(userId: number | null, guest: { code: string; phone: string }[]) {
  const ids = new Set<number>();
  if (userId) {
    for (const r of db.prepare("SELECT id FROM orders WHERE user_id = ?").all(userId) as { id: number }[])
      ids.add(r.id);
  }
  const byCode = db.prepare("SELECT id, phone FROM orders WHERE code = ?");
  const last11 = (p: string) => p.replace(/\D/g, "").slice(-11);
  for (const g of guest.slice(0, 50)) {
    const o = byCode.get(String(g.code).toUpperCase()) as { id: number; phone: string } | undefined;
    if (o && last11(o.phone) === last11(String(g.phone))) ids.add(o.id);
  }
  return [...ids];
}

/** Savings for whoever is browsing: their account orders plus guest orders remembered in this browser. */
export async function savingsForVisitor() {
  const { cookies } = await import("next/headers");
  const { getCurrentUser } = await import("./auth");
  const user = await getCurrentUser();
  const jar = await cookies();
  const codes = [
    ...(jar.get("mc_guest_orders")?.value ?? "").split(","),
    ...(jar.get("mc_tracked")?.value ?? "").split(","),
  ].filter(Boolean);
  const ids = new Set(orderIdsFor(user?.id ?? null, []));
  if (codes.length) {
    const rows = db
      .prepare(`SELECT id FROM orders WHERE code IN (${codes.map(() => "?").join(",")})`)
      .all(...codes) as { id: number }[];
    for (const r of rows) ids.add(r.id);
  }
  return savingsFor([...ids]);
}
