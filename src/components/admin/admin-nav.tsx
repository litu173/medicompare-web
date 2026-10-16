"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, LayoutDashboard, Pill, Settings, Store, Users, ClipboardList } from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, badge: "orders" as const },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav({ pending, userName }: { pending: number; userName: string }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-gray-200 bg-white md:flex print:hidden">
        <Link href="/admin" className="flex items-center gap-2 px-5 py-5 font-bold text-brand-700">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white">
            <Pill className="size-4.5" />
          </span>
          MediCompare Admin
        </Link>
        <nav className="flex-1 space-y-1 px-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive(l.href, l.exact) ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <l.icon className="size-5" />
              <span className="flex-1">{l.label}</span>
              {l.badge && pending > 0 && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{pending}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 p-3 text-sm">
          <p className="px-3 pb-2 text-gray-600">Signed in as {userName}</p>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-gray-700 hover:bg-gray-100"
          >
            <Store className="size-5" /> View store
          </Link>
        </div>
      </aside>

      {/* Mobile bottom tabs */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-gray-200 bg-white md:hidden print:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              isActive(l.href, l.exact) ? "text-brand-700" : "text-gray-600"
            }`}
          >
            <l.icon className="size-5" />
            {l.label}
            {l.badge && pending > 0 && (
              <span className="absolute left-1/2 top-1 ml-2 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                {pending}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </>
  );
}
