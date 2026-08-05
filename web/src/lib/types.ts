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

export interface ReferenceSite {
  name: string;
  url: string;
}

/** General, unverified AI answer for a drug pair with no graph/GNN data —
 * distinct from EvidenceResponse's per-claim citations. reference_sites is
 * a fixed list of real, stable general-reference sites, not per-answer
 * citations (see ml-services/app/general_info.py for why). */
export interface GeneralInfoResponse {
  answer: string;
  reference_sites: ReferenceSite[];
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

export type ReviewStatus = "pending" | "approved" | "rejected";

/** A report as stored in Supabase — same fields as Assessment, just
 * the DB column names/casing, plus the row's own id/owner/timestamp.
 * doctor_notes/review_status/reviewed_at are only populated once
 * supabase/migrations/0002_add_report_review_fields.sql has been run —
 * treat them as optional/possibly-undefined, never assume presence. */
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
  doctor_notes?: string | null;
  review_status?: ReviewStatus;
  reviewed_at?: string | null;
}

export interface GraphNode {
  id: string;
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  evidence: InteractionEvidenceTier;
  mechanism: string;
  source_ref: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ModelEvalPrediction {
  drug_a: string;
  drug_b: string;
  probability: number;
  true_label: string;
  predicted_correctly: boolean;
}

export interface ModelHeldOutEval {
  test_size: number;
  correct: number;
  accuracy: number;
  best_epoch: number;
  best_val_loss: number;
  predictions: ModelEvalPrediction[];
}

/** trained=false means scripts/train_gnn.py has never been run on this
 * checkout — every other field is absent, not zeroed/faked. */
export interface ModelInfoResponse {
  trained: boolean;
  trained_at?: string;
  architecture?: string;
  graph_nodes?: number;
  graph_edges?: number;
  held_out_eval?: ModelHeldOutEval;
  caveat?: string;
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
