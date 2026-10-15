import { search } from "@/lib/catalog";

/** GET /api/v1/search?q=napa&form=Tablet — equivalence groups, cheapest first in each. */
export function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  return Response.json(search(p.get("q") ?? "", { form: p.get("form") ?? undefined }));
}
