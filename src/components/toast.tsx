"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useCart } from "./cart-context";

export function Toast() {
  const { toast } = useCart();
  if (!toast) return null;
  return (
    <div
      role="status"
      className="animate-toast fixed bottom-20 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-lg md:bottom-6"
    >
      <CheckCircle2 className="size-4.5 shrink-0 text-brand-100" />
      <span className="min-w-0 flex-1 truncate">{toast}</span>
      <Link href="/cart" className="font-semibold text-brand-100">
        View cart
      </Link>
    </div>
  );
}
