import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Shared body for every /api/* route that proxies to an ml-services
 * endpoint: require a signed-in patient, forward the JSON payload
 * server-side (keeps ML_SERVICE_URL out of the client bundle and
 * avoids needing CORS changes in ml-services), and surface errors in
 * a consistent shape.
 */
export async function proxyToMlService(mlPath: string, payload: unknown): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mlServiceUrl = process.env.ML_SERVICE_URL ?? "http://127.0.0.1:8000";

  let response: Response;
  try {
    response = await fetch(`${mlServiceUrl}${mlPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
      { error: `ml-services ${mlPath} returned an error`, detail: data },
      { status: response.status || 502 },
    );
  }

  return NextResponse.json(data);
}
