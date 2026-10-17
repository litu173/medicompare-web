"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pill, ShoppingCart, User } from "lucide-react";
import { useCart } from "./cart-context";
import { SearchBox } from "./search-box";

export function Header({ user }: { user: { name: string; role: string } | null }) {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const showSearch = pathname !== "/";

  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-1.5 font-semibold text-brand-700">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">
            <Pill className="size-4.5" />
          </span>
          <span className={`items-baseline gap-1.5 ${showSearch ? "hidden sm:flex" : "flex"}`}>
            <span className="font-bangla text-xl font-bold leading-none">সাশ্রয়</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Sashroy</span>
          </span>
        </Link>
        {showSearch && (
          <div className="min-w-0 flex-1">
            <Suspense fallback={<div className="h-10" />}>
              <SearchBox compact />
            </Suspense>
          </div>
        )}
        <nav className={`hidden items-center gap-1 md:flex ${showSearch ? "" : "ml-auto"}`}>
          {user?.role === "admin" && (
            <Link href="/admin" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
              Admin
            </Link>
          )}
          <Link href="/companies" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Companies
          </Link>
          <Link href="/orders" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Track order
          </Link>
          <Link href="/app" className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Get the app
          </Link>
          <Link
            href={user ? "/account" : "/login"}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            <User className="size-4" />
            {user ? user.name.split(" ")[0] : "Sign in"}
          </Link>
          <Link href="/cart" className="relative rounded-lg p-2 text-gray-700 hover:bg-gray-100" aria-label="Cart">
            <ShoppingCart className="size-5" />
            {ready && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-semibold text-white">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
