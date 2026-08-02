import { NextRequest, NextResponse } from "next/server";
import { proxyToMlService } from "@/lib/ml-proxy";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.drug_a !== "string" || typeof body.drug_b !== "string") {
    return NextResponse.json({ error: "drug_a and drug_b are required" }, { status: 400 });
  }

  return proxyToMlService("/predict-interaction", { drug_a: body.drug_a, drug_b: body.drug_b });
}
