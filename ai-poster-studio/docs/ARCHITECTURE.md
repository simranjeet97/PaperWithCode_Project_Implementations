# AI Poster Studio — Architecture

## 1. System diagram

```
                       ┌──────────────┐
                       │   Browser    │
                       │  (Next.js)   │
                       └──────┬───────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
      ┌──────────┐      ┌──────────┐      ┌──────────┐
      │  Clerk   │      │ UploadThing│    │  R2 CDN  │
      │  (Auth)  │      │  (PDF up)  │    │ (assets) │
      └──────────┘      └──────┬───────┘      └──────────┘
                               │
                               ▼
                       ┌──────────────┐
                       │   Next.js    │
                       │  API routes  │
                       │ + Inngest    │
                       └──────┬───────┘
                              │ events
                              ▼
                       ┌──────────────┐
                       │   Inngest    │
                       │  (durable)   │
                       └──────┬───────┘
                              │ HTTP
                              ▼
                       ┌──────────────┐
                       │   Worker     │
                       │  (FastAPI)   │
                       │   Fly.io     │
                       └──────┬───────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
            ▼                 ▼                 ▼
        ┌───────┐         ┌───────┐        ┌────────┐
        │ Groq  │         │ Gemini│        │ Claude │
        │(LLM)  │         │(VLM)  │        │(agent) │
        └───────┘         └───────┘        └────────┘
```

## 2. Request flow: new poster

```
1. User drops PDF in /app/new
   ↓
2. POST /api/upload (presigned URL)
   ↓
3. Browser uploads to UploadThing
   ↓
4. POST /api/projects (creates project row)
   ↓
5. inngest.send("poster.pipeline", { projectId, paperFileUrl, … })
   ↓
6. Inngest runs posterPipeline() function:
   ├── step.run("ingest.pdf")  → POST /ingest
   ├── step.run("plan.poster") → POST /plan
   ├── step.run("draft.1")     → POST /design
   ├── step.run("critic.1")    → POST /critic
   ├── step.run("draft.2")     → POST /design  (with feedback)
   ├── step.run("critic.2")    → POST /critic
   ├── … (cap at 5 turns)
   └── step.run("finalize")    → POST /finalize
   ↓
7. Each step emits "poster.stage" events
   ↓
8. Browser subscribes via /api/agent-stream (SSE)
   ↓
9. UI updates log + draft filmstrip in real time
```

## 3. Streaming protocol

Events flow: Worker → Inngest → SSE → Browser

```typescript
// Event shape
type AgentEvent = {
  id: string
  projectId: string
  stage: "reading" | "extracting" | "planning" | "rendering" | "critique" | "done"
  message: string
  draftNumber?: number
  timestamp: string
}
```

Browser subscribes via:

```typescript
const source = new EventSource(`/api/agent-stream?projectId=${id}`)
source.addEventListener("stage", (e) => {
  const event = JSON.parse(e.data)
  // append to log
})
```

## 4. Database schema

See `/supabase/migrations/0001_init.sql` for full schema.

Key tables:
- `users` — mirrors Clerk users
- `projects` — one row per poster generation run
- `poster_drafts` — every draft the agent produces
- `agent_events` — full audit log (drives "Why this design?")
- `poster_reasoning` — panel-level explanations

Row-level security: users can only read their own projects + drafts.

## 5. File storage

```
UploadThing (writes):
  /<userId>/<timestamp>-<filename>.pdf

Cloudflare R2 (writes + serves):
  /<projectId>/poster-<uuid>.png
  /<projectId>/poster-<uuid>.pdf
  /<projectId>/poster-<uuid>.html
```

Public read: presigned URLs (1hr expiry) for the user.

## 6. Failure modes

| Failure | Handling |
|---|---|
| Worker unreachable | Inngest retries 2× with exponential backoff |
| LLM rate limit (Groq) | Fallback to Gemini Flash for planning |
| VLM rejects poster | Auto-revise with consolidated feedback, cap 5 turns |
| User closes browser mid-run | Run continues server-side; user rejoins via /app/p/[id] |
| R2 upload fails | Retry with exponential backoff; mark project failed if 3× fail |
| Stripe webhook fails | Stripe retries 3 days; idempotent on client_reference_id |

## 7. Performance budgets

- First poster draft: < 60s after PDF upload
- Full pipeline (3 turns): < 5 min
- Stream event latency: < 200ms (Inngest SSE)
- Marketing page TTFB: < 200ms (Vercel Edge)
- Workspace cold start: < 1s