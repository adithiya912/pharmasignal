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
- [ ] Clustering: group similar reports into emerging-signal clusters
- [ ] Drug knowledge graph in Neo4j (drug-drug relationships)
- [ ] GNN: predict previously-unknown drug interactions
- [ ] RAG: retrieve evidence from PubMed / DrugBank / FDA labels
- [ ] Risk scoring: fuse report + GNN + evidence into Low/Medium/High
  with explanation
