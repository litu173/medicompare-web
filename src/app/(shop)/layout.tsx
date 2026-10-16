import { Header } from "@/components/header";
import { BottomNav } from "@/components/bottom-nav";
import { getCurrentUser } from "@/lib/auth";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <>
      <Header user={user ? { name: user.name, role: user.role } : null} />
      <main className="mx-auto w-full max-w-3xl px-4 pb-safe">{children}</main>
      <BottomNav signedIn={!!user} />
    </>
  );
}
