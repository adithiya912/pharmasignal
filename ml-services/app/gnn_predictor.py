import json
from functools import lru_cache
from pathlib import Path

import torch

_ARTIFACT_DIR = Path(__file__).resolve().parent / "gnn_artifacts"


@lru_cache(maxsize=1)
def _load() -> tuple[torch.Tensor, dict[str, int]]:
    embeddings = torch.load(_ARTIFACT_DIR / "node_embeddings.pt", weights_only=True)
    with open(_ARTIFACT_DIR / "node_index.json") as f:
        node_index = json.load(f)["node_index"]
    return embeddings, node_index


def predict_link_probability(drug_a: str, drug_b: str) -> float | None:
    """Returns the trained GNN's predicted interaction probability, or
    None if either drug wasn't a node in the graph the model was last
    trained on (embeddings are frozen at training time — a drug added
    to Neo4j via scripts/seed_graph.py after the last scripts/train_gnn.py
    run has no embedding until the model is retrained)."""
    embeddings, node_index = _load()
    if drug_a not in node_index or drug_b not in node_index:
        return None
    z_a = embeddings[node_index[drug_a]]
    z_b = embeddings[node_index[drug_b]]
    score = (z_a * z_b).sum()
    return torch.sigmoid(score).item()
