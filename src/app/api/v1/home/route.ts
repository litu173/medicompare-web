import { connection } from "next/server";
import { getBiggestGaps, getStats, POPULAR_SEARCHES } from "@/lib/catalog";

/** GET /api/v1/home — catalog stats, popular searches and the biggest price gaps. */
export async function GET() {
  await connection();
  return Response.json({ stats: getStats(), popular: POPULAR_SEARCHES, gaps: getBiggestGaps(6) });
}
