import { NextRequest, NextResponse } from "next/server";
import { proxyToMlService } from "@/lib/ml-proxy";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.report_text !== "string" || typeof body.extracted !== "object") {
    return NextResponse.json({ error: "report_text and extracted are required" }, { status: 400 });
  }

  return proxyToMlService("/classify", { report_text: body.report_text, extracted: body.extracted });
}
