import { NextRequest, NextResponse } from "next/server";
import { proxyToMlService } from "@/lib/ml-proxy";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.report_id !== "string" ||
    typeof body.classification !== "object" ||
    typeof body.interaction !== "object" ||
    typeof body.evidence !== "object"
  ) {
    return NextResponse.json(
      { error: "report_id, classification, interaction, and evidence are required" },
      { status: 400 },
    );
  }

  return proxyToMlService("/risk-score", {
    report_id: body.report_id,
    classification: body.classification,
    interaction: body.interaction,
    evidence: body.evidence,
  });
}
