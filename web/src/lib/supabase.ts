import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only. Never import this from a "use client" component or
// pass the client to one — the service_role key bypasses Row Level
// Security entirely. That's safe here only because every query in
// lib/reports.ts explicitly filters by patient_user_id (the Clerk
// user id from auth()) before this client is ever used, and this
// module is never reachable from the browser bundle.
let cached: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
