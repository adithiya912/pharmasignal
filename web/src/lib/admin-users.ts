import { clerkClient } from "@clerk/nextjs/server";
import type { UserRole } from "@/lib/roles";

export interface AdminUserSummary {
  id: string;
  email: string | null;
  role: UserRole | null;
  createdAt: number;
  lastSignInAt: number | null;
}

/**
 * Admin-only — callers MUST independently verify isCurrentUserAdmin()
 * before calling this, same pattern as listAllReportsForAdmin. Clerk's
 * list endpoint has no server-side filter on publicMetadata, so this
 * fetches one page (100, its max) and counts client-side — honest for
 * a prototype's user base, but callers should treat totalCount vs.
 * data.length as a "more exist" signal rather than assuming completeness.
 */
export async function listUsersForAdmin(): Promise<{ users: AdminUserSummary[]; totalCount: number }> {
  const client = await clerkClient();
  const { data, totalCount } = await client.users.getUserList({ limit: 100, orderBy: "-created_at" });

  const users: AdminUserSummary[] = data.map((u) => ({
    id: u.id,
    email: u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? null,
    role: (u.publicMetadata?.role as UserRole | undefined) ?? null,
    createdAt: u.createdAt,
    lastSignInAt: u.lastSignInAt,
  }));

  return { users, totalCount };
}
