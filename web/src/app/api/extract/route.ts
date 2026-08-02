import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Server-side proxy to ml-services' /extract endpoint. Keeping this on
// the server (rather than calling ml-services directly from the
// browser) avoids needing CORS changes in ml-services and keeps
// ML_SERVICE_URL out of client bundles.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.report_text !== "string") {
    return NextResponse.json({ error: "report_text is required" }, { status: 400 });
  }

  const mlServiceUrl = process.env.ML_SERVICE_URL ?? "http://127.0.0.1:8000";

  let response: Response;
  try {
    response = await fetch(`${mlServiceUrl}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_text: body.report_text }),
    });
  } catch {
    return NextResponse.json(
      { error: `Could not reach ml-services at ${mlServiceUrl}. Is it running?` },
      { status: 502 },
    );
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    return NextResponse.json(
      { error: "ml-services /extract returned an error", detail: data },
      { status: response.status || 502 },
    );
  }

  return NextResponse.json(data);
}
