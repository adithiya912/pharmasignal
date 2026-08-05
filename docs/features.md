# Features

Mark items done as they're built. Reference this file when scoping
any prompt: "build the next unchecked item under X".

## Patient
- [x] Register/Login (Clerk)
  - Real Clerk integration (not scaffolded): clerkMiddleware gate via
    src/proxy.ts (Next.js 16 renamed middleware.ts -> proxy.ts — see
    node_modules/next/dist/docs/.../upgrading/version-16.md), sign-in/
    sign-up pages, ClerkProvider in the root layout. Verified with a
    real end-to-end sign-in (test user created via Clerk's Backend
    API, signed in through the actual UI including the "new device"
    email-code challenge) — not just "the code compiles."
  - Single role only (patient) — no doctor/admin roles, org support,
    or role-based routing yet.
- [x] Report side effects (free-text form)
  - Full pipeline now wired end-to-end, all 5 calls server-side via
    /api/* route handlers proxying to ml-services (same pattern as
    /api/extract): /extract -> /classify -> /predict-interaction
    (skipped gracefully with a { interaction_predicted: false,
    confidence: 0, graph_path: [] } default when fewer than 2 drugs
    are extracted; every unique pair checked and the
    highest-confidence pair used when 3+) -> /retrieve-evidence
    (query built from extracted drugs + symptoms) -> /risk-score
    (fuses all three). Verified live via Playwright against the real
    dev server + real ml-services process for 3 reports (direct
    interaction, single-drug/no-interaction, negative control) plus a
    4th ad hoc single-drug case — all produced correct, non-mocked
    risk_level/explanation/contributing_reports/contributing_sources.
  - Supabase persistence added: on completion, the full assessment
    (report_text, extracted, classification, interaction, evidence,
    risk_score) is saved via POST /api/reports to a `reports` table
    (schema in web/supabase/migrations/0001_create_reports_table.sql).
    Still left out: doctor-side visibility.
- [x] View history of own past reports
  - GET /api/reports (and page.tsx's initial server-side fetch) return
    only rows where patient_user_id matches the signed-in Clerk user —
    enforced in application code, since the Supabase client uses the
    service_role key (server-only, never reachable from the browser)
    rather than Supabase Auth/RLS-by-JWT. RLS is still enabled on the
    table with zero permissive policies, as defense in depth: even a
    leaked anon key would expose nothing.
  - Renders as more nodes further down the same signal line (collapsed
    to risk badge + date by default, click to expand the full result —
    reuses the exact same result component the live view uses, nothing
    rebuilt), not a separate table/list UI, per design-brief.md.
  - Verified: 2 reports submitted as one test patient (created via
    Clerk's Backend API), hard page refresh, both reappeared with
    correct risk levels and full detail on expand. A second test
    patient, separate browser context, saw exactly 0 reports —
    confirmed both via the rendered page and a direct GET /api/reports
    call. Both test patients and their test data deleted after
    verification.
- [x] Check drug interactions between 2+ medicines
  - Standalone tool at /interactions (components/interaction-checker.tsx),
    separate from report submission — a dropdown of the 9 drugs
    currently seeded in Neo4j (ml-services/scripts/seed_graph.py's
    DRUGS list; static in the UI, not read from Neo4j live, so it
    needs a manual update if the seed graph ever changes), calling
    /predict-interaction and /retrieve-evidence directly. Deliberately
    skips /extract and /classify entirely — there's no free-text
    report, just two drug names, so nothing to extract or classify.
    Linked from the patient home page header ("Check an interaction").
  - Renders interaction_predicted + evidence tier + supporting sources
    via the same SignalLine/SignalNode primitives and the same Field
    component (components/assessment-detail.tsx) the main risk result
    uses — not rebuilt from scratch, though a new tone/badge/
    explanation mapping was needed since there's no risk_level here
    (this endpoint pair never touches /risk-score).
  - Verified with 2 real pairs: warfarin+amoxicillin (direct graph
    edge) correctly returned "major evidence interaction" with 5 real
    PubMed/DrugBank/FDA sources. aspirin+fluconazole (no direct edge —
    both connect only through warfarin) correctly returned "possible
    interaction (model-inferred)" via the GNN's structural link
    (aspirin → warfarin → fluconazole, confidence 0.60), with the same
    honest "proof-of-concept, treat with caution" language used
    elsewhere for GNN-only signals — not overstated as a confirmed
    interaction.
  - Known gap surfaced by this feature (pre-existing, not introduced
    here): /retrieve-evidence's 17-entry corpus only covers ibuprofen/
    metformin/warfarin/amoxicillin. For aspirin+fluconazole, the top-5
    "Evidence" results returned are the closest corpus matches, not
    literature actually about aspirin or fluconazole specifically —
    visible in the aspirin+fluconazole test's evidence list. The report
    flow rarely exposed this because its queries usually included at
    least one of those 4 drugs; a standalone checker makes it easier to
    pick a pair entirely outside the corpus. Same fix as the existing
    RAG known-gap note below: needs a real ingestion pipeline.
  - **Gap closed**: previously, a pair with no graph edge AND no GNN
    signal (`evidence: null`, `interaction_predicted: false`) just
    rendered "no known interaction" and stopped there. `POST
    /general-drug-info` (ml-services/app/general_info.py) now fires
    automatically in that specific case, asking Gemini for a general,
    explicitly-unverified answer plus a fixed list of real reference
    sites (Drugs.com, MedlinePlus, FDA DailyMed) to check independently.
    Rendered in its own clearly-labeled "General AI overview" panel,
    never merged into or presented as the verified graph result above
    it. See docs/api-contracts.md for why this doesn't use live Google
    Search grounding (tested directly: 429 on the free tier) or claim
    per-answer citations.
- [x] Ask medicine-related questions (RAG-backed Q&A)
  - `POST /chat` (ml-services/app/chat.py): embeds the question, retrieves
    from the same evidence corpus as /retrieve-evidence, and has Gemini
    (`gemini-flash-latest`, free tier) answer strictly from the retrieved
    excerpts — returns 503 with an honest "not configured" message if no
    `GEMINI_API_KEY` is present, never a fabricated answer. Patient-facing
    UI at /patient/assistant (src/components/patient/assistant-chat.tsx),
    citing sources inline. Switched from Anthropic to Gemini for a
    zero-cost API key (product decision, not a quality/capability call).
    See docs/api-contracts.md.
- [x] Receive AI-generated risk summary per report
  - risk_level (low/medium/high) + plain-language explanation now
    render as the primary result per report, color-coded per
    design-brief.md (sage/amber/coral) with the signal-line marker
    thickening + a one-time pulse animation for medium/high — the
    brief's "line reacts to an anomaly" moment. Raw NER output
    (drugs/symptoms/dosages/duration/severity) demoted to a collapsed
    "Extracted details" disclosure, no longer the headline.
  - **RESOLVED** (was flagged as a known gap, now fixed and verified):
    /predict-interaction's GNN doesn't preserve evidence tiers in its
    confidence score — querying all 9 seeded edges directly showed
    moderate (metformin-ciprofloxacin, 0.869) scoring *higher* than
    two major edges (0.666, 0.671), and weak (0.598) landing inside
    the major range too. No threshold on GNN confidence alone could
    ever separate these, so thresholds were dropped entirely for
    direct edges: /predict-interaction now also returns `evidence`
    (major/moderate/weak/null), looked up directly from the Neo4j
    edge rather than derived from the GNN. /risk-score uses `evidence`
    as its primary signal (major->High, moderate/weak->Medium) and
    only falls back to the GNN's `confidence` (capped at Medium, never
    High) when there's no direct edge — i.e. for genuinely unseen
    pairs, which is exactly the case a GNN is supposed to help with,
    and exactly where it shouldn't be trusted at High-risk stakes with
    9 training edges. Re-verified end-to-end: warfarin+amoxicillin
    (major) -> High; metformin+ciprofloxacin (moderate) -> Medium.
- [ ] Upload supporting documents (optional)

## Doctor
- [x] Review incoming patient reports (queue view)
  - /doctor page + DoctorQueue component, listing every patient's
    reports (lib/reports.ts's listAllReportsForDoctor(), no
    patient_user_id filter — the doctor-only unfiltered counterpart
    to the patient-side listReportsForUser()). Reverse chronological
    within each risk tier, risk tier first — see next item.
  - Role gate: publicMetadata.role === "doctor" on the Clerk user
    (lib/roles.ts's isCurrentUserDoctor()), set manually per-user for
    now (Clerk dashboard -> user -> Public metadata, or the Backend
    API) — a v0 allowlist-style check, not a role-management system.
    Checked independently in TWO places, not just hidden nav: the
    /doctor layout (redirects non-doctors to `/`) and the
    /api/doctor/reports route itself (403), since a layout redirect
    alone doesn't stop a direct request to the API route. This is the
    resource-based pattern Clerk's own SDK currently recommends over
    middleware/proxy.ts path-matching (see the createRouteMatcher
    deprecation warning surfaced during the patient-auth session).
  - Verified: patient A submitted a High-risk report, patient B a
    Low-risk one (2 separate Clerk accounts). Signed in as a 3rd
    account with publicMetadata.role="doctor" and confirmed the queue
    showed BOTH — 2 distinct patient_user_id values, correct risk
    levels. Separately confirmed patient A hitting /doctor directly
    got redirected to `/` (never saw queue content) AND got 403 from
    GET /api/doctor/reports directly. All test accounts + data
    deleted after verification.
  - Patient identifier is a short tag derived from the Clerk user id
    (last 6 chars, e.g. "Patient 0ZPZLF") — "enough to distinguish
    cases" per scope, not a name lookup (would need extra Clerk
    Backend API calls per unique patient, not needed here).
- [x] Search reports by drug or symptom
  - Client-side filter over the already-loaded queue (components/
    doctor-queue.tsx) — substring match (case-insensitive) against
    each report's extracted.drugs and extracted.symptoms. No new
    backend endpoint; the queue is a single doctor's worth of reports,
    not large enough yet to need server-side search.
  - Known gap, inherited from NER: search only matches entities the
    extractor actually tagged, not the raw report text. E.g.
    "joint pain and swelling" reports get symptoms extracted as
    separate "pain"/"swelling" tokens (see the NER known-gap note
    under ML Pipeline below), so searching "joint" finds nothing even
    though multiple reports describe joint pain — searching "swelling"
    or "pain" does. Verified both cases directly: "warfarin" correctly
    narrowed 5 reports to the 2 that mention it; "swelling" correctly
    matched the 3 that have it as an extracted symptom.
- [x] View extracted entities per report (drug/symptom/dose/duration)
  - Reused, not rebuilt: clicking a queue row expands the exact same
    AssessmentDetail component the patient view uses (now extracted
    into components/assessment-detail.tsx so both sides import the
    same code) — same "Extracted details" disclosure, same tags.
- [x] View interaction risk score + supporting evidence per report
  - Same reused component: risk badge, explanation, Basis and
    Evidence (clickable PubMed/DrugBank/FDA links) all render
    identically to the patient view.
- [x] Monitor trending side effects (cluster view)
  - New "Trending" section (components/trending-clusters.tsx) above
    the triage queue, calling the real /cluster endpoint (via the
    /embed + /cluster helper in lib/admin-insights.ts, added for the
    admin dashboard — reused here as-is, not duplicated) over every
    report currently in the queue. Never fabricated: if ml-services or
    /embed/cluster fail, shows an honest "could not compute" message.
  - Reuses SignalLine/SignalNode exactly as the admin dashboard's
    cluster line does — size-based tone/indent/spike (coral + pulled
    forward + spike animation at 3+ reports), a second independent
    signal line above the queue's own, per design-brief.md's pattern
    of stacking multiple independent lines rather than merging them.
  - Verified with 5 real reports across 2 patients: the Trending
    section showed a genuine 4-report "joint pain and swelling"
    cluster (spiking/coral) and a genuine 1-report "nausea and
    vomiting" cluster (sage) — not placeholder text, and the 4-report
    grouping pulled in one report whose text didn't literally say
    "joint pain" (the warfarin/amoxicillin bruising+dizziness report),
    a real embedding-similarity artifact rather than a fabricated
    result — consistent with the small-sample-threshold caveat already
    documented for /cluster below.
- [x] Access supporting medical literature per finding
  - Same Evidence links as above, already clickable through to the
    source.
- [x] Receive explainable AI recommendations (not just a score)
  - The risk_score.explanation plain-language text (not a bare
    risk_level) is what's shown — same honesty constraint as the
    patient view, nothing doctor-specific invented here.

## Administrator / Regulator
- [x] Nationwide/institutional adverse-event trend dashboard
  - "admin" role via publicMetadata.role, same v0 allowlist pattern as
    doctor (lib/roles.ts's isCurrentUserAdmin), checked independently
    in both the /admin layout (redirect to /) and /api/admin/export
    (403) — same resource-based reasoning as the doctor role (a layout
    redirect alone doesn't stop a direct request to the API route).
  - Institution-wide, not literally "nationwide" — there's no
    region/institution field anywhere in the data model, so this is
    aggregate stats across every report on file, full stop.
  - Layout per design-brief.md: NOT a stat-card grid. A plain-text
    stats line (total + risk breakdown + top symptoms), then multiple
    SignalLine instances side by side — one per top drug (capped at 6
    by report count, overflow noted rather than silently dropped) —
    each showing that drug's reports as nodes colored/dated by risk
    tier. Reuses the existing SignalLine/SignalNode components as-is,
    no changes to signal-line.tsx.
  - Symptom clusters render as their own SignalLine below, sourced
    from the REAL /cluster endpoint (not fabricated): added a new
    minimal POST /embed endpoint to ml-services (thin wrapper around
    the existing embed_text() used internally by /cluster) since the
    /cluster contract only accepts pre-computed embeddings and nothing
    previously exposed that step to a caller with just report text.
    See docs/api-contracts.md. If ml-services is down or /embed//cluster
    error, the dashboard shows an honest "could not compute clusters"
    message — never a fabricated result.
  - Verified: 2 test patients submitted 4 reports total (1 high, 2
    medium, 1 low) across warfarin, metformin, ciprofloxacin,
    paracetamol, amoxicillin. Signed in as a test admin account and
    confirmed the dashboard showed the correct aggregate counts, a
    signal line per drug with correctly risk-toned/dated nodes, and a
    real 3-report cluster from the live /cluster call. Separately
    confirmed a doctor account hitting /admin got redirected to `/`
    (no "Trend dashboard" text ever rendered) AND got 403 from GET
    /api/admin/export directly. All test accounts + data deleted after
    verification.
  - **Rebuilt in the frontend redesign** (src/app/admin/page.tsx): same
    real aggregates, now in the new dashboard shell — StatTile KPI row
    (total reports, doctors/patients registered via Clerk, high-risk
    count), a platform-status card (database, Neo4j reachability via a
    live /graph probe, GNN held-out accuracy), recent activity, and a
    top-drugs bar. The old SignalLine-per-drug layout and this page's
    /admin route are gone; still no fabricated numbers — every figure
    traces to listAllReportsForAdmin(), listUsersForAdmin(), or a live
    ml-services call.
- [ ] High-risk drug combination alerts
  - Out of scope this session — the dashboard visually highlights high
    risk (coral nodes, pulled forward) but there's no proactive
    alerting/notification mechanism (email, push, etc.).
- [ ] Regional/institutional statistics view
  - Out of scope — no region/institution field exists anywhere in the
    reports data model, so there's nothing to break this down by yet.
- [x] Export investigation reports
  - GET /api/admin/export streams a CSV (date, risk_level, drug,
    symptom, patient_tag columns; multi-value fields "; "-joined) —
    admin-only, independently checked same as the dashboard route.
    Verified the response is valid CSV with the real 4 test rows.
  - Now surfaced as an "Export CSV" action on /admin/reports, alongside
    a read-only, searchable table of every report (reuses the doctor
    portal's ReportsTable component in its non-linking mode — no
    per-report admin detail page exists, so rows aren't clickable there).
- [x] Manage users and datasets
  - User management: /admin/users lists every Clerk user (email, role,
    join date, last sign-in) and lets an admin change any user's role
    via a Select bound to `PATCH /api/admin/users/[id]/role` — a
    separate, admin-gated route from the self-service
    /api/onboarding/set-role (which intentionally only ever accepts the
    caller's own user id, to prevent privilege escalation). Verified
    end-to-end: an admin test account changed a second test account's
    role from none to "doctor" and the change round-tripped through a
    real PATCH request (200, Clerk metadata updated).
  - "Datasets" doesn't apply yet — there's no dataset entity in this
    data model (reports are the only persisted collection, already
    covered by the reports page above).

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
  - Now surfaced to admins (not just this file): scripts/train_gnn.py
    writes its Phase 1 eval numbers to app/gnn_artifacts/eval_report.json
    each run; `GET /model-info` reads that artifact (never a hand-
    written number) and the redesigned admin/model page renders it —
    architecture, graph size, the same 2/6 held-out accuracy, and the
    caveat text above, verbatim, as a visible warning banner rather
    than a footnote. Returns `{"trained": false}` on a fresh checkout
    that hasn't run the training script yet.
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
  - **Gap substantially closed**: `scripts/ingest_evidence.py` pulls real
    additional entries from two free, official APIs — PubMed (NCBI
    E-utilities `esearch`/`efetch`, real article titles + abstracts by
    PMID) and openFDA (`/drug/label.json`'s structured
    `drug_interactions`/`warnings`/`adverse_reactions` fields, with the
    label's `spl_set_id` used to build the same DailyMed URL format the
    hand-written FDA entries already use). Run for real during
    development: 74 total corpus entries now (17 hand-written + 57
    ingested: 49 PubMed, 21 FDA, 4 DrugBank), covering all 9 seeded
    drugs instead of 4. Verified end-to-end: `/retrieve-evidence` for
    "aspirin fluconazole" — previously the textbook example of this
    gap, since neither drug was in the original 4 — now returns
    genuinely relevant FDA/PubMed fluconazole and aspirin results
    instead of closest-available fallback matches.
  - Writes to `app/evidence_corpus_ingested.json`
    (`scripts/ingest_evidence.py` → `app/evidence.py`, same
    write-artifact/read-artifact pattern as `train_gnn.py` →
    `app/gnn_artifacts/eval_report.json`). Additive only — the original
    17 hand-written entries are untouched; the script is idempotent
    (skips URLs already present) and the artifact being absent falls
    back to exactly today's 17-entry behavior, verified directly.
  - Explicit scope boundaries, not oversights: **no new DrugBank
    entries** — their terms of service prohibit scraping, real access
    needs a paid API license this project doesn't have; **no changes to
    the Neo4j interaction graph** (`scripts/seed_graph.py` stays
    hand-curated only — classifying "does this abstract describe an
    interaction between A and B" well enough to trust would be its own
    project, and CLAUDE.md's rule is never to fabricate interaction
    data); **batch/offline only**, not a live per-request fetch —
    `/retrieve-evidence` and `/chat` keep today's fast, in-memory,
    no-external-dependency runtime, only the corpus they search grew.
  - Known ingestion-precision gap, caught and partially fixed during
    development: a bare keyword search (e.g. "aspirin AND adverse
    event") can match a paper that only name-drops a drug in passing
    (found directly: a protein-crystallography paper using warfarin and
    ibuprofen purely as textbook albumin-binding-site markers). Fixed
    with PubMed's `[tiab]` field restriction (disables loose MeSH-based
    query expansion) plus a title/abstract keyword guard, and one
    specific PMID excluded by hand after reading the full abstract —
    documented as `EXCLUDED_PMIDS` in the script rather than silently
    dropped. Residual imprecision of this kind is inherent to
    keyword-based literature search generally; the embedding-similarity
    top-K retrieval already limits its practical impact, since an
    off-topic entry is unlikely to be the closest match to any real
    query.
- [x] Risk scoring: fuse report + GNN + evidence into Low/Medium/High
  with explanation
  - Rule-based v0 (app/risk_score.py), not a trained fusion model.
    Not is_adverse_event -> Low. interaction.evidence == "major" ->
    High. evidence in (moderate, weak) -> Medium. No direct edge but
    the GNN's interaction_predicted is true -> Medium (capped there,
    never High — see the GNN section's honest accuracy note above for
    why an inferred-only signal shouldn't carry High-risk stakes).
    Otherwise, top retrieved evidence relevance >= 0.5 -> Medium. Else
    Low. **Superseded the original confidence-threshold design** (see
    the Patient section's "RESOLVED" note above) once testing showed
    the GNN's confidence doesn't preserve evidence tiers at all —
    `evidence`, not `confidence`, is now the primary signal for any
    pair with a direct graph edge.
  - contributing_reports passes through /classify's trigger as-is;
    contributing_sources passes through /retrieve-evidence's sources
    (title/source/url) as-is — nothing invented at this stage, only
    upstream outputs surfaced.
  - Verified via 3 end-to-end pipeline runs (warfarin+amoxicillin ->
    High, metformin+ciprofloxacin -> Medium, negative control -> Low).
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
