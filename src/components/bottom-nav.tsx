"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingCart, User, Package } from "lucide-react";
import { useCart } from "./cart-context";

export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const { count, ready } = useCart();
  const tabs = [
    { href: "/", label: "Home", icon: Home, active: pathname === "/" },
    { href: "/search", label: "Search", icon: Search, active: pathname.startsWith("/search") },
    {
      href: "/orders",
      label: "Orders",
      icon: Package,
      active: ["/orders", "/order/", "/track"].some((p) => pathname.startsWith(p)),
    },
    { href: "/cart", label: "Cart", icon: ShoppingCart, active: pathname === "/cart", badge: ready ? count : 0 },
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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map((t) => (
          <li key={t.label}>
            <Link
              href={t.href}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                t.active ? "text-brand-700" : "text-gray-600"
              }`}
            >
              <t.icon className="size-5" strokeWidth={t.active ? 2.4 : 1.8} />
              {t.label}
              {!!t.badge && (
                <span className="absolute left-1/2 top-1 ml-1.5 grid min-w-4.5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                  {t.badge}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
