import { z } from "zod";
import { quote } from "@/lib/orders";

const Body = z.object({
  items: z.array(z.object({ packId: z.number().int(), qty: z.number().int().min(1).max(99) })).max(100),
  district: z.string().nullish(),
});

/** POST /api/v1/cart/quote — authoritative prices, stock and delivery fee for a cart. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid cart" }, { status: 400 });
  return Response.json(quote(parsed.data.items, parsed.data.district ?? undefined));
}
