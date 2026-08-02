import numpy as np

from app.embeddings import embed_text

# Calibrated against a 6-report test set (3 reports describing the same GI
# symptom in different words, 3 unrelated): within-group cosine similarity
# ranged 0.44-0.63, cross-group similarity topped out at 0.39. This is a
# small-sample threshold, not a tuned one — revisit once real report volume
# is available.
SIMILARITY_THRESHOLD = 0.42

# Nearest-anchor labeling: since /cluster's contract only receives id +
# embedding (no report text), a cluster is labeled by embedding a small set
# of canonical symptom phrases with the same model and picking whichever is
# closest to the cluster centroid — no new model, no invented per-report
# medical claims, just a nearest-neighbor lookup against known vocabulary.
_LABEL_ANCHORS = [
    "stomach pain",
    "abdominal pain",
    "nausea and vomiting",
    "diarrhea",
    "skin rash",
    "dizziness and fainting",
    "headache",
    "bruising and bleeding",
    "fatigue",
    "joint pain and swelling",
    "shortness of breath",
    "chest pain",
    "fever",
]


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / denom) if denom else 0.0


class _UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, x: int, y: int) -> None:
        rx, ry = self.find(x), self.find(y)
        if rx != ry:
            self.parent[rx] = ry


def _anchor_embeddings() -> np.ndarray:
    return np.array([embed_text(a) for a in _LABEL_ANCHORS])


def _label_for_centroid(centroid: np.ndarray, anchors: np.ndarray) -> str:
    sims = [_cosine(centroid, a) for a in anchors]
    return _LABEL_ANCHORS[max(range(len(sims)), key=lambda i: sims[i])]


def cluster_reports(reports: list[dict]) -> list[dict]:
    n = len(reports)
    if n == 0:
        return []

    embeddings = np.array([r["embedding"] for r in reports], dtype=float)

    uf = _UnionFind(n)
    for i in range(n):
        for j in range(i + 1, n):
            if _cosine(embeddings[i], embeddings[j]) >= SIMILARITY_THRESHOLD:
                uf.union(i, j)

    groups: dict[int, list[int]] = {}
    for i in range(n):
        groups.setdefault(uf.find(i), []).append(i)

    anchors = _anchor_embeddings()
    clusters = []
    for cluster_idx, indices in enumerate(groups.values()):
        centroid = embeddings[indices].mean(axis=0)
        clusters.append(
            {
                "cluster_id": f"cluster_{cluster_idx}",
                "report_ids": [reports[i]["id"] for i in indices],
                "label": _label_for_centroid(centroid, anchors),
                "size": len(indices),
            }
        )
    return clusters
