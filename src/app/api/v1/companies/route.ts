import { connection } from "next/server";
import { getManufacturers } from "@/lib/catalog";

/** GET /api/v1/companies — manufacturers by number of products. */
export async function GET() {
  await connection();
  return Response.json({ companies: getManufacturers() });
}
