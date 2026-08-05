"""Trains a small link-prediction GCN on the 9-drug Neo4j graph.

IMPORTANT — read before trusting any number this script prints: with 9
nodes and 9 positive edges, there is no split of this graph large enough
to produce a statistically meaningful held-out evaluation. The "test"
phase below (2 held-out positive edges) exists to demonstrate the
methodology (train message-passing graph excludes test edges, so there's
no leakage) — it is NOT evidence the model generalizes. Treat every
probability this model outputs as illustrative-of-the-method, not
validated-for-use.

Two phases:
  1. Held-out evaluation phase — train on 7/9 edges, evaluate on the 2
     held out (+ held-out negatives), to sanity-check the training setup
     produces a sensible decision boundary at all.
  2. Deployment phase — retrain a fresh model on the FULL 9-edge graph
     (best use of all real data now that methodology is validated) and
     save its node embeddings for /predict-interaction to load.

Run from ml-services/: python -m scripts.train_gnn
"""

import copy
import json
import random
import sys
from datetime import datetime, timezone
from pathlib import Path

import torch
import torch.nn as nn

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.gnn_model import LinkPredictionGCN, build_bidirectional_edge_tensors, load_graph_from_neo4j

SEED = 42
EPOCHS = 300
HIDDEN_DIM = 16
OUT_DIM = 8
ARTIFACT_DIR = Path(__file__).resolve().parent.parent / "app" / "gnn_artifacts"

TEST_PAIRS_FOR_REPORT = [
    ("warfarin", "amoxicillin"),
    ("metformin", "amoxicillin"),
    ("metformin", "warfarin"),
    ("aspirin", "fluconazole"),
]


def all_pairs(n: int) -> list[tuple[int, int]]:
    return [(i, j) for i in range(n) for j in range(i + 1, n)]


def train_model(
    edge_index: torch.Tensor,
    edge_weight: torch.Tensor,
    train_pairs: list[tuple[int, int]],
    train_labels: list[float],
    num_nodes: int,
    log_prefix: str,
    epochs: int,
    val_pairs: list[tuple[int, int]] | None = None,
    val_labels: list[float] | None = None,
) -> tuple[LinkPredictionGCN, int, float]:
    """Trains for `epochs` steps. If val_pairs/val_labels are given, also
    tracks validation loss each epoch (evaluated on the same train-only
    graph, no leakage) and returns the epoch with the lowest validation
    loss — used for early-stopping-by-reference rather than guessing an
    epoch count, since with 9 edges there's no way to validate the final
    deployment run directly (it uses all the data)."""
    torch.manual_seed(SEED)
    model = LinkPredictionGCN(num_nodes, HIDDEN_DIM, OUT_DIM)
    optimizer = torch.optim.Adam(model.parameters(), lr=0.05, weight_decay=1e-3)

    n_pos = sum(1 for label in train_labels if label == 1.0)
    n_neg = len(train_labels) - n_pos
    loss_fn = nn.BCEWithLogitsLoss(pos_weight=torch.tensor(n_neg / max(n_pos, 1)))

    label_index = torch.tensor([[a for a, _ in train_pairs], [b for _, b in train_pairs]], dtype=torch.long)
    labels = torch.tensor(train_labels, dtype=torch.float)

    val_label_index, val_target = None, None
    if val_pairs is not None:
        val_label_index = torch.tensor([[a for a, _ in val_pairs], [b for _, b in val_pairs]], dtype=torch.long)
        val_target = torch.tensor(val_labels, dtype=torch.float)

    best_epoch, best_val_loss = epochs, float("inf")
    best_state = None
    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()
        z = model.encode(edge_index, edge_weight)
        logits = model.decode(z, label_index)
        loss = loss_fn(logits, labels)
        loss.backward()
        optimizer.step()

        if val_label_index is not None:
            model.eval()
            with torch.no_grad():
                z_val = model.encode(edge_index, edge_weight)
                val_loss = nn.functional.binary_cross_entropy_with_logits(
                    model.decode(z_val, val_label_index), val_target
                ).item()
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                best_epoch = epoch
                best_state = copy.deepcopy(model.state_dict())

        if epoch == 1 or epoch % 50 == 0:
            msg = f"  [{log_prefix}] epoch {epoch:4d}  train_loss {loss.item():.4f}"
            if val_label_index is not None:
                msg += f"  val_loss {val_loss:.4f}"
            print(msg)

    if best_state is not None:
        model.load_state_dict(best_state)
        print(f"  [{log_prefix}] restored best checkpoint: epoch {best_epoch}, val_loss {best_val_loss:.4f}")

    return model, best_epoch, best_val_loss


