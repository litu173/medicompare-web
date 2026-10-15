import Link from "next/link";
import type { MedicineRow as Med } from "@/lib/catalog";
import { taka, perUnit, savingsPct } from "@/lib/format";
import { QuickAdd } from "./quick-add";

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
    <div className={`flex items-center gap-3 px-3 py-3 hover:bg-gray-50 ${highlight ? "bg-amber-50/70" : ""}`}>
      <Link href={`/medicine/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="font-semibold text-gray-900">{m.brand_name}</span>
            <span className="text-sm text-gray-500">{m.strength}</span>
            {cheapest && !out && !suspect && (
              <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-700">
                Cheapest
              </span>
            )}
            {highlight && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                {highlight}
              </span>
            )}
          </div>
          <p className="truncate text-xs text-gray-500">
            {showGeneric ? `${m.dosage_form} · ${m.generic_name} · ` : ""}
            {m.manufacturer_name}
          </p>
          {out ? (
            <p className="mt-0.5 text-xs font-medium text-red-600">
              {m.compare_price === null ? "Price unavailable" : "Out of stock"}
            </p>
          ) : suspect ? (
            <p
              className="mt-0.5 text-xs font-medium text-amber-700"
              title="Far from other brands' prices; may be a data error"
            >
              Price unverified
            </p>
          ) : save > 0 ? (
            <p className="mt-0.5 text-xs font-medium text-brand-700">Save {save}%</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="font-semibold tabular-nums text-gray-900">
            {taka(m.compare_price)}
            <span className="text-xs font-normal text-gray-500">{perUnit(m.compare_unit)}</span>
          </p>
          {m.list_label && m.list_label !== `1 ${m.compare_unit}` && (
            <p className="text-[11px] text-gray-500">
              {taka(m.list_price)} · {m.list_label}
            </p>
          )}
        </div>
      </Link>
      {m.pack_id && m.list_price !== null && m.list_label && (
        <QuickAdd
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
