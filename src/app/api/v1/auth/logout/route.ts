import { revokeSessionToken } from "@/lib/auth";
import { bearerToken } from "@/lib/api";

/** POST /api/v1/auth/logout — revokes the Bearer token. Idempotent. */
export function POST(req: Request) {
  const token = bearerToken(req);
  if (token) revokeSessionToken(token);
  return new Response(null, { status: 204 });
}
