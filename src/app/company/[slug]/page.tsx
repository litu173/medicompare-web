import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getManufacturer, getManufacturerMedicines } from "@/lib/catalog";
import { taka, perUnit } from "@/lib/format";

const PAGE_SIZE = 40;

export async function generateMetadata({ params }: PageProps<"/company/[slug]">): Promise<Metadata> {
  const c = getManufacturer((await params).slug);
  return c ? { title: `${c.name} medicines & prices` } : {};
}

export default async function CompanyPage({ params, searchParams }: PageProps<"/company/[slug]">) {
  const company = getManufacturer((await params).slug);
  if (!company) notFound();
  const { page: p } = await searchParams;
  const page = Math.max(1, Number(p) || 1);
  const pages = Math.ceil(company.brand_count / PAGE_SIZE);
  const items = getManufacturerMedicines(company.id, page, PAGE_SIZE);

  return (
    <div className="space-y-4 pt-4">
      <div>
        <h1 className="text-2xl font-bold">{company.name}</h1>
        <p className="text-sm text-gray-500">
          {company.brand_count} products · {company.generic_count} generics
        </p>
      </div>

      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        {items.map((m) => (
          <li key={m.id}>
            <Link href={`/medicine/${m.id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50">
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{m.brand_name}</span>{" "}
                <span className="text-sm text-gray-500">{m.strength}</span>
                <span className="block truncate text-xs text-gray-500">
                  {m.dosage_form} · {m.generic_name}
                </span>
                {m.cheaperCount > 0 && (
                  <span className="mt-0.5 block text-xs font-medium text-amber-700">
                    {m.cheaperCount} cheaper equivalent{m.cheaperCount > 1 ? "s" : ""} from other companies
                  </span>
                )}
              </span>
              <span className="text-right text-sm font-semibold tabular-nums">
                {taka(m.compare_price)}
                <span className="text-xs font-normal text-gray-500">{perUnit(m.compare_unit)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={`?page=${page - 1}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-gray-500">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={`?page=${page + 1}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
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
