import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { insertReport, listReportsForUser } from "@/lib/reports";
import type { Assessment } from "@/lib/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const reports = await listReportsForUser(userId);
    return NextResponse.json({ reports });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load reports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.reportText !== "string" || typeof body.assessment !== "object") {
    return NextResponse.json({ error: "reportText and assessment are required" }, { status: 400 });
  }

  try {
    const saved = await insertReport(userId, body.reportText, body.assessment as Assessment);
    return NextResponse.json(saved);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
