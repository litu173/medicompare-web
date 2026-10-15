import { apiUser } from "@/lib/api";
import { getOrder } from "@/lib/orders";

const digits = (s: string) => s.replace(/\D/g, "").slice(-11);

/**
 * GET /api/v1/orders/:code — order with items and status. Visible to its owner (Bearer), an admin,
 * or anyone who supplies the order's mobile number as `?phone=` (guest tracking, like /track on the web).
 */
export async function GET(req: Request, ctx: RouteContext<"/api/v1/orders/[code]">) {
  const { code } = await ctx.params;
  const data = getOrder(code.trim().toUpperCase());
  const user = apiUser(req);
  const phone = new URL(req.url).searchParams.get("phone") ?? "";
  const allowed =
    data &&
    (user?.role === "admin" ||
      (data.order.user_id !== null && user?.id === data.order.user_id) ||
      (phone !== "" && digits(phone) === digits(data.order.phone)));
  if (!data || !allowed) return Response.json({ error: "No order found with that ID and mobile number." }, { status: 404 });
  const { prescription_file, ...order } = data.order;
  // `events` (status timeline) is being added to getOrder(); default to none until it lands.
  const events = (data as { events?: unknown[] }).events ?? [];
  return Response.json({ order: { ...order, has_prescription: !!prescription_file }, items: data.items, events });
}