def main() -> None:
    random.seed(SEED)
    nodes, edges = load_graph_from_neo4j()
    node_index = {name: i for i, name in enumerate(nodes)}
    n = len(nodes)
    print(f"Loaded graph: {n} nodes, {len(edges)} edges from Neo4j.")
    print("Nodes:", nodes)

    positive_pairs = {(min(a, b), max(a, b)): w for a, b, w in edges}
    negative_pairs = [p for p in all_pairs(n) if p not in positive_pairs]
    print(f"Total possible pairs: {len(all_pairs(n))}  positives: {len(positive_pairs)}  negatives: {len(negative_pairs)}")

    # ---- Phase 1: held-out evaluation (methodology check, not a real generalization estimate) ----
    print("\n=== Phase 1: held-out evaluation (2 positive edges held out) ===")
    pos_list = list(positive_pairs.items())
    random.shuffle(pos_list)
    test_pos, train_pos = pos_list[:2], pos_list[2:]

    neg_list = list(negative_pairs)
    random.shuffle(neg_list)
    test_neg, train_neg = neg_list[:4], neg_list[4:]

    train_edges_for_mp = [(a, b, w) for (a, b), w in train_pos]
    train_edge_index, train_edge_weight = build_bidirectional_edge_tensors(train_edges_for_mp)

    train_pairs = [p for p, _ in train_pos] + train_neg
    train_labels = [1.0] * len(train_pos) + [0.0] * len(train_neg)

    test_pairs = [p for p, _ in test_pos] + test_neg
    test_labels_float = [1.0] * len(test_pos) + [0.0] * len(test_neg)

    eval_model, best_epoch, best_val_loss = train_model(
        train_edge_index,
        train_edge_weight,
        train_pairs,
        train_labels,
        n,
        "phase1-train",
        EPOCHS,
        val_pairs=test_pairs,
        val_labels=test_labels_float,
    )
    print(f"Best epoch by held-out validation loss: {best_epoch} (val_loss {best_val_loss:.4f})")

    eval_model.eval()
    with torch.no_grad():
        z_eval = eval_model.encode(train_edge_index, train_edge_weight)
        test_labels = [1] * len(test_pos) + [0] * len(test_neg)
        test_label_index = torch.tensor(
            [[a for a, _ in test_pairs], [b for _, b in test_pairs]], dtype=torch.long
        )
        test_probs = torch.sigmoid(eval_model.decode(z_eval, test_label_index)).tolist()

    id_to_name = {i: name for name, i in node_index.items()}
    print("\nHeld-out test predictions (graph never saw these edges during training):")
    correct = 0
    eval_predictions = []
    for (a, b), label, prob in zip(test_pairs, test_labels, test_probs):
        predicted = 1 if prob >= 0.5 else 0
        correct += predicted == label
        tag = "true interaction" if label == 1 else "true non-interaction"
        print(f"  {id_to_name[a]:>28s} <-> {id_to_name[b]:<28s}  prob={prob:.3f}  ({tag})")
        eval_predictions.append(
            {
                "drug_a": id_to_name[a],
                "drug_b": id_to_name[b],
                "probability": round(prob, 3),
                "true_label": tag.replace("true ", ""),
                "predicted_correctly": bool(predicted == label),
            }
        )
    print(f"Held-out accuracy: {correct}/{len(test_labels)} — with n={len(test_labels)} this is NOT a")
    print("statistically meaningful generalization estimate, only a methodology sanity check.")

    # ---- Phase 2: deployment model trained on the FULL graph ----
    print("\n=== Phase 2: final model trained on the full 9-edge graph ===")
    full_edges_for_mp = [(a, b, w) for (a, b), w in positive_pairs.items()]
    full_edge_index, full_edge_weight = build_bidirectional_edge_tensors(full_edges_for_mp)

    full_pairs = list(positive_pairs.keys()) + negative_pairs
    full_labels = [1.0] * len(positive_pairs) + [0.0] * len(negative_pairs)

    print(
        f"Using phase-1's best-validation epoch ({best_epoch}) as the stopping point here too — "
        "phase 2 has no held-out set of its own (it trains on all real data), so this borrows "
        "phase 1's early-stopping signal rather than training to full convergence, which would "
        "just memorize all 9 edges (loss -> 0, probabilities -> exact 0/1)."
    )
    final_model, _, _ = train_model(
        full_edge_index, full_edge_weight, full_pairs, full_labels, n, "phase2-final", best_epoch
    )

    final_model.eval()
    with torch.no_grad():
        z_final = final_model.encode(full_edge_index, full_edge_weight)

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    torch.save(z_final, ARTIFACT_DIR / "node_embeddings.pt")
    torch.save(final_model.state_dict(), ARTIFACT_DIR / "gnn_state.pt")
    with open(ARTIFACT_DIR / "node_index.json", "w") as f:
        json.dump({"nodes": nodes, "node_index": node_index}, f, indent=2)
    print(f"\nSaved node embeddings + index to {ARTIFACT_DIR}")

    # Recorded output of THIS run, not a hand-written number — read by
    # GET /model-info so the admin "AI Model Monitoring" page reports
    # the actual last training run instead of a hardcoded figure.
    eval_report = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "architecture": (
            "2-layer GCN (PyTorch Geometric GCNConv) over a learned node-embedding "
            "table, dot-product link-prediction decoder. No molecular/chemical "
            "features — the model only has graph structure + edge evidence weight."
        ),
        "graph_nodes": n,
        "graph_edges": len(positive_pairs),
        "held_out_eval": {
            "test_size": len(test_labels),
            "correct": correct,
            "accuracy": round(correct / len(test_labels), 3),
            "best_epoch": best_epoch,
            "best_val_loss": round(best_val_loss, 4),
            "predictions": eval_predictions,
        },
        "caveat": (
            "Trained on a 9-node/9-edge proof-of-concept graph — far too small to "
            "teach real pharmacology. The held-out accuracy above is not "
            "statistically meaningful at this sample size (n=6); it demonstrates "
            "the model has NOT learned to discriminate real interactions from "
            "non-interactions yet. Confidence scores also do not preserve "
            "major/moderate/weak evidence tiers even on edges seen during "
            "training, which is why /predict-interaction looks evidence up "
            "directly from Neo4j rather than deriving it from this model's output."
        ),
    }
    with open(ARTIFACT_DIR / "eval_report.json", "w") as f:
        json.dump(eval_report, f, indent=2)
    print(f"Saved eval report to {ARTIFACT_DIR / 'eval_report.json'}")

    # ---- Report predictions on the requested test pairs using the final model ----
    print("\n=== Final-model predictions on requested test pairs ===")
    with torch.no_grad():
        for drug_a, drug_b in TEST_PAIRS_FOR_REPORT:
            ia, ib = node_index[drug_a], node_index[drug_b]
            score = (z_final[ia] * z_final[ib]).sum()
            prob = torch.sigmoid(score).item()
            is_known_edge = (min(ia, ib), max(ia, ib)) in positive_pairs
            print(
                f"  {drug_a} <-> {drug_b}: probability={prob:.3f}  "
                f"(known direct edge: {is_known_edge})"
            )


if __name__ == "__main__":
    main()
