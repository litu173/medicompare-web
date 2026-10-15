"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  packId: number;
  medicineId: number;
  brandName: string;
  description: string;
  packLabel: string;
  price: number;
  qty: number;
};

type CartCtx = {
  items: CartItem[];
  ready: boolean;
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (packId: number, qty: number) => void;
  remove: (packId: number) => void;
  clear: () => void;
  toast: string | null;
};

const KEY = "mc_cart_v1";
const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage once on mount
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((cur) => {
      const found = cur.find((i) => i.packId === item.packId);
      if (found)
        return cur.map((i) => (i.packId === item.packId ? { ...i, ...item, qty: Math.min(99, i.qty + qty) } : i));
      return [...cur, { ...item, qty }];
    });
    setToast(`${item.brandName} added to cart`);
  }, []);

  const setQty = useCallback((packId: number, qty: number) => {
    setItems((cur) =>
      qty <= 0
        ? cur.filter((i) => i.packId !== packId)
        : cur.map((i) => (i.packId === packId ? { ...i, qty: Math.min(99, qty) } : i)),
    );
  }, []);

  const remove = useCallback((packId: number) => setItems((cur) => cur.filter((i) => i.packId !== packId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      ready,
      count: items.length,
      subtotal: items.reduce((s, i) => s + i.qty * i.price, 0),
      add,
      setQty,
      remove,
      clear,
      toast,
    }),
    [items, ready, add, setQty, remove, clear, toast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
