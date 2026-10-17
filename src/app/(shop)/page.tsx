import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowLeftRight,
  Building2,
  Heart,
  PackageCheck,
  Search,
  ShoppingBag,
  Truck,
  ShieldCheck,
  PiggyBank,
} from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { ScrollRow } from "@/components/scroll-row";
import { ShareButton } from "@/components/share-button";
import { getBiggestGaps, getStats, POPULAR_SEARCHES } from "@/lib/catalog";
import { savingsForVisitor } from "@/lib/savings";
import { getCurrentUser } from "@/lib/auth";
import { taka, savingsPct } from "@/lib/format";

function greeting(name?: string) {
  const h = Number(new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Dhaka" }));
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = name?.trim().split(" ")[0];
  return first ? `${part}, ${first}` : part;
}

export default async function Home() {
  const stats = getStats();
  const gaps = getBiggestGaps(8);
  const user = await getCurrentUser();
  const savings = await savingsForVisitor();

  return (
    <div className="-mx-4 space-y-8">
      {/* Dark hero, as in the app */}
      <section className="bg-hero relative overflow-hidden rounded-b-[36px] px-5 pb-7 pt-4 text-white">
        <div className="pointer-events-none absolute -right-16 -top-10 size-60 rounded-full bg-[radial-gradient(circle,rgba(15,154,119,.35),transparent_70%)]" />
        <p className="relative text-sm text-white/75">{greeting(user?.name)}</p>
        <h1 className="relative mt-1 font-display text-[38px] font-normal leading-[1.04] sm:text-5xl">
          Same medicine.
          <br />
          <em className="font-light text-gold-2">Honest</em> price.
        </h1>
        <p lang="bn" className="relative mt-2 font-bangla text-lg font-medium text-mint">
          একই ওষুধ, সাশ্রয়ী দামে
        </p>
        <div className="relative mt-5">
          <Suspense fallback={<div className="h-14" />}>
            <SearchBox />
          </Suspense>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            [stats.medicines.toLocaleString(), "medicines"],
            [stats.generics.toLocaleString(), "generics"],
            [stats.companies.toLocaleString(), "companies"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-2xl border border-white/10 bg-white/5 py-3">
              <p className="font-display text-xl">{n}</p>
              <p className="text-[11px] text-white/65">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-8 px-4">
        {/* Savings */}
        {savings.total >= 1 ? (
          <section className="bg-gold-grad rounded-[26px] p-[2px] shadow-card">
            <div className="flex items-center gap-4 rounded-[24px] bg-white p-5">
              <div className="flex-1">
                <p className="eyebrow">You have saved</p>
                <p className="font-display text-4xl font-semibold text-brand-700">{taka(savings.total)}</p>
                <p className="text-xs text-gray-600">
                  vs the typical price, across {savings.orders} order{savings.orders === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="bg-gold-grad grid size-12 place-items-center rounded-full text-night">
                  <PiggyBank className="size-6" />
                </span>
                <ShareButton
                  text={`I saved ${taka(savings.total)} on my medicines with সাশ্রয় (Sashroy). Same medicine, cheaper brand.`}
                />
              </div>
            </div>
          </section>
        ) : (
          <section className="flex items-center gap-3 rounded-[22px] bg-white p-5 shadow-card">
            <div className="flex-1">
              <p className="eyebrow">Your savings</p>
              <p className="mt-1 font-display text-xl font-semibold leading-snug">
                Every order shows how much you saved.
              </p>
              <p className="mt-1 text-xs text-gray-600">Compared with the typical price of the same medicine.</p>
              <Link
                href="/search"
                className="mt-3 inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-2xl bg-brand-600 px-4 text-sm font-bold text-white hover:bg-brand-700"
              >
                <Search className="size-4" /> Start comparing
              </Link>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG illustration */}
            <img
              src="/illustrations/welcome_save.svg"
              alt=""
              className="h-24 w-24 shrink-0 object-contain sm:h-28 sm:w-28"
            />
          </section>
        )}

        {/* Quick actions */}
        <section className="grid grid-cols-4 gap-2">
          {[
            { href: "/search", icon: ArrowLeftRight, label: "Compare" },
            { href: "/orders", icon: Truck, label: "Track order" },
            { href: "/companies", icon: Building2, label: "Companies" },
            { href: "/app", icon: Heart, label: "Get the app" },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex flex-col items-center gap-2 rounded-2xl py-1 hover:bg-white/60"
            >
              <span className="grid size-14 place-items-center rounded-[20px] bg-white text-brand-600 shadow-card">
                <a.icon className="size-6" />
              </span>
              <span className="text-xs font-bold">{a.label}</span>
            </Link>
          ))}
        </section>

        {/* Popular */}
        <section>
          <p className="eyebrow">Start here</p>
          <h2 className="mb-3 font-display text-2xl font-semibold">Popular searches</h2>
          <ScrollRow label="Popular searches">
            {POPULAR_SEARCHES.map((s) => (
              <Link
                key={s}
                href={`/search?q=${encodeURIComponent(s)}`}
                className="flex shrink-0 snap-start items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:border-brand-600"
              >
                <Search className="size-4 text-brand-600" /> {s}
              </Link>
            ))}
          </ScrollRow>
        </section>

        {/* Price gaps */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="eyebrow">Same medicine, different price</p>
              <h2 className="font-display text-2xl font-semibold">Biggest price gaps</h2>
            </div>
            <Link href="/companies" className="text-sm font-bold text-brand-700">
              Companies
            </Link>
          </div>
          <ScrollRow label="Biggest price gaps">
            {gaps.map((g) => (
              <Link
                key={g.equiv_key}
                href={`/medicine/${g.top_id}`}
                className="bg-hero flex w-[270px] shrink-0 snap-start flex-col rounded-[24px] border border-gold/25 p-5 text-white shadow-lux"
              >
                <span className="flex items-start gap-2">
                  <span className="flex-1 truncate font-display text-xl">{g.generic_name}</span>
                  <ArrowUpRight className="size-5 text-gold-2" />
                </span>
                <span className="truncate text-xs text-white/65">
                  {g.strength} · {g.form_group} · {g.brands} brands
                </span>
                <span className="mt-6 flex items-end gap-2">
                  <span className="font-display text-3xl text-mint">{taka(g.min_price)}</span>
                  <span className="pb-1 font-display text-sm text-white/55 line-through decoration-rose">
                    {taka(g.max_price)}
                  </span>
                  <span className="pb-1 text-xs text-white/55">/{g.unit}</span>
                </span>
                <span className="bg-gold-grad mt-3 self-start rounded-full px-3 py-1 text-xs font-extrabold text-night">
                  up to {savingsPct(g.min_price, g.max_price)}% less
                </span>
              </Link>
            ))}
          </ScrollRow>
        </section>

        {/* Community */}
        <section className="rounded-[22px] bg-gold-bg p-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG illustration */}
          <img src="/illustrations/community.svg" alt="Families using Sashroy" className="mx-auto h-32 w-auto" />
          <p lang="bn" className="mt-4 font-bangla text-base text-gold-deep">
            সবার জন্য সাশ্রয়
          </p>
          <h2 className="font-display text-2xl font-semibold">Saving is better together.</h2>
          <p className="mt-2 text-sm leading-relaxed text-[#4a4232]">
            Most people never learn a cheaper equal brand exists. Share Sashroy with your parents, neighbours and family
            group so everyone pays a fair price for the same medicine.
          </p>
          <div className="mt-4">
            <ShareButton
              variant="dark"
              label="Share with family"
              text="সাশ্রয় (Sashroy) shows every brand of the same medicine side by side, cheapest first. Same medicine, honest price."
            />
          </div>
        </section>

        {/* How it works */}
        <section>
          <p className="eyebrow">Four calm steps</p>
          <h2 className="mb-3 font-display text-2xl font-semibold">How Sashroy works</h2>
          <ol className="divide-y divide-line overflow-hidden rounded-[22px] bg-white shadow-card">
            {[
              { icon: Search, t: "Search", d: "Type the brand on your prescription or the chemical name." },
              { icon: ArrowLeftRight, t: "Compare", d: "Every equivalent, cheapest first, with stock and savings." },
              { icon: ShoppingBag, t: "Order", d: "Choose your thana and pay cash on delivery." },
              { icon: PackageCheck, t: "Receive", d: "Checked item by item, packed, and tracked to your door." },
            ].map((s, i) => (
              <li key={s.t} className="flex items-center gap-4 p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <s.icon className="size-5" />
                </span>
                <span>
                  <span className="block font-extrabold">
                    0{i + 1} · {s.t}
                  </span>
                  <span className="text-sm text-gray-600">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <nav className="flex justify-center gap-5 text-sm font-semibold text-brand-700">
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/app">Get the app</Link>
        </nav>
        <p className="flex items-start gap-2 pb-4 text-center text-[11px] leading-relaxed text-gray-600">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          Information is for price comparison only and is not medical advice. Always consult a doctor or pharmacist
          before switching medicines.
        </p>
      </div>
    </div>
  );
}
