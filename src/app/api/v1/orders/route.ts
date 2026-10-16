import { createSessionToken, createUser, findUserByEmail, hashPassword } from "@/lib/auth";
import { apiError, apiUser, jsonBody, unauthorized } from "@/lib/api";
import { getUserOrders, OrderError, placeOrder } from "@/lib/orders";
import { CheckoutSchema, saveAddress } from "@/lib/validation";

/** GET /api/v1/orders — the signed-in user's orders, newest first. */
export function GET(req: Request) {
  const user = apiUser(req);
  if (!user) return unauthorized();
  return Response.json({
    orders: getUserOrders(user.id).map(({ prescription_file, ...o }) => ({
      ...o,
      has_prescription: !!prescription_file,
    })),
  });
}

/**
 * POST /api/v1/orders — places an order (guest, signed-in via Bearer, or creating an account).
 * Body mirrors the web checkout form: `{name, phone, email, division, district, area, line, note?, payment,
 * createAccount, password?, saveAddress, cart:[{packId,qty}]}` → `{code, total, token?}`.
 * Prescription upload is web-only for now.
 */
export async function POST(req: Request) {
  const body = (await jsonBody(req)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return apiError("Invalid request");
  const parsed = CheckoutSchema.safeParse({
    email: "",
    note: "",
    createAccount: false,
    saveAddress: false,
    ...body,
    phone: String(body.phone ?? "").replace(/[\s-]/g, ""),
    ...(typeof body.email === "string" ? { email: body.email.trim().toLowerCase() } : {}),
  });
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);
  const d = parsed.data;

  const user = apiUser(req);
  if (req.headers.has("authorization") && !user) return unauthorized();
  let userId = user?.id ?? null;
  let token: string | undefined;
  if (!user && d.createAccount) {
    if (findUserByEmail(d.email)) return apiError("An account with this email exists. Sign in instead.", 409);
    userId = createUser({
      name: d.name,
      email: d.email,
      phone: d.phone,
      passwordHash: await hashPassword(d.password!),
    });
    token = createSessionToken(userId).token;
  }

  try {
    const { code, total } = placeOrder({
      userId,
      guestEmail: userId ? null : d.email || null,
      name: d.name,
      phone: d.phone,
      division: d.division,
      district: d.district,
      area: d.area,
      line: d.line,
      note: d.note || null,
      prescriptionFile: null,
      paymentMethod: d.payment,
      lines: d.cart,
    });
    if (userId && (d.saveAddress || d.createAccount)) saveAddress(userId, d);
    return Response.json({ code, total, ...(token ? { token } : {}) }, { status: 201 });
  } catch (e) {
    if (e instanceof OrderError) return apiError(e.message, 409);
    throw e;
  }
}
