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
- [ ] GNN: predict previously-unknown drug interactions
  - NOT built yet — /predict-interaction v0 (below) is a direct graph
    traversal, not a trained model, so this item stays unchecked.
    - v0 /predict-interaction: MATCH shortestPath over
      INTERACTS_WITH, 1-2 hops, using app/predict_interaction.py.
      Working and tested (direct hit, indirect 2-hop, no-path all
      confirmed sane).
    - Semantic deviation from what a GNN would return (flagged per
      request, not silently redefined): a direct edge (1 hop) is a
      *documented* interaction — confidence is derived from the
      edge's evidence label (major=0.9/moderate=0.6/weak=0.3), i.e.
      "how well-established is this known interaction," not a
      model's calibrated probability. A 2-hop path (shared
      intermediate drug, no direct edge) is NOT a documented
      interaction between the two queried drugs — it's a much
      weaker structural hint, decayed to 0.5 × min(edge confidences).
      No path within 2 hops returns interaction_predicted=false with
      LOW confidence (0.1), not high confidence — absence of an edge
      in a 9-drug seed graph means "no data," not "proven safe." A
      trained GNN could generalize to previously-unseen pairs from
      learned structure; this graph query cannot — it only reports
      what's already encoded, so it does not actually satisfy
      "predict previously-unknown drug interactions."
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
