import Link from "next/link";
import { Award, TrendingDown } from "lucide-react";
import type { MedicineRow as Med } from "@/lib/catalog";
import { taka, perUnit, savingsPct } from "@/lib/format";
import { CartControl } from "./cart-control";
import { MedicineThumb } from "./medicine-thumb";

export function Pill({
  tone,
  children,
}: {
  tone: "gold" | "mint" | "warn" | "amber" | "night";
  children: React.ReactNode;
}) {
  const cls = {
    gold: "bg-gold-bg text-gold-deep",
    mint: "bg-brand-100 text-brand-700",
    warn: "bg-[#ffe9e3] text-[#c23b22]",
    amber: "bg-[#fff6e5] text-[#9a5b00]",
    night: "bg-night text-gold-2",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>
      {children}
    </span>
  );
}

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
    <div className={`flex items-center gap-3.5 px-4 py-3.5 ${highlight ? "bg-gold-bg/60" : "hover:bg-ivory/60"}`}>
      <Link href={`/medicine/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3.5">
        <MedicineThumb image={m.image} form={m.dosage_form} alt={`${m.brand_name} ${m.strength ?? ""}`} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-base font-bold text-gray-900">{m.brand_name}</span>
            <span className="text-[13px] font-semibold text-gray-600">{m.strength}</span>
          </p>
          <p className="truncate text-xs text-gray-600">
            {showGeneric ? `${m.dosage_form} · ${m.generic_name} · ` : ""}
            {m.manufacturer_name}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span>
              <span className="font-display text-[17px] font-semibold tabular-nums text-gray-900">
                {taka(m.compare_price)}
              </span>
              <span className="text-[11px] font-semibold text-gray-600">{perUnit(m.compare_unit)}</span>
            </span>
            {cheapest && !out && !suspect && (
              <Pill tone="gold">
                <Award className="size-3" /> Cheapest
              </Pill>
            )}
            {highlight && <Pill tone="night">{highlight}</Pill>}
            {out ? (
              <Pill tone="warn">{m.compare_price === null ? "No price" : "Out of stock"}</Pill>
            ) : suspect ? (
              <Pill tone="amber">Price unverified</Pill>
            ) : save > 0 ? (
              <Pill tone="mint">
                <TrendingDown className="size-3" /> Save {save}%
              </Pill>
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
