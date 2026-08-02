from app.graph_db import get_driver

# v0: direct graph traversal, not a trained GNN. See docs/features.md for
# why this changes what "confidence" and "graph_path" mean versus what a
# GNN would return — summarized here:
#
# - A direct edge (1 hop) is a *documented* interaction from the seed
#   corpus. Its confidence is derived from the edge's evidence strength
#   (major/moderate/weak), i.e. "how well-established is this known
#   interaction" — not a model's calibrated probability.
# - A 2-hop path (one intermediate drug, no direct edge) is NOT a
#   documented interaction between drug_a and drug_b — it's a structural
#   hint ("both interact with the same third drug"), which is a much
#   weaker signal. Confidence is decayed accordingly and should not be
#   read as evidence the two drugs actually interact.
# - No path within 2 hops returns interaction_predicted=False with LOW
#   confidence, not high confidence — absence of an edge in a 9-drug seed
#   graph means "no data," not "proven safe." A trained GNN could
#   generalize to previously-unseen pairs from learned structure; this
#   graph query cannot — it can only report what's already encoded.
_EVIDENCE_WEIGHT = {"major": 0.9, "moderate": 0.6, "weak": 0.3}
_INDIRECT_DECAY = 0.5
_NO_PATH_CONFIDENCE = 0.1


def predict_interaction(drug_a: str, drug_b: str) -> tuple[bool, float, list[str]]:
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            """
            MATCH p = shortestPath(
                (a:Drug {name: $drug_a})-[:INTERACTS_WITH*1..2]-(b:Drug {name: $drug_b})
            )
            RETURN [n IN nodes(p) | n.name] AS path,
                   [r IN relationships(p) | r.evidence] AS evidences,
                   length(p) AS hops
            """,
            drug_a=drug_a,
            drug_b=drug_b,
        ).single()

    if record is None:
        return False, _NO_PATH_CONFIDENCE, []

    path: list[str] = record["path"]
    weights = [_EVIDENCE_WEIGHT.get(e, 0.0) for e in record["evidences"]]
    hops: int = record["hops"]

    confidence = weights[0] if hops == 1 else _INDIRECT_DECAY * min(weights)
    return True, round(confidence, 2), path
