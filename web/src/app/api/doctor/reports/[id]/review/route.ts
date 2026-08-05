import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserDoctor } from "@/lib/roles";
import { updateReportReview } from "@/lib/reports";
import type { ReviewStatus } from "@/lib/types";

const VALID_STATUSES: ReviewStatus[] = ["pending", "approved", "rejected"];

// Independent of the /doctor layout's redirect, same reasoning as the
// other /api/doctor/* routes: a layout only guards page navigation, not
// this route handler, so it must re-verify authorization itself.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorized = await isCurrentUserDoctor();
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || (body.review_status !== undefined && !VALID_STATUSES.includes(body.review_status))) {
    return NextResponse.json(
      { error: `review_status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const updated = await updateReportReview(id, {
      doctor_notes: typeof body.doctor_notes === "string" ? body.doctor_notes : undefined,
      review_status: body.review_status,
    });
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
