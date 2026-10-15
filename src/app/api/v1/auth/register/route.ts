import { createSessionToken, createUser, findUserByEmail, hashPassword, userFromToken } from "@/lib/auth";
import { apiError, jsonBody, publicUser } from "@/lib/api";
import { RegisterSchema } from "@/lib/validation";

/** POST /api/v1/auth/register — `{name,email,phone?,password}` → `{token, expiresAt, user}`. */
export async function POST(req: Request) {
  const body = (await jsonBody(req)) as Record<string, unknown> | null;
  const parsed = RegisterSchema.safeParse({ phone: "", ...body });
  if (!parsed.success) return apiError(parsed.error.issues[0].message);
  const existing = findUserByEmail(parsed.data.email);
  if (existing) {
    return apiError(
      existing.google_sub && !existing.password_hash
        ? "This email is registered with Google. Sign in with Google on the website."
        : "An account with this email already exists. Please sign in.",
      409,
    );
  }
  const id = createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    passwordHash: await hashPassword(parsed.data.password),
  });
  const { token, expires } = createSessionToken(id);
  return Response.json(
    { token, expiresAt: expires.toISOString(), user: publicUser(userFromToken(token)!) },
    { status: 201 },
  );
}
