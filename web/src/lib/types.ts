export type Severity = "low" | "medium" | "high" | "unknown";

export interface ExtractResponse {
  drugs: string[];
  symptoms: string[];
  dosages: string[];
  duration: string;
  severity: Severity;
}
