"""Runs /cluster against 6 synthetic reports: 3 describing the same GI
side effect in different words (different drugs), and 3 unrelated
reports, to verify the similar ones group together and the unrelated
ones don't get merged in.

Embeddings are generated here (via app.embeddings.embed_text) the same
way an upstream ingestion step would before calling the real endpoint,
since /cluster's contract only accepts precomputed embeddings.

Run from ml-services/: python -m scripts.test_cluster
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.cluster import cluster_reports
from app.embeddings import embed_text

REPORTS = [
    (
        "r1",
        "After starting ibuprofen I have had persistent stomach pain for "
        "the past week.",
    ),
    (
        "r2",
        "Since taking naproxen my abdominal pain has gotten worse every day.",
    ),
    (
        "r3",
        "I started metformin and now I have ongoing GI discomfort after "
        "meals.",
    ),
    (
        "r4",
        "I have developed an itchy skin rash on my arms since starting "
        "amoxicillin.",
    ),
    (
        "r5",
        "After my first dose of lisinopril I felt extremely dizzy and "
        "almost fainted.",
    ),
    (
        "r6",
        "My knee joint has been swollen and stiff since I started the new "
        "arthritis medication.",
    ),
]


def main() -> None:
    reports = [{"id": rid, "embedding": embed_text(text)} for rid, text in REPORTS]
    clusters = cluster_reports(reports)

    text_by_id = dict(REPORTS)
    print(json.dumps({"clusters": clusters}, indent=2))
    print("\nreport_id -> text (for manual verification):")
    for cluster in clusters:
        print(f"\n{cluster['cluster_id']} [{cluster['label']}]:")
        for rid in cluster["report_ids"]:
            print(f"  {rid}: {text_by_id[rid]}")


if __name__ == "__main__":
    main()
