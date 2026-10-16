import { z } from "zod";
import { db } from "./db";
import { BD_PHONE, DIVISIONS, PAYMENT_METHODS, THANAS } from "./bd";

// Shared by the web server actions and the /api/v1 endpoints the mobile app uses.

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || BD_PHONE.test(v), "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const CheckoutSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter the recipient's name"),
    phone: z.string().trim().regex(BD_PHONE, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)"),
    email: z.union([z.literal(""), z.email("Enter a valid email")]),
    division: z.string().refine((d) => d in DIVISIONS, "Choose a division"),
    district: z.string().min(1, "Choose a district"),
    area: z.string().trim().min(2, "Choose your thana / upazila"),
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
  .refine((d) => THANAS[d.district]?.includes(d.area), { message: "Choose your thana / upazila", path: ["area"] })
  .refine((d) => !d.createAccount || (d.email && (d.password?.length ?? 0) >= 8), {
    message: "To create an account, enter your email and a password of at least 8 characters",
  });

export const AddressSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter the recipient's name"),
    phone: z
      .string()
      .transform((v) => v.replace(/[\s-]/g, ""))
      .pipe(z.string().regex(BD_PHONE, "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)")),
    division: z.string().refine((d) => d in DIVISIONS, "Choose a division"),
    district: z.string().min(1, "Choose a district"),
    area: z.string().trim().min(2, "Choose your thana / upazila"),
    line: z.string().trim().min(4, "Enter house, road and other details"),
    isDefault: z.boolean().optional(),
  })
  .refine((d) => DIVISIONS[d.division]?.includes(d.district), { message: "Choose a district", path: ["district"] })
  .refine((d) => THANAS[d.district]?.includes(d.area), { message: "Choose your thana / upazila", path: ["area"] });

export type AddressInput = Omit<z.infer<typeof AddressSchema>, "isDefault">;

/** Saves an address unless an identical one exists; the first address becomes the default. */
export function saveAddress(userId: number, a: AddressInput, makeDefault = false) {
  const dup = db
    .prepare("SELECT id FROM addresses WHERE user_id = ? AND phone = ? AND district = ? AND area = ? AND line = ?")
    .get(userId, a.phone, a.district, a.area, a.line) as { id: number } | undefined;
  if (dup) return dup.id;
  const first = !db.prepare("SELECT 1 FROM addresses WHERE user_id = ?").get(userId);
  if (makeDefault && !first) db.prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?").run(userId);
  const res = db
    .prepare(
      "INSERT INTO addresses (user_id,name,phone,division,district,area,line,is_default) VALUES (?,?,?,?,?,?,?,?)",
    )
    .run(userId, a.name, a.phone, a.division, a.district, a.area, a.line, first || makeDefault ? 1 : 0);
  return Number(res.lastInsertRowid);
}
