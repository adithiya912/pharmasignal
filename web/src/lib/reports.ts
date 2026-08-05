import { getSupabaseServerClient } from "@/lib/supabase";
import type {
  Assessment,
  PersistedReport,
  ReviewStatus,
  RiskScoreResponse,
  PredictInteractionResponse,
  EvidenceResponse,
} from "@/lib/types";

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

/**
 * Unfiltered — returns every patient's reports. Doctor-only. Callers
 * (the /doctor layout and /api/doctor/* routes) MUST independently
 * verify the caller is a doctor (via lib/roles.ts) before calling
 * this; it performs no authorization check itself.
 */
export async function listAllReportsForDoctor(): Promise<PersistedReport[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load reports: ${error.message}`);
  }
  return (data ?? []) as PersistedReport[];
}

/**
 * Unfiltered — same query as listAllReportsForDoctor, kept as its own
 * named function so each role-restricted caller (the /admin layout and
 * /api/admin/* routes) documents its own authorization requirement
 * rather than sharing a doctor-labeled accessor. Admin-only; callers
 * MUST independently verify the caller is an admin (via lib/roles.ts)
 * before calling this — it performs no authorization check itself.
 */
export async function listAllReportsForAdmin(): Promise<PersistedReport[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load reports: ${error.message}`);
  }
  return (data ?? []) as PersistedReport[];
}

/**
 * Doctor-only — callers (the /api/doctor/reports/[id]/review route) MUST
 * independently verify the caller is a doctor before calling this; it
 * performs no authorization check itself, same pattern as
 * listAllReportsForDoctor. Requires supabase/migrations/
 * 0002_add_report_review_fields.sql to have been run — if it hasn't, this
 * throws (the columns don't exist) rather than silently no-op-ing.
 */
export async function updateReportReview(
  reportId: string,
  fields: { doctor_notes?: string; review_status?: ReviewStatus },
): Promise<PersistedReport> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reports")
    .update({ ...fields, reviewed_at: new Date().toISOString() })
    .eq("id", reportId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update report: ${error.message}`);
  }
  return data as PersistedReport;
}

export interface PublicAggregateStats {
  reportsProcessed: number;
  interactionsFlagged: number;
  activeSignals: number;
  evidenceSourcesCited: number;
}

/**
 * Unauthenticated-safe aggregate for the public landing page
 * (GET /api/public/stats). Deliberately selects only the three
 * risk-related columns — never patient_user_id or report_text — so
 * there's no PII in the query result even at the code level, not just
 * withheld from the response. Every number here is a real count over
 * real rows; see docs/design-brief.md's ban on decorative/invented stats.
 */
export async function getPublicAggregateStats(): Promise<PublicAggregateStats> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("reports").select("interaction, risk_score, evidence");

  if (error) {
    throw new Error(`Failed to load aggregate stats: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    interaction: PredictInteractionResponse;
    risk_score: RiskScoreResponse;
    evidence: EvidenceResponse;
  }>;

  const evidenceUrls = new Set<string>();
  let interactionsFlagged = 0;
  let activeSignals = 0;
  for (const row of rows) {
    if (row.interaction?.interaction_predicted) interactionsFlagged += 1;
    if (row.risk_score?.risk_level === "medium" || row.risk_score?.risk_level === "high") activeSignals += 1;
    for (const source of row.evidence?.sources ?? []) {
      if (source.url) evidenceUrls.add(source.url);
    }
  }

  return {
    reportsProcessed: rows.length,
    interactionsFlagged,
    activeSignals,
    evidenceSourcesCited: evidenceUrls.size,
  };
}
