import { z } from "zod";
import { apiError, apiUser, jsonBody, publicUser, unauthorized } from "@/lib/api";
import { deleteAccount, updateProfile, userFromToken } from "@/lib/auth";
import { BD_PHONE } from "@/lib/bd";
import { bearerToken } from "@/lib/api";

/** GET /api/v1/auth/me — the signed-in user, or 401 if the token is missing or expired. */
export function GET(req: Request) {
  const user = apiUser(req);
  return user ? Response.json({ user: publicUser(user) }) : unauthorized();
}

const Profile = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => v === "" || BD_PHONE.test(v), "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)"),
});

/** PATCH /api/v1/auth/me — update name and mobile number. */
export async function PATCH(req: Request) {
  const user = apiUser(req);
  if (!user) return unauthorized();
  const parsed = Profile.safeParse(await jsonBody(req));
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);
  updateProfile(user.id, { name: parsed.data.name, phone: parsed.data.phone || null });
  return Response.json({ user: publicUser(userFromToken(bearerToken(req))!) });
}

/** DELETE /api/v1/auth/me — permanently delete the account (orders stay with the pharmacy, unlinked). */
export function DELETE(req: Request) {
  const user = apiUser(req);
  if (!user) return unauthorized();
  deleteAccount(user.id);
  return new Response(null, { status: 204 });
}
