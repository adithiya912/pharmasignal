from app.schemas import ClassifyResponse, EvidenceResponse, PredictInteractionResponse, RiskLevel

# High is a STRICT > on confidence: /predict-interaction's own evidence
# weighting (major=0.9, moderate=0.6, weak=0.3) put a direct "moderate"
# edge exactly on 0.6, so a >= comparison would put moderate-evidence
# interactions in High alongside major ones. Confirmed with the user that
# moderate should land Medium instead — hence strict > here, and the
# Medium band below is inclusive of 0.6 to match (no gap between them).
_HIGH_CONFIDENCE_THRESHOLD = 0.6
_MEDIUM_CONFIDENCE_LOW = 0.3
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

    if not classification.is_adverse_event:
        explanation = (
            f"Not flagged as a concern: the classifier did not find evidence of a "
            f"genuine adverse event ({trigger_text})."
        )
        return "low", explanation, contributing_reports, contributing_sources

    if interaction.interaction_predicted and interaction.confidence > _HIGH_CONFIDENCE_THRESHOLD:
        explanation = (
            f"Flagged high risk: adverse event indicators present ({trigger_text}), and the drug "
            f"graph shows a documented interaction ({path_text}, confidence {interaction.confidence:.2f})."
        )
        if evidence.sources:
            explanation += f" Supported by {len(evidence.sources)} retrieved source(s), including '{evidence.sources[0].title}'."
        return "high", explanation, contributing_reports, contributing_sources

    if interaction.interaction_predicted and _MEDIUM_CONFIDENCE_LOW <= interaction.confidence <= _HIGH_CONFIDENCE_THRESHOLD:
        explanation = (
            f"Flagged medium risk: adverse event indicators present ({trigger_text}), and a possible "
            f"interaction was found with moderate confidence ({path_text}, confidence {interaction.confidence:.2f})."
        )
        if evidence.sources:
            explanation += f" Supported by {len(evidence.sources)} retrieved source(s), including '{evidence.sources[0].title}'."
        return "medium", explanation, contributing_reports, contributing_sources

    if not interaction.interaction_predicted and top_relevance >= _EVIDENCE_RELEVANCE_THRESHOLD:
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
