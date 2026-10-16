import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, LogOut, MapPin, Package, Shield } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserOrders } from "@/lib/orders";
import { taka } from "@/lib/format";
import { logout } from "@/app/actions/auth";
import { deleteAddress } from "@/app/actions/account";
import { StatusBadge } from "@/components/order-status";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const orders = getUserOrders(user.id);
  const addresses = db
    .prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC")
    .all(user.id) as {
    id: number;
    name: string;
    phone: string;
    district: string;
    area: string;
    line: string;
    is_default: number;
  }[];

  return (
    <div className="space-y-5 pt-4">
      <section className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <span className="grid size-12 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{user.name}</p>
          <p className="truncate text-sm text-gray-600">{user.email}</p>
          {user.phone && <p className="text-sm text-gray-600">{user.phone}</p>}
        </div>
        <form action={logout}>
          <button className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
            <LogOut className="size-4" /> Sign out
          </button>
        </form>
      </section>

      {user.role === "admin" && (
        <Link href="/admin" className="flex items-center gap-3 rounded-2xl bg-gray-900 p-4 text-white">
          <Shield className="size-5" /> <span className="flex-1 font-medium">Admin · manage orders</span>{" "}
          <ChevronRight className="size-4" />
        </Link>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
          <Package className="size-5" /> Orders
        </h2>
        {orders.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-gray-600 shadow-sm ring-1 ring-black/5">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/order/${o.code}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <span className="min-w-0 flex-1">
                    <span className="font-mono text-sm font-semibold">{o.code}</span>
                    <span className="block text-xs text-gray-600">
                      {new Date(o.created_at + "Z").toLocaleDateString("en-GB", { dateStyle: "medium" })} ·{" "}
                      {o.item_count} item{o.item_count > 1 ? "s" : ""}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold">{taka(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
          <MapPin className="size-5" /> Saved addresses
        </h2>
        {addresses.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-gray-600 shadow-sm ring-1 ring-black/5">
            Addresses you use at checkout are saved here.
          </p>
        ) : (
          <ul className="space-y-2">
            {addresses.map((a) => (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5"
              >
                <span className="flex-1">
                  <b>{a.name}</b> · {a.phone}{" "}
                  {a.is_default ? <span className="ml-1 rounded bg-gray-100 px-1.5 text-[11px]">Default</span> : null}
                  <br />
                  <span className="text-gray-600">
                    {a.line}, {a.area}, {a.district}
                  </span>
                </span>
                <form action={deleteAddress}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="text-xs text-red-600">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
