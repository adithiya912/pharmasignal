import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import type { UserRole } from "@/lib/roles";

const VALID_ROLES: UserRole[] = ["patient", "doctor", "admin"];

/**
 * Self-service role assignment (per product decision — see the redesign
 * plan): a signed-in user can set their OWN role to patient, doctor, or
 * admin. This intentionally replaces the old "granted manually in the
 * Clerk dashboard" model rather than adding to it.
 *
 * Deliberately self-only — does not accept a target user id. Admin-
 * triggered role changes on OTHER accounts (Module 7's /admin/users) need
 * their own route that independently verifies isCurrentUserAdmin() before
 * touching someone else's metadata; bolting that onto this route would
 * let any signed-in caller pass a foreign userId and escalate themselves
 * or others.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const role = body?.role;

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 });
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, { publicMetadata: { role } });

  return NextResponse.json({ role });
}
