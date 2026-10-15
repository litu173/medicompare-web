import { getEquivalents, getGenericById, getMedicine, getPacks, getVariants } from "@/lib/catalog";

/** GET /api/v1/medicines/:id — product, purchasable packs, all equivalent brands cheapest first, and other strengths/forms. */
export async function GET(_req: Request, ctx: RouteContext<"/api/v1/medicines/[id]">) {
  const { id } = await ctx.params;
  const medicine = getMedicine(Number(id));
  if (!medicine) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({
    medicine,
    packs: getPacks(medicine.id),
    alternatives: getEquivalents(medicine.equiv_key).filter((m) => m.id !== medicine.id),
    generic: medicine.generic_id ? getGenericById(medicine.generic_id) : null,
    variants: getVariants(medicine.generic_name, medicine.equiv_key),
  });
}
