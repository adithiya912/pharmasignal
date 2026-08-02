from app.gnn_predictor import predict_link_probability
from app.graph_db import get_driver

# v1: interaction_predicted/confidence come from a trained GNN (see
# scripts/train_gnn.py); Neo4j graph traversal supplies graph_path
# (the explanation field) AND, when drug_a/drug_b share a direct
# edge, the edge's documented evidence tier.
#
# HONEST RELIABILITY NOTE (full writeup in docs/features.md): this GNN
# was trained on 9 nodes / 9 edges — a proof-of-concept scale, not one
# that generalizes meaningfully. A held-out evaluation during training
# scored 2/6, at or below chance. Worse, its confidence does NOT
# preserve evidence tiers even for edges it was trained on — querying
# all 9 seeded edges directly showed:
#   major:    0.997, 0.999, 0.999, 0.671, 0.666, 1.0
#   moderate: 0.282 (warfarin-ciprofloxacin), 0.869 (metformin-ciprofloxacin)
#   weak:     0.598 (warfarin-omeprazole)
# moderate (0.869) exceeds two major edges (0.666, 0.671), and weak
# (0.598) sits inside the major range too — no threshold on
# `confidence` alone can recover the tiers. That's why `evidence` is
# looked up directly from Neo4j and returned alongside `confidence`
# rather than trying to derive it from the GNN's output.
_LINK_THRESHOLD = 0.5


def _graph_path(drug_a: str, drug_b: str) -> list[str]:
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            """
            MATCH p = shortestPath(
                (a:Drug {name: $drug_a})-[:INTERACTS_WITH*1..2]-(b:Drug {name: $drug_b})
            )
            RETURN [n IN nodes(p) | n.name] AS path
            """,
            drug_a=drug_a,
            drug_b=drug_b,
        ).single()
    return record["path"] if record else []


def _direct_edge_evidence(drug_a: str, drug_b: str) -> str | None:
    """Returns the seeded edge's evidence tier (major/moderate/weak) if
    drug_a and drug_b share a direct INTERACTS_WITH edge, else None."""
    driver = get_driver()
    with driver.session() as session:
        record = session.run(
            """
            MATCH (a:Drug {name: $drug_a})-[r:INTERACTS_WITH]-(b:Drug {name: $drug_b})
            RETURN r.evidence AS evidence
            LIMIT 1
            """,
            drug_a=drug_a,
            drug_b=drug_b,
        ).single()
    return record["evidence"] if record else None


def predict_interaction(drug_a: str, drug_b: str) -> tuple[bool, float, list[str], str | None]:
    path = _graph_path(drug_a, drug_b)
    probability = predict_link_probability(drug_a, drug_b)

    if probability is None:
        # Neither the GNN nor the graph has ever seen one of these drugs.
        return False, 0.0, path, None

    evidence = _direct_edge_evidence(drug_a, drug_b)
    return probability >= _LINK_THRESHOLD, round(probability, 3), path, evidence
