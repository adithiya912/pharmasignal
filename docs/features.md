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
- [ ] Drug knowledge graph in Neo4j (drug-drug relationships)
- [ ] GNN: predict previously-unknown drug interactions
- [ ] RAG: retrieve evidence from PubMed / DrugBank / FDA labels
- [ ] Risk scoring: fuse report + GNN + evidence into Low/Medium/High
  with explanation
