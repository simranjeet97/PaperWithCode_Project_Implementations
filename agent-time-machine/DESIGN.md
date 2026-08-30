# DESIGN.md - Agent Time Machine Design System

> **Design Language**: Cyber-Obsidian & Atomic Precision  
> **Target Audience**: AI Researchers, Senior Software Engineers, Data Engineers, LinkedIn Showcase  
> **Source of Truth**: Based on `VoltAgent/awesome-design-md` specification.

---

## 1. Color Roles & Palette

### Base Surfaces (Dark Carbon / Cyber Obsidian)
- **`--bg-canvas`**: `#090D16` (Deep Void Canvas)
- **`--bg-surface-1`**: `#0F172A` (Elevated Panel Base)
- **`--bg-surface-2`**: `#1E293B` (Interactive Card / Modal Surface)
- **`--bg-surface-glass`**: `rgba(15, 23, 42, 0.75)` (Backdrop Blur Glassmorphism)
- **`--border-subtle`**: `rgba(148, 163, 184, 0.12)`
- **`--border-active`**: `rgba(56, 189, 248, 0.35)`

### Semantic Status Tokens
- **Committed / Atomic Success (Emerald)**:
  - Base: `#10B981` | Glow: `rgba(16, 185, 129, 0.25)` | Badge: `rgba(16, 185, 129, 0.15)`
- **Rollback / Compensating / Warning (Rose & Amber)**:
  - Failure/Rollback: `#F43F5E` | Glow: `rgba(244, 63, 94, 0.35)`
  - Compensating Rewind: `#FB923C` | Pulse: `rgba(251, 146, 60, 0.3)`
- **Time Travel & Live Streaming (Cyan & Violet)**:
  - Time Travel Active: `#06B6D4` (Cyan neon)
  - Live Streaming: `#6366F1` (Indigo electric)
  - Memory Graph: `#A855F7` (Purple neural)

### Text Hierarchy
- **`--text-primary`**: `#F8FAFC` (100% Contrast)
- **`--text-secondary`**: `#94A3B8` (Muted Context)
- **`--text-code`**: `#38BDF8` (Terminal & Log highlights)

---

## 2. Typography

- **Primary UI Font**: Inter, system-ui, -apple-system, sans-serif
- **Code & Numbers Font**: 'JetBrains Mono', 'Fira Code', 'Menlo', monospace
- **Hierarchy**:
  - Hero Title: `text-2xl font-bold tracking-tight`
  - Section Headers: `text-xs font-semibold tracking-wider uppercase text-slate-400`
  - Metric Numerals: `font-mono text-xl font-bold tracking-tight`
  - Step Labels: `text-sm font-medium`
  - Log & State Inspector: `font-mono text-xs leading-relaxed`

---

## 3. Elevation, Glassmorphism & Borders

- **Glass Panels**: `backdrop-filter: blur(16px); background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.08);`
- **Glow Effects**:
  - Committed Node: `box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);`
  - Failed / Rollback Node: `box-shadow: 0 0 20px rgba(244, 63, 94, 0.4);`
  - Rewind Laser Wave: Animated gradient sweep `linear-gradient(90deg, transparent, #fb923c, #f43f5e, transparent)`
- **Card Corners**: `border-radius: 12px;`

---

## 4. Micro-Animations & Time-Travel Interactions

1. **Timeline Scrubber**:
   - Dragging the thumb triggers immediate reactive state hydration without flicker.
   - Active step glows with Cyan ring and emits time-travel coordinate stamp (`t - 2 steps`).
2. **Reverse Compensation Cascade (LIFO Rewind)**:
   - When Rollback occurs, the failed step pulses Rose (`#F43F5E`).
   - Inverse compensation actions animate from right to left (Step 4 -> Step 3 -> Step 2 -> Step 1) with an Amber/Orange rewinding spinner.
3. **State Transition Hero**:
   - `Before ($100)` $\rightarrow$ `Mutated ($0)` $\rightarrow$ `Restored ($100)` counters smoothly increment/decrement.

---

## 5. UI Layout Blueprint

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [ ● AGENT TIME MACHINE ]   Tx: #tx-refund-092    [ gemma:2b | Ollama Local ] [● LIVE]│
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│ │  TIMELINE SCRUBBER (Time-Travel): [== ● =============================== ] (t-2)   │ │
│ └──────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────┐ ┌────────────────────────────────────────────────────┐ │
│ │ TRANSACTION DAG & REWIND  │ │ STATE BEFORE / AFTER / RESTORED                    │ │
│ │                           │ │ ┌───────────────┐ ┌───────────────┐ ┌────────────┐ │ │
│ │ [✓ Read Order]           │ │ │ Before: $100  │ │ Current: $0   │ │Restored:$100│ │ │
│ │      ↓                    │ │ └───────────────┘ └───────────────┘ └────────────┘ │ │
│ │ [✓ Restock Inventory]     │ │                                                    │ │
│ │      ↓                    │ │ TABS: [ Database ] [ API Logs ] [ Memory ] [ VFS ] │ │
│ │ [✓ Create Refund]         │ │ -------------------------------------------------- │ │
│ │      ↓                    │ │ Table: customers (balance: 100 -> 0 -> 100)        │ │
│ │ [✕ Send Email - FAILED]   │ │ API: POST /refunds [200] -> POST /void [COMPENSATED│ │
│ │      ↓                    │ └────────────────────────────────────────────────────┘ │
│ │ [⏪ LIFO ROLLBACK ACTIVE] │ ┌────────────────────────────────────────────────────┐ │
│ └───────────────────────────┘ │ FAULT INJECTION LAB & CONTROLS                     │ │
│                               │ [Inject Step 4 Failure] [Run Wollaston] [Speed: 1x]│ │
│                               └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
