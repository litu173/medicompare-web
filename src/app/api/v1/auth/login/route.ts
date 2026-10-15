import { z } from "zod";
import { createSessionToken, findUserByEmail, userFromToken, verifyPassword } from "@/lib/auth";
import { apiError, jsonBody, publicUser } from "@/lib/api";

const Body = z.object({ email: z.string().trim().toLowerCase(), password: z.string() });

/** POST /api/v1/auth/login — `{email,password}` → `{token, expiresAt, user}`. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await jsonBody(req));
  if (!parsed.success) return apiError("Enter your email and password.");
  const { email, password } = parsed.data;
  const user = findUserByEmail(email);
  if (!user || !user.password_hash || !(await verifyPassword(password, user.password_hash))) {
    return apiError(
      user?.google_sub && !user.password_hash
        ? "This account uses Google sign-in. Sign in with Google on the website."
        : "Incorrect email or password.",
      401,
    );
  }
  const { token, expires } = createSessionToken(user.id);
  return Response.json({ token, expiresAt: expires.toISOString(), user: publicUser(userFromToken(token)!) });
}
