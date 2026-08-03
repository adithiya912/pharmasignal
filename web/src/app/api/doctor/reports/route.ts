import { NextResponse } from "next/server";
import { listAllReportsForDoctor } from "@/lib/reports";
import { isCurrentUserDoctor } from "@/lib/roles";

// Independent of the /doctor layout's redirect: a layout only guards
// page navigation, not this route handler. Anyone could hit this URL
// directly, so it must re-verify authorization itself.
export async function GET() {
  const authorized = await isCurrentUserDoctor();
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const reports = await listAllReportsForDoctor();
    return NextResponse.json({ reports });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load reports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
