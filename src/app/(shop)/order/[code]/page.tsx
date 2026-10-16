import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bike, CheckCircle2, Phone } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { canViewOrder } from "@/lib/access";
import { getOrder } from "@/lib/orders";
import { PAYMENT_METHODS } from "@/lib/bd";
import { taka } from "@/lib/format";
import { StatusBadge, StatusTracker, fmtTime } from "@/components/order-status";
import { MedicineThumb } from "@/components/medicine-thumb";
import { AutoRefresh } from "@/components/auto-refresh";

export const metadata: Metadata = { title: "Track order" };

export default async function OrderPage({ params, searchParams }: PageProps<"/order/[code]">) {
  const { code } = await params;
  const { placed } = await searchParams;
  const data = getOrder(code);
  const user = await getCurrentUser();
  if (!data || !(await canViewOrder(data.order, user))) notFound();
  const { order, items, events } = data;
  const active = !["delivered", "cancelled"].includes(order.status);

  return (
    <div className="space-y-4 pt-4">
      {active && <AutoRefresh seconds={30} />}
      {placed && (
        <div className="rounded-2xl bg-brand-600 p-5 text-center text-white">
          <CheckCircle2 className="mx-auto size-10" />
          <h1 className="mt-2 text-xl font-bold">Order placed!</h1>
          <p className="mt-1 text-sm text-white/90">
            We&apos;ll call {order.phone} to confirm. Your order ID is <b>{order.code}</b>. Use it to track the order.
          </p>
        </div>
      )}

      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">Order</p>
            <p className="font-mono text-lg font-bold">{order.code}</p>
            <p className="text-xs text-gray-600">Placed {fmtTime(order.created_at)}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {order.status === "shipped" && order.rider_name && (
          <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-950">
            <Bike className="size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">On the way with {order.rider_name}</p>
              {order.tracking_note && <p>{order.tracking_note}</p>}
              {order.payment_method === "cod" && order.payment_status !== "paid" && (
                <p>Please keep {taka(order.total)} ready (cash on delivery).</p>
              )}
            </div>
            {order.rider_phone && (
              <a
                href={`tel:${order.rider_phone}`}
                className="flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white hover:bg-blue-800"
              >
                <Phone className="size-4" /> Call
              </a>
            )}
          </div>
        )}

        <StatusTracker status={order.status} events={events} />
        {active && <p className="text-xs text-gray-600">This page updates automatically.</p>}
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-3 font-semibold">Items ({items.length})</h2>
        <ul className="space-y-3 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-3">
              <MedicineThumb image={i.image} form={i.dosage_form} alt={i.brand_name} />
              <span className="min-w-0 flex-1">
                <Link href={`/medicine/${i.medicine_id}`} className="font-semibold hover:underline">
                  {i.brand_name}
                </Link>{" "}
                <span className="text-gray-700">× {i.qty}</span>
                <span className="block truncate text-xs text-gray-600">
                  {i.pack_label} · {i.description}
                </span>
              </span>
              <span className="tabular-nums">{taka(i.unit_price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">Subtotal</span>
            <span>{taka(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">Delivery</span>
            <span>{order.delivery_fee ? taka(order.delivery_fee) : "Free"}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{taka(order.total)}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
          <h2 className="mb-1 font-semibold">Delivery to</h2>
          <p>
            {order.name} · {order.phone}
          </p>
          <p className="text-gray-700">
            {order.line}, {order.area}, {order.district}, {order.division}
          </p>
          {order.note && <p className="mt-1 text-gray-700">Note: {order.note}</p>}
        </div>
        <div className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
          <h2 className="mb-1 font-semibold">Payment</h2>
          <p>{PAYMENT_METHODS.find((p) => p.id === order.payment_method)?.label ?? order.payment_method}</p>
          <p className="capitalize text-gray-700">{order.payment_status}</p>
          {order.prescription_file && <p className="mt-1 text-gray-700">Prescription attached</p>}
        </div>
      </section>

      {!user && (
        <p className="rounded-xl bg-white p-4 text-center text-sm text-gray-700 shadow-sm ring-1 ring-black/5">
          Want to track all your orders in one place?{" "}
          <Link href="/register" className="font-semibold text-brand-700">
            Create an account
          </Link>
        </p>
      )}
      <Link href="/" className="block py-2 text-center text-sm font-semibold text-brand-700">
        Continue shopping
      </Link>
    </div>
  );
}
