# PharmaSignal

## What this is
AI pharmacovigilance platform: patients report drug side effects,
system extracts entities (BioBERT/NER), predicts drug interactions
(GNN over Neo4j graph), verifies against PubMed/DrugBank via RAG,
outputs explainable risk scores to doctors/regulators.

Full feature list: see docs/features.md
API contracts between ML services and app: see docs/api-contracts.md
Visual design direction: see docs/design-brief.md — this is NOT a
standard admin-dashboard grid layout, follow the brief exactly.

## Stack
- Frontend: Next.js, Tailwind, shadcn/ui, deployed on Vercel
- Backend: FastAPI (ML services), Node/Express (app API) — see ml-services/ vs web/
- DB: Supabase (relational), Neo4j Aura (drug interaction graph)
- Auth: Clerk
- AI: Anthropic + BioBERT (local) + custom GNN
- Storage: Cloudflare R2

## Rules
- NEVER fabricate drug interaction data or risk scores — always call
  the actual ML service endpoints, even during scaffolding (mock the
  response shape, don't invent medical claims)
- ML services and web app communicate ONLY via the contracts in
  docs/api-contracts.md — if you change a response shape, update that
  file in the same commit
- Risk scores must always include the contributing evidence (which
  reports, which papers) — no black-box outputs
- Frontend must follow docs/design-brief.md — no default card-grid
  dashboard layout. If you're about to build a 3-column grid of white
  rounded cards, stop and re-read the brief.
- Every feature you complete, mark it done in docs/features.md in
  the same commit

## Current phase
[Update this each week] Phase 0: ML prototyping, not yet building app

## Commands
- `cd ml-services && uvicorn main:app --reload`
- `cd web && npm run dev`
- Tests: [fill in once you have them]
