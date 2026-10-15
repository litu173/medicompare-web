import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  const dest = typeof next === "string" && next.startsWith("/") ? next : "/account";
  if (await getCurrentUser()) redirect(dest);
  return (
    <AuthShell
      title="Sign in"
      subtitle="Track orders and check out faster."
      next={dest}
      error={typeof error === "string" ? error : undefined}
    >
      <LoginForm next={dest} />
    </AuthShell>
  );
}
