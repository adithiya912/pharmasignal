import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/roles";
import type { UserRole } from "@/lib/roles";

const VALID_ROLES: UserRole[] = ["patient", "doctor", "admin"];

/**
 * Admin-triggered role change on ANOTHER account. Deliberately separate
 * from /api/onboarding/set-role (which is self-only, by design, to
 * prevent privilege escalation) — this route independently re-verifies
 * isCurrentUserAdmin() before touching someone else's metadata.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authorized = await isCurrentUserAdmin();
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(id, { publicMetadata: { role } });

  return NextResponse.json({ id, role });
}
