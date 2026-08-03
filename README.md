# PharmaSignal

AI pharmacovigilance platform: patients report drug side effects, the
system extracts entities (BioBERT/NER), predicts drug interactions
(GNN over Neo4j), verifies against PubMed/DrugBank via RAG, and
outputs explainable risk scores to doctors/regulators.

See `CLAUDE.md` for the full project brief, `docs/features.md` for
what's actually built vs. mocked, and `docs/api-contracts.md` for the
contract between `ml-services/` and `web/`.

## Running the full stack

`ml-services/` (FastAPI + BioBERT/GNN/Neo4j) is **not** deployed to
the cloud — it only ever runs locally. `web/` (Next.js) is the only
piece that deploys to Vercel. Every ml-services call web/ makes goes
through `ML_SERVICE_URL` (see `web/.env.example`), so however you run
it, ml-services has to be reachable at that URL first.

### 1. Start ml-services (always required, always local)

```bash
cd ml-services
# first time only:
python -m venv .venv
.venv/Scripts/activate        # .venv/bin/activate on macOS/Linux
pip install -r requirements.txt

# every time:
uvicorn app.main:app --reload
```

This serves on `http://127.0.0.1:8000`. Requires a root-level `.env`
with `NEO4J_URI` / `NEO4J_USERNAME` / `NEO4J_PASSWORD` (see
`.env.example`) pointing at a running Neo4j instance seeded via
`ml-services/scripts/seed_graph.py`.

### 2a. Fully local demo

```bash
cd web
npm install
npm run dev
```

Set `web/.env.local` (see `web/.env.example`) with
`ML_SERVICE_URL=http://localhost:8000` plus your Clerk/Supabase keys.
Open `http://localhost:3000`.

### 2b. Live public demo (Vercel + tunneled local ml-services)

Vercel can't reach `localhost:8000` on your machine, so tunnel it:

```bash
ngrok http 8000
```

Take the `https://...ngrok...` URL ngrok prints and set it as
`ML_SERVICE_URL` in the Vercel project's environment variables (not
`web/.env.local` — that only affects local runs), then redeploy/
redeploy-trigger so the new env var takes effect. Keep both
`uvicorn` and `ngrok` running for the duration of the demo — if either
stops, the deployed app's ml-services calls will fail (see the
"service unavailable" handling in `docs/features.md`'s Patient
section for what users see when that happens, rather than a crash).
