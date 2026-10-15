import { getManufacturer, getManufacturerMedicines } from "@/lib/catalog";

const PAGE_SIZE = 40;

/** GET /api/v1/companies/:slug?page=N — a company's products with how many cheaper equivalents each has. */
export async function GET(req: Request, ctx: RouteContext<"/api/v1/companies/[slug]">) {
  const { slug } = await ctx.params;
  const company = getManufacturer(slug);
  if (!company) return Response.json({ error: "Not found" }, { status: 404 });
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page")) || 1);
  return Response.json({
    company,
    page,
    pages: Math.ceil(company.brand_count / PAGE_SIZE),
    items: getManufacturerMedicines(company.id, page, PAGE_SIZE),
  });
}
