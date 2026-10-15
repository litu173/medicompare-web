import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createUser, startSession } from "@/lib/auth";
import { appOrigin, googleEnabled, redirectUri } from "@/lib/google";

type GoogleProfile = { sub: string; email: string; email_verified: boolean; name?: string };

export async function GET(req: Request) {
  const origin = appOrigin(req);
  const fail = (code: string) => Response.redirect(`${origin}/login?error=${code}`);
  if (!googleEnabled()) return fail("google_unavailable");

  const params = new URL(req.url).searchParams;
  const jar = await cookies();
  const saved = JSON.parse(jar.get("mc_oauth")?.value ?? "{}") as { state?: string; next?: string };
  jar.delete("mc_oauth");
  const code = params.get("code");
  if (!code || !saved.state || params.get("state") !== saved.state) return fail("google_failed");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(req),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return fail("google_failed");
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${access_token}` },
  });
  if (!profileRes.ok) return fail("google_failed");
  const p = (await profileRes.json()) as GoogleProfile;
  if (!p.email_verified) return fail("google_unverified");

  // Sign in an existing Google user, link a verified email to an existing account, or create one.
  let user = db.prepare("SELECT id FROM users WHERE google_sub = ?").get(p.sub) as { id: number } | undefined;
  if (!user) {
    const byEmail = db.prepare("SELECT id FROM users WHERE email = ?").get(p.email) as { id: number } | undefined;
    if (byEmail) {
      db.prepare("UPDATE users SET google_sub = ? WHERE id = ?").run(p.sub, byEmail.id);
      user = byEmail;
    } else {
      user = { id: createUser({ name: p.name || p.email.split("@")[0], email: p.email, googleSub: p.sub }) };
    }
  }
  await startSession(user.id);
  const next = saved.next?.startsWith("/") && !saved.next.startsWith("//") ? saved.next : "/account";
  return Response.redirect(`${origin}${next}`);
}
