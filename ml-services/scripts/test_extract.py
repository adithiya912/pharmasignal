"""Runs the /extract logic directly against 3 sample patient reports
and prints the resulting JSON for manual medical-sanity review.

Run from ml-services/: python -m scripts.test_extract
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ner_extraction import extract_entities

REPORTS = [
    (
        "Knee pain, GI bleed",
        "I've been taking ibuprofen 400mg twice daily for my knee pain for "
        "about two weeks, and yesterday I started having severe stomach "
        "pain and noticed blood in my stool.",
    ),
    (
        "Diabetes, mild GI upset",
        "My doctor prescribed metformin 500mg after meals for my type 2 "
        "diabetes. After three days I started having mild nausea and "
        "diarrhea.",
    ),
    (
        "Anticoagulant + antibiotic interaction",
        "I take warfarin 5mg daily and started amoxicillin 500mg three "
        "times a day last week for a sinus infection. I've noticed unusual "
        "bruising on my arms and moderate dizziness since yesterday.",
    ),
]


def main() -> None:
    for label, report_text in REPORTS:
        result = extract_entities(report_text)
        print(f"\n=== {label} ===")
        print(f"input: {report_text}")
        print(json.dumps(result.model_dump(), indent=2))


if __name__ == "__main__":
    main()
