# AI Poster Studio — Roadmap

## Phase 1: MVP (4 weeks)

### Week 1
- [x] Scaffold monorepo (web + worker + types + config)
- [x] Marketing site skeleton (home, pricing, examples, use cases, about, blog)
- [x] Design system (DESIGN.md + tokens.css)
- [x] Auth (Clerk) + DB schema (Supabase)
- [x] File upload (UploadThing → R2)

### Week 2
- [x] 3-panel workspace UI with mock agent stream
- [x] Draft filmstrip + "Why this design?" popover
- [x] PDF viewer with pdfjs-dist
- [ ] Worker: real PDF ingestion (pypdf + pdfplumber)
- [ ] Worker: poster planning via Groq

### Week 3
- [ ] Worker: poster design via Claude (coding-agent SDK)
- [ ] Worker: rule-based + VLM critic
- [ ] Worker: Playwright PNG/PDF export
- [ ] Inngest pipeline wired to real worker

### Week 4
- [ ] Stripe checkout + webhooks
- [ ] Usage limits (free tier cap)
- [ ] Demo video recording
- [ ] Show HN submission
- [ ] Bug bash + polish

## Phase 2: Polish (3 weeks)

- [ ] Edit-in-browser poster editor (Tiptap for text overlays)
- [ ] More templates: CVPR landscape, ICML, NeurIPS, Nature, custom
- [ ] Figure extraction improvements (vision-based figure detection)
- [ ] Team seats + shared projects (Lab tier)
- [ ] API access (Lab tier) — POST /api/posters
- [ ] Public share pages for posters
- [ ] Email notifications (Resend)
- [ ] SEO content: blog posts, example pages

## Phase 3: Growth (4 weeks)

- [ ] Multi-language posters (LibreTranslate)
- [ ] Slide deck generation (AutoDesign's slide track)
- [ ] arXiv integration (paste arXiv ID → auto-fetch latest version)
- [ ] Embed widget for blogs (`<iframe>`)
- [ ] Browser extension (one-click poster from arXiv abstract page)
- [ ] Mobile-responsive workspace (currently desktop-only)
- [ ] Public poster gallery / examples

## Phase 4: Moat

- [ ] Fine-tuned poster critic on user feedback
- [ ] "Design memory" — learns from your past posters
- [ ] Reference manager integration (Zotero, Mendeley)
- [ ] Conference-specific auto-formatting (NeurIPS 2026, ICML 2026)
- [ ] Real-time collaboration (multiplayer editing)
- [ ] Brand kit (your lab's colors, fonts, logo on every poster)
- [ ] Self-host option (Docker Compose)

## Non-goals

- Slide deck generation (Phase 3 — defer to v2)
- Video generation (not the product)
- Generic design tool (we're research-poster specific)
- Mobile-first (research happens on desktop)

## Open questions

1. Solo build vs team?
2. Self-host LLM via Ollama as Pro feature?
3. Open-source the agent runtime?
4. Custom domain strategy?
5. Initial beta user list?