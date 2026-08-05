import { NextRequest, NextResponse } from "next/server";
import { proxyToMlService } from "@/lib/ml-proxy";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  return proxyToMlService("/chat", { message: body.message, history: body.history ?? [] });
}
