import "server-only";

export const googleEnabled = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function appOrigin(req: Request) {
  return process.env.APP_URL?.replace(/\/$/, "") || new URL(req.url).origin;
}

export const redirectUri = (req: Request) => `${appOrigin(req)}/api/auth/google/callback`;
