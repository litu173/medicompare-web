"use client";

import Link from "next/link";
import { AlertCircle, Minus, Plus, ShoppingBag, Trash2, TrendingDown } from "lucide-react";
import { useCart } from "@/components/cart-context";
import { useQuote } from "@/components/use-quote";
import { taka } from "@/lib/format";
import { MedicineThumb } from "@/components/medicine-thumb";

export default function CartPage() {
  const { items, ready, setQty, remove, add } = useCart();
  const quote = useQuote(items);

  if (!ready) return <div className="pt-10 text-center text-sm text-gray-600">Loading cart…</div>;

  if (!items.length) {
    return (
      <div className="pt-10 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG illustration */}
        <img src="/illustrations/empty_cart.svg" alt="" className="mx-auto h-48 w-auto" />
        <h1 className="mt-4 font-display text-3xl font-semibold">Your cart is empty</h1>
        <p className="mt-1 text-gray-600">Search a medicine and pick the cheapest equal brand.</p>
        <Link
          href="/search"
          className="mt-6 inline-flex h-14 items-center gap-2 rounded-2xl bg-brand-600 px-7 font-bold text-white hover:bg-brand-700"
        >
          <ShoppingBag className="size-5" /> Search medicines
        </Link>
      </div>
    );
  }

  const byPack = new Map(quote?.items.map((q) => [q.packId, q]));

  /** Replaces a line with its cheapest in-stock equivalent, keeping the same quantity. */
  const switchLine = (packId: number) => {
    const line = items.find((x) => x.packId === packId);
    const c = byPack.get(packId)?.cheaper;
    if (!line || !c?.packId || c.price == null || !c.packLabel) return;
    remove(packId);
    add(
      {
        packId: c.packId,
        medicineId: c.medicineId,
        brandName: c.brandName,
        description: c.manufacturer,
        packLabel: c.packLabel,
        price: c.price,
      },
      line.qty,
    );
  };
  const switchable = quote?.items.filter((x) => x.cheaper?.packId) ?? [];
  const potential = switchable.reduce((s, x) => s + (x.lineTotal * (x.cheaper?.savePct ?? 0)) / 100, 0);
  const subtotal = quote?.subtotal ?? items.reduce((s, i) => s + i.price * i.qty, 0);
  const toFree = quote ? quote.freeOver - subtotal : 0;

  return (
    <div className="space-y-4 pt-4">
      <h1 className="font-display text-3xl font-semibold">Cart</h1>

      {potential >= 1 && (
        <div className="bg-hero flex items-center gap-3 rounded-[24px] border border-gold/25 p-5 text-white shadow-lux">
          <div className="flex-1">
            <p className="eyebrow !text-gold-2">Switch &amp; save</p>
            <p className="mt-1 text-sm">
              Same medicines, cheaper brands. Save about{" "}
              <span className="font-display text-lg text-gold-2">{taka(Math.round(potential))}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => switchable.forEach((x) => switchLine(x.packId))}
            className="bg-gold-grad shrink-0 rounded-2xl px-4 py-3 text-sm font-extrabold text-night"
          >
            Switch all
          </button>
        </div>
      )}

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-[22px] bg-white shadow-card">
        {items.map((i) => {
          const q = byPack.get(i.packId);
          const price = q?.price ?? i.price;
          return (
            <li key={i.packId} className="p-3">
              <div className="flex gap-3">
                <Link href={`/medicine/${i.medicineId}`} aria-hidden tabIndex={-1}>
                  <MedicineThumb image={q?.image} form={i.description} alt={i.brandName} />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/medicine/${i.medicineId}`} className="font-semibold hover:underline">
                    {i.brandName}
                  </Link>
                  <p className="truncate text-xs text-gray-600">{i.description}</p>
                  <p className="mt-0.5 text-xs text-gray-600">
                    {i.packLabel} · {taka(price)} each
                  </p>
                </div>
                <p className="font-semibold tabular-nums">{taka(price * i.qty)}</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex h-10 items-center rounded-lg border border-gray-300">
                  <button
                    aria-label="Decrease"
                    onClick={() => setQty(i.packId, i.qty - 1)}
                    className="grid h-full w-10 place-items-center rounded-l-lg hover:bg-gray-100"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">{i.qty}</span>
                  <button
                    aria-label="Increase"
                    onClick={() => setQty(i.packId, i.qty + 1)}
                    disabled={q ? i.qty >= q.maxQty : false}
                    className="grid h-full w-10 place-items-center rounded-r-lg hover:bg-gray-100 disabled:opacity-30"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => remove(i.packId)}
                  className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
              {quote && !q && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-700">
                  <AlertCircle className="size-3.5" /> No longer available — please remove it
                </p>
              )}
              {q && !q.available && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-700">
                  <AlertCircle className="size-3.5" />
                  {q.maxQty === 0 ? "Out of stock — choose an alternative" : `Only ${q.maxQty} available`}
                </p>
              )}
              {q?.cheaper && q.cheaper.savePct > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-brand-100 bg-brand-50 py-2 pl-3 pr-2 text-xs text-brand-900">
                  <TrendingDown className="size-4 shrink-0 text-brand-700" />
                  <Link href={`/medicine/${q.cheaper.medicineId}`} className="flex-1 hover:underline">
                    <b>{q.cheaper.brandName}</b> ({q.cheaper.manufacturer}) is the same medicine and {q.cheaper.savePct}
                    % cheaper
                  </Link>
                  {q.cheaper.packId && (
                    <button
                      type="button"
                      onClick={() => switchLine(i.packId)}
                      className="shrink-0 rounded-full bg-brand-600 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-brand-700"
                    >
                      Switch
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="space-y-2 rounded-[22px] bg-white p-4 text-sm shadow-card">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium tabular-nums">{taka(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Delivery</span>
          <span className="text-gray-600">Calculated at checkout</span>
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
