# AI Poster Studio — Production-Scale Project Plan

> **Tagline:** "I gave an AI agent a 19-page research paper and asked for one slide."
> **Hook video:** Show the 3-panel workspace going from uploaded PDF → Draft 1 → Draft 2 → Draft 3 → Final poster in ~3 minutes, with live agent activity streamed in the middle panel.

---

## 1. Product Overview

### What it does
Upload any research paper (PDF, up to 50 MB). An autonomous agent ingests the paper, plans a poster structure, drafts an editable HTML poster, critiques its own work via a rule-based validator + VLM, and iterates 3–5 times. The final poster is rendered to PNG/PDF, downloadable, and editable in-browser.

### Killer features (from the spec, in priority order)
1. **3-panel agent workspace** — PDF viewer | Live agent activity | Live poster render
2. **Draft filmstrip** — Draft 1 → Draft 2 → Draft 3 with the poster visibly improving
3. **"Why did you design it this way?"** — click any section of the poster → the agent explains its reasoning
4. **Reasoning transparency** — every revision turn's critic feedback is preserved and replayable
5. **Editable artifact** — posters are HTML/CSS, not flat images; users can tweak text, swap figures, adjust colors

### Inspiration
AutoDesign (arXiv 2608.13560, Meituan/MBZUAI, Aug 2026) — meta-harness optimization for paper-to-poster generation. We replicate the **runtime DesignHarness** (the inner loop) but skip the 7-day meta-optimization. Our web app achieves a polished poster in **2–5 minutes** instead of 40.

---

## 2. Repository Analysis Summary

### Inspiration repos used

