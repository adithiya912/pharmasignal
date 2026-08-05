from app.graph_db import get_driver


def get_full_graph() -> tuple[list[dict], list[dict]]:
    """Returns every seeded Drug node and INTERACTS_WITH edge directly
    from Neo4j — real, documented interactions only (see
    scripts/seed_graph.py), never GNN-inferred edges materialized as if
    they were confirmed. Used by the doctor/admin Drug Interaction
    Network page so it renders in one call instead of the O(n^2)
    pairwise /predict-interaction calls a full pairwise check would need."""
    driver = get_driver()
    with driver.session() as session:
        nodes = [
            record["name"]
            for record in session.run("MATCH (d:Drug) RETURN d.name AS name ORDER BY d.name")
        ]
        edges = session.run(
            """
            MATCH (a:Drug)-[r:INTERACTS_WITH]->(b:Drug)
            RETURN a.name AS source, b.name AS target, r.evidence AS evidence,
                   r.mechanism AS mechanism, r.source AS source_ref
            ORDER BY a.name, b.name
            """
        ).data()
    return [{"id": name, "label": name} for name in nodes], edges
