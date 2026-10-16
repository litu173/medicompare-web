import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  Boxes,
  CheckCheck,
  ClipboardCheck,
  FileText,
  PackageCheck,
  Wallet,
} from "lucide-react";
import { dashboardStats, findOrders, orderCounts } from "@/lib/orders";
import { inventoryStats, listInventory } from "@/lib/inventory";
import { taka } from "@/lib/format";
import { StatusBadge, fmtTime } from "@/components/order-status";
import { MedicineThumb } from "@/components/medicine-thumb";

export const metadata = { title: "Dashboard" };

export default function AdminDashboard() {
  const counts = orderCounts();
  const stats = dashboardStats();
  const inv = inventoryStats();
  const low = listInventory({ filter: "low", size: 6 }).rows;
  const recent = findOrders({ limit: 6 });

  // The daily workflow, in order. Each card opens the list of orders waiting at that step.
  const queue = [
    {
      status: "placed",
      label: "New — confirm",
      hint: "Call customer, check Rx",
      icon: ClipboardCheck,
      tone: "bg-amber-50 text-amber-900 ring-amber-200",
    },
    {
      status: "confirmed",
      label: "To pack",
      hint: "Pick & check every item",
      icon: PackageCheck,
      tone: "bg-orange-50 text-orange-900 ring-orange-200",
    },
    {
      status: "packed",
      label: "Ready to ship",
      hint: "Assign delivery person",
      icon: Boxes,
      tone: "bg-sky-50 text-sky-900 ring-sky-200",
    },
    {
      status: "shipped",
      label: "Out for delivery",
      hint: "Mark delivered on handover",
      icon: Bike,
      tone: "bg-blue-50 text-blue-900 ring-blue-200",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Today&apos;s work</h1>
        <p className="text-sm text-gray-700">Work through each step left to right. Oldest orders are shown first.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {queue.map((q) => (
          <Link
            key={q.status}
            href={`/admin/orders?status=${q.status}`}
            className={`group rounded-2xl p-4 ring-1 hover:shadow-md ${q.tone}`}
          >
            <div className="flex items-center justify-between">
              <q.icon className="size-6" />
              <span className="text-3xl font-bold tabular-nums">{counts[q.status] ?? 0}</span>
            </div>
            <p className="mt-2 font-semibold">{q.label}</p>
            <p className="text-xs opacity-90">{q.hint}</p>
          </Link>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={Wallet}
          label="Sales today"
          value={taka(stats.today.revenue)}
          sub={`${stats.today.orders} orders`}
        />
        <Stat
          icon={CheckCheck}
          label="Last 7 days"
          value={taka(stats.week.revenue)}
          sub={`${stats.week.orders} orders`}
        />
        <Stat icon={Bike} label="Cash to collect" value={taka(stats.codToCollect)} sub="from riders on the road" />
        <Stat
          icon={FileText}
          label="Prescriptions to check"
          value={String(stats.rxPending)}
          sub="new orders with Rx"
          href="/admin/orders?status=placed"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent orders</h2>
            <Link href="/admin/orders" className="flex items-center gap-1 text-sm font-semibold text-brand-700">
              All orders <ArrowRight className="size-4" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-600">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.code}`} className="flex items-center gap-3 py-2.5 hover:bg-gray-50">
                    <span className="min-w-0 flex-1">
                      <span className="font-mono text-sm font-bold">{o.code}</span>
                      <span className="block truncate text-xs text-gray-600">
                        {o.name} · {o.area}, {o.district} · {fmtTime(o.created_at)}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{taka(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4 text-amber-700" /> Running low
            </h2>
            <Link
              href="/admin/inventory?filter=low"
              className="flex items-center gap-1 text-sm font-semibold text-brand-700"
            >
              {inv.low_stock} low · {inv.out_of_stock} out <ArrowRight className="size-4" />
            </Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {low.map((m) => (
              <li key={m.id}>
                <Link href={`/admin/inventory/${m.id}`} className="flex items-center gap-3 py-2 hover:bg-gray-50">
                  <MedicineThumb image={m.image} form={m.dosage_form} alt={m.brand_name} />
                  <span className="min-w-0 flex-1">
                    <span className="text-sm font-semibold">
                      {m.brand_name} <span className="font-normal text-gray-600">{m.strength}</span>
                    </span>
                    <span className="block truncate text-xs text-gray-600">{m.manufacturer_name}</span>
                  </span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                    {m.stock} left
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-600">
            {inv.no_photo.toLocaleString()} of {inv.products.toLocaleString()} products still need a photo.{" "}
            <Link href="/admin/inventory?filter=nophoto" className="font-semibold text-brand-700">
              Add photos
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  href?: string;
}) {
  const body = (
    <>
      <Icon className="size-5 text-gray-600" />
      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-600">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-gray-600">{sub}</p>
    </>
  );
  const cls = "block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5";
  return href ? (
    <Link href={href} className={`${cls} hover:ring-brand-600`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
