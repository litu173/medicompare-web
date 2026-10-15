import { getGeneric, getGenericGroups } from "@/lib/catalog";

export async function GET(_req: Request, ctx: RouteContext<"/api/v1/generics/[slug]">) {
  const { slug } = await ctx.params;
  const generic = getGeneric(slug);
  if (!generic) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ generic, groups: getGenericGroups(generic.id) });
}
