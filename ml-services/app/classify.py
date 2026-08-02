from app.schemas import ExtractResponse

# Explicit patient denial ("felt fine", "no side effects") overrides
# extracted entities: the NER model doesn't distinguish a symptom that's
# the *reason* for taking a drug (e.g. "headache" in "took paracetamol
# for a headache") from one experienced *after* taking it, so a plain
# entity-count rule would misfire on exactly the reports this phrase
# is meant to catch.
NEGATION_PHRASES = [
    "felt fine",
    "feeling fine",
    "feeling well",
    "felt well",
    "no side effects",
    "no side effect",
    "no adverse",
    "no issues",
    "no problems",
    "no complaints",
    "no reaction",
    "nothing unusual",
    "tolerating well",
    "tolerated well",
]

_SEVERITY_WEIGHT = {"high": 0.3, "medium": 0.2, "low": 0.1, "unknown": 0.0}

_NEGATION_CONFIDENCE = 0.85
_NO_EVIDENCE_CONFIDENCE = 0.5


def classify_report(report_text: str, extracted: ExtractResponse) -> tuple[bool, float, list[str]]:
    text_lower = report_text.lower()
    for phrase in NEGATION_PHRASES:
        if phrase in text_lower:
            return False, _NEGATION_CONFIDENCE, [f"negation: {phrase}"]

    has_drug = len(extracted.drugs) > 0
    symptom_count = len(extracted.symptoms)

    if has_drug and symptom_count > 0:
        severity_weight = _SEVERITY_WEIGHT.get(extracted.severity, 0.0)
        confidence = min(0.6 + 0.1 * min(symptom_count, 2) + severity_weight, 0.95)
        trigger = [f"drug: {d}" for d in extracted.drugs] + [f"symptom: {s}" for s in extracted.symptoms]
        return True, round(confidence, 2), trigger

    trigger = []
    if not has_drug:
        trigger.append("no drug entities extracted")
    if symptom_count == 0:
        trigger.append("no symptom entities extracted")
    return False, _NO_EVIDENCE_CONFIDENCE, trigger
