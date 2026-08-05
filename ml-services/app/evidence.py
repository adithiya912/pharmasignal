import json
from functools import lru_cache
from pathlib import Path

import numpy as np

from app.embeddings import embed_text

# Every title/url/source below was independently verified against the live
# page (via direct fetch, not just a search snippet) before being added here.
# Excerpts are direct quotes or close paraphrases of verified page content —
# nothing here is an invented citation. See docs/features.md for the
# verification note and the two PubMed/DrugBank/FDA-vs-DailyMed caveats.
#
# "FDA" sources are hosted on DailyMed (NIH's official public mirror of
# FDA-approved structured product labels) rather than accessdata.fda.gov,
# because the specific accessdata.fda.gov PDF URLs found during research
# had gone stale (404) — DailyMed serves the same FDA-approved label content
# under a stable URL.
EVIDENCE_CORPUS: list[dict] = [
    {
        "title": "Warfarin-drug interactions: An emphasis on influence of polypharmacy and high doses of amoxicillin/clavulanate",
        "source": "PubMed",
        "url": "https://pubmed.ncbi.nlm.nih.gov/26138877/",
        "text": (
            "Investigated the effect of polypharmacy and high doses of "
            "amoxicillin/clavulanate on warfarin response in hospitalized "
            "patients; high-dose amoxicillin/clavulanate was associated with "
            "a higher risk of over-anticoagulation (elevated INR) than "
            "normal doses."
        ),
    },
    {
        "title": "Warfarin and Antibiotics: Drug Interactions and Clinical Considerations",
        "source": "PubMed",
        "url": "https://pubmed.ncbi.nlm.nih.gov/37629518/",
        "text": (
            "Warfarin administration poses a notable challenge in clinical "
            "practice due to increased susceptibility to major bleeding, "
            "particularly when co-administered with antibiotics that can "
            "modulate cytochrome P450-2C9 and affect warfarin's metabolism."
        ),
    },
    {
        "title": "Risk of Bleeding with Exposure to Warfarin and Nonsteroidal Anti-Inflammatory Drugs: A Systematic Review and Meta-Analysis",
        "source": "PubMed",
        "url": "https://pubmed.ncbi.nlm.nih.gov/32455439/",
        "text": (
            "Warfarin use can trigger bleeding independently or as a result "
            "of a drug-drug interaction when used in combination with "
            "nonsteroidal anti-inflammatory drugs (NSAIDs) such as "
            "ibuprofen."
        ),
    },
    {
        "title": "Risk factors of drug interaction between warfarin and nonsteroidal anti-inflammatory drugs in practical setting",
        "source": "PubMed",
        "url": "https://pubmed.ncbi.nlm.nih.gov/20191029/",
        "text": (
            "NSAIDs are known to interact with the oral anticoagulant "
            "warfarin and can cause a serious bleeding complication; "
            "evaluated risk factors for INR increase after adding an NSAID "
            "in patients already on warfarin."
        ),
    },
    {
        "title": "Over-the-counter ibuprofen and risk of gastrointestinal bleeding complications: a systematic literature review",
        "source": "PubMed",
        "url": "https://pubmed.ncbi.nlm.nih.gov/22017233/",
        "text": (
            "Exposure to over-the-counter ibuprofen and other OTC NSAIDs is "
            "substantial; reviewed the gastrointestinal (GI) bleeding risk "
            "profile specific to OTC-dose ibuprofen."
        ),
    },
    {
        "title": "Variability among nonsteroidal antiinflammatory drugs in risk of upper gastrointestinal bleeding",
        "source": "PubMed",
        "url": "https://pubmed.ncbi.nlm.nih.gov/20178131/",
        "text": (
            "Traditional NSAIDs increase the risk of upper gastrointestinal "
            "bleeding and perforation; assessed the risk of upper GI "
            "bleeding among users of individual NSAIDs including ibuprofen."
        ),
    },
    {
        "title": "Metformin as a cause of late-onset chronic diarrhea",
        "source": "PubMed",
        "url": "https://pubmed.ncbi.nlm.nih.gov/11714216/",
        "text": (
            "Gastrointestinal adverse effects such as abdominal pain, "
            "nausea, dyspepsia, anorexia, and diarrhea are common with "
            "metformin; describes a case of explosive watery diarrhea "
            "occurring years into stable metformin therapy that resolved "
            "on discontinuation."
        ),
    },
    {
        "title": "Gastrointestinal adverse events of metformin treatment in patients with type 2 diabetes mellitus: A systematic review, meta-analysis and meta-regression of randomized controlled trials",
        "source": "PubMed",
        "url": "https://pubmed.ncbi.nlm.nih.gov/36187122/",
        "text": (
            "Meta-analysis of 71 randomized controlled trials found "
            "metformin use was associated with higher risk of abdominal "
            "pain, diarrhea, and nausea compared to control; risk of "
            "bloating and diarrhea was higher with immediate-release than "
            "extended-release formulations."
        ),
    },
    {
        "title": "Adverse reaction to amoxicillin: a case report",
        "source": "PubMed",
        "url": "https://pubmed.ncbi.nlm.nih.gov/11048309/",
        "text": (
            "Penicillin is the drug that most often leads to allergic "
            "reactions and anaphylaxis; describes a severe allergic "
            "reaction to amoxicillin in a pediatric patient and reviews "
            "management of penicillin hypersensitivity."
        ),
    },
    {
        "title": "Warfarin: Uses, Interactions, Mechanism of Action",
        "source": "DrugBank",
        "url": "https://go.drugbank.com/drugs/DB00682",
        "text": (
            "Warfarin is a vitamin K antagonist used to treat venous "
            "thromboembolism, pulmonary embolism, thromboembolism with "
            "atrial fibrillation, thromboembolism with cardiac valve "
            "replacement, and thromboembolic events post myocardial "
            "infarction."
        ),
    },
    {
        "title": "Metformin: Uses, Interactions, Mechanism of Action",
        "source": "DrugBank",
        "url": "https://go.drugbank.com/drugs/DB00331",
        "text": (
            "Metformin is a biguanide antihyperglycemic used in "
            "conjunction with diet and exercise for glycemic control in "
            "type 2 diabetes mellitus, also used off-label for insulin "
            "resistance in PCOS."
        ),
    },
    {
        "title": "Ibuprofen: Uses, Interactions, Mechanism of Action",
        "source": "DrugBank",
        "url": "https://go.drugbank.com/drugs/DB01050",
        "text": (
            "Ibuprofen is an NSAID and non-selective COX inhibitor used to "
            "treat mild-moderate pain, fever, and inflammation."
        ),
    },
    {
        "title": "Amoxicillin: Uses, Interactions, Mechanism of Action",
        "source": "DrugBank",
        "url": "https://go.drugbank.com/drugs/DB01060",
        "text": (
            "Amoxicillin is a penicillin derivative used for the treatment "
            "of infections caused by gram-positive bacteria, particularly "
            "streptococcal bacteria causing upper respiratory tract "
            "infections."
        ),
    },
    {
        "title": "WARFARIN SODIUM tablet — FDA-approved label (DailyMed)",
        "source": "FDA",
        "url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=c437507c-d308-4aac-aa5e-a54972c7fa95",
        "text": (
            "Warfarin sodium can cause major or fatal bleeding. Bleeding "
            "is more likely to occur during the starting period and with "
            "a higher dose, resulting in a higher INR."
        ),
    },
    {
        "title": "AMOXICILLIN capsule/tablet/suspension — FDA-approved label (DailyMed)",
        "source": "FDA",
        "url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=649d285c-8fcb-48dd-aa5e-2f34128102f5",
        "text": (
            "Serum sickness-like reactions, erythematous maculopapular "
            "rashes, erythema multiforme, and urticaria have been "
            "reported. A high percentage of patients with mononucleosis "
            "who receive ampicillin-class antibiotics develop an "
            "erythematous skin rash."
        ),
    },
    {
        "title": "METFORMIN HYDROCHLORIDE tablet — FDA-approved label (DailyMed)",
        "source": "FDA",
        "url": "https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=bb62088f-e9af-4644-9f57-cb90bab0f199",
        "text": (
            "Postmarketing cases of metformin-associated lactic acidosis "
            "have resulted in death, hypothermia, hypotension, and "
            "resistant bradyarrhythmias. The most common adverse reactions "
            "(>5.0%) are diarrhea, nausea/vomiting, flatulence, asthenia, "
            "indigestion, abdominal discomfort, and headache."
        ),
    },
    {
        "title": "MOTRIN IB (ibuprofen) tablet, film coated — FDA-approved label (DailyMed)",
        "source": "FDA",
        "url": "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d21129f8-4d96-4e36-bc39-a534306dd77e",
        "text": (
            "This product contains an NSAID, which may cause severe "
            "stomach bleeding; the chance is higher for people age 60 or "
            "older. NSAIDs, except aspirin, increase the risk of heart "
            "attack, heart failure, and stroke, which can be fatal."
        ),
    },
]

