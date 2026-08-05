import json
from pathlib import Path

ARTIFACT_DIR = Path(__file__).resolve().parent / "gnn_artifacts"
EVAL_REPORT_PATH = ARTIFACT_DIR / "eval_report.json"


def get_model_eval() -> dict:
    """Reads the eval report scripts/train_gnn.py wrote during its last
    run. Returns an honest "not yet trained" shape if the artifact is
    missing rather than fabricating numbers — this can happen on a
    fresh checkout before anyone has run the training script."""
    if not EVAL_REPORT_PATH.exists():
        return {"trained": False}
    with open(EVAL_REPORT_PATH) as f:
        report = json.load(f)
    return {"trained": True, **report}
