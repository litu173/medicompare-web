import "server-only";
import { userFromToken, type User } from "./auth";

/** Session token from `Authorization: Bearer <token>` (the mobile app; the web uses the cookie). */
export function bearerToken(req: Request) {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get("authorization") ?? "");
  return m?.[1];
}

export const apiUser = (req: Request) => userFromToken(bearerToken(req));

export const apiError = (error: string, status = 400) => Response.json({ error }, { status });

export const unauthorized = () => apiError("Please sign in.", 401);

/** Parses a JSON body, returning null on malformed input. */
export const jsonBody = (req: Request) => req.json().catch(() => null) as Promise<unknown>;

export const publicUser = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  hasPassword: Boolean(u.has_password),
  google: Boolean(u.google),
});
