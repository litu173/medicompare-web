import "server-only";
import crypto from "node:crypto";
import { db } from "./db";
import { getPacksByIds, IMAGE_SQL } from "./catalog";
import { deliveryFeeFor, getSettings } from "./settings";
import { adjustStock } from "./inventory";

export type CartLine = { packId: number; qty: number };

export type QuoteLine = {
  packId: number;
  medicineId: number;
  brandName: string;
  description: string;
  packLabel: string;
  unitsPerPack: number;
  price: number;
  qty: number;
  lineTotal: number;
  available: boolean;
  maxQty: number;
  image: string | null;
  /** Cheapest in-stock equivalent brand, if it is cheaper than this one. */
  cheaper: {
    medicineId: number;
    brandName: string;
    manufacturer: string;
    savePct: number;
    /** The cheaper brand's default pack, so apps can switch in one tap. */
    packId: number | null;
    packLabel: string | null;
    price: number | null;
    unitsPerPack: number | null;
  } | null;
};

/** Re-prices a cart from the database. Client-side prices are never trusted. */
export function quote(lines: CartLine[], district?: string) {
  const merged = new Map<number, number>();
  for (const l of lines) {
    const qty = Math.max(0, Math.min(99, Math.floor(l.qty)));
    if (qty > 0) merged.set(l.packId, (merged.get(l.packId) ?? 0) + qty);
  }
  const rows = getPacksByIds([...merged.keys()]);
  const cheaperStmt = db.prepare(
    `SELECT c.id, c.brand_name, f.name AS manufacturer, c.compare_price, m.compare_price AS own,
            cp.id AS pack_id, cp.label AS pack_label, cp.price AS pack_price, cp.qty AS pack_qty
     FROM medicines m JOIN medicines c ON c.equiv_key = m.equiv_key AND c.id != m.id
     LEFT JOIN packs cp ON cp.medicine_id = c.id AND cp.sort = 0
     JOIN manufacturers f ON f.id = c.manufacturer_id
     JOIN inventory inv ON inv.medicine_id = c.id
     WHERE m.id = ? AND inv.stock > 0 AND c.price_suspect = 0 AND c.compare_price < m.compare_price
     ORDER BY c.compare_price LIMIT 1`,
  );
  const items: QuoteLine[] = rows.map((r) => {
    const c = cheaperStmt.get(r.medicine_id) as
      | {
          id: number;
          brand_name: string;
          manufacturer: string;
          compare_price: number;
          own: number;
          pack_id: number | null;
          pack_label: string | null;
          pack_price: number | null;
          pack_qty: number | null;
        }
      | undefined;
    const qty = merged.get(r.pack_id)!;
    const maxQty = Math.floor(r.stock / r.qty);
    return {
      packId: r.pack_id,
      medicineId: r.medicine_id,
      brandName: r.brand_name,
      description: [r.strength, r.dosage_form, r.generic_name].filter(Boolean).join(" · "),
      packLabel: r.label,
      unitsPerPack: r.qty,
      price: r.price,
      qty,
      lineTotal: Math.round(r.price * qty * 100) / 100,
      available: maxQty >= qty,
      maxQty,
      image: r.image,
      cheaper: c
        ? {
            medicineId: c.id,
            brandName: c.brand_name,
            manufacturer: c.manufacturer,
            savePct: Math.round(((c.own - c.compare_price) / c.own) * 100),
            packId: c.pack_id,
            packLabel: c.pack_label,
            price: c.pack_price,
            unitsPerPack: c.pack_qty,
          }
        : null,
    };
  });
  const settings = getSettings();
  const subtotal = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
  const fee = items.length ? deliveryFeeFor(district ?? "Dhaka", subtotal, settings) : 0;
  return {
    items,
    subtotal,
    deliveryFee: fee,
    total: subtotal + fee,
    freeOver: settings.freeDeliveryOver,
    allAvailable: items.length === merged.size && items.every((i) => i.available),
  };
}

export type OrderInput = {
  userId: number | null;
  guestEmail: string | null;
  name: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  line: string;
  note: string | null;
  prescriptionFile: string | null;
  paymentMethod: string;
  lines: CartLine[];
};

export class OrderError extends Error {}

function addEvent(orderId: number, status: string, note: string | null, actor: string | null) {
  db.prepare("INSERT INTO order_events (order_id, status, note, actor) VALUES (?,?,?,?)").run(
    orderId,
    status,
    note,
    actor,
  );
}

