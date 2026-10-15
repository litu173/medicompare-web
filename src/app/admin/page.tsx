import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getAllOrders } from "@/lib/orders";
import { ORDER_STATUSES } from "@/lib/bd";
import { taka } from "@/lib/format";
import { updateOrderStatus } from "@/app/actions/account";
import { StatusBadge } from "@/components/order-status";

export const metadata: Metadata = { title: "Admin · Orders" };

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") notFound();
  const { status } = await searchParams;
  const filter =
    typeof status === "string" && (ORDER_STATUSES as readonly string[]).includes(status) ? status : undefined;
  const orders = getAllOrders(filter);

  return (
    <div className="space-y-4 pt-4">
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {[undefined, ...ORDER_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin?status=${s}` : "/admin"}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm capitalize ${filter === s ? "bg-gray-900 text-white" : "border border-gray-200 bg-white"}`}
          >
            {s ?? "All"}
          </Link>
        ))}
      </div>
      {orders.length === 0 && <p className="text-sm text-gray-500">No orders.</p>}
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="rounded-xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/order/${o.code}`} className="font-mono font-semibold text-brand-700">
                  {o.code}
                </Link>
                <p className="text-xs text-gray-500">
                  {new Date(o.created_at + "Z").toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <p className="mt-2">
              {o.name} · {o.phone}
              {o.user_id ? "" : " · guest"}
            </p>
            <p className="text-gray-600">
              {o.area}, {o.district}
            </p>
            <p className="mt-1">
              {o.item_count} items · <b>{taka(o.total)}</b> · {o.payment_method.toUpperCase()}
            </p>
            {o.prescription_file && (
              <a
                href={`/api/admin/prescriptions/${o.prescription_file}`}
                target="_blank"
                className="text-xs font-medium text-brand-700 underline"
              >
                View prescription
              </a>
            )}
            {o.status !== "cancelled" && o.status !== "delivered" && (
              <form key={o.status} action={updateOrderStatus} className="mt-3 flex gap-2">
                <input type="hidden" name="code" value={o.code} />
                <select
                  name="status"
                  defaultValue={o.status}
                  className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-2 capitalize"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button className="rounded-lg bg-gray-900 px-4 font-medium text-white">Update</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
