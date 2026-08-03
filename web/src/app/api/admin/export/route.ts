import { NextResponse } from "next/server";
import { listAllReportsForAdmin } from "@/lib/reports";
import { isCurrentUserAdmin } from "@/lib/roles";

// Independent of the /admin layout's redirect, same reasoning as
// /api/doctor/reports: a layout only guards page navigation, not this
// route handler, so it must re-verify authorization itself.

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function patientTag(patientUserId: string): string {
  return patientUserId.replace(/^user_/, "").slice(-6).toUpperCase();
}

export async function GET() {
  const authorized = await isCurrentUserAdmin();
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const reports = await listAllReportsForAdmin();
    const header = ["date", "risk_level", "drug", "symptom", "patient_tag"];
    const rows = reports.map((r) => [
      new Date(r.created_at).toISOString(),
      r.risk_score.risk_level,
      r.extracted.drugs.join("; ") || "—",
      r.extracted.symptoms.join("; ") || "—",
      patientTag(r.patient_user_id),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="pharmasignal-reports.csv"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to export reports";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
