# AI Poster Studio

> **I gave an AI agent a 19-page research paper and asked for one slide.**

Upload any research paper (PDF). An autonomous agent reads, plans, drafts, critiques, and iterates — producing a beautiful, editable research poster in 2–5 minutes. With explanations, not just pixels.

**$0 cloud spend. Runs entirely on your machine.**

**Inspired by:** [AutoDesign](https://autodesign.designanything.ai/) (arXiv [2608.13560](https://arxiv.org/abs/2608.13560))

---

## The $0 stack

| What | Tool | Cost |
|---|---|---|
| Frontend + backend | Next.js 15 (App Router) | $0 |
| Database | JSON file (`.data/db.json`) | $0 |
| File storage | Local filesystem (`.data/uploads/`) | $0 |
| Auth | Cookie sessions (no password) | $0 |
| LLM | [Ollama](https://ollama.com) running locally | $0 |
| Email | None (skip) | $0 |
| Analytics | None (skip) | $0 |
| Errors | None (skip) | $0 |
| Payments | None — free for first 100 users | $0 |

**Total: $0.** No API keys, no signup, no Stripe, no Supabase, no Cloudflare, no Sentry, no PostHog. Everything runs on your machine.

If you outgrow this stack later, every component has a swap path:
- DB → SQLite → Postgres
- Files → S3 / R2
- LLM → Groq / Claude (when you want better quality)
- Auth → Clerk / WorkOS (when you need OAuth / 2FA)
- Email → Resend
- Analytics → PostHog

---

## Quick start (60 seconds)

### Prerequisites
- Node.js 20+
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.12.0 --activate`)
- (Optional) [Ollama](https://ollama.com) for the local LLM. Without Ollama, the agent uses template-based generation.

### Run it

```bash
git clone <this-repo>
cd ai-poster-studio
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). No `.env` file needed.

### Sign in

Click **Sign in** in the top right → enter any email → you're in. No password, no email verification, no API key. The session is a signed cookie and a row in `.data/db.json`.

### Upload a paper

Click **Get started** → drop a PDF (up to 50 MB) → watch the 3-panel workspace:
- **Left:** PDF viewer
- **Middle:** Live agent activity (reading → extracting → planning → drafting → critique → done)
- **Right:** Poster rendering in real time

The whole pipeline finishes in **2–5 minutes** for a typical paper.

---

## Repository Structure

```
ai-poster-studio/
├── apps/
│   ├── web/    Next.js 15 (App Router) — marketing + workspace + agents
│   └── worker/ Reference FastAPI worker (for future cloud deploy)
├── packages/
│   ├── config/ Tailwind tokens + design system
│   └── types/  Shared domain types
├── lib/
│   ├── db/local.ts      ← TinyDB-style JSON file DB
│   ├── auth/session.ts  ← Cookie-based auth
│   ├── llm/ollama.ts    ← Ollama local LLM client
│   └── agents/          ← ingest / plan / design / critic
├── DESIGN.md   The design system spec (read by AI agents)
├── README.md   This file
└── .data/      (auto-created on first run) DB + uploads
```

---

## Optional: install Ollama for higher-quality output

Without Ollama, the agent generates posters from templates. **With Ollama**, it uses a local LLM to write custom taglines, refine palette choices, and produce better section summaries.

```bash
# macOS
brew install ollama
ollama serve        # runs on http://localhost:11434

# Pull a small, fast model
ollama pull llama3.2:3b

# (optional, for better quality if you have the RAM)
ollama pull llama3.1:8b
```

The app auto-detects Ollama. If it's running, you'll see better taglines and section text. If not, the app still works — it just uses deterministic templates.

---

## The 3-Panel Workspace

The killer UI is at `/app/p/[id]` — three panels:

- **Left (320px):** PDF viewer with page thumbnails, zoom controls, tabs for citations/figures/tables.
- **Middle (380px):** Live agent activity feed. Color-coded by stage with the timeline pastel system. Draft filmstrip at the bottom. Feedback input.
- **Right (flex):** Live poster preview (HTML rendered in a sandboxed iframe). Click any panel to see the agent's reasoning in a popover. Download buttons.

The agent pipeline streams progress to the UI via polling (`/api/projects/[id]/events` every 1.5s). For production, swap this for Server-Sent Events or WebSockets.

---

## The Agent Pipeline

Adapted from AutoDesign's runtime DesignHarness — but stripped to run locally:

```
Ingestion (~5s)
    pdfjs-dist parses text, sections, claims
    ↓
Planning (~1s)
    Template-based panel layout + Ollama palette suggestion
    ↓
Designer × 3 turns (~5s each)
    Template HTML + Ollama tagline refinement
    ↓
Critic after each turn
    Deterministic rule checks (has title, has abstract, etc.)
    ↓
Finalize
    HTML saved to .data/db.json + rendered in iframe
```

Total: 2–5 minutes per poster.

---

## Pricing

$0 while we're in alpha. Pro and Lab tiers are listed as "coming soon" for when you eventually need cloud-hosted features.

---

## Tech Stack

**Frontend:** Next.js 15 · React 19 · Tailwind v4 · Inter Variable + JetBrains Mono · Lucide · Motion
**Backend:** Next.js API Routes · pdfjs-dist · nanoid
**Storage:** JSON file (`.data/db.json`) · Local filesystem (`.data/uploads/`)
**LLM:** Ollama (local) — gracefully degrades to templates
**Auth:** Cookie sessions (iron-session-style, hand-rolled)

---

## Inspiration

- [AutoDesign (arXiv 2608.13560)](https://arxiv.org/abs/2608.13560) — runtime DesignHarness, the agent loop
- [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) — DESIGN.md format
- [nexu-io/open-design](https://github.com/nexu-io/open-design) — design system packages
- [public-apis/public-apis](https://github.com/public-apis/public-apis) — niche free APIs (Colormind, Kroki, OpenAlex, etc.)
- [jixserver/free-for-dev](https://github.com/jixserver/free-for-dev) — free SaaS tier catalog (initial scaffolding)

## License

MIT. Built by [Simranjeet Singh](https://www.linkedin.com/in/simranjeet97/).

## Useful Scripts

```bash
pnpm dev              # Run web app on http://localhost:3000
pnpm dev:all          # Web + worker in parallel (worker is reference only)
pnpm build            # Production build
pnpm lint             # Lint with Biome
pnpm lint:fix         # Auto-fix
pnpm typecheck        # TypeScript check
```