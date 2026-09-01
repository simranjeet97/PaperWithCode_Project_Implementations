# AI Poster Studio — Roadmap

**Status (Sept 2026):** MVP complete, 13 of 16 v1 features shipped. v0.2 (box resize, real PDF export, 5 templates, KaTeX, tables, diagrams, drag-reorder, click-to-explain, panel overrides, mid-project template switch, size badge) is on `main`.

---

## Phase 1: MVP (4 weeks) — ✅ Complete (local-first stack)

The MVP shipped with a **$0-stack**: Next.js + JSON-file DB + local Ollama, no Clerk, no Supabase, no Stripe, no Inngest. Every component has a swap path for production.

### Week 1
- [x] Scaffold monorepo (web + worker + types + config)
- [x] Marketing site skeleton (home, pricing, examples, use cases, about, blog)
- [x] Design system (DESIGN.md + tokens.css)
- [x] Auth (cookie sessions) + DB schema (local JSON)
- [x] File upload (multipart → `.data/uploads/`)

### Week 2
- [x] 3-panel workspace UI with mock + real agent stream
- [x] Draft filmstrip + "Why this design?" popover
- [x] PDF viewer with pdfjs-dist
- [x] Real PDF ingestion (pdf-parse, in-process)
- [x] Poster planning (template-driven + Ollama palette suggestion)

### Week 3
- [x] Poster design (template HTML + Ollama tagline refinement)
- [x] Rule-based critic (deterministic checks)
- [x] Puppeteer PNG/PDF export (300 DPI, template page size)
- [ ] Worker parity (reference FastAPI worker — not deployed)

### Week 4
- [ ] Stripe checkout + webhooks
- [ ] Usage limits (free tier cap)
- [ ] Demo video recording
- [ ] Show HN submission
- [ ] Bug bash + polish

---

## Phase 2: v0.2 polish (3 weeks) — 🟡 In progress

- [x] Box resize (CSS `resize: both` on every panel in the editor)
- [x] Real PDF export (Puppeteer + Chromium, A0 / A4 / US Letter)
- [x] 5 templates (CVPR portrait/landscape, ICML, NeurIPS, Nature)
- [x] KaTeX math rendering (inline `$...$` and `$$...$$`)
- [x] Tables (pdfplumber wrapper → `.table-block`)
- [x] Inline SVG architecture diagrams
- [x] Drag-to-reorder panels in editor
- [x] Click-to-explain popover
- [x] Per-panel text override (panelOverrides)
- [x] Mid-project template + accent switch (Settings modal)
- [x] Workspace size badge (`A0 portrait · 841×1189mm`)
- [ ] Edit-in-browser poster editor (Tiptap for text overlays)
- [ ] Figure extraction improvements (vision-based figure detection)
- [ ] Team seats + shared projects (Lab tier)
- [ ] API access (Lab tier) — POST /api/posters
- [ ] Public share pages for posters
- [ ] Email notifications (Resend)
- [ ] SEO content: blog posts, example pages

---

## Phase 3: Growth (4 weeks)

- [ ] Multi-language posters (LibreTranslate)
- [ ] Slide deck generation (AutoDesign's slide track)
- [ ] arXiv integration (paste arXiv ID → auto-fetch latest version)
- [ ] Embed widget for blogs (`<iframe>`)
- [ ] Browser extension (one-click poster from arXiv abstract page)
- [ ] Mobile-responsive workspace (currently desktop-only)
- [ ] Public poster gallery / examples

---

## Phase 4: Moat

- [ ] Fine-tuned poster critic on user feedback
- [ ] "Design memory" — learns from your past posters
- [ ] Reference manager integration (Zotero, Mendeley)
- [ ] Conference-specific auto-formatting (NeurIPS 2026, ICML 2026)
- [ ] Real-time collaboration (multiplayer editing)
- [ ] Brand kit (your lab's colors, fonts, logo on every poster)
- [ ] Self-host option (Docker Compose)

---

## Non-goals

- Slide deck generation (Phase 3 — defer to v2)
- Video generation (not the product)
- Generic design tool (we're research-poster specific)
- Mobile-first (research happens on desktop)

---

## Open questions

1. Solo build vs team?
2. Self-host LLM via Ollama as Pro feature?
3. Open-source the agent runtime?
4. Custom domain strategy?
5. Initial beta user list?