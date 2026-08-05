import { NextResponse } from "next/server";
import { getPublicAggregateStats } from "@/lib/reports";

/**
 * Unauthenticated (see proxy.ts's isPublicRoute) — backs the landing
 * page's live stats section. On any failure (Supabase unreachable, env
 * vars missing, etc.) returns { available: false } rather than a
 * fabricated/zeroed number, so the landing page can render an honest
 * "stats unavailable" state instead of implying zero real reports.
 */
export async function GET() {
  try {
    const stats = await getPublicAggregateStats();
    return NextResponse.json({ available: true, stats });
  } catch {
    return NextResponse.json({ available: false });
  }
}
