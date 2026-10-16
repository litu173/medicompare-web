import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, FileText, MapPin, Phone, Printer } from "lucide-react";
import { getOrder, NEXT_STATUS } from "@/lib/orders";
import { PAYMENT_METHODS, STATUS_INFO } from "@/lib/bd";
import { taka } from "@/lib/format";
import { StatusBadge, fmtTime } from "@/components/order-status";
import { MedicineThumb } from "@/components/medicine-thumb";
import { ActionForm, adminInput } from "@/components/admin/action-form";
import { togglePacked, updateStatus } from "@/app/actions/admin";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[code]">) {
  return { title: `Order ${(await params).code}` };
}

export default async function AdminOrder({ params }: PageProps<"/admin/orders/[code]">) {
  const { code } = await params;
  const data = getOrder(code);
  if (!data) notFound();
  const { order: o, items, events } = data;
  const packedCount = items.filter((i) => i.packed).length;
  const allPacked = packedCount === items.length;
  const canCancel = NEXT_STATUS[o.status]?.includes("cancelled");
  const card = "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" aria-label="Back to orders" className="rounded-lg p-1.5 hover:bg-gray-200">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="font-mono text-2xl font-bold">{o.code}</h1>
          <p className="text-sm text-gray-700">
            Placed {fmtTime(o.created_at)} · {items.length} item{items.length > 1 ? "s" : ""} · {taka(o.total)}
          </p>
        </div>
        <StatusBadge status={o.status} />
        <Link
          href={`/admin/orders/${o.code}/print`}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          <Printer className="size-4" /> Packing slip
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* ---------- The one thing to do next ---------- */}
          {o.status === "placed" && (
            <section className={`${card} border-l-4 border-amber-500`}>
              <h2 className="text-lg font-bold">Step 1 · Confirm the order</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-800">
                <li>
                  Call <b>{o.name}</b> on{" "}
                  <a href={`tel:${o.phone}`} className="font-semibold text-brand-700 underline">
                    {o.phone}
                  </a>{" "}
                  to confirm the order and address.
                </li>
                <li>
                  {o.prescription_file
                    ? "Check the prescription below matches the medicines."
                    : "No prescription was uploaded. Ask for one if any item needs it."}
                </li>
                <li>Confirm. The customer sees “Confirmed” right away.</li>
              </ol>
              <ActionForm action={updateStatus} submit="Confirm order" className="mt-3 space-y-3">
                <input type="hidden" name="code" value={o.code} />
                <input type="hidden" name="status" value="confirmed" />
              </ActionForm>
            </section>
          )}

          {o.status === "confirmed" && (
            <section className={`${card} border-l-4 border-orange-500`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold">Step 2 · Pick &amp; pack</h2>
                <span className="text-sm font-semibold tabular-nums">
                  {packedCount} / {items.length} checked
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-brand-600 transition-all"
                  style={{ width: `${(packedCount / items.length) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-700">
                Take each item from the shelf, compare it with the photo, name, strength and maker, count the quantity,
                then tap <b>Checked</b>.
              </p>
            </section>
          )}

          {o.status === "packed" && (
            <section className={`${card} border-l-4 border-sky-500`}>
              <h2 className="text-lg font-bold">Step 3 · Hand over for delivery</h2>
              <p className="mt-1 text-sm text-gray-700">
                The customer will see this person&apos;s name and can call them.
              </p>
              <ActionForm action={updateStatus} submit="Send out for delivery" className="mt-3 space-y-3">
                <input type="hidden" name="code" value={o.code} />
                <input type="hidden" name="status" value="shipped" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium">
                    Delivery person
                    <input name="riderName" required className={`${adminInput} mt-1`} placeholder="Name" />
                  </label>
                  <label className="block text-sm font-medium">
                    Their mobile
                    <input
                      name="riderPhone"
                      required
                      type="tel"
                      className={`${adminInput} mt-1`}
                      placeholder="01XXXXXXXXX"
                    />
                  </label>
                </div>
                <label className="block text-sm font-medium">
                  Note for customer (optional)
                  <input
                    name="trackingNote"
                    className={`${adminInput} mt-1`}
                    placeholder="e.g. Pathao parcel #12345, arriving by 6 pm"
                  />
                </label>
              </ActionForm>
            </section>
          )}

          {o.status === "shipped" && (
            <section className={`${card} border-l-4 border-blue-500`}>
              <h2 className="text-lg font-bold">Step 4 · Delivered?</h2>
              <p className="mt-1 text-sm text-gray-700">
                With {o.rider_name} ({o.rider_phone}).{" "}
                {o.payment_method === "cod" && (
                  <>
                    Collect <b>{taka(o.total)}</b> cash.
                  </>
                )}
              </p>
              <ActionForm action={updateStatus} submit="Mark as delivered" className="mt-3 space-y-3">
                <input type="hidden" name="code" value={o.code} />
                <input type="hidden" name="status" value="delivered" />
              </ActionForm>
            </section>
          )}

          {(o.status === "delivered" || o.status === "cancelled") && (
            <section className={card}>
              <p className="font-semibold">{STATUS_INFO[o.status].detail}</p>
              {o.cancel_reason && <p className="text-sm text-gray-700">Reason: {o.cancel_reason}</p>}
            </section>
          )}

          {/* ---------- Items / packing checklist ---------- */}
          <section className={card}>
            <h2 className="mb-3 font-semibold">Items</h2>
            <ul className="space-y-3">
              {items.map((i) => {
                const units = (i.units_per_pack ?? 1) * i.qty;
                return (
                  <li
                    key={i.id}
                    className={`flex flex-wrap items-center gap-3 rounded-xl border-2 p-3 sm:flex-nowrap ${
                      i.packed ? "border-brand-600 bg-brand-50" : "border-gray-200"
                    }`}
                  >
                    <MedicineThumb image={i.image} form={i.dosage_form} alt={i.brand_name} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold leading-tight">
                        {i.brand_name} <span className="font-semibold text-gray-700">{i.strength}</span>
                      </p>
                      <p className="text-sm text-gray-800">
                        {i.dosage_form} · {i.manufacturer_name}
                      </p>
                      <p className="text-sm text-gray-700">{i.pack_label}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-black tabular-nums">×{i.qty}</p>
                      {units !== i.qty && <p className="text-xs font-semibold text-gray-700">= {units} pcs</p>}
                    </div>
                    {o.status === "confirmed" && (
                      <form action={togglePacked} className="w-full sm:w-auto">
                        <input type="hidden" name="code" value={o.code} />
                        <input type="hidden" name="itemId" value={i.id} />
                        <input type="hidden" name="packed" value={i.packed ? "0" : "1"} />
                        <button
                          className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 font-bold sm:w-32 ${
                            i.packed
                              ? "bg-brand-600 text-white hover:bg-brand-700"
                              : "border-2 border-gray-400 bg-white text-gray-800 hover:border-brand-600"
                          }`}
                        >
                          <Check className="size-5" /> {i.packed ? "Checked" : "Check"}
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
            {o.status === "confirmed" && (
              <ActionForm
                action={updateStatus}
                submit={
                  allPacked
                    ? "All checked · Mark as packed"
                    : `Check all items first (${items.length - packedCount} left)`
                }
                submitClass={allPacked ? "bg-brand-600 hover:bg-brand-700 text-white" : "bg-gray-200 text-gray-700"}
                className="mt-4 space-y-3"
              >
                <input type="hidden" name="code" value={o.code} />
                <input type="hidden" name="status" value="packed" />
              </ActionForm>
            )}
            <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Subtotal</span>
                <span>{taka(o.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Delivery</span>
                <span>{o.delivery_fee ? taka(o.delivery_fee) : "Free"}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{taka(o.total)}</span>
              </div>
            </div>
          </section>
        </div>

        {/* ---------- Side column ---------- */}
        <div className="space-y-4">
          <section className={card}>
            <h2 className="mb-2 font-semibold">Customer</h2>
            <p className="font-medium">{o.name}</p>
            <a href={`tel:${o.phone}`} className="mt-1 flex items-center gap-2 text-sm font-semibold text-brand-700">
              <Phone className="size-4" /> {o.phone}
            </a>
            {o.guest_email && <p className="text-sm text-gray-700">{o.guest_email}</p>}
            <p className="mt-2 flex gap-2 text-sm text-gray-800">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span>
                {o.line}, {o.area}, {o.district}, {o.division}
              </span>
            </p>
            {o.note && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">Note: {o.note}</p>}
            <p className="mt-2 text-sm text-gray-700">
              {PAYMENT_METHODS.find((p) => p.id === o.payment_method)?.label} ·{" "}
              <span className="capitalize">{o.payment_status}</span>
            </p>
          </section>

          {o.prescription_file && (
            <section className={card}>
              <h2 className="mb-2 flex items-center gap-2 font-semibold">
                <FileText className="size-4" /> Prescription
              </h2>
              {o.prescription_file.endsWith(".pdf") ? (
                <a
                  href={`/api/admin/prescriptions/${o.prescription_file}`}
                  target="_blank"
                  className="text-sm font-semibold text-brand-700 underline"
                >
                  Open PDF
                </a>
              ) : (
                <a href={`/api/admin/prescriptions/${o.prescription_file}`} target="_blank">
                  {/* eslint-disable-next-line @next/next/no-img-element -- private admin-only route */}
                  <img
                    src={`/api/admin/prescriptions/${o.prescription_file}`}
                    alt="Prescription"
                    className="w-full rounded-lg border"
                  />
                </a>
              )}
            </section>
          )}

          <section className={card}>
            <h2 className="mb-2 font-semibold">History</h2>
            <ol className="space-y-2 text-sm">
              {events.map((e) => (
                <li key={e.id}>
                  <span className="font-semibold">{STATUS_INFO[e.status]?.label ?? e.status}</span>{" "}
                  <span className="text-gray-600">· {fmtTime(e.created_at)}</span>
                  {e.actor && <span className="text-gray-600"> · {e.actor}</span>}
                  {e.note && <p className="text-gray-700">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>

          {canCancel && (
            <section className={card}>
              <h2 className="mb-2 font-semibold text-red-800">Cancel order</h2>
              <ActionForm
                action={updateStatus}
                submit="Cancel order"
                submitClass="border-2 border-red-600 text-red-700 hover:bg-red-50"
                confirm="Cancel this order? Stock will be returned to inventory."
              >
                <input type="hidden" name="code" value={o.code} />
                <input type="hidden" name="status" value="cancelled" />
                <input name="note" required placeholder="Reason (customer will see this)" className={adminInput} />
              </ActionForm>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
