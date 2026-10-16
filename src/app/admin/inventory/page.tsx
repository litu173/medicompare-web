import Link from "next/link";
import { Search } from "lucide-react";
import { inventoryStats, listInventory, type InventoryFilter } from "@/lib/inventory";
import { taka } from "@/lib/format";
import { MedicineThumb } from "@/components/medicine-thumb";
import { ScrollRow } from "@/components/scroll-row";
import { chipCls } from "@/components/chip";
import { QuickRestock } from "@/components/admin/quick-restock";

export const metadata = { title: "Inventory" };

const FILTERS: { id: InventoryFilter; label: string }[] = [
  { id: "all", label: "All products" },
  { id: "ordered", label: "In open orders" },
  { id: "low", label: "Running low" },
  { id: "out", label: "Out of stock" },
  { id: "nophoto", label: "No photo" },
];

export default async function InventoryPage({ searchParams }: PageProps<"/admin/inventory">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const filter = (FILTERS.find((f) => f.id === sp.filter)?.id ?? "all") as InventoryFilter;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pages } = listInventory({ q, filter, page });
  const stats = inventoryStats();
  const counts: Partial<Record<InventoryFilter, number>> = {
    all: stats.products,
    low: stats.low_stock,
    out: stats.out_of_stock,
    nophoto: stats.no_photo,
  };
  const href = (p: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    const merged = { q, filter, page: 1, ...p };
    if (merged.q) u.set("q", String(merged.q));
    if (merged.filter && merged.filter !== "all") u.set("filter", String(merged.filter));
    if (Number(merged.page) > 1) u.set("page", String(merged.page));
    return `/admin/inventory?${u}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-gray-700">Stock is counted in single units (tablets, bottles, vials…).</p>
      </div>

      <form className="flex gap-2" role="search">
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 focus-within:border-brand-600">
          <Search className="size-4 text-gray-600" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Brand, generic or company"
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-gray-500"
          />
        </label>
        <button className="rounded-lg bg-gray-900 px-4 font-semibold text-white hover:bg-gray-800">Search</button>
      </form>

      <ScrollRow label="Inventory filters">
        {FILTERS.map((f) => (
          <Link key={f.id} href={href({ filter: f.id })} className={chipCls(filter === f.id)}>
            {f.label}
            {counts[f.id] !== undefined && <span className="ml-1 opacity-80">{counts[f.id]!.toLocaleString()}</span>}
          </Link>
        ))}
      </ScrollRow>

      <p className="text-sm text-gray-700">{total.toLocaleString()} products</p>

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        {rows.map((m) => {
          const low = m.stock > 0 && m.stock <= m.low_stock_at;
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
              <Link
                href={`/admin/inventory/${m.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
              >
                <MedicineThumb image={m.image} form={m.dosage_form} alt={m.brand_name} />
                <span className="min-w-0">
                  <span className="font-semibold">
                    {m.brand_name} <span className="font-normal text-gray-700">{m.strength}</span>
                  </span>
                  <span className="block truncate text-xs text-gray-600">
                    {m.dosage_form} · {m.generic_name} · {m.manufacturer_name}
                  </span>
                  <span className="block text-xs text-gray-600">
                    #{m.id} · {taka(m.list_price)} / {m.list_label}
                  </span>
                </span>
              </Link>
              <div className="text-right">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${
                    m.stock === 0
                      ? "bg-red-100 text-red-800"
                      : low
                        ? "bg-amber-100 text-amber-900"
                        : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {m.stock === 0 ? "Out" : m.stock.toLocaleString()}
                </span>
                {m.reserved > 0 && <p className="text-xs text-gray-600">{m.reserved} in open orders</p>}
              </div>
              <QuickRestock medicineId={m.id} />
            </li>
          );
        })}
      </ul>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={href({ page: page - 1 })}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold hover:bg-gray-50"
            >
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-gray-700">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link
              href={href({ page: page + 1 })}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold hover:bg-gray-50"
            >
              Next
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
