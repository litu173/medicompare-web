import { z } from "zod";
import { apiError, apiUser, jsonBody, unauthorized } from "@/lib/api";
import { changePassword } from "@/lib/auth";

const Body = z.object({
  current: z.string().default(""),
  next: z.string().min(8, "New password must be at least 8 characters"),
});

/** POST /api/v1/auth/password — change (or, for Google-only accounts, set) the password. */
export async function POST(req: Request) {
  const user = apiUser(req);
  if (!user) return unauthorized();
  const parsed = Body.safeParse(await jsonBody(req));
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);
  const ok = await changePassword(user.id, parsed.data.current, parsed.data.next);
  return ok ? Response.json({ ok: true }) : apiError("Your current password is incorrect.", 403);
}
