"""Pulls real evidence-corpus entries from PubMed (NCBI E-utilities) and
openFDA to widen app/evidence.py's local corpus beyond its 17 hand-written
entries, which cover only 4 of the 9 drugs seeded in scripts/seed_graph.py.

Deliberately does NOT touch scripts/seed_graph.py's Neo4j interaction
graph (no new interaction claims are added anywhere) and does NOT add
DrugBank entries — DrugBank's terms of service prohibit scraping their
site; real access needs a paid API license this project doesn't have.
See docs/features.md for the full scope note.

Writes app/evidence_corpus_ingested.json. app/evidence.py loads it
additively alongside the existing hand-written EVIDENCE_CORPUS, deduped
by URL — an absent file means today's 17-entry behavior, unchanged.
Idempotent: re-running only fetches URLs not already present in either
the hand-written list or a prior run's output.

Run from ml-services/: python -m scripts.ingest_evidence
"""

import json
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.evidence import EVIDENCE_CORPUS
from scripts.seed_graph import DRUGS, INTERACTIONS

ARTIFACT_PATH = Path(__file__).resolve().parent.parent / "app" / "evidence_corpus_ingested.json"

EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
OPENFDA_BASE = "https://api.fda.gov/drug/label.json"

# NCBI's E-utilities usage policy asks for a tool/email identifier and no
# more than 3 requests/sec without an API key
# (https://www.ncbi.nlm.nih.gov/books/NBK25497/) — this is a manual,
# one-off batch job, so a fixed delay is simpler than a real limiter.
EUTILS_DELAY_SECONDS = 0.4
TOOL_PARAMS = {"tool": "pharmasignal-ingest", "email": "dev@pharmasignal.local"}

EXCERPT_MAX_CHARS = 500
FDA_LABEL_FIELDS = ["drug_interactions", "warnings", "adverse_reactions"]

# openFDA stores this combo drug's generic_name differently than our
# hyphenated seed-graph spelling.
OPENFDA_NAME_OVERRIDES = {
    "sulfamethoxazole-trimethoprim": "sulfamethoxazole and trimethoprim",
}

# PMIDs manually confirmed (by reading the full abstract) to be false
# positives that survive both the [tiab] restriction and the require_any
# keyword guard — a real limitation of keyword-based filtering, not a
# code bug: the drug names genuinely appear in title/abstract, just not
# as the paper's actual subject.
#   42383347 — a protein-crystallography/molecular-docking study that
#   uses warfarin and ibuprofen only as textbook Sudlow's-site albumin-
#   binding markers ("site-specific markers, warfarin and ibuprofen"),
#   not a clinical paper about either drug.
EXCLUDED_PMIDS = {"42383347"}

# Already covered by the hand-written corpus (or a prior run of this
# script, since its own output gets merged into EVIDENCE_CORPUS) — skip
# re-fetching these so re-runs only pull genuinely new material.
existing_urls = {e["url"] for e in EVIDENCE_CORPUS}


def _truncate(text: str) -> str:
    text = " ".join(text.split())
    return text if len(text) <= EXCERPT_MAX_CHARS else text[:EXCERPT_MAX_CHARS].rsplit(" ", 1)[0] + "…"


def fetch_fda_entries(drug: str) -> list[dict]:
    query_name = OPENFDA_NAME_OVERRIDES.get(drug, drug)
    resp = requests.get(
        OPENFDA_BASE,
        params={"search": f'openfda.generic_name:"{query_name}"', "limit": 1},
        timeout=15,
    )
    if resp.status_code != 200:
        return []

    result = resp.json()["results"][0]
    spl_set_ids = result.get("openfda", {}).get("spl_set_id")
    if not spl_set_ids:
        return []
    url = f"https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid={spl_set_ids[0]}"
    if url in existing_urls:
        return []

    brand = (result.get("openfda", {}).get("brand_name") or [drug.upper()])[0]
    entries = []
    for field in FDA_LABEL_FIELDS:
        values = result.get(field)
        if not values:
            continue
        entries.append(
            {
                "title": f"{brand} — {field.replace('_', ' ').title()} (FDA label via DailyMed)",
                "source": "FDA",
                "url": url,
                "text": _truncate(values[0]),
            }
        )
    return entries


def _esearch(term: str, retmax: int) -> list[str]:
    resp = requests.get(
        f"{EUTILS_BASE}/esearch.fcgi",
        params={**TOOL_PARAMS, "db": "pubmed", "term": term, "retmax": retmax, "retmode": "json"},
        timeout=15,
    )
    time.sleep(EUTILS_DELAY_SECONDS)
    if resp.status_code != 200:
        return []
    return resp.json().get("esearchresult", {}).get("idlist", [])


