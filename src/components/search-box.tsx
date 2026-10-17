"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, X, FlaskConical } from "lucide-react";
import { taka } from "@/lib/format";

type Suggest = {
  brands: {
    id: number;
    brand_name: string;
    strength: string | null;
    dosage_form: string;
    generic_name: string;
    list_price: number | null;
    list_label: string | null;
  }[];
  generics: { id: number; name: string; slug: string; brand_count: number }[];
};

export function SearchBox({ compact = false, autoFocus = false }: { compact?: boolean; autoFocus?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (urlQ !== prevUrlQ) {
    // Keep the box in sync when the URL query changes (e.g. clicking a popular search).
    setPrevUrlQ(urlQ);
    setQ(urlQ);
  }
  const [data, setData] = useState<Suggest | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/v1/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then(setData)
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setOpen(false);
    (document.activeElement as HTMLElement | null)?.blur();
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const showDropdown = open && q.trim().length >= 2 && data && (data.brands.length > 0 || data.generics.length > 0);

  return (
    <form ref={boxRef} onSubmit={submit} role="search" className="relative">
      <label className="sr-only" htmlFor={compact ? "q-compact" : "q-hero"}>
        Search medicine by brand or generic name
      </label>
      <div
        className={`flex items-center gap-2 border bg-white focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20 ${
          compact ? "h-11 rounded-2xl border-line px-3.5" : "h-14 rounded-[20px] border-transparent px-4 shadow-lux"
        }`}
      >
        <Search className="size-5 shrink-0 text-brand-600" />
        <input
          id={compact ? "q-compact" : "q-hero"}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          type="search"
          placeholder={compact ? "Search medicine…" : "Brand or generic, e.g. Napa, Omeprazole"}
          className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none placeholder:text-gray-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {q && (
          <button type="button" aria-label="Clear" onClick={() => setQ("")} className="text-gray-500">
            <X className="size-4" />
          </button>
        )}
        {!compact && (
          <button
            type="submit"
            className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
          >
            Search
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-[22px] border border-line bg-white text-gray-900 shadow-lux">
          {data.generics.length > 0 && (
            <div className="border-b border-gray-100 p-1.5">
              <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Generic (chemical) name
              </p>
              {data.generics.map((g) => (
                <Link
                  key={g.id}
                  href={`/generic/${g.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50"
                >
                  <FlaskConical className="size-4 text-brand-600" />
                  <span className="flex-1 font-medium">{g.name}</span>
                  <span className="text-xs text-gray-600">{g.brand_count} brands</span>
                </Link>
              ))}
            </div>
          )}
          {data.brands.length > 0 && (
            <div className="p-1.5">
              <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Brands</p>
              {data.brands.map((b) => (
                <Link
                  key={b.id}
                  href={`/medicine/${b.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{b.brand_name}</span>{" "}
                    <span className="text-gray-600">{b.strength}</span>
                    <span className="block truncate text-xs text-gray-600">
                      {b.dosage_form} · {b.generic_name}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-gray-700">{taka(b.list_price)}</span>
                </Link>
              ))}
            </div>
          )}
          <button
            type="submit"
            className="block w-full border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-left text-sm font-medium text-brand-700"
          >
            See all alternatives for “{q.trim()}”
          </button>
        </div>
      )}
    </form>
  );
}
