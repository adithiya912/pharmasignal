import { getSupabaseServerClient } from "@/lib/supabase";
import type { Assessment, PersistedReport } from "@/lib/types";

/**
 * Every function here takes `userId` as an explicit parameter and
 * uses it directly in the query — never trust a userId from request
 * body/client input. Callers (the /api/reports route, and page.tsx)
 * must always source it from Clerk's auth() server-side. This filter
 * is the actual security boundary, since the Supabase client here
 * uses the service_role key and bypasses RLS.
 */

export async function insertReport(
  userId: string,
  reportText: string,
  assessment: Assessment,
): Promise<PersistedReport> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      patient_user_id: userId,
      report_text: reportText,
      extracted: assessment.extracted,
      classification: assessment.classification,
      interaction: assessment.interaction,
      evidence: assessment.evidence,
      risk_score: assessment.riskScore,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save report: ${error.message}`);
  }
  return data as PersistedReport;
}

export async function listReportsForUser(userId: string): Promise<PersistedReport[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("patient_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load reports: ${error.message}`);
  }
  return (data ?? []) as PersistedReport[];
}
