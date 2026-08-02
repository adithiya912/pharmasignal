import { NextRequest, NextResponse } from "next/server";
import { proxyToMlService } from "@/lib/ml-proxy";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.query !== "string") {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  return proxyToMlService("/retrieve-evidence", { query: body.query });
}
