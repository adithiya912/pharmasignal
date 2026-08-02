"""Runs /extract + /classify against 4 sample reports (the 3 from
test_extract.py plus one clean negative-control report) for manual
review.

Run from ml-services/: python -m scripts.test_classify
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.classify import classify_report
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
    (
        "Negative control - no adverse event",
        "I've been taking paracetamol 500mg for a headache and felt fine, "
        "no side effects at all.",
    ),
]


def main() -> None:
    for label, report_text in REPORTS:
        extracted = extract_entities(report_text)
        is_adverse_event, confidence, trigger = classify_report(report_text, extracted)
        print(f"\n=== {label} ===")
        print(f"input: {report_text}")
        print("extracted:", json.dumps(extracted.model_dump(), indent=2))
        print(
            "classify:",
            json.dumps(
                {
                    "is_adverse_event": is_adverse_event,
                    "confidence": confidence,
                    "trigger": trigger,
                },
                indent=2,
            ),
        )


if __name__ == "__main__":
    main()
