import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/roles";
import { listUsersForAdmin } from "@/lib/admin-users";

// Independent of the /admin layout's redirect, same reasoning as every
// other /api/admin/* and /api/doctor/* route: a layout only guards page
// navigation, not this route handler, so it must re-verify authorization
// itself. Used by the client-side users table to refresh after a role
// change; the initial page load fetches server-side directly instead.

export async function GET() {
  const authorized = await isCurrentUserAdmin();
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { users, totalCount } = await listUsersForAdmin();
  return NextResponse.json({ users, totalCount });
}