| Repo | What we stole |
|---|---|
| [`VoltAgent/awesome-design-md`](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md) | The DESIGN.md format — a plain-markdown design spec that the AI agent reads to generate UI. 73 production-ready files from Linear, Vercel, Stripe, Cursor, Notion. We fork the **Cursor** + **Linear** patterns for the workspace, and **Vercel** + **Notion** patterns for marketing. |
| [`jixserver/free-for-dev`](https://github.com/jixserver/free-for-dev) | Free-tier vendor catalog. We chose: Vercel, Supabase, Clerk, Cloudflare R2, Inngest, Groq, Replicate, Resend, PostHog, Sentry, Upstash, QStash. |
| [`public-apis/public-apis`](https://github.com/public-apis/public-apis) | Niche free APIs: OpenAlex (paper metadata), Kroki (diagrams), CodeCogs (LaTeX), Colormind (palettes), Pexels (stock images), QuickChart (charts), WolframAlpha (math), Iconify (icons). |
| [`nexu-io/open-design`](https://github.com/nexu-io/open-design) | 151 production-ready design systems. We blended `design-systems/modern` (light indigo) for marketing and `design-systems/notion` (warm white) for app surfaces. |

---

## 3. Tech Stack (Production, $0/mo at launch)

### Frontend + Marketing
| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | RSC, streaming, Vercel-native |
| Styling | **Tailwind CSS v4** + **shadcn/ui** (Radix) | Canonical modern SaaS stack |
| Typography | **Inter Variable** (display + body) + **JetBrains Mono** | Enable `cv01`, `ss03` OpenType features on display |
| Icons | **Lucide** | Matches the 1.5px stroke aesthetic |
| Animation | **Motion** (Framer Motion) | `cubic-bezier(0.22, 1, 0.36, 1)` reveals |
| PDF viewer (client) | **`pdfjs-dist`** | Mozilla, free |
| Diagrams (in poster) | **Mermaid** + **Kroki** API | Render architecture diagrams server-side |
| Charts (in poster) | **Recharts** (exported to SVG, embedded in poster HTML) | Used for figure regeneration |
| Math | **KaTeX** | Auto-render equations from paper |
| Markdown → poster text | **`@uiw/react-md-editor`** or **`streamdown`** | For streaming agent reasoning to UI |

### Backend + Agent
| Layer | Choice | Why |
|---|---|---|
| Long-running jobs | **Inngest** | 25k runs/mo free, durable execution, native `streamEvents()` to React |
| HTTP API | **Vercel API routes** (Edge + Node, < 10s) + **FastAPI on Fly.io** for heavy lifting | Vercel can't run the agent inline |
| LLM (planning + critique) | **Groq** (Llama 3.3 70B) primary + **Google Gemini 2.5 Flash** for vision | Fastest free inference, vision fallback |
| LLM (poster design) | **Claude Sonnet 4.5** via coding-agent SDK (Codex/Claude Code) — *we don't write the agent loop ourselves* | Replicates the AutoDesign "lean on coding agents" pattern |
| Image gen (figures/illustrations) | **Replicate** (FLUX.1-schnell) + **Together AI** ($5 credit) | Cached aggressively in R2 |
| PDF parse | **`pypdf`** + **`pdfplumber`** + **`unstructured`** (self-host) | Multi-pass extraction: text, tables, figures |
| Web render | **Playwright** (Chromium, headless) | Renders HTML poster → PNG/PDF |
| Validation | **`zod`** for schemas, custom rule-validator for layout | Rule-based critic + VLM critic |
| Color extraction | **Colormind API** + **Huemint** | Auto-palette from paper content |
| Vector DB (RAG over paper) | **Qdrant Cloud free** (1 GB) | For retrieving relevant claims/sections |

### Data + Infra
| Layer | Choice | Why |
|---|---|---|
| Auth | **Clerk** | 10k MAUs free, social login, webhooks |
| Database | **Supabase Postgres** | 500 MB free, Realtime channels for streaming |
| File upload | **UploadThing** (PDFs) + **Cloudflare R2** (storage, zero egress) | 50 MB max fits |
| Email | **Resend** + **React Email** | 100/day, transactional |
| Analytics | **PostHog** (1M events/mo, session replay, feature flags) | All-in-one |
| Errors | **Sentry** | 5k errors/mo |
| Rate limit + cache | **Upstash Redis** | 10k cmds/day |
| CDN + DNS + WAF | **Cloudflare** free | In front of everything |
| CI/CD | **GitHub Actions** | 2000 min/mo |

### Cost ceiling at scale (free tier)
- **Emails:** 100/day (Resend) → upgrade at ~$20/mo Pro
- **Storage:** 10 GB R2 → ~200 posters before upgrade
- **Agent runs:** Inngest 25k/mo = ~800 posters/mo free
- **LLM:** Groq free + Gemini free = bursty but covers MVP
- **Image gen:** ~$5 credit = ~500 posters, then pay-as-you-go

---

## 4. Visual Design System

### Color palette (light theme, single accent, attention-grabbing)

Blended from `design-systems/modern` + `design-systems/notion` + the "Cursor cream" energy for the app workspace.

```css
/* === LIGHT THEME (Marketing site) === */
--bg:              #f7f8fc;   /* cool off-white canvas */
--surface:         #ffffff;   /* pure white cards */
--surface-warm:    #eef1ff;   /* alternating band: hero, features */
--surface-cream:   #faf9f5;   /* warm alt band for case studies */
--fg:              #111827;   /* primary text */
--fg-2:            #374151;   /* body text */
--muted:           #6b7280;   /* captions */
--meta:            #9ca3af;   /* hairline meta */
--border:          #dfe3ed;
--border-soft:     #eef1f7;

/* Single accent — indigo, restrained */
--accent:          #4f46e5;
--accent-hover:    #4338ca;
--accent-active:   #3c34b3;
--accent-soft:     #eef1ff;   /* tints used for "demo" backgrounds */

/* Semantic */
--success:         #10b981;
--warn:            #f59e0b;
--danger:          #ef4444;

/* === WORKSPACE (3-panel app) === */
/* Slightly darker, designed to make the white poster pop */
--ws-canvas:       #f4f5f8;
--ws-panel:        #ffffff;
--ws-panel-2:      #fafbfc;
--ws-hairline:     #e4e7ed;
--ws-active:       #eef1ff;

/* Timeline pastels (for agent activity pills) — scoped to in-product only */
--timeline-reading:    #9fbbe0;  /* pastel blue */
--timeline-extracting: #dfa88f;  /* peach */
--timeline-planning:   #c0a8dd;  /* lavender */
--timeline-rendering:  #9fc9a2;  /* mint */
--timeline-critique:   #f5c97f;  /* warm gold */
--timeline-done:       #c08532;  /* deep gold */
```

### Typography
- **Display:** Inter Variable, 76px hero / 54px section / 36px sub, weight 600, tracking `-0.025em`, leading 1.05
- **Body:** Inter Variable, 16/18/20, weight 400, leading 1.55
- **Mono:** JetBrains Mono, 13px, for code blocks and agent logs
- OpenType features on display: `cv01`, `ss03`

### Spacing + radius
- Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128
- Radius: `sm` 8, `md` 12, `lg` 20, `xl` 28, `pill` 9999
- Shadow (whisper only): `0 22px 58px rgba(17,24,39,0.11)` for elevated cards

### "Catches attention" moves
1. **Hero band in `--surface-warm` (#eef1ff)** — soft indigo wash behind the headline + mockup
2. **Polarized pricing tier** — featured tier flips to dark `#111827` fill with white text (Linear pattern)
3. **Pastel feature card family** — use-case cards get peach/rose/mint/lavender/sky tints (Notion pattern)
4. **Floating product mockup** with 1px indigo ring and `--elev-raised` shadow
5. **Marquee logo strip** of "papers converted" examples (well-known arXiv IDs)
6. **Generous section rhythm** — 104px top/bottom on desktop

---

## 5. Marketing Site Architecture

### Routes
```
/                  Home (hero + how it works + social proof + CTA)
/pricing           3-tier pricing with featured tier flipped dark
/examples          Gallery of generated posters (filterable: field, paper type)
/use-cases         Pastel feature cards: Researchers, Students, Conference Organizers, Journalists
/case-studies      Long-form stories (testimonial cards + stats)
/about             Team + mission
/blog              Changelog + research notes (MDX)
/login             Clerk sign-in
/signup            Clerk sign-up
/app               (auth-gated) the 3-panel workspace
  /app/new         Upload screen
  /app/projects    List of past posters
  /app/p/:id       Single poster session (the workspace)
/api/...           Edge functions for upload, billing, webhooks
```

### Page-by-page details

#### Home (`/`)
- **Hero:** "I gave an AI agent a 19-page research paper and asked for one slide." 76px Inter display, indigo accent on "one slide". Subhead 18px. Dual CTAs: `button-primary` "Try it free" + `button-secondary` "Watch video". Below: hero-band mockup of the 3-panel workspace on a `--surface-warm` background.
- **How it works:** 3 columns with custom icons — Upload → Agent thinks → Beautiful poster. Each step has a 12-second auto-playing screencap loop.
- **Demo video:** Embedded 60-sec YouTube showing Draft 1→2→3 evolution.
- **Social proof:** Logo strip of "papers converted" (mock arXiv IDs + author names) + 3 testimonials with photo + title + university.
- **Comparison table:** vs Canva, vs Beautiful.ai, vs hiring a designer.
- **FAQ:** 6-item accordion.
- **Final CTA:** Polarity-flipped band (`--fg` background, white text).

#### Pricing (`/pricing`)
- 3 tiers: **Free** (1 poster/month, watermarked) / **Pro $19/mo** (20 posters, full export, no watermark) / **Lab $99/mo** (unlimited, team seats, API)
- Featured = **Pro** with dark fill (`#111827` bg, white text, indigo accent on CTA)
- Toggle: Monthly / Annual (save 20%)
- FAQ inline below

#### Examples (`/examples`)
- Grid of 12 generated posters with filter chips: AI/ML, Biomed, Climate, Economics, Physics
- Hover reveals: paper title, authors, draft count, time taken
- Click → opens poster detail page with full-res preview + "Why this design?" annotations visible

#### Use Cases (`/use-cases`)
- Pastel card family — each use case gets its own tint:
  - Researchers → lavender
  - PhD Students → mint
  - Conference Organizers → sky
  - Science Journalists → peach
  - Educators → rose
  - Grant Writers → cream

#### Case Studies (`/case-studies`)
- 3 long-form stories: "How Dr. X saved 8 hours on her NeurIPS submission", "Y Research Lab standardized 50 papers in a week"
- Stats strip at top: "3× faster than manual design", "94% of users keep their first draft"
- Pull quotes from real users (post-launch)

#### About (`/about`)
- 2-column: Mission text left, team mosaic right (placeholder for now — solo founder)
- Story of building AutoDesign-inspired tool
- Open-source / reproducible section
- Footer: contact + socials + the founder's LinkedIn/Instagram/GitHub/TopMate

---

## 6. Application UI (the 3-panel workspace)

### Routes
```
/app/new                Upload PDF (drag-drop, paste arXiv URL, or pick from recent)
/app/p/[id]             The workspace (3 panels)
/app/p/[id]/settings    Customize: aspect ratio (A0 portrait/landscape, US Letter), template (CVPR/ICML/NeurIPS), accent color
/app/projects           List of past poster projects
```

### The 3-panel workspace layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ top-nav (56px sticky, white) — wordmark left, project name center, share right │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────┬─────────────────────────┬───────────────────────────┐ │
│ │ LEFT PANEL      │ MIDDLE PANEL            │ RIGHT PANEL                │ │
│ │ PDF Viewer      │ Agent Activity          │ Poster Render              │ │
│ │ 320px           │ 380px                   │ flex-1                     │ │
│ │ --ws-panel-2    │ --ws-panel              │ --ws-panel                 │ │
│ │                 │                         │                            │ │
│ │ ┌─────────────┐ │ ┌─────────────────────┐ │  ┌──────────────────────┐  │ │
│ │ │ Page 1 thumb│ │ │ Reading paper.pdf…  │ │  │                      │  │ │
│ │ │ Page 2      │ │ │ ● Identified 5 sec  │ │  │   ┌────────────────┐ │  │ │
│ │ │ Page 3      │ │ │                     │ │  │   │                │ │  │ │
│ │ │ …           │ │ │ ┌── Draft filmstrip │ │  │   │  Live poster   │ │  │ │
│ │ │             │ │ │ │ [D1][D2*][D3]      │ │  │   │  preview       │ │  │ │
│ │ │ ┌─────────┐ │ │ │ └──────────────────┘ │ │  │   │                │ │  │ │
│ │ │ │ Render  │ │ │ │                     │ │  │   └────────────────┘ │  │ │
│ │ │ │ of page │ │ │ │ Turn 3 of 5          │ │  │                      │  │ │
│ │ │ │         │ │ │ │ "Layout too crowded  │ │  │  [Download PDF]       │  │ │
│ │ │ │         │ │ │ │  in section 3,       │ │  │  [Download PNG]       │  │ │
│ │ │ └─────────┘ │ │ │  revising…"          │ │  │  [Open in editor]     │  │ │
│ │ │             │ │ │                     │ │  │                      │  │ │
│ │ │ + Citations │ │ │ [Edit prompt]        │ │  │                      │  │ │
│ │ │ + Figures   │ │ │                     │ │  │                      │  │ │
│ │ └─────────────┘ │ └─────────────────────┘ │  └──────────────────────┘  │ │
│ └─────────────────┴─────────────────────────┴───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Left panel — PDF Viewer
- Page thumbnails in vertical rail (auto-scroll, current page highlighted `--ws-active`)
- Main render: `pdfjs-dist` canvas with zoom controls
- Bottom tabs: `Citations` | `Figures` | `Tables` (auto-extracted by the agent)
- Click a figure → opens modal preview → "Use in poster" toggle

### Middle panel — Agent Activity (the killer view)
- Top: progress bar with current stage (Reading / Planning / Drafting / Critiquing / Finalizing) and percentage
- Streamed log lines, color-coded with timeline pastels:
  - `[Reading]` `--timeline-reading` — "Understanding paper..."
  - `[Extracting]` `--timeline-extracting` — "Identified: Problem, Method, Architecture, Experiments, Results"
  - `[Planning]` `--timeline-planning` — "Planning poster: 6 panels, hierarchy set"
  - `[Drafting]` `--timeline-rendering` — "Rendering Draft 2..."
  - `[Critique]` `--timeline-critique` — "Layout too crowded. Revising section 3..."
  - `[Done]` `--timeline-done` — "Draft 2 accepted"
- **Draft filmstrip** — horizontal row of poster thumbnails, click any to swap right panel view
- **Edit prompt** — textarea lets user inject: "Make section 2 bigger" or "Use a darker blue" — injected into next revision
- **Token usage + time elapsed** — small footer

### Right panel — Poster Render
- White poster card centered on `--ws-canvas` with `--elev-raised` shadow
- Floating action bar (top-right): Zoom in/out, Fit to screen, Fullscreen
- Footer buttons: `Download PDF` | `Download PNG` | `Open in editor` | `Share link`
- **Why did you design it this way?** — any text/image in the poster is clickable; clicking opens a popover with the agent's reasoning for that section, sourced from the critic's feedback at that revision turn
- **Regenerate section** — right-click any element → "Regenerate" → agent redoes just that section

### Draft filmstrip detail
Each draft card shows:
- Thumbnail PNG of the poster at that turn
- "Draft 1" label
- Critic verdict at that turn (one line): "Layout too crowded" / "Density target hit" / "All checks pass"
- Click to swap into main view + jump agent log to that turn
- A checkmark on accepted drafts

### Empty state (no PDF uploaded yet)
- Big illustration: stylized paper + sparkle
- "Drop a PDF here, paste an arXiv link, or [browse recent]"
- 3 example papers pre-loaded with one-click "Try this paper" — `attention_is_all_you_need.pdf`, `BERT.pdf`, `ResNet.pdf`

---

## 7. Agent Architecture (the DesignHarness runtime)

Adapted from AutoDesign's open-source `autodesign` module. We replicate the inner loop with 5 components; we skip the 7-day meta-optimization.

### Pipeline

```
User uploads PDF
   ↓
[1. Ingestion] ── 30s
    - Parse: pypdf (text), pdfplumber (tables), unstructured (figures)
    - Extract claims, sections, figures, tables with provenance (source page + coordinates)
    - Fetch metadata: OpenAlex (authors, citations, related works)
    - Fetch arXiv abstract + categories
    - Output: content_brief.json (sections, claims, figures with provenance tags)
   ↓
[2. Planning] ── 10s
    - LLM (Groq Llama 3.3 70B) generates poster outline
    - Picks template: CVPR / ICML / NeurIPS / custom
    - Selects palette via Colormind based on paper topic
    - Output: poster_plan.json (panel layout, typography, color tokens)
   ↓
[3. Designer (Turn 1)] ── 30s
    - Coding-agent (Claude Code SDK) generates poster.html from plan
    - Embeds figures, renders equations via KaTeX, renders diagrams via Mermaid+Kroki
    - Playwright renders → preview.png
   ↓
[4. Dual-Critic]
    - Rule validator (Python):
      • All claims have provenance link
      • No overflow/overlap (computed bbox check)
      • Typography contrast ≥ 4.5:1
      • Figure-text association valid
    - VLM critic (Gemini 2.5 Flash):
      • Reads preview.png
      • Scores: layout (0-10), density (0-10), readability (0-10)
      • Returns localized feedback (e.g., "section 3 panel is too dense")
   ↓
[5. Designer (Turn 2..N)] ── 30s each, cap at 5
    - Receives consolidated feedback f_k
    - Localized HTML edits (not full regen)
    - Re-render, re-critic
    - Accept when all rule-checks pass AND VLM scores ≥ threshold
   ↓
[6. Finalization] ── 15s
    - Inline all assets (base64) for portability
    - KaTeX math finalize
    - Export PDF via Playwright (chromium PDF print)
    - Save to R2, return to UI
```

### Tool inventory (what the agent can call)
```python
tools = [
    read_pdf_page(page_num),
    extract_figure(figure_id),          # returns cropped PNG + caption
    extract_table(table_id),            # returns CSV
    read_section(section_name),
    write_poster_html(content),         # full regen
    edit_poster_html(target_selector, new_content),  # localized edit
    render_preview(),                   # Playwright → preview.png
    run_rule_validator(),               # returns blocking + non-blocking violations
    run_vlm_critic(),                   # returns score + natural language feedback
    fetch_color_palette(seed),          # Colormind API
    render_mermaid_diagram(code),       # Kroki API
    render_latex_equation(latex),       # CodeCogs API
    search_stock_image(query),          # Pexels API
    finalize()                          # inline assets, export PDF
]
```

### State persistence
Each turn writes to Inngest:
- `content_brief.json` — immutable
- `poster_plan.json` — immutable
- `poster.html` — current editable artifact
- `preview.png` — current render
- `critic_log.jsonl` — every critic verdict, append-only (this is the source for "Why this design?")
- `run_events.jsonl` — every tool call (streamed to UI)

### Real-time streaming to UI
Inngest's `streamEvents()` over SSE → React hook `useInngestStream()` → append to middle panel log + update filmstrip.

---

## 8. Pricing & Monetization

| Tier | Price | Includes |
|---|---|---|
| **Free** | $0 | 1 poster/month, watermark, 720p export |
| **Pro** | $19/mo | 20 posters/month, no watermark, 4K export, all templates, "Why this design?" full history, edit-in-browser |
| **Lab** | $99/mo | Unlimited posters, 5 team seats, API access, custom templates, priority queue |
| **Enterprise** | Custom | On-prem option, SSO, audit log, custom branding |

### Payment
**Stripe Checkout** (free tier) + **Stripe Billing** for subscriptions. Webhooks → Supabase for entitlements.

### Conversion hooks
- Free user uploads 2nd paper → modal: "You've used your 1 free poster. Upgrade to Pro for $19/mo"
- Pro user hits 20 posters → "You're a power user — Lab is $99/mo for unlimited"
- Showcase page after each poster: "Share this poster" → viral loop, brings in researchers via X/LinkedIn

---

## 9. Growth & Distribution

### Launch strategy
1. **Show HN** — submit with the hook video. Target: top 10 of the day.
2. **Twitter/X launch thread** — 8-tweet breakdown with video, screenshots, before/after.
3. **r/MachineLearning, r/AskAcademia, r/PhD** — post example posters.
4. **arXiv announcement** — short paper "AI Poster Studio: a production system for paper-to-poster generation" (optional, builds credibility).
5. **Cold outreach** to 10 CS professors with student pain point (poster deadlines).

### Viral loop
- Every generated poster has a "Made with AI Poster Studio" footer (Pro users can remove)
- Share link → opens public read-only poster view + CTA "Make your own"
- Embed widget: `<iframe>` for blogs/conference sites

### SEO content
- Blog: "How to make a research poster" (long-tail, high volume)
- Blog: "Best research poster templates 2026"
- Example pages indexed: `/examples/attention-is-all-you-need-poster` (target arXiv searches)

---

## 10. Infrastructure & DevOps

### Environments
- **Local:** `pnpm dev` — Next.js + local Postgres (Supabase CLI) + Inngest dev server
- **Preview:** every PR → Vercel preview deploy + Inngest branch
- **Production:** Vercel (web) + Fly.io (FastAPI worker) + managed Supabase + Inngest cloud

### Observability
- **Sentry** — Next.js + FastAPI + Inngest functions
- **PostHog** — funnels: signup → first upload → first poster → share
- **Logtail** — FastAPI agent logs, searchable by run_id
- **Inngest dashboard** — every run inspected, step timings visible

### Secrets management
- All API keys in **Vercel env vars** + **Fly.io secrets** + **Doppler** (free tier) for local dev
- Never commit `.env.local`

### CI/CD
- **GitHub Actions:** lint (Biome), typecheck (tsc), test (Vitest + Playwright), build
- **Preview deploys:** Vercel automatic
- **Migrations:** `supabase db push` on merge to main

### Backups
- **Supabase** — daily automatic backup (point-in-time recovery on Pro tier)
- **R2** — versioned bucket, 30-day retention on free tier

---

## 11. Security & Compliance

- **Auth:** Clerk handles session, JWT verified on API routes
- **PDF isolation:** each user uploads to their own R2 prefix; signed URLs expire in 1 hour
- **PII:** we don't store user PII beyond email + name (from Clerk); no paper content shared between users
- **Rate limiting:** Upstash Redis — 5 uploads/hour on Free, 50/hour on Pro
- **CSP:** strict, no inline scripts in production
- **GDPR:** data export endpoint, account deletion endpoint
- **SOC 2:** not at MVP, target post-PMF

---

## 12. Roadmap

### Phase 1 — MVP (4 weeks)
- [ ] Marketing site (home, pricing, examples, about)
- [ ] Auth (Clerk) + DB schema (users, projects, posters, runs)
- [ ] PDF upload (UploadThing + R2)
- [ ] Inngest pipeline: ingestion → 3 designer turns → finalize
- [ ] 3-panel workspace UI with streaming
- [ ] Draft filmstrip + "Why this design?" popover
- [ ] Stripe checkout for Pro
- [ ] Sentry + PostHog instrumentation
- [ ] Demo video + Show HN

### Phase 2 — Polish (3 weeks)
- [ ] Edit-in-browser poster editor (Tiptap or Lexical for text overlays)
- [ ] More templates (CVPR, ICML, NeurIPS, Nature, custom)
- [ ] Figure extraction improvements (figure-aware PDF parsing)
- [ ] Team seats + shared projects (Lab tier)
- [ ] API access (Lab tier)
- [ ] Public share pages for posters

### Phase 3 — Growth (4 weeks)
- [ ] Multi-language posters (translation via LibreTranslate)
- [ ] Slide deck generation (AutoDesign's slide track — bonus)
- [ ] arXiv integration (paste arXiv ID → auto-fetch latest version)
- [ ] Embed widget for blogs
- [ ] Browser extension (one-click poster from arXiv abstract page)
- [ ] Mobile-responsive workspace

### Phase 4 — Moat (later)
- [ ] Fine-tuned poster critic on user feedback
- [ ] "Design memory" — learns from your past posters (style preferences)
- [ ] Reference manager integration (Zotero, Mendeley)
- [ ] Conference-specific auto-formatting (NeurIPS 2026, ICML 2026)

---

## 13. Founder Section (for the About page + Footer)

**Simranjeet Singh** — Building AI tools that turn research papers into beautiful artifacts.

- **LinkedIn:** https://www.linkedin.com/in/simranjeet97/
- **Instagram:** https://www.instagram.com/itsexceptional/
- **GitHub:** https://github.com/simranjeet97
- **TopMate:** https://topmate.io/simranjeet97/ (book a 1:1 call — AI consulting, design partnerships, mentorship)

Footer layout: 6 columns with eyebrow labels in mono caption (Linear pattern)
```
Product      Resources   Company    Legal        Socials
- Home       - Blog      - About    - Privacy    - LinkedIn
- Examples   - Docs      - Careers  - Terms      - Instagram
- Pricing    - Changelog - Contact  - DPA        - GitHub
- Use Cases  - API       - Press               - TopMate
```

---

## 14. Success Metrics

### North star
**Posters generated per week** (active usage).

### Leading indicators
- Signup conversion rate (target: 5% from pricing page)
- Free → Pro conversion (target: 4% within 30 days)
- Time-to-first-poster (target: < 5 minutes including upload)
- Poster rating on "Why this design?" popover (5-star thumbs up/down → iterate on agent)
- Share rate (% of posters that get a share link clicked)

### Quality bars
- Poster acceptance rate (Draft 1 accepted by user without revision): > 30%
- "Why this design?" answers rated helpful: > 70%
- Crash-free sessions: > 99.5%
- P95 time-to-poster: < 4 minutes

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Free-tier rate limits hit during launch | Have Inngest + Groq fallback to paid tier ($20/mo) ready; budget $200 for first month |
| Hallucinated content in poster | Provenance links in poster HTML (click any claim → opens source PDF page); strict rule-validator |
| Bad posters look worse than no poster | Strict quality bar: if final score < threshold, refund the credit and tell user |
| OpenAI/Anthropic API price spike | Use Groq + Gemini as primary; OpenAI/Anthropic as fallback only |
| Competitor copies the idea | Speed to market + community + the "Why this design?" moat |
| Paper copyright concerns | We don't store PDFs beyond session; user owns their papers; share links require explicit opt-in |

---

## 16. Open Questions for Founder

1. Do you want a **standalone domain** like `aiposterstudio.com` or branded differently?
2. **Solo build or team?** Affects timeline (4 weeks assumes solo with focused full-time).
3. **Self-host the LLM via Ollama** for full $0 cost? Trade-off: 3× slower poster generation. Recommended for v1: use Groq for speed, document Ollama as power-user option.
4. **Initial seed list** — who are the first 50 beta users? (PhD students, ML researchers, etc.)
5. **Open-source the agent runtime?** AutoDesign is MIT licensed; we could open-source the Inngest pipeline (great marketing, builds trust).

---

*Last updated: 2026-08-31 — plan ready for review.*