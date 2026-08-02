"""End-to-end pipeline test: chains /extract -> /classify ->
/predict-interaction -> /retrieve-evidence -> /risk-score for 3 real
reports, to verify the fusion logic against real upstream outputs
rather than hand-crafted inputs.

Reports with fewer than 2 extracted drugs skip /predict-interaction
(there's no pair to check) and pass through a default
"no interaction" result — this mirrors how a real orchestrator would
have to handle a single-drug report.

Run from ml-services/: python -m scripts.test_risk_score
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.classify import classify_report
from app.evidence import retrieve_evidence
from app.graph_db import get_driver
from app.ner_extraction import extract_entities
from app.predict_interaction import predict_interaction
from app.risk_score import compute_risk_score
from app.schemas import ClassifyResponse, EvidenceResponse, EvidenceSource, PredictInteractionResponse

REPORTS = [
    (
        "r1-warfarin-amoxicillin",
        "I take warfarin 5mg daily and started amoxicillin 500mg three "
        "times a day last week for a sinus infection. I've noticed unusual "
        "bruising on my arms and moderate dizziness since yesterday.",
    ),
    (
        "r2-metformin-ciprofloxacin",
        "I've been taking metformin for my diabetes and started "
        "ciprofloxacin for a urinary tract infection last week. Since then "
        "I've noticed my blood sugar swinging unpredictably, with a few "
        "episodes of shakiness and sweating.",
    ),
    (
        "r3-negative-control",
        "I've been taking paracetamol 500mg for a headache and felt fine, "
        "no side effects at all.",
    ),
]


def run_pipeline(report_id: str, report_text: str) -> None:
    extracted = extract_entities(report_text)

    is_adverse_event, classify_confidence, trigger = classify_report(report_text, extracted)
    classification = ClassifyResponse(is_adverse_event=is_adverse_event, confidence=classify_confidence, trigger=trigger)

    drugs = extracted.drugs
    if len(drugs) >= 2:
        interaction_predicted, interaction_confidence, graph_path = predict_interaction(drugs[0], drugs[1])
    else:
        interaction_predicted, interaction_confidence, graph_path = False, 0.0, []
    interaction = PredictInteractionResponse(
        interaction_predicted=interaction_predicted,
        confidence=interaction_confidence,
        graph_path=graph_path,
    )

    query = " ".join(drugs) if drugs else " ".join(extracted.symptoms)
    evidence_sources = retrieve_evidence(query) if query else []
    evidence = EvidenceResponse(sources=[EvidenceSource(**s) for s in evidence_sources])

    risk_level, explanation, contributing_reports, contributing_sources = compute_risk_score(
        classification, interaction, evidence
    )

    print(f"\n=== {report_id} ===")
    print(f"input: {report_text}")
    print("extracted.drugs:", drugs)
    print("classification:", classification.model_dump())
    print("interaction:", interaction.model_dump())
    print(
        "evidence top source:",
        evidence.sources[0].model_dump() if evidence.sources else None,
    )
    print(
        json.dumps(
            {
                "risk_level": risk_level,
                "explanation": explanation,
                "contributing_reports": contributing_reports,
                "contributing_sources": contributing_sources,
            },
            indent=2,
        )
    )


def main() -> None:
    for report_id, report_text in REPORTS:
        run_pipeline(report_id, report_text)
    get_driver().close()


if __name__ == "__main__":
    main()
