import { apiUser, publicUser, unauthorized } from "@/lib/api";

/** GET /api/v1/auth/me — the signed-in user, or 401 if the token is missing or expired. */
export function GET(req: Request) {
  const user = apiUser(req);
  return user ? Response.json({ user: publicUser(user) }) : unauthorized();
}
