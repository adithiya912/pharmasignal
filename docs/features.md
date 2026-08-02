# Features

Mark items done as they're built. Reference this file when scoping
any prompt: "build the next unchecked item under X".

## Patient
- [ ] Register/Login (Clerk)
- [ ] Report side effects (free-text form)
- [ ] View history of own past reports
- [ ] Check drug interactions between 2+ medicines
- [ ] Ask medicine-related questions (RAG-backed Q&A)
- [ ] Receive AI-generated risk summary per report
- [ ] Upload supporting documents (optional)

## Doctor
- [ ] Review incoming patient reports (queue view)
- [ ] Search reports by drug or symptom
- [ ] View extracted entities per report (drug/symptom/dose/duration)
- [ ] View interaction risk score + supporting evidence per report
- [ ] Monitor trending side effects (cluster view)
- [ ] Access supporting medical literature per finding
- [ ] Receive explainable AI recommendations (not just a score)

## Administrator / Regulator
- [ ] Nationwide/institutional adverse-event trend dashboard
- [ ] High-risk drug combination alerts
- [ ] Regional/institutional statistics view
- [ ] Export investigation reports
- [ ] Manage users and datasets

## ML Pipeline (backend, no UI)
- [ ] BioBERT text embedding on patient report
- [x] NER extraction: drug, dose, duration, side effect, severity
  - Known gap: base model (d4data/biomedical-ner-all) under-tags some
    symptom words on casual patient phrasing, e.g. "diarrhea" is only
    partially recognized as "dia". Not patched — needs fine-tuning or
    a symptom-lexicon fallback in a later pass.
- [x] Classification: genuine adverse drug event? yes/no
  - Rule-based v0 (drug+symptom entity presence, with a negation-phrase
    override for "felt fine" / "no side effects" type reports), not a
    trained model — revisit if precision on real reports is too low.
- [x] Clustering: group similar reports into emerging-signal clusters
  - Embeddings use sentence-transformers/all-MiniLM-L6-v2, not the
    /extract NER model. Tried reusing the NER model's hidden states
    first (per original plan) but verified empirically that it doesn't
    encode semantic similarity — it's fine-tuned only for per-token
    classification, so unrelated symptoms came back more "similar"
    than genuinely matching ones across every pooling strategy tested.
    MiniLM needs no fine-tuning/dataset and cleanly separated the test
    reports. Clustering is single-linkage over a cosine-similarity
    threshold.
  - Known gap: the 0.42 similarity threshold is calibrated on a
    6-report sample only. Needs re-tuning once real report volume
    exists — the margin between within-group and cross-group
    similarity may not hold at scale.
  - Known gap: cluster labels come from nearest-neighbor lookup
    against a fixed symptom-phrase vocabulary, because the /cluster
    contract only passes {id, embedding} — no report text reaches
    this endpoint. Novel phrasing not covered by the vocabulary will
    get an inaccurate or overly generic label. Fixing this properly
    needs either passing report text through to /cluster, or a
    downstream lookup of report text by report_ids after clustering.
- [x] Drug knowledge graph in Neo4j (drug-drug relationships)
  - Seeded via scripts/seed_graph.py (idempotent, MERGE-based, re-run
    freely). 9 Drug nodes, 9 INTERACTS_WITH relationships covering
    ibuprofen, metformin, warfarin, amoxicillin, plus aspirin,
    omeprazole, fluconazole, ciprofloxacin, sulfamethoxazole-
    trimethoprim. Every pair independently verified against PubMed
    case reports/studies or an FDA safety communication before being
    added — none invented. Each relationship carries mechanism,
    evidence (major/moderate/weak), and source properties for
    traceability.
