"""Runs /predict-interaction (now GNN-backed) against 4 pairs:
- warfarin + amoxicillin: known direct interaction (major evidence)
- metformin + amoxicillin: no known interaction, 3 hops apart in the graph
- metformin + warfarin: no known interaction, 2 hops apart (via ciprofloxacin)
- aspirin + fluconazole: genuinely unseen pair, not directly connected,
  2 hops apart via the warfarin hub — the actual "unseen interaction"
  case a GNN is supposed to handle differently from pure graph traversal

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
    ("metformin", "warfarin"),
    ("aspirin", "fluconazole"),
]


def main() -> None:
    for drug_a, drug_b in PAIRS:
        interaction_predicted, confidence, graph_path, evidence = predict_interaction(drug_a, drug_b)
        print(f"\n=== {drug_a} + {drug_b} ===")
        print(
            json.dumps(
                {
                    "interaction_predicted": interaction_predicted,
                    "confidence": confidence,
                    "graph_path": graph_path,
                    "evidence": evidence,
                },
                indent=2,
            )
        )
    get_driver().close()


if __name__ == "__main__":
    main()
