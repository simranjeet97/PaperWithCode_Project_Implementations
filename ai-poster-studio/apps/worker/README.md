# AI Poster Studio — Worker (FastAPI)

Long-running agent for PDF ingestion, poster planning, drafting, critique, and finalization.
Deployed on Fly.io. Receives calls from Inngest via the Next.js app.

## Endpoints

- `POST /ingest` — extract text, figures, tables, claims from a PDF
- `POST /plan` — generate poster plan (panels, palette, typography)
- `POST /design` — generate or revise poster HTML
- `POST /critic` — rule-based + VLM critique of draft
- `POST /finalize` — inline assets, export PNG/PDF

## Local development

```bash
cd apps/worker
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
playwright install chromium
uvicorn main:app --reload --port 8000
```

## Deploy

```bash
fly deploy
```