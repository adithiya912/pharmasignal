from app.schemas import ClassifyResponse, EvidenceResponse, PredictInteractionResponse, RiskLevel

# Recalibration note: thresholds on /predict-interaction's GNN
# `confidence` were tried first and abandoned. Querying all 9 seeded
# edges directly showed the GNN does not preserve evidence tiers:
#   major:    0.997, 0.999, 0.999, 0.671, 0.666, 1.0
#   moderate: 0.282 (warfarin-ciprofloxacin), 0.869 (metformin-ciprofloxacin)
#   weak:     0.598 (warfarin-omeprazole)
# moderate (0.869) exceeds two major edges (0.666, 0.671), and weak
# (0.598) sits inside the major range too — no confidence threshold
# can recover the tiers. So `evidence` (the seeded edge's documented
# tier, looked up directly from Neo4j — see /predict-interaction) is
# now the primary signal for direct edges. GNN `confidence` is used
# only as a boolean gate (via interaction_predicted) for pairs with NO
# direct edge, where it's the sole available signal — and it's capped
# at Medium there, never High, since it's an inferred structural hint,
# not a documented interaction.
_EVIDENCE_RELEVANCE_THRESHOLD = 0.5


def _format_sources(evidence: EvidenceResponse) -> list[str]:
    return [f"{s.title} [{s.source}] {s.url}" for s in evidence.sources]


def compute_risk_score(
    classification: ClassifyResponse,
    interaction: PredictInteractionResponse,
    evidence: EvidenceResponse,
) -> tuple[RiskLevel, str, list[str], list[str]]:
    contributing_reports = list(classification.trigger)
    contributing_sources = _format_sources(evidence)
    trigger_text = "; ".join(contributing_reports) or "no supporting signal"
    top_relevance = max((s.relevance for s in evidence.sources), default=0.0)
    path_text = " -> ".join(interaction.graph_path) if interaction.graph_path else "no graph path"
    sources_note = (
        f" Supported by {len(evidence.sources)} retrieved source(s), including '{evidence.sources[0].title}'."
        if evidence.sources
        else ""
    )

    if not classification.is_adverse_event:
        explanation = (
            f"Not flagged as a concern: the classifier did not find evidence of a "
            f"genuine adverse event ({trigger_text})."
        )
        return "low", explanation, contributing_reports, contributing_sources

    if interaction.evidence == "major":
        explanation = (
            f"Flagged high risk: adverse event indicators present ({trigger_text}), and the drug graph "
            f"shows a documented major interaction ({path_text})."
        ) + sources_note
        return "high", explanation, contributing_reports, contributing_sources

    if interaction.evidence in ("moderate", "weak"):
        explanation = (
            f"Flagged medium risk: adverse event indicators present ({trigger_text}), and the drug graph "
            f"shows a documented {interaction.evidence}-evidence interaction ({path_text})."
        ) + sources_note
        return "medium", explanation, contributing_reports, contributing_sources

    if interaction.interaction_predicted:
        explanation = (
            f"Flagged medium risk: adverse event indicators present ({trigger_text}); no documented "
            f"interaction was found in the drug graph, but the trained model flagged a possible "
            f"structural link ({path_text}, model confidence {interaction.confidence:.2f}) — not a "
            f"confirmed interaction."
        ) + sources_note
        return "medium", explanation, contributing_reports, contributing_sources

    if top_relevance >= _EVIDENCE_RELEVANCE_THRESHOLD:
        explanation = (
            f"Flagged medium risk: adverse event indicators present ({trigger_text}); no documented "
            f"interaction was found in the drug graph, but retrieved literature is relevant (top match "
            f"'{evidence.sources[0].title}', relevance {evidence.sources[0].relevance:.2f})."
        )
        return "medium", explanation, contributing_reports, contributing_sources

    explanation = (
        f"Adverse event indicators present ({trigger_text}), but no documented or graph-suggested drug "
        f"interaction was found"
    )
    explanation += (
        f", and retrieved evidence was not strongly relevant (top relevance {top_relevance:.2f})."
        if evidence.sources
        else " and no supporting literature was retrieved."
    )
    return "low", explanation, contributing_reports, contributing_sources
