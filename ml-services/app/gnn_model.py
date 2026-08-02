import torch
import torch.nn as nn
from torch_geometric.nn import GCNConv

from app.graph_db import get_driver

EVIDENCE_WEIGHT = {"major": 0.9, "moderate": 0.6, "weak": 0.3}


class LinkPredictionGCN(nn.Module):
    """2-layer GCN encoder + dot-product decoder for link prediction.

    No molecular/chemical descriptors are available at this prototype
    stage, so node features are a learned embedding table — the model
    has to learn node representations purely from graph structure and
    the INTERACTS_WITH evidence weight, nothing else.
    """

    def __init__(self, num_nodes: int, hidden_dim: int = 16, out_dim: int = 8):
        super().__init__()
        self.embedding = nn.Embedding(num_nodes, hidden_dim)
        self.conv1 = GCNConv(hidden_dim, hidden_dim)
        self.conv2 = GCNConv(hidden_dim, out_dim)

    def encode(self, edge_index: torch.Tensor, edge_weight: torch.Tensor) -> torch.Tensor:
        x = self.embedding.weight
        x = self.conv1(x, edge_index, edge_weight).relu()
        x = self.conv2(x, edge_index, edge_weight)
        return x

    def decode(self, z: torch.Tensor, edge_label_index: torch.Tensor) -> torch.Tensor:
        src, dst = edge_label_index
        return (z[src] * z[dst]).sum(dim=-1)


def load_graph_from_neo4j() -> tuple[list[str], list[tuple[int, int, float]]]:
    """Returns (node_names sorted, [(src_idx, dst_idx, evidence_weight), ...])."""
    driver = get_driver()
    with driver.session() as session:
        nodes = sorted(r["name"] for r in session.run("MATCH (d:Drug) RETURN d.name AS name"))
        node_index = {name: i for i, name in enumerate(nodes)}
        edges = [
            (node_index[r["a"]], node_index[r["b"]], EVIDENCE_WEIGHT.get(r["evidence"], 0.5))
            for r in session.run(
                "MATCH (a:Drug)-[rel:INTERACTS_WITH]->(b:Drug) "
                "RETURN a.name AS a, b.name AS b, rel.evidence AS evidence"
            )
        ]
    return nodes, edges


def build_bidirectional_edge_tensors(
    edges: list[tuple[int, int, float]],
) -> tuple[torch.Tensor, torch.Tensor]:
    """GCNConv needs both directions present for undirected message passing."""
    src = [e[0] for e in edges] + [e[1] for e in edges]
    dst = [e[1] for e in edges] + [e[0] for e in edges]
    weight = [e[2] for e in edges] + [e[2] for e in edges]
    edge_index = torch.tensor([src, dst], dtype=torch.long)
    edge_weight = torch.tensor(weight, dtype=torch.float)
    return edge_index, edge_weight
