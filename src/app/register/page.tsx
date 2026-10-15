import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  const dest = typeof next === "string" && next.startsWith("/") ? next : "/account";
  if (await getCurrentUser()) redirect(dest);
  return (
    <AuthShell title="Create account" subtitle="Save addresses and see your order history." next={dest}>
      <RegisterForm next={dest} />
    </AuthShell>
  );
}
