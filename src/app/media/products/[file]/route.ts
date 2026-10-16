import fs from "node:fs/promises";
import path from "node:path";
import { PRODUCT_IMAGE_DIR } from "@/lib/media";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Public product photos. File names are unique per upload, so they can be cached forever. */
export async function GET(_req: Request, ctx: RouteContext<"/media/products/[file]">) {
  const { file } = await ctx.params;
  if (!/^[0-9]+-[a-f0-9]{8,}\.(jpg|png|webp)$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(PRODUCT_IMAGE_DIR, file));
    return new Response(data, {
      headers: {
        "content-type": TYPES[file.split(".").pop()!],
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