def _efetch_abstract(pmid: str) -> dict | None:
    resp = requests.get(
        f"{EUTILS_BASE}/efetch.fcgi",
        params={**TOOL_PARAMS, "db": "pubmed", "id": pmid, "rettype": "abstract", "retmode": "xml"},
        timeout=15,
    )
    time.sleep(EUTILS_DELAY_SECONDS)
    if resp.status_code != 200:
        return None

    root = ET.fromstring(resp.content)
    title_el = root.find(".//ArticleTitle")
    # Structured abstracts (BACKGROUND/METHODS/RESULTS/...) split across
    # multiple <AbstractText> elements — join all of them, not just one.
    abstract_els = root.findall(".//AbstractText")
    if title_el is None or not abstract_els:
        return None
    abstract = " ".join("".join(el.itertext()).strip() for el in abstract_els).strip()
    if not abstract:
        return None
    return {"title": "".join(title_el.itertext()).strip(), "abstract": abstract}


def fetch_pubmed_entries(term: str, retmax: int, seen_pmids: set[str], require_any: list[str]) -> list[dict]:
    """require_any: the article's title+abstract must mention at least one
    of these terms (case-insensitive) to be kept. PubMed's automatic term
    mapping/MeSH expansion can return results that technically match the
    query syntax but aren't actually about the drug in question — caught
    directly during ingestion (e.g. a tin-chemistry paper matched a bare
    "aspirin AND adverse event" search) — this guard is the fix."""
    entries = []
    for pmid in _esearch(term, retmax):
        if pmid in seen_pmids or pmid in EXCLUDED_PMIDS:
            continue
        seen_pmids.add(pmid)
        url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
        if url in existing_urls:
            continue
        article = _efetch_abstract(pmid)
        if not article:
            continue
        haystack = f"{article['title']} {article['abstract']}".lower()
        if not any(term.lower() in haystack for term in require_any):
            continue
        entries.append(
            {"title": article["title"], "source": "PubMed", "url": url, "text": _truncate(article["abstract"])}
        )
    return entries


def _name_variants(drug: str) -> list[str]:
    # "sulfamethoxazole-trimethoprim" should match a paper that only
    # mentions one half of the combo by name.
    return drug.split("-")


def _tiab(term: str) -> str:
    # [tiab] restricts to title/abstract, the PubMed field-tag idiom for
    # precision searches — verified directly: a bare (untagged) query for
    # "aspirin AND adverse event" pulled in a materials-chemistry paper
    # about a tin complex that only name-drops aspirin in passing (via
    # PubMed's automatic MeSH/synonym expansion on untagged terms);
    # [tiab] disables that expansion. Split on "-" for combo drug names
    # so "sulfamethoxazole-trimethoprim" matches a paper naming either
    # half, since PubMed phrase-indexes hyphenated terms literally.
    parts = term.split("-")
    if len(parts) > 1:
        return "(" + " OR ".join(f"{p}[tiab]" for p in parts) + ")"
    return f"{term}[tiab]"


def main() -> None:
    all_entries: list[dict] = []
    seen_pmids: set[str] = set()

    print("=== openFDA drug labels ===")
    for drug in DRUGS:
        entries = fetch_fda_entries(drug)
        print(f"  {drug}: {len(entries)} label section(s)")
        all_entries.extend(entries)

    print("\n=== PubMed — documented interaction pairs ===")
    for drug_a, drug_b, *_rest in INTERACTIONS:
        require_any = _name_variants(drug_a) + _name_variants(drug_b)
        term = f"{_tiab(drug_a)} AND {_tiab(drug_b)} AND interaction[tiab]"
        entries = fetch_pubmed_entries(term, retmax=3, seen_pmids=seen_pmids, require_any=require_any)
        print(f"  {drug_a} + {drug_b}: {len(entries)} article(s)")
        all_entries.extend(entries)

    print("\n=== PubMed — per-drug adverse event coverage ===")
    for drug in DRUGS:
        term = f'{_tiab(drug)} AND ("adverse event"[tiab] OR "adverse reaction"[tiab])'
        entries = fetch_pubmed_entries(term, retmax=2, seen_pmids=seen_pmids, require_any=_name_variants(drug))
        print(f"  {drug}: {len(entries)} article(s)")
        all_entries.extend(entries)

    by_source: dict[str, int] = {}
    for e in all_entries:
        by_source[e["source"]] = by_source.get(e["source"], 0) + 1
    print(f"\nTotal new entries: {len(all_entries)} {by_source}")

    ARTIFACT_PATH.write_text(json.dumps(all_entries, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Saved to {ARTIFACT_PATH}")


if __name__ == "__main__":
    main()
