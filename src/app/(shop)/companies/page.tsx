import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getManufacturers } from "@/lib/catalog";

export const metadata: Metadata = { title: "Pharmaceutical companies" };

export default function CompaniesPage() {
  const list = getManufacturers();
  return (
    <div className="space-y-4 pt-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Companies</h1>
        <p className="text-sm text-gray-600">{list.length} manufacturers, sorted by number of products</p>
      </div>
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-[22px] bg-white shadow-card">
        {list.map((c) => (
          <li key={c.id}>
            <Link href={`/company/${c.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">
                {c.name
                  .replace(/[^A-Za-z]/g, "")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="text-xs text-gray-600">
                  {c.brand_count} products · {c.generic_count} generics
                </span>
              </span>
              <ChevronRight className="size-4 text-gray-500" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
