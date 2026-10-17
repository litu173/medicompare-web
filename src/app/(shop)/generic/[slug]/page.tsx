import type { Metadata } from "next";
import Link from "next/link";
import { ScrollRow } from "@/components/scroll-row";
import { chipCls } from "@/components/chip";
import { notFound } from "next/navigation";
import { getGeneric, getGenericGroups } from "@/lib/catalog";
import { MedicineRow } from "@/components/medicine-row";
import { Monograph } from "@/components/monograph";
import { taka, savingsPct } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/generic/[slug]">): Promise<Metadata> {
  const g = getGeneric((await params).slug);
  return g ? { title: `${g.name} — all brands & prices in Bangladesh` } : {};
}

export default async function GenericPage({ params, searchParams }: PageProps<"/generic/[slug]">) {
  const generic = getGeneric((await params).slug);
  if (!generic) notFound();
  const { v } = await searchParams;
  const all = getGenericGroups(generic.id);
  const groups = typeof v === "string" ? all.filter((g) => g[0].equiv_key === v) : all;
  const base = `/generic/${generic.slug}`;

  return (
    <div className="space-y-5 pt-4">
      <section className="bg-hero rounded-[24px] border border-gold/25 p-6 text-white shadow-lux">
        <p className="eyebrow !text-gold-2">Generic · chemical name</p>
        <h1 className="mt-2 font-display text-3xl">{generic.name}</h1>
        {generic.drug_class && <p className="mt-1 text-sm text-white/70">{generic.drug_class}</p>}
        <p className="mt-3 text-sm font-bold text-mint">
          {generic.brand_count} brands in {all.length} strength/form combination{all.length > 1 ? "s" : ""}
        </p>
      </section>

      {all.length > 1 && (
        <ScrollRow label="Strength and form">
          <Link href={base} className={chipCls(!v)}>
            All
          </Link>
          {all.map((g) => (
            <Link
              key={g[0].equiv_key}
              href={`${base}?v=${encodeURIComponent(g[0].equiv_key)}`}
              className={chipCls(v === g[0].equiv_key)}
            >
              {g[0].strength ?? "—"} {g[0].form_group}
            </Link>
          ))}
        </ScrollRow>
      )}

      {groups.map((items) => {
        const priced = items.filter((i) => i.compare_price !== null && !i.price_suspect);
        const min = priced[0]?.compare_price ?? null;
        const max = priced.at(-1)?.compare_price ?? null;
        return (
          <section key={items[0].equiv_key} className="overflow-hidden rounded-[22px] bg-white shadow-card">
            <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-3 py-3">
              <div>
                <h2 className="font-semibold">
                  {items[0].strength ?? "—"} · {items[0].form_group}
                </h2>
                <p className="text-xs text-gray-600">{items.length} brands · cheapest first</p>
              </div>
              {min !== null && max !== null && items.length > 1 && savingsPct(min, max) > 0 && (
                <p className="text-right text-xs">
                  <span className="text-gray-600">
                    {taka(min)} – {taka(max)}/{priced[0].compare_unit}
                  </span>
                  <br />
                  <span className="font-semibold text-brand-700">save up to {savingsPct(min, max)}%</span>
                </p>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {(v ? items : items.slice(0, 8)).map((m, i) => (
                <MedicineRow key={m.id} m={m} cheapest={i === 0 && items.length > 1} reference={max} />
              ))}
            </div>
            {!v && items.length > 8 && (
              <Link
                href={`${base}?v=${encodeURIComponent(items[0].equiv_key)}`}
                className="block border-t border-gray-100 py-2.5 text-center text-sm font-medium text-brand-700"
              >
                See all {items.length} brands
              </Link>
            )}
          </section>
        );
      })}

      <section>
        <h2 className="mb-2 text-lg font-semibold">Drug information</h2>
        <Monograph generic={generic} />
      </section>
    </div>
  );
}
