import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { orderCounts } from "@/lib/orders";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Sashroy" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") notFound();
  const counts = orderCounts();
  const pending = (counts.placed ?? 0) + (counts.confirmed ?? 0) + (counts.packed ?? 0);
  return (
    <div className="min-h-dvh bg-[#f5f7f6]">
      <AdminNav pending={pending} userName={user.name} />
      <main className="px-4 pb-24 pt-4 md:ml-60 md:px-8 md:pb-10 md:pt-8 print:m-0 print:p-0">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
