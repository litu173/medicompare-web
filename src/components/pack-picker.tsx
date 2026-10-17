"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "./cart-context";
import { taka } from "@/lib/format";

type Pack = { id: number; label: string; qty: number; price: number };

export function PackPicker({
  medicineId,
  brandName,
  description,
  packs,
  stock,
}: {
  medicineId: number;
  brandName: string;
  description: string;
  packs: Pack[];
  stock: number;
}) {
  const router = useRouter();
  const { add } = useCart();
  // Default to a single piece bought as a strip of 10, or the first pack for bottles/tubes.
  const perPiece = (p?: Pack) => !!p && /^1 (tablet|capsule|piece)$/.test(p.label);
  const [packId, setPackId] = useState(packs[0]?.id);
  const pack = packs.find((p) => p.id === packId) ?? packs[0];
  const maxQty = pack ? Math.max(0, Math.min(99, Math.floor(stock / pack.qty))) : 0;
  const [qty, setQty] = useState(perPiece(packs[0]) ? 10 : 1);
  const q = Math.min(qty, Math.max(1, maxQty));

  if (!pack) return <p className="text-sm text-gray-600">This product is not available for online purchase.</p>;
  const soldOut = maxQty === 0;

  const doAdd = () =>
    add({ packId: pack.id, medicineId, brandName, description, packLabel: pack.label, price: pack.price }, q);

  return (
    <div className="space-y-4">
      {packs.length > 1 && (
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Pack size">
          {packs.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={p.id === pack.id}
              disabled={p.qty > stock}
              onClick={() => {
                setPackId(p.id);
                setQty(perPiece(p) ? 10 : 1);
              }}
              className={`rounded-[18px] border p-3.5 text-left disabled:opacity-50 ${
                p.id === pack.id ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-gray-200 bg-white"
              }`}
            >
              <p className="text-sm font-medium text-gray-900">{p.label}</p>
              <p className="font-display text-xl font-semibold tabular-nums">{taka(p.price)}</p>
              {p.qty > stock && <p className="text-[11px] text-red-600">Not enough stock</p>}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-11 items-center rounded-full border border-brand-100 bg-brand-50 text-brand-700">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty(Math.max(1, q - 1))}
            className="grid h-full w-11 place-items-center text-gray-600 disabled:opacity-40"
            disabled={q <= 1 || soldOut}
          >
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center font-semibold tabular-nums">{soldOut ? 0 : q}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty(Math.min(maxQty, q + 1))}
            className="grid h-full w-11 place-items-center text-gray-600 disabled:opacity-40"
            disabled={q >= maxQty || soldOut}
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex-1 text-right">
          <p className="text-xs text-gray-600">Total</p>
          <p className="text-xl font-bold tabular-nums">{taka(soldOut ? 0 : pack.price * q)}</p>
        </div>
      </div>

      {soldOut ? (
        <a
          href="#alternatives"
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-night font-bold text-white"
        >
          Out of stock — see alternatives
        </a>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={doAdd}
            className="flex h-14 items-center justify-center gap-2 rounded-2xl border-2 border-brand-600 font-bold text-brand-700 hover:bg-brand-50"
          >
            <ShoppingCart className="size-4.5" /> Add to cart
          </button>
          <button
            type="button"
            onClick={() => {
              doAdd();
              router.push("/cart");
            }}
            className="h-14 rounded-2xl bg-brand-600 font-bold text-white hover:bg-brand-700"
          >
            Buy now
          </button>
        </div>
      )}
    </div>
  );
}
