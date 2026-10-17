import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronRight, Package } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getOrdersByCodes, getUserOrders } from "@/lib/orders";
import { taka } from "@/lib/format";
import { StatusBadge, fmtTime } from "@/components/order-status";
import { TrackForm } from "@/components/track-form";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  const jar = await cookies();
  const guestCodes = (jar.get("mc_guest_orders")?.value ?? "").split(",").filter(Boolean);
  const tracked = (jar.get("mc_tracked")?.value ?? "").split(",").filter(Boolean);
  const own = user ? getUserOrders(user.id) : [];
  const ownCodes = new Set(own.map((o) => o.code));
  const others = getOrdersByCodes([...new Set([...guestCodes, ...tracked])]).filter((o) => !ownCodes.has(o.code));
  const orders = [...own, ...others].sort((a, b) => b.id - a.id);
  const active = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const past = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));

  const list = (rows: typeof orders) => (
    <ul className="divide-y divide-gray-100 overflow-hidden rounded-[22px] bg-white shadow-card">
      {rows.map((o) => (
        <li key={o.id}>
          <Link href={`/order/${o.code}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
              <Package className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="font-mono text-sm font-bold">{o.code}</span>
              <span className="block text-xs text-gray-600">
                {fmtTime(o.created_at)} · {o.item_count} item{o.item_count > 1 ? "s" : ""} · {taka(o.total)}
              </span>
            </span>
            <StatusBadge status={o.status} />
            <ChevronRight className="size-4 text-gray-500" />
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-5 pt-4">
      <h1 className="font-display text-3xl font-semibold">My orders</h1>
      {active.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">In progress</h2>
          {list(active)}
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-700">Past orders</h2>
          {list(past)}
        </section>
      )}
      {orders.length === 0 && (
        <div className="rounded-[22px] bg-white p-6 text-center text-sm text-gray-700 shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG illustration */}
          <img src="/illustrations/welcome_delivery.svg" alt="" className="mx-auto mb-2 h-36 w-auto" />
          <p className="font-display text-xl font-semibold text-gray-900">No orders yet</p>
          No orders on this device yet.{" "}
          {!user && (
            <>
              <Link href="/login?next=/orders" className="font-semibold text-brand-700">
                Sign in
              </Link>{" "}
              to see orders from your account.
            </>
          )}
        </div>
      )}
      <section className="rounded-[22px] bg-white p-4 shadow-card">
        <h2 className="font-semibold">Track another order</h2>
        <p className="mb-3 text-sm text-gray-700">Enter the order ID and the mobile number used at checkout.</p>
        <TrackForm />
      </section>
    </div>
  );
}
