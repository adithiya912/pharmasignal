from app.gnn_predictor import predict_link_probability
from app.graph_db import get_driver

# v1: interaction_predicted/confidence now come from a trained GNN
# (see scripts/train_gnn.py); Neo4j graph traversal is used ONLY for
# graph_path (the explanation field), not for the core prediction —
# per the requested internals swap.
#
# HONEST RELIABILITY NOTE (full writeup in docs/features.md): this GNN
# was trained on 9 nodes / 9 edges — a proof-of-concept scale, not one
# that generalizes meaningfully. A held-out evaluation during training
# (2 held-out true interactions + 4 held-out non-interactions) scored
# 2/6, at or below chance, and that evaluation is itself too small to
# be statistically meaningful — it demonstrates the training
# methodology has no leakage, not that the model works. Treat
# `confidence` here as "what a barely-trained model on 9 data points
# outputs," not a validated probability of real interaction.
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


def predict_interaction(drug_a: str, drug_b: str) -> tuple[bool, float, list[str]]:
    path = _graph_path(drug_a, drug_b)
    probability = predict_link_probability(drug_a, drug_b)

    if probability is None:
        # Neither the GNN nor the graph has ever seen one of these drugs.
        return False, 0.0, path

    return probability >= _LINK_THRESHOLD, round(probability, 3), path
