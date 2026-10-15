import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const SESSION_COOKIE = "mc_session";
const SESSION_DAYS = 30;

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: "customer" | "admin";
  has_password: number;
  google: number;
};

const adminEmails = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export function findUserByEmail(email: string) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
    { id: number; email: string; password_hash: string | null; google_sub: string | null; name: string } | undefined;
}

export function createUser(u: {
  name: string;
  email: string;
  phone?: string | null;
  passwordHash?: string | null;
  googleSub?: string | null;
}) {
  const role = adminEmails().includes(u.email.toLowerCase()) ? "admin" : "customer";
  const res = db
    .prepare("INSERT INTO users (name, email, phone, password_hash, google_sub, role) VALUES (?,?,?,?,?,?)")
    .run(u.name, u.email, u.phone ?? null, u.passwordHash ?? null, u.googleSub ?? null, role);
  return Number(res.lastInsertRowid);
}

export async function startSession(userId: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)").run(
    token,
    userId,
    expires.toISOString(),
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
  return token;
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  jar.delete(SESSION_COOKIE);
}

/** Resolves a session token (cookie on web, Bearer token for the future mobile app). */
export function userFromToken(token: string | undefined): User | null {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.password_hash IS NOT NULL AS has_password,
              u.google_sub IS NOT NULL AS google
       FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?`,
    )
    .get(token, new Date().toISOString()) as User | undefined;
  if (!row) return null;
  if (row.role !== "admin" && adminEmails().includes(row.email.toLowerCase())) row.role = "admin";
  return row;
}

export async function getCurrentUser() {
  return userFromToken((await cookies()).get(SESSION_COOKIE)?.value);
}
