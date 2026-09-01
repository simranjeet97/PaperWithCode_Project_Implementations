---
name: AI Poster Studio
slug: ai-poster-studio
version: 1.0.0
basedOn:
  - nexus-io/open-design/design-systems/modern
  - nexus-io/open-design/design-systems/notion
  - VoltAgent/awesome-design-md/design-md/linear.app
  - VoltAgent/awesome-design-md/design-md/cursor.com
---

# AI Poster Studio — Design System

## 1. Visual Theme & Atmosphere

A modern SaaS aesthetic inspired by Linear, Vercel, Notion, and Cursor. Light canvas with a single restrained accent. The product IS an AI poster generator — the UI must demonstrate design quality without competing with the user's poster on screen.

- **Marketing site:** calm, confident, professional — think "Stripe meets Linear"
- **Workspace app:** slightly more focused, slightly cooler — the white poster card pops on the panel background

Tone: confident, technical, generous whitespace, single-accent discipline, hairline borders, whisper shadows.

## 2. Color Palette & Roles

### Marketing (light theme)

| Token | Hex | Role |
|---|---|---|
| `bg` | `#f7f8fc` | page canvas — cool off-white |
| `surface` | `#ffffff` | cards |
| `surface-warm` | `#eef1ff` | alternating band: hero, features |
| `surface-cream` | `#faf9f5` | warm alt band for case studies |
| `fg` | `#111827` | primary text |
| `fg-2` | `#374151` | body text |
| `muted` | `#6b7280` | captions |
| `meta` | `#9ca3af` | hairline meta |
| `border` | `#dfe3ed` | borders |
| `border-soft` | `#eef1f7` | subtle dividers |
| `accent` | `#4f46e5` | indigo — CTAs, links |
| `accent-hover` | `#4338ca` | hover |
| `accent-active` | `#3c34b3` | pressed |
| `accent-soft` | `#eef1ff` | tint background |
| `success` | `#10b981` | — |
| `warn` | `#f59e0b` | — |
| `danger` | `#ef4444` | — |

### Workspace (3-panel app)

| Token | Hex | Role |
|---|---|---|
| `ws-canvas` | `#f4f5f8` | app shell background |
| `ws-panel` | `#ffffff` | panel surface |
| `ws-panel-2` | `#fafbfc` | secondary panel |
| `ws-hairline` | `#e4e7ed` | 1px dividers |
| `ws-active` | `#eef1ff` | active/selected |

### Timeline pastels (agent activity — scoped to in-product ONLY)

| Token | Hex | Stage |
|---|---|---|
| `timeline-reading` | `#9fbbe0` | Reading paper |
| `timeline-extracting` | `#dfa88f` | Extracting claims/figures |
| `timeline-planning` | `#c0a8dd` | Planning poster layout |
| `timeline-rendering` | `#9fc9a2` | Drafting/rendering |
| `timeline-critique` | `#f5c97f` | Critique + revision |
| `timeline-done` | `#c08532` | Draft accepted |

**Rule:** Timeline pastels are reserved exclusively for the agent activity timeline in `/app`. Never use them in marketing surfaces, nav, or buttons.

## 3. Typography Rules

- **Display:** Inter Variable, weight 600, tracking `-0.025em` on sizes ≥ 36px
- **Body:** Inter Variable, weight 400, leading 1.55
- **Mono:** JetBrains Mono, 13px, used for code, agent logs, file names

Scale (px): 12 / 14 / 16 / 18 / 20 / 24-26 / 32-36 / 48-54 / 64-76

Enable OpenType features on display sizes: `cv01`, `ss03`, `ss06`

Hero display: 76px / weight 600 / tracking -0.025em / leading 1.05
Section display: 54px / weight 600 / leading 1.08
Sub-display: 36px / weight 600 / leading 1.15

## 4. Component Stylings

### Buttons
- **button-primary**: bg `--accent`, text white, radius 12px, padding 8px 14px (or 12px 20px for lg)
- **button-secondary**: bg transparent, border `--border`, text `--fg`, hover bg `--surface-warm`
- **button-tertiary-text**: no chrome, text `--accent`, underline on hover
- **button-on-dark**: bg white, text `--fg` (used on dark pricing tier)

