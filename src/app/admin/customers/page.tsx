import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { taka } from "@/lib/format";
import { fmtTime } from "@/components/order-status";

export const metadata = { title: "Customers" };

type Customer = {
  key: string;
  name: string;
  phone: string;
  email: string | null;
  registered: number;
  orders: number;
  spent: number;
  last_order: string;
};

/** Everyone who has ordered (registered or guest, grouped by phone) plus registered users without orders. */
export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const { q: qp } = await searchParams;
  const q = typeof qp === "string" ? qp.trim() : "";
  const like = `%${q}%`;
  const rows = db
    .prepare(
      `SELECT * FROM (
         SELECT COALESCE('u' || o.user_id, 'p' || o.phone) AS key, MAX(o.name) AS name, o.phone,
                COALESCE(MAX(u.email), MAX(o.guest_email)) AS email, MAX(o.user_id IS NOT NULL) AS registered,
                COUNT(*) AS orders, SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END) AS spent,
                MAX(o.created_at) AS last_order
         FROM orders o LEFT JOIN users u ON u.id = o.user_id
         GROUP BY COALESCE('u' || o.user_id, 'p' || o.phone)
         UNION ALL
         SELECT 'u' || u.id, u.name, COALESCE(u.phone, ''), u.email, 1, 0, 0, u.created_at
         FROM users u WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id)
       ) WHERE (? = '' OR name LIKE ? OR phone LIKE ? OR email LIKE ?)
       ORDER BY last_order DESC LIMIT 300`,
    )
    .all(q, like, like, like) as Customer[];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Customers</h1>
      <form className="flex gap-2" role="search">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 focus-within:border-brand-600">
          <Search className="size-4 text-gray-600" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, phone or email"
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-gray-500"
          />
        </label>
        <button className="rounded-lg bg-gray-900 px-4 font-semibold text-white hover:bg-gray-800">Search</button>
      </form>
      {rows.length === 0 ? (
        <p className="rounded-[22px] bg-white p-6 text-center text-sm text-gray-700 shadow-card">No customers yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-[22px] bg-white shadow-card">
          {rows.map((c) => (
            <li key={c.key} className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">
                {c.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{c.name}</span>{" "}
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${c.registered ? "bg-brand-50 text-brand-800" : "bg-gray-100 text-gray-700"}`}
                >
                  {c.registered ? "Account" : "Guest"}
                </span>
                <span className="block truncate text-sm text-gray-700">
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className="text-brand-700 hover:underline">
                      {c.phone}
                    </a>
                  )}
                  {c.email && ` · ${c.email}`}
                </span>
              </span>
              <span className="text-right text-sm">
                <span className="block font-semibold">
                  {c.orders} order{c.orders === 1 ? "" : "s"} · {taka(c.spent)}
                </span>
                <span className="text-xs text-gray-600">
                  {c.orders ? `Last ${fmtTime(c.last_order)}` : `Joined ${fmtTime(c.last_order)}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