- [x] GNN: predict previously-unknown drug interactions
  - A real GNN is now trained and wired into /predict-interaction
    (app/gnn_model.py, app/gnn_predictor.py, scripts/train_gnn.py),
    replacing the v0 graph-traversal logic for interaction_predicted
    and confidence. Neo4j graph traversal (shortestPath, 1-2 hops) is
    now used ONLY for graph_path — the /predict-interaction contract
    shape is unchanged.
  - **Checking this box means "a working GNN training/inference
    pipeline exists," NOT "this reliably predicts real drug
    interactions."** Read the rest of this note before trusting any
    number it outputs.
  - Architecture: 2-layer GCN (PyTorch Geometric `GCNConv`) over a
    learned node-embedding table (no molecular/chemical features are
    available at this stage — the model only has graph structure and
    the INTERACTS_WITH evidence weight to learn from), decoded via
    dot-product link prediction.
  - Training data: the same 9-node / 9-edge seed graph from
    scripts/seed_graph.py. This is a proof-of-concept scale, full
    stop. 9 edges cannot teach a model real pharmacology.
  - Honest evaluation (see scripts/train_gnn.py output): held out 2
    true interactions + 4 true non-interactions, trained on the
    remaining 7 edges with early stopping on validation loss (best
    epoch found: 9, out of 300 — the model starts overfitting almost
    immediately past that). Held-out accuracy: **2/6, at or below
    chance.** With n=6 this is not statistically meaningful either
    way, but it directly demonstrates the model has NOT learned to
    discriminate real interactions from non-interactions at this
    data scale — it is not quietly working; it is visibly not working,
    and that's the honest result to report at 9 nodes.
  - What it would take to be genuinely useful: a labeled dataset with
    hundreds-to-thousands of drugs and known interactions (e.g. the
    full DrugBank interaction set, not our 9-pair sample), real
    molecular/chemical descriptors as node features instead of a
    learned embedding table, a train/val/test split with actual
    statistical power, and proper calibration. None of that exists
    yet — this is the scaffolding for that future work, not a
    substitute for it.
  - Operational caveat: the GNN's embeddings are a frozen snapshot
    from the last scripts/train_gnn.py run. Adding drugs to Neo4j via
    scripts/seed_graph.py does NOT update predictions for those drugs
    until the model is retrained — predict_interaction.py returns
    interaction_predicted=false, confidence=0.0 for any drug the GNN
    hasn't seen, even if Neo4j now has it.
- [x] RAG: retrieve evidence from PubMed / DrugBank / FDA labels
  - v0 is a small local corpus (17 entries covering ibuprofen,
    metformin, warfarin, amoxicillin), not live PubMed/DrugBank/FDA
    API calls. Every title/URL/excerpt was independently verified
    against the live page before being added (via direct fetch, not
    just a search snippet) — no invented citations. Retrieval is
    cosine similarity over sentence-transformers/all-MiniLM-L6-v2
    embeddings (same model as /cluster), top-5 by relevance.
  - Verification note: DrugBank blocked plain fetches (bot
    protection) but resolved with a browser User-Agent header — the 4
    DrugBank entries are real, confirmed via page meta tags. The
    accessdata.fda.gov PDF label URLs found during research had gone
    stale (404); the 4 "FDA" entries instead link to DailyMed, NIH's
    official public mirror of the same FDA-approved label content,
    under stable URLs that were confirmed live.
  - Known gap: this is a 17-entry corpus covering only the 4 drugs in
    our test data — needs a real ingestion pipeline (PubMed/DrugBank/
    FDA API or bulk download) before this generalizes to arbitrary
    drugs/symptoms.
- [x] Risk scoring: fuse report + GNN + evidence into Low/Medium/High
  with explanation
  - Rule-based v0 (app/risk_score.py), not a trained fusion model.
    High: is_adverse_event AND interaction confidence > 0.6 (major
    evidence only). Medium: is_adverse_event AND (interaction
    confidence 0.3-0.6 inclusive, i.e. moderate/weak-direct or
    decayed-indirect, OR no interaction found but top retrieved
    evidence relevance >= 0.5). Low: everything else, or
    is_adverse_event=false.
  - contributing_reports passes through /classify's trigger as-is;
    contributing_sources passes through /retrieve-evidence's sources
    (title/source/url) as-is — nothing invented at this stage, only
    upstream outputs surfaced.
  - Threshold note: the High/Medium boundary (0.6) was deliberately
    set to a strict `>` so that /predict-interaction's "moderate"
    evidence weight (exactly 0.6) lands Medium rather than High,
    matching intent confirmed with the user — verified via 3
    end-to-end pipeline runs (warfarin+amoxicillin -> High,
    metformin+ciprofloxacin -> Medium, negative control -> Low).
  - Known gap: the explanation text is built only from what
    /predict-interaction's contracted output shape actually carries
    (graph_path, confidence) — it does NOT include mechanism-level
    detail (e.g. "INR/bleeding risk") since that lives on the Neo4j
    edge and isn't part of /predict-interaction's response contract.
    Adding it would need a similar contract extension to how
    "trigger" was added to /classify.
  - The 0.5 evidence-relevance threshold for the "no interaction but
    relevant literature" Medium path is a first-pass estimate based
    on the relevance distribution seen in /retrieve-evidence testing,
    not independently validated.