### Cards
- **card**: bg `--surface`, border 1px `--border`, radius 20px, padding 24-32px, shadow `0 22px 58px rgba(17,24,39,0.11)`
- **card-feature-peach**: bg `#fde6dc`, border `#f5c8b8`
- **card-feature-mint**: bg `#d8efe0`, border `#a7d8b8`
- **card-feature-lavender**: bg `#ebe3f5`, border `#c8b9e0`
- **card-feature-sky**: bg `#dfeaf7`, border `#a8c8e8`
- **card-feature-rose**: bg `#fadcd9`, border `#e8b3ae`
- **card-feature-yellow**: bg `#fbf3cf`, border `#e8d894`

### Pricing
- **pricing-card**: bg `--surface`, border 1px `--border`, radius 20px, padding 32px
- **pricing-card-featured**: bg `--fg`, text white, accent button white-on-dark, badge `Most popular`

### Timeline pill (workspace only)
- **timeline-pill-{stage}**: bg = timeline-{stage}, text dark, radius pill, padding 4px 10px, typography 11px uppercase 600 tracking 0.88px

### Workspace panels
- **panel-chrome**: bg `--ws-panel`, border 1px `--ws-hairline`, radius 12px
- **panel-header**: height 44px, border-bottom 1px `--ws-hairline`, padding 0 16px
- **poster-canvas-frame**: bg `--ws-panel`, radius 20px, padding 24px, shadow `0 22px 58px rgba(17,24,39,0.11)`

## 5. Layout Principles

- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128
- Section vertical rhythm desktop: 96px top/bottom
- Marketing grid: max-width 1280px, side padding 24px (mobile 16px)
- Workspace: fixed 320px left, 380px middle, flex-1 right
- Card grid: 12-column on desktop, 3-up on tablet, 1-up on mobile

## 6. Depth & Elevation

Three-tier depth ladder:
- **flat**: hairline border only
- **raised**: 1 layer shadow `0 1px 2px rgba(17,24,39,0.06)`
- **elevated**: stacked shadow `0 22px 58px rgba(17,24,39,0.11)`

No drop shadows on workspace panels — only hairlines + surface contrast.

## 7. Do's and Don'ts

**Do:**
- Reserve `--accent` for: brand mark, primary CTAs, focus rings, link emphasis
- Use the 4-step surface ladder for hierarchy
- Display weight stays at 600 (never 700+)
- Apply negative letter-spacing aggressively on display sizes
- Use timeline pastels ONLY inside the workspace agent timeline

**Don't:**
- Don't use pure black `#000` — always `--fg` (`#111827`)
- Don't use dual accents — single accent only
- Don't use heavy drop shadows — keep them whisper-light
- Don't use neon gradients — restrained, calm
- Don't use timeline pastels in marketing

## 8. Responsive Behavior

- Breakpoints: `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280 / `2xl` 1536
- Marketing collapses 3-up grids → 2-up at `md` → 1-up at `sm`
- Workspace collapses 3-panel → stacked tabs at `lg`
- Touch targets: minimum 44×44px
- Mobile nav: drawer from right

## 9. Agent Prompt Guide

Use this when instructing an AI agent to build UI for this project:

> "Read DESIGN.md. Build a Next.js 15 + Tailwind v4 + shadcn/ui page using the marketing color tokens (`bg`, `surface`, `surface-warm`, `accent`). Use Inter Variable at 76px / weight 600 / tracking -0.025em for the hero display. Use the pastel feature card family for use-case cards (peach/mint/lavender/sky/rose/yellow tints). Apply the whisper-elevated shadow for floating cards. Do not use timeline pastels on marketing pages. Maintain 96px section rhythm on desktop. Use the polarized pricing tier pattern (dark fill on the featured tier)."

For workspace UI:

> "Read DESIGN.md workspace section. Build the 3-panel shell (320px left | 380px middle | flex-1 right) using `--ws-canvas` for the app shell and `--ws-panel` for each panel. Use `--ws-hairline` 1px borders between panels. Apply the timeline-pill-{stage} component to agent activity log entries, with colors scoped to the timeline pastel tokens."