_INGESTED_CORPUS_PATH = Path(__file__).resolve().parent / "evidence_corpus_ingested.json"


def _load_ingested_corpus() -> list[dict]:
    """Real PubMed/openFDA entries from scripts/ingest_evidence.py, if
    that script has been run — same honest empty-if-absent pattern as
    app/model_info.py's GNN eval artifact. Never replaces the hand-written
    entries above, only adds to them."""
    if not _INGESTED_CORPUS_PATH.exists():
        return []
    with open(_INGESTED_CORPUS_PATH, encoding="utf-8") as f:
        return json.load(f)


_existing_urls = {e["url"] for e in EVIDENCE_CORPUS}
EVIDENCE_CORPUS.extend(e for e in _load_ingested_corpus() if e["url"] not in _existing_urls)


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom else 0.0


@lru_cache(maxsize=1)
def _corpus_embeddings() -> np.ndarray:
    return np.array([embed_text(f"{e['title']}. {e['text']}") for e in EVIDENCE_CORPUS])


def retrieve_evidence(query: str, top_k: int = 5) -> list[dict]:
    query_vec = np.array(embed_text(query))
    embeddings = _corpus_embeddings()

    scored = [
        {
            "title": entry["title"],
            "source": entry["source"],
            "url": entry["url"],
            "relevance": round(_cosine(query_vec, embeddings[i]), 3),
        }
        for i, entry in enumerate(EVIDENCE_CORPUS)
    ]
    scored.sort(key=lambda s: s["relevance"], reverse=True)
    return scored[:top_k]
