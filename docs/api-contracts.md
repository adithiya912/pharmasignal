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
  "graph_path": ["drug_a", "intermediate_drug", "drug_b"]
}
```

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

## Non-negotiable rule
Every endpoint that outputs a risk-related field (`is_adverse_event`,
`interaction_predicted`, `risk_level`) MUST return evidence alongside
it. No endpoint returns a bare score with nothing backing it.
