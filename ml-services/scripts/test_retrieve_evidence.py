"""Runs /retrieve-evidence against 2 queries: a drug-pair query and a
symptom-based query, to verify the local corpus retrieves relevant
real sources for both.

Run from ml-services/: python -m scripts.test_retrieve_evidence
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.evidence import retrieve_evidence

QUERIES = [
    "warfarin amoxicillin",
    "GI bleeding ibuprofen",
]


def main() -> None:
    for query in QUERIES:
        print(f"\n=== query: {query!r} ===")
        print(json.dumps({"sources": retrieve_evidence(query)}, indent=2))


if __name__ == "__main__":
    main()
