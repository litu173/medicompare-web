"use server";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { createUser, findUserByEmail, getCurrentUser, hashPassword, startSession } from "@/lib/auth";
import { CheckoutSchema, saveAddress } from "@/lib/validation";
import { OrderError, placeOrder } from "@/lib/orders";

export type CheckoutState = { error?: string; code?: string } | undefined;

const RX_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const RX_MAX = 5 * 1024 * 1024;

async function savePrescription(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  const ext = RX_TYPES[file.type];
  if (!ext) throw new OrderError("Prescription must be a JPG, PNG, WEBP or PDF file.");
  if (file.size > RX_MAX) throw new OrderError("Prescription file must be 5 MB or smaller.");
  const dir = path.join(process.cwd(), "data/uploads");
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function placeOrderAction(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  let cart: unknown;
  try {
    cart = JSON.parse(String(form.get("cart") ?? "[]"));
  } catch {
    cart = [];
  }
  const parsed = CheckoutSchema.safeParse({
    name: form.get("name") ?? "",
    phone: String(form.get("phone") ?? "").replace(/[\s-]/g, ""),
    email: String(form.get("email") ?? "")
      .trim()
      .toLowerCase(),
    division: form.get("division") ?? "",
    district: form.get("district") ?? "",
    area: form.get("area") ?? "",
    line: form.get("line") ?? "",
    note: form.get("note") ?? "",
    payment: form.get("payment") ?? "",
    createAccount: form.get("createAccount") === "on",
    password: String(form.get("password") ?? ""),
    saveAddress: form.get("saveAddress") === "on",
    cart,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const user = await getCurrentUser();
  let userId = user?.id ?? null;
  if (!user && d.createAccount) {
    if (findUserByEmail(d.email))
      return { error: "An account with this email exists. Sign in or uncheck “Create an account”." };
    userId = createUser({
      name: d.name,
      email: d.email,
      phone: d.phone,
      passwordHash: await hashPassword(d.password!),
    });
    await startSession(userId);
  }

  try {
    const prescription = await savePrescription(form.get("prescription"));
    const { code } = placeOrder({
      userId,
      guestEmail: userId ? null : d.email || null,
      name: d.name,
      phone: d.phone,
      division: d.division,
      district: d.district,
      area: d.area,
      line: d.line,
      note: d.note || null,
      prescriptionFile: prescription,
      paymentMethod: d.payment,
      lines: d.cart,
    });

    if (userId && (d.saveAddress || d.createAccount)) {
      saveAddress(userId, d);
    }

    if (!userId) {
      // Lets this browser view its guest orders without an account.
      const jar = await cookies();
      const codes = (jar.get("mc_guest_orders")?.value ?? "").split(",").filter(Boolean);
      jar.set("mc_guest_orders", [code, ...codes].slice(0, 20).join(","), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
      });
    }
    return { code };
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    throw e;
  }
}
