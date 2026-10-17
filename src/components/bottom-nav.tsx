"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingBag, User, ReceiptText } from "lucide-react";
import { useCart } from "./cart-context";

/** Floating tab bar, the same as the app's: night green with a gold pill on the active tab. */
export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const tabs = [
    { href: "/", label: "Home", icon: Home, active: pathname === "/" },
    { href: "/search", label: "Search", icon: Search, active: pathname.startsWith("/search") },
    { href: "/cart", label: "Cart", icon: ShoppingBag, active: pathname === "/cart", badge: ready ? count : 0 },
    {
      href: "/orders",
      label: "Orders",
      icon: ReceiptText,
      active: ["/orders", "/order/", "/track"].some((p) => pathname.startsWith(p)),
    },
    {
      href: signedIn ? "/account" : "/login",
      label: signedIn ? "Account" : "Sign in",
      icon: User,
      active: ["/account", "/login", "/register"].some((p) => pathname.startsWith(p)),
    },
  ];

  if (pathname.startsWith("/checkout")) return null;

  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-30 md:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main"
    >
      <ul className="flex h-16 items-center rounded-[26px] border border-gold/25 bg-night px-1.5 shadow-lux">
        {tabs.map((t) => (
          <li key={t.label} className={`${t.active ? "flex-[1.5]" : "flex-1"} transition-all duration-300`}>
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={`relative mx-0.5 flex h-11 items-center justify-center gap-1.5 rounded-[18px] ${
                t.active ? "bg-gold/15 text-gold-2" : "text-white/70"
              }`}
            >
              <span className="relative">
                <t.icon className="size-[22px]" strokeWidth={t.active ? 2.3 : 1.8} />
                {!!t.badge && (
                  <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-night">
                    {t.badge}
                  </span>
                )}
              </span>
              {t.active && <span className="truncate text-[12.5px] font-bold">{t.label}</span>}
              {!t.active && <span className="sr-only">{t.label}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
