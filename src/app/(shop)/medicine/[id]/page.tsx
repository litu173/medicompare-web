import type { Metadata } from "next";
import Link from "next/link";
import { ScrollRow } from "@/components/scroll-row";
import { MedicineThumb } from "@/components/medicine-thumb";
import { notFound } from "next/navigation";
import { AlertTriangle, Building2, ChevronRight, FlaskConical, TrendingDown } from "lucide-react";
import { getEquivalents, getGenericById, getMedicine, getPacks, getVariants } from "@/lib/catalog";
import { MedicineRow } from "@/components/medicine-row";
import { PackPicker } from "@/components/pack-picker";
import { Monograph } from "@/components/monograph";
import { taka, perUnit, savingsPct } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/medicine/[id]">): Promise<Metadata> {
  const m = getMedicine(Number((await params).id));
  if (!m) return {};
  return {
    title: `${m.brand_name} ${m.strength ?? ""} price & cheaper alternatives`,
    description: `${m.brand_name} (${m.generic_name}) by ${m.manufacturer_name}. Compare prices of all equivalent brands in Bangladesh.`,
  };
}

export default async function MedicinePage({ params }: PageProps<"/medicine/[id]">) {
  const m = getMedicine(Number((await params).id));
  if (!m) notFound();

  const packs = getPacks(m.id);
  const equivalents = getEquivalents(m.equiv_key);
  const alternatives = equivalents.filter((e) => e.id !== m.id);
  const cheaper = alternatives.filter(
    (a) =>
      a.compare_price !== null && !a.price_suspect && m.compare_price !== null && a.compare_price < m.compare_price,
  );
  const cheapest = equivalents.find((e) => e.compare_price !== null && !e.price_suspect && e.stock > 0);
  const rank = equivalents.findIndex((e) => e.id === m.id) + 1;
  const generic = m.generic_id ? getGenericById(m.generic_id) : undefined;
  const variants = getVariants(m.generic_name, m.equiv_key);
  const outOfStock = m.stock <= 0;
  const maxSave = cheapest && m.compare_price ? savingsPct(cheapest.compare_price!, m.compare_price) : 0;

  return (
    <div className="space-y-5 pt-4">
      <nav className="flex items-center gap-1 text-xs text-gray-600">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <ChevronRight className="size-3" />
        {m.generic_slug ? (
          <Link href={`/generic/${m.generic_slug}`} className="truncate hover:underline">
            {m.generic_name}
          </Link>
        ) : (
          <span className="truncate">{m.generic_name}</span>
        )}
      </nav>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <div className="flex items-start gap-4">
          <MedicineThumb
            image={m.image}
            form={m.dosage_form}
            alt={`${m.brand_name} ${m.strength ?? ""} pack`}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-600">{m.dosage_form}</p>
            <h1 className="text-2xl font-bold leading-tight text-gray-900">
              {m.brand_name} <span className="font-medium text-gray-600">{m.strength}</span>
            </h1>
            {m.type === "herbal" && (
              <span className="mt-1 inline-block rounded bg-lime-100 px-2 py-0.5 text-xs font-semibold text-lime-800">
                Herbal
              </span>
            )}
            {!m.image && <p className="mt-1 text-xs text-gray-600">Product photo coming soon</p>}
          </div>
        </div>

        <div className="mt-3 space-y-1.5 text-sm">
          {m.generic_slug ? (
            <Link href={`/generic/${m.generic_slug}`} className="flex items-center gap-2 text-brand-700">
              <FlaskConical className="size-4 shrink-0" />
              <span className="font-medium">{m.generic_name}</span>
            </Link>
          ) : (
            <p className="flex items-center gap-2 text-gray-700">
              <FlaskConical className="size-4 shrink-0" />
              {m.generic_name}
            </p>
          )}
          <Link href={`/company/${m.manufacturer_slug}`} className="flex items-center gap-2 text-gray-700">
            <Building2 className="size-4 shrink-0 text-gray-500" />
            {m.manufacturer_name}
          </Link>
        </div>

        <div className="mt-4 flex items-baseline gap-2 border-t border-gray-100 pt-4">
          <span className="text-2xl font-bold tabular-nums">{taka(m.compare_price)}</span>
          <span className="text-sm text-gray-600">{perUnit(m.compare_unit)}</span>
          {equivalents.length > 1 && m.compare_price !== null && (
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${rank === 1 ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-700"}`}
            >
              {rank === 1 ? "Lowest price" : `#${rank} of ${equivalents.length} by price`}
            </span>
          )}
        </div>
        <p className={`mt-1 text-sm font-medium ${outOfStock ? "text-red-700" : "text-brand-700"}`}>
          {outOfStock ? "Currently out of stock" : m.stock < 20 ? `Only ${m.stock} left` : "In stock"}
        </p>

        <div className="mt-4">
          <PackPicker
            medicineId={m.id}
            brandName={m.brand_name}
            description={[m.strength, m.dosage_form, m.manufacturer_name].filter(Boolean).join(" · ")}
            packs={packs}
            stock={m.stock}
          />
        </div>
      </section>

      {cheaper.length > 0 && cheapest && maxSave > 0 && (
        <a href="#alternatives" className="flex items-center gap-3 rounded-xl bg-brand-600 p-4 text-white">
          <TrendingDown className="size-6 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">
              {cheaper.length} cheaper equivalent{cheaper.length > 1 ? "s" : ""} — save up to {maxSave}%
            </p>
            <p className="text-white/80">
              {cheapest.brand_name} by {cheapest.manufacturer_name} costs {taka(cheapest.compare_price)}
              {perUnit(cheapest.compare_unit)}
            </p>
          </div>
        </a>
      )}

      {outOfStock && alternatives.some((a) => a.stock > 0) && (
        <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="size-4.5 shrink-0" />
          <p>
            This brand is out of stock. The alternatives below contain the same active ingredient, strength and form.
          </p>
        </div>
      )}

      <section id="alternatives" className="scroll-mt-20">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Equivalent brands</h2>
          <span className="text-xs text-gray-600">{equivalents.length} total · cheapest first</span>
        </div>
        {alternatives.length === 0 ? (
          <p className="rounded-xl bg-white p-4 text-sm text-gray-600 shadow-sm ring-1 ring-black/5">
            No other brand with exactly the same generic, strength and form is listed.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
            {equivalents.map((e, i) => (
              <MedicineRow
                key={e.id}
                m={e}
                cheapest={i === 0}
                reference={m.compare_price}
                highlight={e.id === m.id ? "This brand" : undefined}
              />
            ))}
          </div>
        )}
        <p className="mt-2 text-[11px] text-gray-600">
          Equivalents share the same generic, strength and dosage form. Ask your doctor or pharmacist before switching.
        </p>
      </section>

      {variants.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">Other strengths & forms</h2>
          <ScrollRow label="Other strengths and forms">
            {variants.map((v) => (
              <Link
                key={v.equiv_key}
                href={`/medicine/${v.any_id}`}
                className="shrink-0 snap-start rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-black/5 hover:ring-brand-600"
              >
                <p className="font-medium">{v.strength ?? "—"}</p>
                <p className="text-xs text-gray-600">
                  {v.form_group} · {v.brands} brands
                </p>
                {v.min_price !== null && (
                  <p className="text-xs text-brand-700">
                    from {taka(v.min_price)}/{v.unit}
                  </p>
                )}
              </Link>
            ))}
          </ScrollRow>
        </section>
      )}

      {generic && (
        <section>
          <h2 className="mb-2 text-lg font-semibold">About {generic.name}</h2>
          {generic.drug_class && <p className="mb-2 text-sm text-gray-600">Class: {generic.drug_class}</p>}
          <Monograph generic={generic} />
        </section>
      )}
    </div>
  );
}
