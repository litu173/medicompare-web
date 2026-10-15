import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { googleEnabled } from "@/lib/google";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  const addresses = user
    ? (db
        .prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC")
        .all(user.id) as Parameters<typeof CheckoutForm>[0]["addresses"])
    : [];
  return (
    <CheckoutForm
      user={user ? { name: user.name, email: user.email, phone: user.phone } : null}
      addresses={addresses}
      googleEnabled={googleEnabled()}
    />
  );
}
