import { Suspense } from "react";
import Link from "next/link";
import { ScrollRow } from "@/components/scroll-row";
import { chipCls } from "@/components/chip";
import { ArrowRight, BadgePercent, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { getBiggestGaps, getStats, POPULAR_SEARCHES } from "@/lib/catalog";
import { taka, savingsPct } from "@/lib/format";

export default function Home() {
  const stats = getStats();
  const gaps = getBiggestGaps(6);

  return (
    <div className="space-y-8 pt-6">
      <section>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-gray-900 sm:text-3xl">
          Same medicine. <span className="text-brand-600">Lower price.</span>
        </h1>
        <p className="font-bangla mt-1 text-lg font-medium text-brand-700">একই ওষুধ, সাশ্রয়ী দামে</p>
        <p className="mt-2 text-[15px] text-gray-600">
          Search by brand or chemical (generic) name and see every equivalent brand sold in Bangladesh — cheapest first.
        </p>
        <div className="mt-4">
          <Suspense fallback={<div className="h-13" />}>
            <SearchBox />
          </Suspense>
        </div>
        <div className="mt-3">
          <ScrollRow label="Popular searches">
            {POPULAR_SEARCHES.map((s) => (
              <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className={chipCls()}>
                {s}
              </Link>
            ))}
          </ScrollRow>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2 text-center">
        {[
          [stats.medicines.toLocaleString(), "medicines"],
          [stats.generics.toLocaleString(), "generics"],
          [stats.companies.toLocaleString(), "companies"],
        ].map(([n, l]) => (
          <div key={l} className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/5">
            <p className="text-lg font-bold text-gray-900">{n}</p>
            <p className="text-xs text-gray-600">{l}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Biggest price gaps</h2>
          <span className="text-xs text-gray-600">same generic, strength & form</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {gaps.map((g) => (
            <Link
              key={g.equiv_key}
              href={`/medicine/${g.top_id}`}
              className="group rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:ring-brand-500"
            >
              <p className="font-semibold text-gray-900">{g.generic_name}</p>
              <p className="text-sm text-gray-600">
                {g.strength} · {g.form_group} · {g.brands} brands
              </p>
              <div className="mt-3 flex items-end justify-between">
                <div className="text-sm">
                  <span className="font-semibold text-brand-700">{taka(g.min_price)}</span>
                  <span className="text-gray-500"> – </span>
                  <span className="text-gray-600 line-through decoration-red-400">{taka(g.max_price)}</span>
                  <span className="text-xs text-gray-600"> /{g.unit}</span>
                </div>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
                  up to {savingsPct(g.min_price, g.max_price)}% less
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {[
          { icon: BadgePercent, t: "Always a cheaper option", d: "Every equivalent brand ranked by price per unit." },
          { icon: PackageCheck, t: "Out of stock? Switch", d: "Alternatives in stock are shown instantly." },
          { icon: ShieldCheck, t: "Same active ingredient", d: "Matched by generic, strength and dosage form." },
          { icon: Truck, t: "Home delivery", d: "Cash on delivery across Bangladesh." },
        ].map((f) => (
          <div key={f.t} className="rounded-xl bg-white p-3.5 shadow-sm ring-1 ring-black/5">
            <f.icon className="size-5 text-brand-600" />
            <p className="mt-2 text-sm font-semibold">{f.t}</p>
            <p className="mt-0.5 text-xs text-gray-600">{f.d}</p>
          </div>
        ))}
      </section>

      <Link href="/companies" className="flex items-center justify-between rounded-xl bg-brand-900 p-4 text-white">
        <div>
          <p className="font-semibold">Browse by company</p>
          <p className="text-sm text-white/85">See which products have cheaper equivalents</p>
        </div>
        <ArrowRight className="size-5" />
      </Link>

      <Link
        href="/app"
        className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-black/5 hover:ring-brand-600"
      >
        <div>
          <p className="font-semibold">Get the Android app</p>
          <p className="text-sm text-gray-700">Download the test build to your phone</p>
        </div>
        <ArrowRight className="size-5 text-brand-700" />
      </Link>

      <Link href="/orders" className="block text-center text-sm font-semibold text-brand-700">
        Track an order
      </Link>

      <p className="pb-4 text-center text-[11px] leading-relaxed text-gray-500">
        Information is for price comparison only and is not medical advice. Always consult a doctor or pharmacist before
        switching medicines.
      </p>
    </div>
  );
}
