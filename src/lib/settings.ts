import "server-only";
import { db } from "./db";
import { DELIVERY } from "./bd";

export type StoreSettings = {
  deliveryInsideDhaka: number;
  deliveryOutsideDhaka: number;
  freeDeliveryOver: number;
  storeName: string;
  supportPhone: string;
};

const DEFAULTS: StoreSettings = {
  deliveryInsideDhaka: DELIVERY.insideDhaka,
  deliveryOutsideDhaka: DELIVERY.outsideDhaka,
  freeDeliveryOver: DELIVERY.freeOver,
  storeName: "সাশ্রয় Sashroy",
  supportPhone: "",
};

export function getSettings(): StoreSettings {
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const out: StoreSettings = { ...DEFAULTS };
  for (const r of rows) {
    if (!(r.key in out)) continue;
    const def = DEFAULTS[r.key as keyof StoreSettings];
    (out as Record<string, unknown>)[r.key] = typeof def === "number" ? Number(r.value) : r.value;
  }
  return out;
}

export function saveSettings(s: Partial<StoreSettings>) {
  const up = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  db.transaction(() => {
    for (const [k, v] of Object.entries(s)) if (k in DEFAULTS && v !== undefined) up.run(k, String(v));
  })();
}

export function deliveryFeeFor(district: string, subtotal: number, s = getSettings()) {
  if (subtotal >= s.freeDeliveryOver) return 0;
  return district === "Dhaka" ? s.deliveryInsideDhaka : s.deliveryOutsideDhaka;
}
