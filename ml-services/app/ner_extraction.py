import re
from functools import lru_cache

from transformers import pipeline

from app.schemas import ExtractResponse, Severity

MODEL_NAME = "d4data/biomedical-ner-all"

DRUG_LABELS = {"Medication"}
SYMPTOM_LABELS = {"Sign_symptom", "Disease_disorder"}
DOSAGE_LABELS = {"Dosage"}
# The model splits duration-equivalent phrasing ("last week", "after
# three days") across Duration/Frequency/Date rather than tagging it
# all as Duration, so all three are treated as duration for this contract.
DURATION_LABELS = {"Duration", "Frequency", "Date"}
SEVERITY_LABELS = {"Severity"}

_HIGH_KEYWORDS = {"severe", "acute", "critical", "extreme", "intense", "worsening", "life-threatening"}
_MEDIUM_KEYWORDS = {"moderate"}
_LOW_KEYWORDS = {"mild", "slight", "minor"}

_DOSAGE_PATTERN = re.compile(
    r"\d+\s?(?:mg|ml|g|mcg)"
    r"(?:\s?(?:once|twice|three times))?"
    r"(?:\s?(?:daily|a day|after meals))?",
    re.IGNORECASE,
)

_TIME_UNIT_WORDS = {"day", "days", "week", "weeks", "month", "months"}


@lru_cache(maxsize=1)
def _get_pipeline():
    return pipeline("ner", model=MODEL_NAME, aggregation_strategy="simple")


def _clean(text: str) -> str:
    return re.sub(r"\s+([,.;:])", r"\1", text).strip()


def _merge_split_tokens(entities: list[dict], report_text: str) -> list[dict]:
    """d4data/biomedical-ner-all sometimes mis-tags a mid-word subword
    continuation as a new B- tag (e.g. 'ib' / '##uprofen' both tagged
    B-Medication), which breaks the pipeline's own aggregation and
    yields two entities for one word. Re-merge same-label entities that
    sit directly adjacent in the source text (no gap between them)."""
    merged: list[dict] = []
    for ent in entities:
        if (
            merged
            and merged[-1]["entity_group"] == ent["entity_group"]
            and merged[-1]["end"] == ent["start"]
        ):
            merged[-1]["end"] = ent["end"]
            merged[-1]["word"] = report_text[merged[-1]["start"] : ent["end"]]
        else:
            merged.append(dict(ent))
    return merged


def _snap_dosage(text: str) -> str:
    """The model sometimes over-extends a Dosage span into adjacent
    words (e.g. '500mg after'). Trim to the longest prefix matching a
    standard dosage pattern; leave text untouched if it doesn't match
    at all (e.g. non-numeric dosage phrasing), so we never drop data."""
    match = _DOSAGE_PATTERN.match(text.strip())
    if not match or not match.group(0):
        return text
    return match.group(0).strip()


def _extend_durations(entities: list[dict], report_text: str) -> list[dict]:
    """The model sometimes under-extends a duration-equivalent span
    (e.g. tagging only 'two' in 'two weeks'). Look at the next 1-2
    words in the source text and pull in a time-unit word if it sits
    directly adjacent (whitespace only, no punctuation break)."""
    for ent in entities:
        if ent["entity_group"] not in DURATION_LABELS:
            continue
        pos = ent["end"]
        for _ in range(2):
            gap_match = re.match(r" ?", report_text[pos:])
            gap = gap_match.group(0)
            word_match = re.match(r"[A-Za-z]+", report_text[pos + len(gap) :])
            if not word_match or word_match.group(0).lower() not in _TIME_UNIT_WORDS:
                break
            new_end = pos + len(gap) + len(word_match.group(0))
            ent["end"] = new_end
            ent["word"] = report_text[ent["start"] : new_end]
            pos = new_end
    return entities


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def _map_severity(texts: list[str]) -> Severity:
    joined = " ".join(t.lower() for t in texts)
    if any(k in joined for k in _HIGH_KEYWORDS):
        return "high"
    if any(k in joined for k in _MEDIUM_KEYWORDS):
        return "medium"
    if any(k in joined for k in _LOW_KEYWORDS):
        return "low"
    return "unknown"


def extract_entities(report_text: str) -> ExtractResponse:
    entities = _merge_split_tokens(_get_pipeline()(report_text), report_text)
    entities = _extend_durations(entities, report_text)

    drugs: list[str] = []
    symptoms: list[str] = []
    dosages: list[str] = []
    durations: list[str] = []
    severities: list[str] = []

    for ent in entities:
        group = ent.get("entity_group")
        word = _clean(ent.get("word", ""))
        if not word:
            continue
        if group in DRUG_LABELS:
            drugs.append(word)
        elif group in SYMPTOM_LABELS:
            symptoms.append(word)
        elif group in DOSAGE_LABELS:
            dosages.append(_snap_dosage(word))
        elif group in DURATION_LABELS:
            durations.append(word)
        elif group in SEVERITY_LABELS:
            severities.append(word)

    return ExtractResponse(
        drugs=_dedupe(drugs),
        symptoms=_dedupe(symptoms),
        dosages=_dedupe(dosages),
        duration="; ".join(_dedupe(durations)),
        severity=_map_severity(severities),
    )
