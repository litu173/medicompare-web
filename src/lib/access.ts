import "server-only";
import { cookies } from "next/headers";
import type { User } from "./auth";
import type { Order } from "./orders";

/** Owner, the guest browser that placed it, a phone-verified tracker, or an admin may view an order. */
export async function canViewOrder(order: Order, user: User | null) {
  if (user?.role === "admin") return true;
  if (order.user_id) return user?.id === order.user_id;
  const jar = await cookies();
  const guest = (jar.get("mc_guest_orders")?.value ?? "").split(",");
  const tracked = (jar.get("mc_tracked")?.value ?? "").split(",");
  return guest.includes(order.code) || tracked.includes(order.code);
}
