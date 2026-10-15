import fs from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

/** Admin-only access to uploaded prescriptions. */
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/prescriptions/[file]">) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new Response("Forbidden", { status: 403 });
  const { file } = await ctx.params;
  if (!/^[a-f0-9]{24}\.(jpg|png|webp|pdf)$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(process.cwd(), "data/uploads", file));
    return new Response(data, { headers: { "content-type": TYPES[file.split(".").pop()!] } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
