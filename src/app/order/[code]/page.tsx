import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { canViewOrder } from "@/lib/access";
import { getOrder } from "@/lib/orders";
import { PAYMENT_METHODS } from "@/lib/bd";
import { taka } from "@/lib/format";
import { StatusBadge, StatusTimeline } from "@/components/order-status";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: PageProps<"/order/[code]">) {
  const { code } = await params;
  const { placed } = await searchParams;
  const data = getOrder(code);
  const user = await getCurrentUser();
  if (!data || !(await canViewOrder(data.order, user))) notFound();
  const { order, items } = data;

  return (
    <div className="space-y-4 pt-4">
      {placed && (
        <div className="rounded-2xl bg-brand-600 p-5 text-center text-white">
          <CheckCircle2 className="mx-auto size-10" />
          <h1 className="mt-2 text-xl font-bold">Order placed!</h1>
          <p className="mt-1 text-sm text-white/85">
            We&apos;ll call {order.phone} to confirm. Keep your order ID: <b>{order.code}</b>
          </p>
        </div>
      )}

      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Order</p>
            <p className="font-mono font-semibold">{order.code}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <StatusTimeline status={order.status} />
        <p className="text-xs text-gray-500">
          Placed {new Date(order.created_at + "Z").toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="mb-3 font-semibold">Items</h2>
        <ul className="space-y-3 text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span className="min-w-0">
                <Link href={`/medicine/${i.medicine_id}`} className="font-medium hover:underline">
                  {i.brand_name}
                </Link>{" "}
                <span className="text-gray-500">× {i.qty}</span>
                <span className="block truncate text-xs text-gray-500">
                  {i.pack_label} · {i.description}
                </span>
              </span>
              <span className="tabular-nums">{taka(i.unit_price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span>{taka(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery</span>
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
          <p className="text-gray-600">
            {order.line}, {order.area}, {order.district}, {order.division}
          </p>
          {order.note && <p className="mt-1 text-gray-500">Note: {order.note}</p>}
        </div>
        <div className="rounded-2xl bg-white p-4 text-sm shadow-sm ring-1 ring-black/5">
          <h2 className="mb-1 font-semibold">Payment</h2>
          <p>{PAYMENT_METHODS.find((p) => p.id === order.payment_method)?.label ?? order.payment_method}</p>
          <p className="capitalize text-gray-600">{order.payment_status}</p>
          {order.prescription_file && <p className="mt-1 text-gray-500">Prescription attached</p>}
        </div>
      </section>

      {!user && (
        <p className="rounded-xl bg-white p-4 text-center text-sm text-gray-600 shadow-sm ring-1 ring-black/5">
          Want to track all your orders in one place?{" "}
          <Link href="/register" className="font-semibold text-brand-700">
            Create an account
          </Link>
        </p>
      )}
      <Link href="/" className="block text-center text-sm font-medium text-brand-700">
        Continue shopping
      </Link>
    </div>
  );
}
