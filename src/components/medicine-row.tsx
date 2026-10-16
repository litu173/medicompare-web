import Link from "next/link";
import type { MedicineRow as Med } from "@/lib/catalog";
import { taka, perUnit, savingsPct } from "@/lib/format";
import { CartControl } from "./cart-control";
import { MedicineThumb } from "./medicine-thumb";

export function MedicineRow({
  m,
  cheapest,
  reference,
  highlight,
  showGeneric = false,
}: {
  m: Med;
  cheapest?: boolean;
  /** Price to compare against for the "save" label (e.g. the brand the user searched). */
  reference?: number | null;
  highlight?: string;
  showGeneric?: boolean;
}) {
  const out = m.stock <= 0 || m.compare_price === null;
  const suspect = !!m.price_suspect;
  const save = reference && m.compare_price && !suspect ? savingsPct(m.compare_price, reference) : 0;
  return (
    <div className={`flex items-center gap-3 px-3 py-3 ${highlight ? "bg-amber-50" : "hover:bg-gray-50"}`}>
      <Link href={`/medicine/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <MedicineThumb image={m.image} form={m.dosage_form} alt={`${m.brand_name} ${m.strength ?? ""}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="text-[15px] font-semibold text-gray-900">{m.brand_name}</span>
            <span className="text-sm text-gray-600">{m.strength}</span>
            {cheapest && !out && !suspect && (
              <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-700">
                Cheapest
              </span>
            )}
            {highlight && (
              <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
                {highlight}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-gray-600">
            {showGeneric ? `${m.dosage_form} · ${m.generic_name} · ` : ""}
            {m.manufacturer_name}
          </p>
          <p className="mt-0.5 text-sm">
            <span className="font-bold tabular-nums text-gray-900">{taka(m.compare_price)}</span>
            <span className="text-xs text-gray-600">{perUnit(m.compare_unit)}</span>
            {out ? (
              <span className="ml-2 text-xs font-semibold text-red-700">
                {m.compare_price === null ? "Price unavailable" : "Out of stock"}
              </span>
            ) : suspect ? (
              <span
                className="ml-2 text-xs font-semibold text-amber-800"
                title="Far from other brands' prices; may be a data error"
              >
                Price unverified
              </span>
            ) : save > 0 ? (
              <span className="ml-2 text-xs font-semibold text-brand-700">Save {save}%</span>
            ) : null}
          </p>
        </div>
      </Link>
      {m.pack_id && m.list_price !== null && m.list_label && (
        <CartControl
          packId={m.pack_id}
          medicineId={m.id}
          brandName={m.brand_name}
          description={[m.strength, m.dosage_form, m.manufacturer_name].filter(Boolean).join(" · ")}
          packLabel={m.list_label}
          price={m.list_price}
          disabled={out}
        />
      )}
    </div>
  );
}
