---
title: PharmaSignal ML Services
emoji: 💊
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
---

# PharmaSignal ML Services

FastAPI backend for PharmaSignal: BioBERT NER extraction, GNN drug-interaction
prediction over a Neo4j graph, PubMed/FDA evidence retrieval, and a
Gemini-backed chat assistant. See `/docs` on the running Space for the full
OpenAPI schema, and the repo root's `docs/api-contracts.md` for the
human-readable contract every endpoint follows.

## Required secrets

Set these under this Space's **Settings → Variables and secrets** (as
Secrets, not public Variables):

| Name | Used for |
|---|---|
| `NEO4J_URI` | Neo4j Aura connection (drug interaction graph) |
| `NEO4J_USERNAME` | Neo4j Aura connection |
| `NEO4J_PASSWORD` | Neo4j Aura connection |
| `GEMINI_API_KEY` | AI Health Assistant (`POST /chat`) + the interaction checker's general-info fallback (`POST /general-drug-info`) |

Without `GEMINI_API_KEY`, those two endpoints return an honest 503 rather
than failing silently — everything else (extraction, classification,
interaction prediction, evidence retrieval, risk scoring) works without it.

This is the ml-services half of PharmaSignal only. The Next.js app (`web/`)
is deployed separately (e.g. Vercel) and talks to this Space over HTTP via
its `ML_SERVICE_URL` environment variable, set to this Space's public URL.