export function placeOrder(input: OrderInput) {
  return db.transaction(() => {
    const q = quote(input.lines, input.district);
    if (!q.items.length) throw new OrderError("Your cart is empty.");
    const short = q.items.filter((i) => !i.available);
    if (short.length) {
      throw new OrderError(
        `Not enough stock for ${short.map((s) => s.brandName).join(", ")}. Please adjust quantity or pick an alternative.`,
      );
    }
    const code = "MC" + crypto.randomBytes(5).toString("hex").toUpperCase();
    const res = db
      .prepare(
        `INSERT INTO orders (code,user_id,guest_email,name,phone,division,district,area,line,note,prescription_file,
           payment_method,subtotal,delivery_fee,total,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`,
      )
      .run(
        code,
        input.userId,
        input.guestEmail,
        input.name,
        input.phone,
        input.division,
        input.district,
        input.area,
        input.line,
        input.note,
        input.prescriptionFile,
        input.paymentMethod,
        q.subtotal,
        q.deliveryFee,
        q.total,
      );
    const orderId = Number(res.lastInsertRowid);
    const insItem = db.prepare(
      `INSERT INTO order_items (order_id,medicine_id,pack_id,brand_name,description,pack_label,unit_price,qty)
       VALUES (?,?,?,?,?,?,?,?)`,
    );
    for (const i of q.items) {
      insItem.run(orderId, i.medicineId, i.packId, i.brandName, i.description, i.packLabel, i.price, i.qty);
      // Stock is reserved when the order is placed so two customers can't buy the last strip.
      adjustStock(i.medicineId, -i.qty * i.unitsPerPack, "order", { ref: code });
    }
    addEvent(orderId, "placed", null, "customer");
    return { code, total: q.total };
  })();
}

export type Order = {
  id: number;
  code: string;
  user_id: number | null;
  guest_email: string | null;
  name: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  line: string;
  note: string | null;
  prescription_file: string | null;
  payment_method: string;
  payment_status: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  rider_name: string | null;
  rider_phone: string | null;
  tracking_note: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string | null;
};

export type OrderItem = {
  id: number;
  medicine_id: number;
  pack_id: number;
  brand_name: string;
  description: string;
  pack_label: string;
  unit_price: number;
  qty: number;
  packed: number;
  /** Extra detail for packing: current photo, manufacturer, units per pack. */
  image: string | null;
  manufacturer_name: string | null;
  strength: string | null;
  dosage_form: string | null;
  units_per_pack: number | null;
};

export type OrderEvent = { id: number; status: string; note: string | null; actor: string | null; created_at: string };

export function getOrder(code: string) {
  const order = db.prepare("SELECT * FROM orders WHERE code = ?").get(code) as Order | undefined;
  if (!order) return null;
  const items = db
    .prepare(
      `SELECT i.*, ${IMAGE_SQL} AS image, f.name AS manufacturer_name, m.strength, m.dosage_form, p.qty AS units_per_pack
       FROM order_items i
       LEFT JOIN medicines m ON m.id = i.medicine_id
       LEFT JOIN manufacturers f ON f.id = m.manufacturer_id
       LEFT JOIN packs p ON p.id = i.pack_id
       LEFT JOIN inventory inv ON inv.medicine_id = i.medicine_id
       WHERE i.order_id = ? ORDER BY i.id`,
    )
    .all(order.id) as OrderItem[];
  const events = db
    .prepare("SELECT id, status, note, actor, created_at FROM order_events WHERE order_id = ? ORDER BY id")
    .all(order.id) as OrderEvent[];
  return { order, items, events };
}

export type OrderSummary = Order & { item_count: number; packed_count: number };

const SUMMARY_SELECT = `SELECT o.*,
  (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count,
  (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id AND i.packed = 1) AS packed_count
  FROM orders o`;

export function getUserOrders(userId: number) {
  return db.prepare(`${SUMMARY_SELECT} WHERE user_id = ? ORDER BY o.id DESC`).all(userId) as OrderSummary[];
}

export function getOrdersByCodes(codes: string[]) {
  if (!codes.length) return [];
  return db
    .prepare(`${SUMMARY_SELECT} WHERE code IN (${codes.map(() => "?").join(",")}) ORDER BY o.id DESC`)
    .all(...codes) as OrderSummary[];
}

