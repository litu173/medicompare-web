"use client";

import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "./cart-context";

/**
 * "Add" button that turns into a − qty + stepper once the item is in the cart.
 * Single tablets/capsules are added a strip (10) at a time.
 */
export function CartControl(props: {
  packId: number;
  medicineId: number;
  brandName: string;
  description: string;
  packLabel: string;
  price: number;
  disabled?: boolean;
}) {
  const { items, add, setQty } = useCart();
  const inCart = items.find((i) => i.packId === props.packId);
  const step = /^1 (tablet|capsule|piece)$/.test(props.packLabel) ? 10 : 1;
  const { packId, medicineId, brandName, description, packLabel, price } = props;

  if (inCart) {
    return (
      <div className="flex h-10 shrink-0 items-center rounded-lg border border-brand-600 bg-brand-50 text-brand-700">
        <button
          type="button"
          aria-label={`Remove ${step} ${brandName}`}
          onClick={() => setQty(packId, inCart.qty - step)}
          className="grid h-full w-9 place-items-center rounded-l-lg hover:bg-brand-100"
        >
          <Minus className="size-4" />
        </button>
        <span className="min-w-7 text-center text-sm font-bold tabular-nums" aria-live="polite">
          {inCart.qty}
        </span>
        <button
          type="button"
          aria-label={`Add ${step} more ${brandName}`}
          onClick={() => setQty(packId, inCart.qty + step)}
          className="grid h-full w-9 place-items-center rounded-r-lg hover:bg-brand-100"
        >
          <Plus className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={() => add({ packId, medicineId, brandName, description, packLabel, price }, step)}
      aria-label={`Add ${brandName} to cart`}
      className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-600"
    >
      <ShoppingCart className="size-4" />
      {props.disabled ? "Sold out" : "Add"}
    </button>
  );
}
