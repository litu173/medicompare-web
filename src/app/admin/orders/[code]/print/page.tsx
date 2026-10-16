import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { PAYMENT_METHODS } from "@/lib/bd";
import { taka } from "@/lib/format";
import { fmtTime } from "@/components/order-status";
import { PrintButton } from "@/components/admin/print-button";

export const metadata = { title: "Packing slip" };

/** Printable packing slip + invoice. The packer ticks each line; it goes in the parcel. */
export default async function PrintSlip({ params }: PageProps<"/admin/orders/[code]/print">) {
  const { code } = await params;
  const data = getOrder(code);
  if (!data) notFound();
  const { order: o, items } = data;
  const s = getSettings();
  const cod = o.payment_method === "cod" && o.payment_status !== "paid";

  return (
    <div className="mx-auto max-w-2xl space-y-4 bg-white p-6 text-gray-900 shadow-sm ring-1 ring-black/5 print:max-w-none print:shadow-none print:ring-0">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/admin/orders/${o.code}`} className="text-sm font-semibold text-brand-700">
          ← Back to order
        </Link>
        <PrintButton />
      </div>

      <header className="flex items-start justify-between border-b-2 border-gray-900 pb-3">
        <div>
          <p className="text-xl font-bold">{s.storeName}</p>
          {s.supportPhone && <p className="text-sm">Help: {s.supportPhone}</p>}
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-black tracking-wider">{o.code}</p>
          <p className="text-sm">{fmtTime(o.created_at)}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-bold uppercase">Deliver to</p>
          <p className="text-base font-bold">{o.name}</p>
          <p className="text-base font-semibold">{o.phone}</p>
          <p>
            {o.line}, {o.area}
            <br />
            {o.district}, {o.division}
          </p>
          {o.note && <p className="mt-1 italic">Note: {o.note}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase">Payment</p>
          <p>{PAYMENT_METHODS.find((p) => p.id === o.payment_method)?.label}</p>
          {cod && (
            <p className="mt-1 inline-block border-2 border-gray-900 px-3 py-1 text-lg font-black">
              COLLECT {taka(o.total)}
            </p>
          )}
        </div>
      </section>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y-2 border-gray-900 text-left">
            <th className="w-10 py-2">✓</th>
            <th className="py-2">Medicine</th>
            <th className="py-2 text-center">Qty</th>
            <th className="py-2 text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-gray-300 align-top">
              <td className="py-2">
                <span className="inline-block size-5 border-2 border-gray-900" />
              </td>
              <td className="py-2">
                <p className="font-bold">
                  {i.brand_name} {i.strength}
                </p>
                <p className="text-xs">
                  {i.dosage_form} · {i.manufacturer_name} · {i.pack_label}
                </p>
              </td>
              <td className="py-2 text-center text-lg font-black">
                {i.qty}
                {(i.units_per_pack ?? 1) > 1 && (
                  <span className="block text-[10px] font-semibold">= {(i.units_per_pack ?? 1) * i.qty} pcs</span>
                )}
              </td>
              <td className="py-2 text-right tabular-nums">{taka(i.unit_price * i.qty)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="text-sm">
          <tr>
            <td colSpan={3} className="pt-2 text-right">
              Subtotal
            </td>
            <td className="pt-2 text-right">{taka(o.subtotal)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="text-right">
              Delivery
            </td>
            <td className="text-right">{o.delivery_fee ? taka(o.delivery_fee) : "Free"}</td>
          </tr>
          <tr className="text-base font-bold">
            <td colSpan={3} className="text-right">
              Total
            </td>
            <td className="text-right">{taka(o.total)}</td>
          </tr>
        </tfoot>
      </table>

      <footer className="grid grid-cols-2 gap-8 pt-6 text-xs">
        <p className="border-t border-gray-900 pt-1">Packed by</p>
        <p className="border-t border-gray-900 pt-1">Checked by</p>
      </footer>
      <p className="text-center text-xs">Items: {items.length} · Please check your medicines on delivery.</p>
    </div>
  );
}
