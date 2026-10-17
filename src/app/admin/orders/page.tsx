import Link from "next/link";
import { ChevronRight, FileText, Search } from "lucide-react";
import { findOrders, orderCounts } from "@/lib/orders";
import { ORDER_STATUSES, STATUS_INFO } from "@/lib/bd";
import { taka } from "@/lib/format";
import { StatusBadge, fmtTime } from "@/components/order-status";
import { ScrollRow } from "@/components/scroll-row";
import { chipCls } from "@/components/chip";

export const metadata = { title: "Orders" };

export default async function AdminOrders({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const status =
    typeof sp.status === "string" && (ORDER_STATUSES as readonly string[]).includes(sp.status) ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q : "";
  const orders = findOrders({ status, q });
  const counts = orderCounts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const href = (s?: string) =>
    `/admin/orders?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(q ? { q } : {}) })}`;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Orders</h1>

      <form className="flex gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 focus-within:border-brand-600">
          <Search className="size-4 text-gray-600" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Order ID, phone or customer name"
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-gray-500"
          />
        </label>
        <button className="rounded-lg bg-gray-900 px-4 font-semibold text-white hover:bg-gray-800">Search</button>
      </form>

      <ScrollRow label="Filter by status">
        <Link href={href()} className={chipCls(!status)}>
          All <span className="opacity-80">{total}</span>
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={href(s)} className={chipCls(status === s)}>
            {STATUS_INFO[s].label} <span className="opacity-80">{counts[s] ?? 0}</span>
          </Link>
        ))}
      </ScrollRow>

      {orders.length === 0 ? (
        <p className="rounded-[22px] bg-white p-6 text-center text-sm text-gray-700 shadow-card">
          No orders here. {status && "Nothing waiting at this step."}
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-[22px] bg-white shadow-card">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.code}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold">{o.code}</span>
                    <StatusBadge status={o.status} />
                    {o.prescription_file && (
                      <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-900">
                        <FileText className="size-3" /> Rx
                      </span>
                    )}
                    {!o.user_id && <span className="text-xs text-gray-600">guest</span>}
                  </div>
                  <p className="truncate text-sm text-gray-800">
                    {o.name} · {o.phone}
                  </p>
                  <p className="truncate text-xs text-gray-600">
                    {o.area}, {o.district} · {fmtTime(o.created_at)}
                    {o.status === "confirmed" && ` · packed ${o.packed_count}/${o.item_count}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold tabular-nums">{taka(o.total)}</p>
                  <p className="text-xs text-gray-600">
                    {o.item_count} item{o.item_count > 1 ? "s" : ""} · {o.payment_method.toUpperCase()}
                  </p>
                </div>
                <ChevronRight className="size-4 text-gray-500" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
