export type Severity = "low" | "medium" | "high" | "unknown";

export interface ExtractResponse {
  drugs: string[];
  symptoms: string[];
  dosages: string[];
  duration: string;
  severity: Severity;
}

export interface ClassifyResponse {
  is_adverse_event: boolean;
  confidence: number;
  trigger: string[];
}

export type InteractionEvidenceTier = "major" | "moderate" | "weak";

export interface PredictInteractionResponse {
  interaction_predicted: boolean;
  confidence: number;
  graph_path: string[];
  evidence?: InteractionEvidenceTier | null;
}

export type EvidenceSourceType = "PubMed" | "DrugBank" | "FDA";

export interface EvidenceSource {
  title: string;
  source: EvidenceSourceType;
  url: string;
  relevance: number;
}

export interface EvidenceResponse {
  sources: EvidenceSource[];
}

export type RiskLevel = "low" | "medium" | "high";

export interface RiskScoreResponse {
  risk_level: RiskLevel;
  explanation: string;
  contributing_reports: string[];
  contributing_sources: string[];
}

/** Full pipeline output for one submitted report — everything the
 * signal-line UI needs to render both the headline risk and the
 * collapsed extraction detail. */
export interface Assessment {
  extracted: ExtractResponse;
  classification: ClassifyResponse;
  interaction: PredictInteractionResponse;
  checkedPairs: Array<{ drug_a: string; drug_b: string; result: PredictInteractionResponse }>;
  evidence: EvidenceResponse;
  riskScore: RiskScoreResponse;
}

/** A report as stored in Supabase — same fields as Assessment, just
 * the DB column names/casing, plus the row's own id/owner/timestamp. */
export interface PersistedReport {
  id: string;
  patient_user_id: string;
  report_text: string;
  extracted: ExtractResponse;
  classification: ClassifyResponse;
  interaction: PredictInteractionResponse;
  evidence: EvidenceResponse;
  risk_score: RiskScoreResponse;
  created_at: string;
}

export function assessmentFromPersistedReport(row: PersistedReport): Assessment {
  return {
    extracted: row.extracted,
    classification: row.classification,
    interaction: row.interaction,
    checkedPairs: [],
    evidence: row.evidence,
    riskScore: row.risk_score,
  };
}
