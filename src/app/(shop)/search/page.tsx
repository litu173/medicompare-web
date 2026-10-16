import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, FlaskConical, SearchX, TrendingDown } from "lucide-react";
import { search, POPULAR_SEARCHES } from "@/lib/catalog";
import { MedicineRow } from "@/components/medicine-row";
import { MedicineThumb } from "@/components/medicine-thumb";
import { CartControl } from "@/components/cart-control";
import { ScrollRow } from "@/components/scroll-row";
import { chipCls } from "@/components/chip";
import type { MedicineRow as Med } from "@/lib/catalog";
import { SearchBox } from "@/components/search-box";
import { taka, perUnit, savingsPct } from "@/lib/format";

export async function generateMetadata({ searchParams }: PageProps<"/search">): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `${q} — alternatives & prices` : "Search" };
}

const PREVIEW = 6;

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const form = typeof sp.form === "string" ? sp.form : undefined;

  if (!q) {
    return (
      <div className="space-y-5 pt-5">
        <div className="md:hidden">
          <Suspense>
            <SearchBox autoFocus />
          </Suspense>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Popular searches</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((s) => (
              <Link
                key={s}
                href={`/search?q=${encodeURIComponent(s)}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { groups, generics, forms } = search(q, { form });
  const qs = (f?: string) => `/search?q=${encodeURIComponent(q)}${f ? `&form=${encodeURIComponent(f)}` : ""}`;
  const ql = q.toLowerCase();

  return (
    <div className="space-y-4 pt-4">
      {generics.length > 0 && (
        <ScrollRow label="Matching generic names">
          {generics.map((g) => (
            <Link
              key={g.id}
              href={`/generic/${g.slug}`}
              className="flex shrink-0 snap-start items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-100 hover:ring-brand-600"
            >
              <FlaskConical className="size-4" />
              {g.name}
              <span className="text-xs font-normal">{g.brand_count} brands</span>
            </Link>
          ))}
        </ScrollRow>
      )}

      {forms.length > 1 && (
        <ScrollRow label="Filter by dosage form">
          <Link href={qs()} className={chipCls(!form)}>
            All forms
          </Link>
          {forms.map((f) => (
            <Link key={f.form} href={qs(f.form)} className={chipCls(form === f.form)}>
              {f.form}
            </Link>
          ))}
        </ScrollRow>
      )}

      {groups.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
          <SearchX className="mx-auto size-8 text-gray-500" />
          <p className="mt-3 font-semibold">No medicines found for “{q}”</p>
          <p className="mt-1 text-sm text-gray-600">
            Check the spelling, or try the generic name printed on the strip (e.g. “Paracetamol”).
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            Results for <b className="text-gray-900">“{q}”</b> · equivalent brands sorted cheapest first
          </p>
          {groups.map((g) => {
            const matched = new Set(g.matchedIds);
            const matchedItems = g.items.filter((i) => matched.has(i.id));
            const brandSearch = matchedItems.length > 0 && !g.genericName.toLowerCase().includes(ql);
            // The brand the user typed becomes the heading of its group.
            const hero = brandSearch
              ? (matchedItems.find((i) => i.brand_name.toLowerCase() === ql) ??
                matchedItems.find((i) => i.brand_name.toLowerCase().startsWith(ql)) ??
                matchedItems[0])
              : null;
            const rest = g.items.filter((i) => i.id !== hero?.id);
            const visible = rest.slice(0, PREVIEW);
            const reference = hero ? hero.compare_price : g.maxPrice;
            const seeAll = g.genericSlug
              ? `/generic/${g.genericSlug}?v=${encodeURIComponent(g.equivKey)}`
              : `/medicine/${g.items[0].id}`;
            return (
              <section key={g.equivKey} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                {hero ? (
                  <SearchedHero m={hero} items={g.items} />
                ) : (
                  <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold leading-snug text-gray-900">
                        {g.genericName}{" "}
                        {g.strength && <span className="font-semibold text-gray-700">{g.strength}</span>}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {g.form} · {g.total} brand{g.total > 1 ? "s" : ""}
                      </p>
                    </div>
                    {g.minPrice !== null && g.maxPrice !== null && g.total > 1 && (
                      <div className="shrink-0 text-right text-xs">
                        <p className="text-gray-700">
                          {taka(g.minPrice)} – {taka(g.maxPrice)}/{g.unit}
                        </p>
                        {savingsPct(g.minPrice, g.maxPrice) > 0 && (
                          <p className="font-semibold text-brand-700">
                            save up to {savingsPct(g.minPrice, g.maxPrice)}%
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {visible.length > 0 && (
                  <>
                    {hero && (
                      <h3 className="bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-700">
                        Same medicine from other companies · cheapest first
                      </h3>
                    )}
                    <div className="divide-y divide-gray-100">
                      {visible.map((m, idx) => (
                        <MedicineRow
                          key={m.id}
                          m={m}
                          cheapest={idx === 0 && g.total > 1}
                          reference={reference}
                          highlight={!hero && brandSearch && matched.has(m.id) ? "Searched" : undefined}
                        />
                      ))}
                    </div>
                  </>
                )}
                {rest.length > visible.length && (
                  <Link
                    href={seeAll}
                    className="flex items-center justify-center gap-1 border-t border-gray-100 py-3 text-sm font-semibold text-brand-700 hover:bg-gray-50"
                  >
                    See all {g.total} brands <ChevronRight className="size-4" />
                  </Link>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

/** The medicine the user searched for, shown as the group's heading with its cheaper-alternative summary. */
function SearchedHero({ m, items }: { m: Med; items: Med[] }) {
  const cheaper = items.filter(
    (i) =>
      i.id !== m.id &&
      !i.price_suspect &&
      i.compare_price !== null &&
      m.compare_price !== null &&
      i.compare_price < m.compare_price,
  );
  const best = cheaper.find((i) => i.stock > 0) ?? cheaper[0];
  const out = m.stock <= 0;
  return (
    <div className="border-b border-gray-100 p-4">
      <div className="flex items-start gap-3">
        <Link href={`/medicine/${m.id}`} className="flex min-w-0 flex-1 items-start gap-3">
          <MedicineThumb image={m.image} form={m.dosage_form} alt={`${m.brand_name} ${m.strength ?? ""}`} size="md" />
          <div className="min-w-0">
            <h2 className="text-xl font-bold leading-tight text-gray-900">
              {m.brand_name} <span className="font-semibold text-gray-700">{m.strength}</span>
            </h2>
            <p className="mt-0.5 text-sm text-gray-700">
              {m.dosage_form} · {m.generic_name}
            </p>
            <p className="text-sm text-gray-600">{m.manufacturer_name}</p>
            <p className="mt-1">
              <span className="text-lg font-bold tabular-nums">{taka(m.compare_price)}</span>
              <span className="text-sm text-gray-600">{perUnit(m.compare_unit)}</span>
              {out && <span className="ml-2 text-sm font-semibold text-red-700">Out of stock</span>}
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
            disabled={out || m.compare_price === null}
          />
        )}
      </div>
      {best && m.compare_price && best.compare_price ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
          <TrendingDown className="size-4 shrink-0 text-brand-700" />
          <span>
            <b>{cheaper.length}</b> cheaper equivalent{cheaper.length > 1 ? "s" : ""} — save up to{" "}
            <b>{savingsPct(best.compare_price, m.compare_price)}%</b>
          </span>
        </p>
      ) : items.length > 1 ? (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">This is already the lowest price.</p>
      ) : null}
    </div>
  );
}
