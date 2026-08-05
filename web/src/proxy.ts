import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts`
// (see node_modules/next/dist/docs/.../upgrading/version-16.md). The
// exported function itself is unchanged — clerkMiddleware() still
// returns a standard Next middleware handler.
// "/" is now the public marketing landing page (moved the authenticated
// patient dashboard to /patient — see docs/pharmasignal redesign plan).
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/api/public/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
