# API Contracts — ML Services ↔ Web App

Any change to a shape below must be updated here in the same commit
that changes the code.

## POST /extract
Input:
```json
{ "report_text": "string" }
```
Output:
```json
{
  "drugs": ["string"],
  "symptoms": ["string"],
  "dosages": ["string"],
  "duration": "string",
  "severity": "low | medium | high | unknown"
}
```

## POST /classify
Input:
```json
{ "report_text": "string", "extracted": { "...output of /extract" : "" } }
```
Output:
```json
{
  "is_adverse_event": true,
  "confidence": 0.0,
  "trigger": ["string — entity or phrase that drove the decision, e.g. 'drug: ibuprofen', 'symptom: blood', 'negation: felt fine'"]
}
```

## POST /embed
Input:
```json
{ "report_text": "string" }
```
Output:
```json
{ "embedding": [0.0] }
```
Thin wrapper around the sentence-transformers model already used
internally by `/cluster` and `/retrieve-evidence` (`app/embeddings.py`)
— added so a caller that only has report text (e.g. the admin trend
dashboard, clustering reports fetched from Supabase after the fact)
can produce the `embedding` that `/cluster` requires, without
duplicating the model elsewhere.

## POST /cluster
Input:
```json
{ "reports": [ { "id": "string", "embedding": [0.0] } ] }
```
Output:
```json
{
  "clusters": [
    {
      "cluster_id": "string",
      "report_ids": ["string"],
      "label": "string (e.g. 'stomach pain + vomiting')",
      "size": 0
    }
  ]
}
```

## POST /predict-interaction
Input:
```json
{ "drug_a": "string", "drug_b": "string" }
```
Output:
```json
{
  "interaction_predicted": true,
  "confidence": 0.0,
  "graph_path": ["drug_a", "intermediate_drug", "drug_b"],
  "evidence": "major | moderate | weak | null"
}
```
`evidence` is the seeded edge's documented evidence tier when drug_a
and drug_b share a direct graph edge — sourced from Neo4j, not the
GNN. It's `null` when there's no direct edge (indirect path or no
path at all), since an evidence tier only exists for documented
interactions, not GNN-inferred ones. Added because the GNN's
confidence alone doesn't preserve evidence tiers at this data scale
(a "moderate" edge scored higher than several "major" edges in
testing) — /risk-score uses `evidence` as its primary signal for
direct edges and falls back to `confidence` only when `evidence` is
null. See docs/features.md for the full writeup.

## POST /retrieve-evidence
Input:
```json
{ "query": "string (e.g. drug pair or symptom)" }
```
Output:
```json
{
  "sources": [
    {
      "title": "string",
      "source": "PubMed | DrugBank | FDA",
      "url": "string",
      "relevance": 0.0
    }
  ]
}
```

## POST /risk-score
Input:
```json
{
  "report_id": "string",
  "classification": { "...output of /classify": "" },
  "interaction": { "...output of /predict-interaction": "" },
  "evidence": { "...output of /retrieve-evidence": "" }
}
```
Output:
```json
{
  "risk_level": "low | medium | high",
  "explanation": "string — plain-language reason for the score",
  "contributing_reports": ["string"],
  "contributing_sources": ["string"]
}
```

## POST /chat
Input:
```json
{
  "message": "string",
  "history": [{ "role": "user | assistant", "content": "string" }]
}
```
Output:
```json
{
  "answer": "string",
  "sources": [
    {
      "title": "string",
      "source": "PubMed | DrugBank | FDA",
      "url": "string",
      "relevance": 0.0
    }
  ]
}
```
Backs the patient AI Health Assistant (`/patient/assistant`). Retrieves
evidence via the same corpus/embeddings `/retrieve-evidence` uses
(`app/evidence.py`'s `retrieve_evidence`), then calls the Gemini API
(`gemini-flash-latest`) with a system prompt instructing it to answer **only**
from the retrieved excerpts and say so plainly when the corpus doesn't
cover the question — never from unaided model knowledge, per this file's
non-negotiable rule below. Returns `503` with an honest "not configured"
message (not a fabricated answer) when no `GEMINI_API_KEY` is available in
the environment (checked explicitly in `app/chat.py`, not inferred from an
SDK error shape). `sources` is the same `EvidenceSource` shape
`/retrieve-evidence` returns, filtered to entries with `relevance >= 0.3`.

## GET /graph
Output:
```json
{
  "nodes": [{ "id": "string", "label": "string" }],
  "edges": [
    {
      "source": "string",
      "target": "string",
      "evidence": "major | moderate | weak",
      "mechanism": "string",
      "source_ref": "string (e.g. 'PMID:26138877', 'FDA advisory, Sept 2006')"
    }
  ]
}
```
Backs the doctor/admin Drug Interaction Network page. Returns every Drug
node and INTERACTS_WITH edge directly from Neo4j (`scripts/seed_graph.py`'s
seeded data) — real, documented interactions only. Deliberately does NOT
materialize GNN-inferred edges for undocumented pairs as graph edges; per
docs/features.md, the GNN is a proof-of-concept at this data scale and an
inferred-only signal shouldn't be rendered as if it were a confirmed
interaction. A node's predicted-but-undocumented interactions are surfaced
separately if needed, via /predict-interaction on demand — never baked
into this endpoint's edge list.

## GET /model-info
Output (untrained):
```json
{ "trained": false }
```
Output (trained):
```json
{
  "trained": true,
  "trained_at": "ISO 8601 string",
  "architecture": "string",
  "graph_nodes": "number",
  "graph_edges": "number",
  "held_out_eval": {
    "test_size": "number",
    "correct": "number",
    "accuracy": "number",
    "best_epoch": "number",
    "best_val_loss": "number",
    "predictions": [
      {
        "drug_a": "string",
        "drug_b": "string",
        "probability": "number",
        "true_label": "interaction | non-interaction",
        "predicted_correctly": "boolean"
      }
    ]
  },
  "caveat": "string"
}
```
Backs the admin AI Model Monitoring page. Reads `app/gnn_artifacts/
eval_report.json`, written by `scripts/train_gnn.py`'s Phase 1 (held-out
evaluation) each time that script runs — never a hand-written number.
Returns `{"trained": false}` on a fresh checkout where the script hasn't
been run yet, rather than fabricating a metric. Per docs/features.md, the
held-out accuracy reported here is expected to be low (2/6 on the last
run, at or below chance) — the 9-node/9-edge seed graph is a proof-of-
concept scale, not a validated model; the `caveat` field states this
explicitly so the frontend never presents it as a trustworthy accuracy %.

## Non-negotiable rule
Every endpoint that outputs a risk-related field (`is_adverse_event`,
`interaction_predicted`, `risk_level`) MUST return evidence alongside
it. No endpoint returns a bare score with nothing backing it.
