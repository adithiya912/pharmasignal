import { currentUser } from "@clerk/nextjs/server";

export type UserRole = "patient" | "doctor" | "admin";

const ROLES: UserRole[] = ["patient", "doctor", "admin"];

/**
 * Reads the self-service role set by /api/onboarding/set-role. Returns
 * null for a signed-in user who hasn't picked a role yet (redirect them
 * to /onboarding/role) as well as for a signed-out user.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const user = await currentUser();
  const role = user?.publicMetadata?.role;
  return ROLES.includes(role as UserRole) ? (role as UserRole) : null;
}

export function roleHomePath(role: UserRole): string {
  return `/${role}`;
}

/**
 * v0 role check: a `role` field in Clerk's publicMetadata, set
 * manually per-user (Clerk dashboard -> Users -> select user -> Public
 * metadata -> `{"role": "doctor"}`, or via the Backend API). Not a
 * full role-management system — that's a later refinement.
 *
 * Deliberately resource-based (called directly in the layout/route
 * that needs it) rather than a middleware/proxy.ts check — this is
 * Clerk's own current recommendation (see the createRouteMatcher
 * deprecation warning: middleware path-matching can diverge from
 * actual route resolution and leave protected resources reachable).
 * Every doctor-only entry point (the /doctor layout AND the
 * /api/doctor/* routes) must call this independently — a layout
 * redirect alone would not stop a direct request to the API route.
 */
export async function isCurrentUserDoctor(): Promise<boolean> {
  const user = await currentUser();
  return user?.publicMetadata?.role === "doctor";
}

/**
 * Same v0 approach as isCurrentUserDoctor, same requirement: every
 * admin-only entry point (the /admin layout AND /api/admin/* routes)
 * must call this independently, not rely on the layout redirect alone.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await currentUser();
  return user?.publicMetadata?.role === "admin";
}
