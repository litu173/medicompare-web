import { db } from "@/lib/db";
import { apiError, apiUser, jsonBody, unauthorized } from "@/lib/api";
import { AddressSchema, saveAddress } from "@/lib/validation";

const list = (userId: number) =>
  db.prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC").all(userId);

/** GET /api/v1/addresses — saved delivery addresses, default first. */
export function GET(req: Request) {
  const user = apiUser(req);
  if (!user) return unauthorized();
  return Response.json({ addresses: list(user.id) });
}

/** POST /api/v1/addresses — `{name,phone,division,district,area,line,isDefault?}` → `{id, addresses}`. */
export async function POST(req: Request) {
  const user = apiUser(req);
  if (!user) return unauthorized();
  const parsed = AddressSchema.safeParse(await jsonBody(req));
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);
  const { isDefault, ...a } = parsed.data;
  const id = saveAddress(user.id, a, isDefault);
  return Response.json({ id, addresses: list(user.id) }, { status: 201 });
}

/** DELETE /api/v1/addresses?id=N — removes one of the user's addresses. */
export function DELETE(req: Request) {
  const user = apiUser(req);
  if (!user) return unauthorized();
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return apiError("Missing address id");
  const res = db.prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?").run(id, user.id);
  if (!res.changes) return apiError("Address not found", 404);
  // Keep one default: promote the newest remaining address if the default was removed.
  db.prepare(
    `UPDATE addresses SET is_default = 1 WHERE id = (SELECT id FROM addresses WHERE user_id = ? ORDER BY id DESC LIMIT 1)
       AND NOT EXISTS (SELECT 1 FROM addresses WHERE user_id = ? AND is_default = 1)`,
  ).run(user.id, user.id);
  return Response.json({ addresses: list(user.id) });
}