/** Admin order list with optional status filter and free-text search (order ID, phone or name). */
export function findOrders(opts: { status?: string; q?: string; limit?: number }) {
  const where: string[] = [];
  const args: unknown[] = [];
  if (opts.status) {
    where.push("o.status = ?");
    args.push(opts.status);
  }
  if (opts.q) {
    const q = opts.q.trim();
    where.push("(o.code LIKE ? OR o.phone LIKE ? OR o.name LIKE ? COLLATE NOCASE)");
    args.push(`%${q.toUpperCase()}%`, `%${q.replace(/\D/g, "") || q}%`, `%${q}%`);
  }
  // Oldest first while work is pending (first in, first out); newest first otherwise.
  const pending = opts.status && ["placed", "confirmed", "packed", "shipped"].includes(opts.status);
  return db
    .prepare(
      `${SUMMARY_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY o.id ${pending ? "ASC" : "DESC"} LIMIT ?`,
    )
    .all(...args, opts.limit ?? 200) as OrderSummary[];
}

export function orderCounts() {
  const rows = db.prepare("SELECT status, COUNT(*) AS n FROM orders GROUP BY status").all() as {
    status: string;
    n: number;
  }[];
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
}

/** Allowed next steps for each status. Cancellation is allowed until delivery. */
export const NEXT_STATUS: Record<string, string[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export function setPacked(code: string, itemId: number, packed: boolean) {
  const o = db.prepare("SELECT id, status FROM orders WHERE code = ?").get(code) as
    { id: number; status: string } | undefined;
  if (!o || o.status !== "confirmed")
    throw new OrderError("Items can only be checked while the order is being packed.");
  db.prepare("UPDATE order_items SET packed = ? WHERE id = ? AND order_id = ?").run(packed ? 1 : 0, itemId, o.id);
}

export function changeOrderStatus(
  code: string,
  status: string,
  opts: { actor: string; note?: string | null; riderName?: string; riderPhone?: string; trackingNote?: string } = {
    actor: "admin",
  },
) {
  db.transaction(() => {
    const o = db.prepare("SELECT * FROM orders WHERE code = ?").get(code) as Order | undefined;
    if (!o) throw new OrderError("Order not found.");
    if (!NEXT_STATUS[o.status]?.includes(status)) {
      throw new OrderError(`An order that is "${o.status}" can't be moved to "${status}".`);
    }

    if (status === "packed") {
      const missing = db
        .prepare("SELECT COUNT(*) AS n FROM order_items WHERE order_id = ? AND packed = 0")
        .get(o.id) as { n: number };
      if (missing.n > 0) throw new OrderError(`Check every item before marking packed (${missing.n} left).`);
    }

    if (status === "shipped") {
      if (!opts.riderName?.trim() || !opts.riderPhone?.trim()) {
        throw new OrderError("Enter the delivery person's name and phone so the customer can reach them.");
      }
      db.prepare("UPDATE orders SET rider_name = ?, rider_phone = ?, tracking_note = ? WHERE id = ?").run(
        opts.riderName.trim(),
        opts.riderPhone.trim(),
        opts.trackingNote?.trim() || null,
        o.id,
      );
    }

    if (status === "cancelled") {
      const items = db
        .prepare(
          "SELECT i.medicine_id, i.qty * COALESCE(p.qty, 1) AS units FROM order_items i LEFT JOIN packs p ON p.id = i.pack_id WHERE i.order_id = ?",
        )
        .all(o.id) as { medicine_id: number; units: number }[];
      for (const i of items) adjustStock(i.medicine_id, i.units, "cancel", { ref: o.code });
      db.prepare("UPDATE orders SET cancel_reason = ? WHERE id = ?").run(opts.note || null, o.id);
    }

    if (status === "delivered" && o.payment_method === "cod") {
      db.prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?").run(o.id);
    }

    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, o.id);
    addEvent(o.id, status, opts.note || null, opts.actor);
  })();
}

export function dashboardStats() {
  const today = db
    .prepare(
      "SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue FROM orders WHERE status != 'cancelled' AND date(created_at) = date('now')",
    )
    .get() as { orders: number; revenue: number };
  const week = db
    .prepare(
      "SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue FROM orders WHERE status != 'cancelled' AND created_at >= datetime('now', '-7 days')",
    )
    .get() as { orders: number; revenue: number };
  const rxPending = db
    .prepare("SELECT COUNT(*) AS n FROM orders WHERE prescription_file IS NOT NULL AND status = 'placed'")
    .get() as { n: number };
  const codToCollect = db
    .prepare("SELECT COALESCE(SUM(total), 0) AS v FROM orders WHERE status = 'shipped' AND payment_status != 'paid'")
    .get() as { v: number };
  return { today, week, rxPending: rxPending.n, codToCollect: codToCollect.v };
}
