import * as bd from "@/lib/bd";
import { getSettings } from "@/lib/settings";

// Namespace import: THANAS is being added to bd.ts and the DELIVERY constants are moving to DB settings,
// so read both defensively. The cart quote's deliveryFee/freeOver are authoritative for prices.
const extra = bd as unknown as { THANAS?: Record<string, string[]>; DELIVERY?: unknown };

/** GET /api/v1/meta — static reference data for checkout forms (divisions/districts/thanas, payment). */
export function GET() {
  return Response.json({
    divisions: bd.DIVISIONS,
    thanas: extra.THANAS ?? {},
    paymentMethods: bd.PAYMENT_METHODS,
    delivery: extra.DELIVERY ?? null,
    orderStatuses: bd.ORDER_STATUSES,
    supportPhone: getSettings().supportPhone || null,
  });
}
