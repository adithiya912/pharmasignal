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

export interface PredictInteractionResponse {
  interaction_predicted: boolean;
  confidence: number;
  graph_path: string[];
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
