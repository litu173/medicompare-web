"use client";

import { useEffect, useState } from "react";
import type { CartItem } from "./cart-context";

export type Quote = {
  items: {
    packId: number;
    medicineId: number;
    brandName: string;
    packLabel: string;
    price: number;
    qty: number;
    lineTotal: number;
    available: boolean;
    maxQty: number;
    cheaper: { medicineId: number; brandName: string; manufacturer: string; savePct: number } | null;
  }[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  allAvailable: boolean;
};

/** Live server-side pricing for the local cart. */
export function useQuote(items: CartItem[], district?: string) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const key = JSON.stringify([items.map((i) => [i.packId, i.qty]), district]);

  useEffect(() => {
    const [lines, d] = JSON.parse(key) as [[number, number][], string | undefined];
    if (!lines.length) return;
    const ctrl = new AbortController();
    fetch("/api/v1/cart/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: lines.map(([packId, qty]) => ({ packId, qty })), district: d }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((q: Quote | null) => q && Array.isArray(q.items) && setQuote(q))
      .catch(() => {});
    return () => ctrl.abort();
  }, [key]);

  return items.length ? quote : null;
}
