"use server";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { createUser, findUserByEmail, getCurrentUser, hashPassword, startSession } from "@/lib/auth";
import { BD_PHONE, DIVISIONS, PAYMENT_METHODS } from "@/lib/bd";
import { OrderError, placeOrder } from "@/lib/orders";

export type CheckoutState = { error?: string; code?: string } | undefined;

const Schema = z
  .object({
    name: z.string().trim().min(2, "Please enter the recipient's name"),
    phone: z.string().trim().regex(BD_PHONE, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)"),
    email: z.union([z.literal(""), z.email("Enter a valid email")]),
    division: z.string().refine((d) => d in DIVISIONS, "Choose a division"),
    district: z.string().min(1, "Choose a district"),
    area: z.string().trim().min(2, "Enter your area / thana"),
    line: z.string().trim().min(4, "Enter house, road and other details"),
    note: z.string().trim().max(500).optional(),
    payment: z.string().refine((p) => PAYMENT_METHODS.some((m) => m.id === p && m.enabled), "Choose a payment method"),
    createAccount: z.boolean(),
    password: z.string().optional(),
    saveAddress: z.boolean(),
    cart: z
      .array(z.object({ packId: z.number().int(), qty: z.number().int().min(1).max(99) }))
      .min(1, "Your cart is empty"),
  })
  .refine((d) => DIVISIONS[d.division]?.includes(d.district), { message: "Choose a district", path: ["district"] })
  .refine((d) => !d.createAccount || (d.email && (d.password?.length ?? 0) >= 8), {
    message: "To create an account, enter your email and a password of at least 8 characters",
  });

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
  const parsed = Schema.safeParse({
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
      const dup = db
        .prepare("SELECT id FROM addresses WHERE user_id = ? AND phone = ? AND district = ? AND area = ? AND line = ?")
        .get(userId, d.phone, d.district, d.area, d.line);
      if (!dup) {
        const first = !db.prepare("SELECT 1 FROM addresses WHERE user_id = ?").get(userId);
        db.prepare(
          "INSERT INTO addresses (user_id,name,phone,division,district,area,line,is_default) VALUES (?,?,?,?,?,?,?,?)",
        ).run(userId, d.name, d.phone, d.division, d.district, d.area, d.line, first ? 1 : 0);
      }
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
