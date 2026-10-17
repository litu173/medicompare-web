import { z } from "zod";
import { apiUser, jsonBody } from "@/lib/api";
import { orderIdsFor, savingsFor } from "@/lib/savings";

const Body = z.object({
  orders: z
    .array(z.object({ code: z.string(), phone: z.string() }))
    .max(50)
    .default([]),
});

/**
 * POST /api/v1/savings — how much the customer saved versus the typical price of the same medicines.
 * Counts the signed-in user's orders (Bearer token) plus guest orders proven by `{code, phone}`.
 * → `{ total, orders, items, byOrder: { [code]: amount } }` (taka).
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse((await jsonBody(req)) ?? {});
  const guest = parsed.success ? parsed.data.orders : [];
  const user = apiUser(req);
  return Response.json(savingsFor(orderIdsFor(user?.id ?? null, guest)));
}
