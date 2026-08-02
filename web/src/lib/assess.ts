import type {
  Assessment,
  ClassifyResponse,
  EvidenceResponse,
  ExtractResponse,
  PredictInteractionResponse,
  RiskScoreResponse,
} from "@/lib/types";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error ?? `Request to ${path} failed (${res.status})`);
  }
  return res.json();
}

function uniquePairs<T>(items: T[]): [T, T][] {
  const pairs: [T, T][] = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push([items[i], items[j]]);
    }
  }
  return pairs;
}

/**
 * Chains /classify -> /predict-interaction -> /retrieve-evidence ->
 * /risk-score for one already-extracted report, entirely via the
 * server-side /api/* proxy routes (mirroring /api/extract's pattern).
 *
 * If fewer than 2 drugs were extracted, /predict-interaction is
 * skipped and a "no interaction evaluated" default is fed to
 * /risk-score instead of erroring. If 3+ drugs were extracted, every
 * unique pair is checked and the highest-confidence result is used
 * as the representative interaction — the full per-pair list is kept
 * on the returned Assessment for transparency.
 */
export async function runFullAssessment(
  reportId: string,
  reportText: string,
  extracted: ExtractResponse,
): Promise<Assessment> {
  const classification = await postJson<ClassifyResponse>("/api/classify", {
    report_text: reportText,
    extracted,
  });

  const drugPairs = uniquePairs(extracted.drugs);
  const checkedPairs: Assessment["checkedPairs"] = [];
  for (const [drug_a, drug_b] of drugPairs) {
    const result = await postJson<PredictInteractionResponse>("/api/predict-interaction", {
      drug_a,
      drug_b,
    });
    checkedPairs.push({ drug_a, drug_b, result });
  }

  const interaction: PredictInteractionResponse =
    checkedPairs.length > 0
      ? checkedPairs.reduce((best, cur) => (cur.result.confidence > best.result.confidence ? cur : best))
          .result
      : { interaction_predicted: false, confidence: 0, graph_path: [] };

  const queryTerms = [...extracted.drugs, ...extracted.symptoms].join(" ").trim();
  const evidence = queryTerms
    ? await postJson<EvidenceResponse>("/api/retrieve-evidence", { query: queryTerms })
    : { sources: [] };

  const riskScore = await postJson<RiskScoreResponse>("/api/risk-score", {
    report_id: reportId,
    classification,
    interaction,
    evidence,
  });

  return { extracted, classification, interaction, checkedPairs, evidence, riskScore };
}
