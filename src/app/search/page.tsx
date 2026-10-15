import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, FlaskConical, SearchX } from "lucide-react";
import { search, POPULAR_SEARCHES } from "@/lib/catalog";
import { MedicineRow } from "@/components/medicine-row";
import { SearchBox } from "@/components/search-box";
import { taka, savingsPct } from "@/lib/format";

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

  return (
    <div className="space-y-4 pt-4">
      {generics.length > 0 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {generics.map((g) => (
            <Link
              key={g.id}
              href={`/generic/${g.slug}`}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 ring-1 ring-brand-100"
            >
              <FlaskConical className="size-4" />
              {g.name}
              <span className="text-xs font-normal text-brand-700/70">{g.brand_count}</span>
            </Link>
          ))}
        </div>
      )}

      {forms.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Link
            href={qs()}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${!form ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-700"}`}
          >
            All forms
          </Link>
          {forms.map((f) => (
            <Link
              key={f.form}
              href={qs(f.form)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${form === f.form ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-700"}`}
            >
              {f.form}
            </Link>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
          <SearchX className="mx-auto size-8 text-gray-400" />
          <p className="mt-3 font-semibold">No medicines found for “{q}”</p>
          <p className="mt-1 text-sm text-gray-500">
            Check the spelling, or try the generic name printed on the strip (e.g. “Paracetamol”).
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {groups.length} medicine group{groups.length > 1 ? "s" : ""} for “{q}” · cheapest first
          </p>
          {groups.map((g) => {
            const matched = new Set(g.matchedIds);
            const searchedBrand = g.items.find((i) => matched.has(i.id));
            // Show the cheapest few plus whatever the user actually searched for.
            const visible = g.items.slice(0, PREVIEW);
            const searchedHidden = g.items
              .filter((i, idx) => idx >= PREVIEW && matched.has(i.id) && g.total > 1)
              .slice(0, 2);
            const brandSearch = searchedBrand && !g.genericName.toLowerCase().includes(q.toLowerCase());
            const reference = brandSearch ? searchedBrand.compare_price : g.maxPrice;
            const seeAll = g.genericSlug
              ? `/generic/${g.genericSlug}?v=${encodeURIComponent(g.equivKey)}`
              : `/medicine/${g.items[0].id}`;
            return (
              <section key={g.equivKey} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                <div className="border-b border-gray-100 px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-semibold leading-snug text-gray-900">
                        {g.genericName} {g.strength && <span className="font-normal text-gray-500">{g.strength}</span>}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {g.form} · {g.total} brand{g.total > 1 ? "s" : ""}
                      </p>
                    </div>
                    {g.minPrice !== null && g.maxPrice !== null && g.total > 1 && (
                      <div className="shrink-0 text-right text-xs">
                        <p className="text-gray-500">
                          {taka(g.minPrice)} – {taka(g.maxPrice)}
                          <span>/{g.unit}</span>
                        </p>
                        {savingsPct(g.minPrice, g.maxPrice) > 0 && (
                          <p className="font-semibold text-brand-700">
                            save up to {savingsPct(g.minPrice, g.maxPrice)}%
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {[...visible, ...searchedHidden].map((m, idx) => (
                    <MedicineRow
                      key={m.id}
                      m={m}
                      cheapest={idx === 0 && g.total > 1}
                      reference={reference}
                      highlight={brandSearch && matched.has(m.id) ? "Searched" : undefined}
                    />
                  ))}
                </div>
                {g.total > visible.length + searchedHidden.length && (
                  <Link
                    href={seeAll}
                    className="flex items-center justify-center gap-1 border-t border-gray-100 py-2.5 text-sm font-medium text-brand-700"
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
