import crypto from "node:crypto";
import { cookies } from "next/headers";
import { appOrigin, googleEnabled, redirectUri } from "@/lib/google";

/** Starts Google sign-in (OAuth 2.0 authorization code flow). */
export async function GET(req: Request) {
  if (!googleEnabled()) return Response.redirect(`${appOrigin(req)}/login?error=google_unavailable`);
  const next = new URL(req.url).searchParams.get("next") ?? "/account";
  const state = crypto.randomBytes(16).toString("base64url");
  (await cookies()).set("mc_oauth", JSON.stringify({ state, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  return Response.redirect(url.toString());
}
