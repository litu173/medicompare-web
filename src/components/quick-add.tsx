"use client";

import { Plus } from "lucide-react";
import { useCart } from "./cart-context";

/** One-tap add of a product's default pack (a strip of 10 for per-piece tablets/capsules). */
export function QuickAdd(props: {
  packId: number;
  medicineId: number;
  brandName: string;
  description: string;
  packLabel: string;
  price: number;
  disabled?: boolean;
}) {
  const { add } = useCart();
  const perPiece = /^1 (tablet|capsule|piece)$/.test(props.packLabel);
  const qty = perPiece ? 10 : 1;
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const { packId, medicineId, brandName, description, packLabel, price } = props;
        add({ packId, medicineId, brandName, description, packLabel, price }, qty);
      }}
      aria-label={`Add ${props.brandName} to cart`}
      className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-brand-600 px-2.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent"
    >
      <Plus className="size-3.5" />
      {perPiece ? "10" : "Add"}
    </button>
  );
}
