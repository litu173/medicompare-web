import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getMedicine, getPacks } from "@/lib/catalog";
import { getInventoryRow, getMovements } from "@/lib/inventory";
import { taka, perUnit } from "@/lib/format";
import { MedicineThumb } from "@/components/medicine-thumb";
import { fmtTime } from "@/components/order-status";
import { ActionForm, adminInput } from "@/components/admin/action-form";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { removePhoto, restock, updateLowStock, updatePrices } from "@/app/actions/admin";

export async function generateMetadata({ params }: PageProps<"/admin/inventory/[id]">) {
  const m = getMedicine(Number((await params).id));
  return { title: m ? `${m.brand_name} ${m.strength ?? ""}` : "Product" };
}

const REASONS: Record<string, string> = {
  order: "Sold (order)",
  cancel: "Returned (cancelled order)",
  restock: "Received",
  adjust: "Removed",
  count: "Stock count",
};

export default async function InventoryItem({ params }: PageProps<"/admin/inventory/[id]">) {
  const id = Number((await params).id);
  const m = getMedicine(id);
  if (!m) notFound();
  const inv = getInventoryRow(id);
  const packs = getPacks(id);
  const moves = getMovements(id);
  const card = "rounded-[22px] bg-white p-4 shadow-card";
  const lowAt = inv?.low_stock_at ?? 30;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/inventory" aria-label="Back to inventory" className="rounded-lg p-1.5 hover:bg-gray-200">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="min-w-0 flex-1 text-2xl font-bold">
          {m.brand_name} <span className="font-semibold text-gray-700">{m.strength}</span>
        </h1>
        <Link
          href={`/medicine/${m.id}`}
          target="_blank"
          className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          View in store <ExternalLink className="size-4" />
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className={card}>
          <div className="flex gap-4">
            <MedicineThumb image={m.image} form={m.dosage_form} alt={m.brand_name} size="lg" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold">
                {m.dosage_form} · {m.generic_name}
              </p>
              <p className="text-gray-700">{m.manufacturer_name}</p>
              <p className="mt-1 text-gray-700">Product ID #{m.id}</p>
              <p className="text-gray-700">
                {taka(m.compare_price)}
                {perUnit(m.compare_unit)}
              </p>
              {m.image && (
                <form action={removePhoto} className="mt-2">
                  <input type="hidden" name="medicineId" value={m.id} />
                  <button className="text-sm font-semibold text-red-700 hover:underline">Remove photo</button>
                </form>
              )}
            </div>
          </div>
          <div className="mt-4">
            <PhotoUpload medicineId={m.id} hasPhoto={!!m.image} />
          </div>
        </section>

        <section className={card}>
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Stock</h2>
            <p className="text-3xl font-black tabular-nums">
              {m.stock.toLocaleString()}
              <span className="ml-1 text-sm font-medium text-gray-700">units</span>
            </p>
          </div>
          {m.stock === 0 ? (
            <p className="mt-1 text-sm font-semibold text-red-700">Out of stock. Customers see alternatives instead.</p>
          ) : m.stock <= lowAt ? (
            <p className="mt-1 text-sm font-semibold text-amber-800">Running low (alert at {lowAt}).</p>
          ) : null}

          <ActionForm action={restock} submit="Update stock" className="mt-3 space-y-3">
            <input type="hidden" name="medicineId" value={m.id} />
            <fieldset className="grid grid-cols-3 gap-2 text-sm">
              <legend className="sr-only">What happened?</legend>
              {[
                ["add", "Received"],
                ["remove", "Remove"],
                ["set", "Counted"],
              ].map(([v, l], i) => (
                <label
                  key={v}
                  className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 py-2.5 font-medium has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-800"
                >
                  <input type="radio" name="mode" value={v} defaultChecked={i === 0} className="accent-brand-600" /> {l}
                </label>
              ))}
            </fieldset>
            <label className="block text-sm font-medium">
              Units
              <input name="qty" type="number" min={0} inputMode="numeric" required className={`${adminInput} mt-1`} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm font-medium">
                Supplier invoice (optional)
                <input name="ref" className={`${adminInput} mt-1`} />
              </label>
              <label className="block text-sm font-medium">
                Note (optional)
                <input name="note" className={`${adminInput} mt-1`} placeholder="e.g. expired" />
              </label>
            </div>
          </ActionForm>

          <ActionForm
            action={updateLowStock}
            submit="Save alert level"
            submitClass="border border-gray-300 bg-white hover:bg-gray-50 text-gray-900"
            className="mt-4 space-y-2 border-t border-gray-100 pt-4"
          >
            <input type="hidden" name="medicineId" value={m.id} />
            <label className="block text-sm font-medium">
              Warn me when stock falls to
              <input name="lowStockAt" type="number" min={0} defaultValue={lowAt} className={`${adminInput} mt-1`} />
            </label>
          </ActionForm>
        </section>

        <section className={card}>
          <h2 className="mb-1 font-semibold">Selling prices</h2>
          <p className="mb-3 text-sm text-gray-700">
            Changing a price re-ranks this product against its equivalents. Edits survive data re-imports.
          </p>
          {packs.length === 0 ? (
            <p className="text-sm text-gray-700">No purchasable packs.</p>
          ) : (
            <ActionForm action={updatePrices} submit="Save prices">
              {packs.map((p) => (
                <label key={p.id} className="flex items-center gap-3 text-sm">
                  <span className="flex-1 font-medium">{p.label}</span>
                  <span className="text-gray-700">৳</span>
                  <input
                    name={`price_${p.id}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={p.price}
                    className="h-11 w-28 rounded-lg border border-gray-300 px-2 text-right text-[16px] tabular-nums outline-none focus:border-brand-600"
                  />
                </label>
              ))}
            </ActionForm>
          )}
        </section>

        <section className={card}>
          <h2 className="mb-2 font-semibold">Stock history</h2>
          {moves.length === 0 ? (
            <p className="text-sm text-gray-700">No changes recorded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {moves.map((mv) => (
                <li key={mv.id} className="flex items-center gap-3 py-2">
                  <span
                    className={`w-16 text-right font-bold tabular-nums ${mv.delta > 0 ? "text-brand-700" : "text-red-700"}`}
                  >
                    {mv.delta > 0 ? "+" : ""}
                    {mv.delta}
                  </span>
                  <span className="min-w-0 flex-1">
                    {REASONS[mv.reason] ?? mv.reason}
                    {mv.ref && (
                      <>
                        {" · "}
                        {mv.reason === "order" || mv.reason === "cancel" ? (
                          <Link href={`/admin/orders/${mv.ref}`} className="font-mono text-brand-700 underline">
                            {mv.ref}
                          </Link>
                        ) : (
                          mv.ref
                        )}
                      </>
                    )}
                    {mv.note && <span className="block text-xs text-gray-600">{mv.note}</span>}
                  </span>
                  <span className="text-right text-xs text-gray-600">
                    {fmtTime(mv.created_at)}
                    {mv.user_name && <span className="block">{mv.user_name}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
