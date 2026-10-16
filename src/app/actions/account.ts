"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getOrder } from "@/lib/orders";

export async function trackOrder(_prev: { error?: string } | undefined, form: FormData) {
  const code = String(form.get("code") ?? "")
    .trim()
    .toUpperCase();
  const phone = String(form.get("phone") ?? "")
    .replace(/\D/g, "")
    .slice(-11);
  const data = getOrder(code);
  if (!data || data.order.phone.replace(/\D/g, "").slice(-11) !== phone) {
    return { error: "No order found with that ID and mobile number." };
  }
  const jar = await cookies();
  const codes = (jar.get("mc_tracked")?.value ?? "").split(",").filter(Boolean);
  jar.set("mc_tracked", [code, ...codes].slice(0, 20).join(","), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(`/order/${code}`);
}

export async function deleteAddress(form: FormData) {
  const user = await getCurrentUser();
  if (!user) return;
  db.prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?").run(Number(form.get("id")), user.id);
  revalidatePath("/account");
}
