import "server-only";
import crypto from "node:crypto";
import { db } from "./db";
import { getPacksByIds } from "./catalog";
import { deliveryFee } from "./bd";

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
  /** Cheapest in-stock equivalent brand, if it is cheaper than this one. */
  cheaper: { medicineId: number; brandName: string; manufacturer: string; savePct: number } | null;
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
    `SELECT c.id, c.brand_name, f.name AS manufacturer, c.compare_price, m.compare_price AS own
     FROM medicines m JOIN medicines c ON c.equiv_key = m.equiv_key AND c.id != m.id
     JOIN manufacturers f ON f.id = c.manufacturer_id
     WHERE m.id = ? AND c.stock > 0 AND c.price_suspect = 0 AND c.compare_price < m.compare_price
     ORDER BY c.compare_price LIMIT 1`,
  );
  const items: QuoteLine[] = rows.map((r) => {
    const c = cheaperStmt.get(r.medicine_id) as
      { id: number; brand_name: string; manufacturer: string; compare_price: number; own: number } | undefined;
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
      cheaper: c
        ? {
            medicineId: c.id,
            brandName: c.brand_name,
            manufacturer: c.manufacturer,
            savePct: Math.round(((c.own - c.compare_price) / c.own) * 100),
          }
        : null,
    };
  });
  const subtotal = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
  const fee = items.length ? deliveryFee(district ?? "Dhaka", subtotal) : 0;
  return {
    items,
    subtotal,
    deliveryFee: fee,
    total: subtotal + fee,
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
           payment_method,subtotal,delivery_fee,total) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
    const takeStock = db.prepare("UPDATE medicines SET stock = stock - ? WHERE id = ?");
    for (const i of q.items) {
      insItem.run(orderId, i.medicineId, i.packId, i.brandName, i.description, i.packLabel, i.price, i.qty);
      takeStock.run(i.qty * i.unitsPerPack, i.medicineId);
    }
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
  created_at: string;
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
};

export function getOrder(code: string) {
  const order = db.prepare("SELECT * FROM orders WHERE code = ?").get(code) as Order | undefined;
  if (!order) return null;
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id) as OrderItem[];
  return { order, items };
}

export function getUserOrders(userId: number) {
  return db
    .prepare(
      `SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o WHERE user_id = ? ORDER BY o.id DESC`,
    )
    .all(userId) as (Order & { item_count: number })[];
}

export function getAllOrders(status?: string) {
  return db
    .prepare(
      `SELECT o.*, (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id) AS item_count
       FROM orders o ${status ? "WHERE status = ?" : ""} ORDER BY o.id DESC LIMIT 200`,
    )
    .all(...(status ? [status] : [])) as (Order & { item_count: number })[];
}

/** Cancelling puts stock back. */
export function setOrderStatus(code: string, status: string) {
  db.transaction(() => {
    const o = db.prepare("SELECT id, status FROM orders WHERE code = ?").get(code) as
      { id: number; status: string } | undefined;
    if (!o || o.status === status || o.status === "cancelled") return;
    if (status === "cancelled" && o.status !== "cancelled") {
      db.prepare(
        `UPDATE medicines SET stock = stock + (SELECT SUM(i.qty * p.qty) FROM order_items i JOIN packs p ON p.id = i.pack_id
           WHERE i.order_id = ? AND i.medicine_id = medicines.id)
         WHERE id IN (SELECT medicine_id FROM order_items WHERE order_id = ?)`,
      ).run(o.id, o.id);
    }
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, o.id);
  })();
}
