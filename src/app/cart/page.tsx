"use client";

import Link from "next/link";
import { AlertCircle, Minus, Plus, ShoppingBag, Trash2, TrendingDown } from "lucide-react";
import { useCart } from "@/components/cart-context";
import { useQuote } from "@/components/use-quote";
import { taka } from "@/lib/format";
import { DELIVERY } from "@/lib/bd";

export default function CartPage() {
  const { items, ready, setQty, remove } = useCart();
  const quote = useQuote(items);

  if (!ready) return <div className="pt-10 text-center text-sm text-gray-500">Loading cart…</div>;

  if (!items.length) {
    return (
      <div className="pt-16 text-center">
        <ShoppingBag className="mx-auto size-12 text-gray-300" />
        <h1 className="mt-4 text-xl font-semibold">Your cart is empty</h1>
        <p className="mt-1 text-sm text-gray-500">Search a medicine and compare prices to get started.</p>
        <Link href="/search" className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white">
          Search medicines
        </Link>
      </div>
    );
  }

  const byPack = new Map(quote?.items.map((q) => [q.packId, q]));
  const subtotal = quote?.subtotal ?? items.reduce((s, i) => s + i.price * i.qty, 0);
  const toFree = DELIVERY.freeOver - subtotal;

  return (
    <div className="space-y-4 pt-4">
      <h1 className="text-2xl font-bold">Cart</h1>

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        {items.map((i) => {
          const q = byPack.get(i.packId);
          const price = q?.price ?? i.price;
          return (
            <li key={i.packId} className="p-3">
              <div className="flex gap-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/medicine/${i.medicineId}`} className="font-semibold hover:underline">
                    {i.brandName}
                  </Link>
                  <p className="truncate text-xs text-gray-500">{i.description}</p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {i.packLabel} · {taka(price)} each
                  </p>
                </div>
                <p className="font-semibold tabular-nums">{taka(price * i.qty)}</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex h-9 items-center rounded-lg border border-gray-200">
                  <button
                    aria-label="Decrease"
                    onClick={() => setQty(i.packId, i.qty - 1)}
                    className="grid h-full w-9 place-items-center"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">{i.qty}</span>
                  <button
                    aria-label="Increase"
                    onClick={() => setQty(i.packId, i.qty + 1)}
                    disabled={q ? i.qty >= q.maxQty : false}
                    className="grid h-full w-9 place-items-center disabled:opacity-30"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button onClick={() => remove(i.packId)} className="flex items-center gap-1 text-xs text-gray-500">
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
              {quote && !q && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
                  <AlertCircle className="size-3.5" /> No longer available — please remove it
                </p>
              )}
              {q && !q.available && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
                  <AlertCircle className="size-3.5" />
                  {q.maxQty === 0 ? "Out of stock — choose an alternative" : `Only ${q.maxQty} available`}
                </p>
              )}
              {q?.cheaper && q.cheaper.savePct > 0 && (
                <Link
                  href={`/medicine/${q.cheaper.medicineId}`}
                  className="mt-2 flex items-center gap-2 rounded-lg bg-brand-50 px-2.5 py-2 text-xs text-brand-900"
                >
                  <TrendingDown className="size-4 shrink-0 text-brand-600" />
                  <span>
                    <b>{q.cheaper.brandName}</b> ({q.cheaper.manufacturer}) is the same medicine and {q.cheaper.savePct}
                    % cheaper
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="space-y-2 rounded-xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium tabular-nums">{taka(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Delivery</span>
          <span className="text-gray-500">Calculated at checkout</span>
        </div>
        {toFree > 0 && (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Add {taka(toFree)} more for free delivery.
          </p>
        )}
      </div>

      <div className="sticky bottom-20 md:bottom-4">
        <Link
          href="/checkout"
          aria-disabled={quote ? !quote.allAvailable : false}
          className={`flex h-12 items-center justify-center rounded-xl font-semibold text-white shadow-lg ${
            quote && !quote.allAvailable ? "pointer-events-none bg-gray-400" : "bg-brand-600"
          }`}
        >
          {quote && !quote.allAvailable ? "Fix stock issues to continue" : `Checkout · ${taka(subtotal)}`}
        </Link>
      </div>
    </div>
  );
}
