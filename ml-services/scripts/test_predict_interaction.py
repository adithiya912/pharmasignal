"""Runs /predict-interaction against 2 pairs: a direct, well-documented
interaction (warfarin + amoxicillin) and a pair with no known
interaction in the seed graph (metformin + amoxicillin — both nodes
exist but aren't connected within 2 hops), to confirm both return
sensible results.

Run from ml-services/: python -m scripts.test_predict_interaction
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.graph_db import get_driver
from app.predict_interaction import predict_interaction

PAIRS = [
    ("warfarin", "amoxicillin"),
    ("metformin", "amoxicillin"),
]


def main() -> None:
    for drug_a, drug_b in PAIRS:
        interaction_predicted, confidence, graph_path = predict_interaction(drug_a, drug_b)
        print(f"\n=== {drug_a} + {drug_b} ===")
        print(
            json.dumps(
                {
                    "interaction_predicted": interaction_predicted,
                    "confidence": confidence,
                    "graph_path": graph_path,
                },
                indent=2,
            )
        )
    get_driver().close()


if __name__ == "__main__":
    main()
