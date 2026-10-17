"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, User } from "lucide-react";
import { useCart } from "./cart-context";
import { SearchBox } from "./search-box";

/** সাশ্রয় wordmark, as in the app. */
export function Wordmark({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className={`font-bangla text-2xl font-bold leading-none ${light ? "text-ivory" : "text-night"}`}>
        সাশ্রয়
      </span>
      {!compact && (
        <span
          className={`text-[11px] font-bold uppercase tracking-[0.22em] ${light ? "text-gold-2" : "text-gold-deep"}`}
        >
          Sashroy
        </span>
      )}
    </span>
  );
}

export function Header({ user }: { user: { name: string; role: string } | null }) {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const home = pathname === "/";
  const showSearch = !home;
  const link = home
    ? "rounded-full px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
    : "rounded-full px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-white";

  return (
    <header className={`sticky top-0 z-30 ${home ? "bg-night" : "border-b border-line bg-ivory/90 backdrop-blur"}`}>
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Link href="/" className="shrink-0" aria-label="Sashroy home">
          <Wordmark light={home} compact={showSearch} />
        </Link>
        {showSearch && (
          <div className="min-w-0 flex-1">
            <Suspense fallback={<div className="h-11" />}>
              <SearchBox compact />
            </Suspense>
          </div>
        )}
        <nav className={`hidden items-center gap-1 md:flex ${showSearch ? "" : "ml-auto"}`}>
          {user?.role === "admin" && (
            <Link href="/admin" className={link}>
              Admin
            </Link>
          )}
          <Link href="/companies" className={link}>
            Companies
          </Link>
          <Link href="/orders" className={link}>
            Track order
          </Link>
          <Link href="/app" className={link}>
            Get the app
          </Link>
          <Link href={user ? "/account" : "/login"} className={`flex items-center gap-1.5 ${link}`}>
            <User className="size-4" />
            {user ? user.name.split(" ")[0] : "Sign in"}
          </Link>
          <Link href="/cart" className={`relative ${link}`} aria-label="Cart">
            <ShoppingBag className="size-5" />
            {ready && count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] font-bold text-night">
                {count}
              </span>
            )}
          </Link>
        </nav>
        {home && (
          <Link
            href={user ? "/account" : "/login"}
            aria-label={user ? "Account" : "Sign in"}
            className="ml-auto grid size-10 place-items-center rounded-full bg-gold/20 font-display text-lg text-gold-2 md:hidden"
          >
            {user ? user.name.charAt(0).toUpperCase() : <User className="size-5" />}
          </Link>
        )}
      </div>
    </header>
  );
}
