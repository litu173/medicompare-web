"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createUser, endSession, findUserByEmail, hashPassword, startSession, verifyPassword } from "@/lib/auth";
import { BD_PHONE } from "@/lib/bd";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

/** Only allow local redirects after login. */
function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/account";
}

const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || BD_PHONE.test(v), "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function register(_prev: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(["name", "email", "phone", "password"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = RegisterSchema.safeParse(raw);
  const fields = { name: raw.name, email: raw.email, phone: raw.phone };
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const existing = findUserByEmail(parsed.data.email);
  if (existing) {
    return {
      error:
        existing.google_sub && !existing.password_hash
          ? "This email is registered with Google. Use “Continue with Google”."
          : "An account with this email already exists. Please sign in.",
      fields,
    };
  }
  const id = createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    passwordHash: await hashPassword(parsed.data.password),
  });
  await startSession(id);
  redirect(safeNext(form.get("next")));
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = findUserByEmail(email);
  if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
    return {
      error:
        user?.google_sub && !user.password_hash
          ? "This account uses Google sign-in. Use “Continue with Google”."
          : "Incorrect email or password.",
      fields: { email },
    };
  }
  await startSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await endSession();
  redirect("/");
}
