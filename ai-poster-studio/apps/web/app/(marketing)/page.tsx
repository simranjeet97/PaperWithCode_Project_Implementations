import { CTABanner } from "@/components/marketing/cta-banner"
import { CASE_STUDIES, EXAMPLE_POSTERS, FAQ, USE_CASES } from "@/lib/data"
import { ArrowRight, CheckCircle2, Download, FileText, Wand2 } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <DemoSection />
      <ExamplesPreview />
      <UseCasesPreview />
      <SocialProof />
      <CaseStudiesPreview />
      <ComparisonSection />
      <FAQSection />
      <CTABanner />
    </>
  )
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-surface-warm">
      <div className="mx-auto max-w-marketing px-6 pt-24 pb-32">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-pill border border-accent/20 bg-accent-soft px-3 py-1 text-caption-uppercase text-accent">
            <span className="h-1.5 w-1.5 rounded-pill bg-accent" />
            Inspired by AutoDesign · $0 cloud spend · local-first
          </div>
          <h1 className="mt-8 text-hero text-fg">
            I gave an AI agent a 19-page research paper
            <br />
            and asked for <span className="text-accent">one slide</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lead text-fg-2">
            Upload any research paper. An autonomous agent reads, plans, drafts, critiques, and
            iterates — producing a beautiful, editable research poster in minutes. With
            explanations, not just pixels.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/app/new"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Try it free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/examples"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-5 py-3 text-sm font-medium text-fg transition-colors hover:bg-surface-warm"
            >
              See examples
            </Link>
          </div>
        </div>

        <HeroMockup />
      </div>
    </section>
  )
}

function HeroMockup() {
  return (
    <div className="mx-auto mt-16 max-w-5xl rounded-xl border border-border bg-surface shadow-elevated">
      <div className="flex items-center gap-2 border-b border-border-soft px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-pill bg-danger/60" />
        <span className="h-2.5 w-2.5 rounded-pill bg-warn/60" />
        <span className="h-2.5 w-2.5 rounded-pill bg-success/60" />
        <span className="ml-4 font-mono text-xs text-muted">
          aiposter.studio/app/p/attention-is-all-you-need
        </span>
      </div>
      <div className="grid grid-cols-12 gap-0 divide-x divide-border-soft">
        <div className="col-span-3 bg-ws-panel-2 p-3">
          <p className="text-caption-uppercase text-muted">PDF · 19 pages</p>
          <div className="mt-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={`pdf-thumb-${i + 1}`}
                className={`h-16 rounded-md border ${
                  i === 0 ? "border-accent bg-accent-soft" : "border-border-soft bg-white"
                } p-2`}
              >
                <div className="h-1 w-3/4 rounded bg-fg/10" />
                <div className="mt-1 h-1 w-1/2 rounded bg-fg/10" />
                <div className="mt-1 h-1 w-2/3 rounded bg-fg/10" />
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-4 bg-ws-panel p-4">
          <p className="text-caption-uppercase text-muted">Agent activity</p>
          <div className="mt-3 space-y-2 font-mono text-xs">
            {[
              { color: "bg-timeline-reading", text: "Reading paper.pdf…" },
              { color: "bg-timeline-extracting", text: "Identified 5 sections" },
              { color: "bg-timeline-planning", text: "Planning 6 panels" },
              { color: "bg-timeline-rendering", text: "Draft 1 rendered" },
              { color: "bg-timeline-critique", text: "Layout too crowded" },
              { color: "bg-timeline-rendering", text: "Revising section 3…" },
              { color: "bg-timeline-done", text: "Draft 2 accepted ✓" },
            ].map((line) => (
              <div key={line.text} className="flex items-start gap-2">
                <span className={`mt-1.5 h-1.5 w-1.5 rounded-pill ${line.color}`} />
                <span className="text-fg-2">{line.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-10 w-14 rounded-sm border ${
                  n === 2 ? "border-accent bg-accent-soft" : "border-border-soft bg-ws-panel-2"
                }`}
              >
                <p className="p-1 text-[9px] font-mono text-muted">D{n}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-5 bg-ws-canvas p-6">
          <div className="mx-auto aspect-[3/4] w-full max-w-[240px] rounded-lg bg-white p-3 shadow-elevated">
            <div className="h-3 w-3/4 rounded bg-fg" />
            <div className="mt-1 h-1.5 w-1/2 rounded bg-muted" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="h-12 rounded bg-surface-warm" />
              <div className="h-12 rounded bg-timeline-reading/40" />
            </div>
            <div className="mt-2 h-1 w-full rounded bg-muted/40" />
            <div className="mt-1 h-1 w-5/6 rounded bg-muted/40" />
            <div className="mt-2 h-1 w-4/6 rounded bg-muted/40" />
            <div className="mt-3 h-14 rounded bg-timeline-planning/30" />
            <div className="mt-2 h-8 rounded bg-success/20" />
          </div>
          <p className="mt-3 text-center text-xs text-muted">Live poster preview · 240×320</p>
        </div>
      </div>
    </div>
  )
}

function HowItWorks() {
  const STEPS = [
    {
      icon: FileText,
      title: "Upload your paper",
      body: "Drop a PDF (up to 50MB) or paste an arXiv link. We extract text, figures, tables, and equations — with provenance.",
    },
    {
      icon: Wand2,
      title: "Agent thinks",
      body: "Reads your paper, plans a layout, picks a palette, and drafts a poster. Then critiques its own work and revises — up to 5 turns.",
    },
    {
      icon: Download,
      title: "Export & edit",
      body: "Download PNG/PDF, or open in our visual editor. Click any element to see why the agent designed it that way.",
    },
  ]

  return (
    <section className="section-rhythm">
      <div className="mx-auto max-w-marketing px-6">
        <div className="text-center">
          <p className="text-caption-uppercase text-accent">How it works</p>
          <h2 className="mt-3 text-section text-fg">From PDF to poster in 3 steps</h2>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-lg border border-border bg-surface p-8 shadow-raised transition-shadow hover:shadow-elevated"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-accent-soft font-mono text-sm font-semibold text-accent">
                  {i + 1}
                </span>
                <step.icon className="h-5 w-5 text-fg-2" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-fg">{step.title}</h3>
              <p className="mt-2 text-fg-2">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function DemoSection() {
  return (
    <section className="section-rhythm bg-surface-cream">
      <div className="mx-auto max-w-marketing px-6">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="text-caption-uppercase text-accent">The killer feature</p>
            <h2 className="mt-3 text-section text-fg">
              Click any element. <br />
              See why it&apos;s there.
            </h2>
            <p className="mt-4 text-lead text-fg-2">
              Every design choice has a reason. The agent logs its reasoning at every revision turn,
              so you can ask: &ldquo;Why did you design it this way?&rdquo; — and get a real answer.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Every claim links back to a page in your paper",
                "Critic feedback preserved across all drafts",
                "Roll back to any earlier draft with one click",
                "Edit text, swap figures, change colors — in browser",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-fg-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-surface p-6 shadow-elevated">
            <div className="rounded-md bg-accent-soft p-4 text-sm">
              <p className="text-caption-uppercase text-accent">Click → Reasoning</p>
              <p className="mt-2 font-mono text-fg">
                &ldquo;I enlarged this results panel because Table 2 contains the paper&apos;s
                primary quantitative contribution — it&apos;s cited 3× more than other tables in the
                source.&rdquo;
              </p>
              <p className="mt-3 text-caption-uppercase text-muted">— Agent, Turn 2</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ExamplesPreview() {
  const featured = EXAMPLE_POSTERS.filter((p) => p.featured).slice(0, 3)
  return (
    <section className="section-rhythm">
      <div className="mx-auto max-w-marketing px-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-caption-uppercase text-accent">Examples</p>
            <h2 className="mt-3 text-section text-fg">Built from real papers</h2>
          </div>
          <Link href="/examples" className="hidden text-sm text-accent hover:underline md:block">
            View all →
          </Link>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {featured.map((poster) => (
            <Link
              key={poster.id}
              href={`/examples/${poster.id}`}
              className="group rounded-lg border border-border bg-surface p-5 transition-shadow hover:shadow-elevated"
            >
              <div className="aspect-[3/4] rounded-md bg-surface-warm" />
              <p className="mt-4 text-sm font-medium text-fg group-hover:text-accent">
                {poster.title}
              </p>
              <p className="mt-1 font-mono text-xs text-muted">
                {poster.draftCount} drafts · {poster.timeMinutes} min
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function UseCasesPreview() {
  return (
    <section className="section-rhythm bg-surface-warm">
      <div className="mx-auto max-w-marketing px-6">
        <div className="text-center">
          <p className="text-caption-uppercase text-accent">Use cases</p>
          <h2 className="mt-3 text-section text-fg">Built for everyone who ships research</h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((uc) => {
            const tints = {
              peach: "bg-peach-50 border-peach-200",
              mint: "bg-mint-50 border-mint-200",
              lavender: "bg-lavender-50 border-lavender-200",
              sky: "bg-sky-50 border-sky-200",
              rose: "bg-rose-50 border-rose-200",
              yellow: "bg-yellow-50 border-yellow-200",
            }
            return (
              <div key={uc.id} className="rounded-lg border border-border bg-surface p-6">
                <div className={`mb-4 inline-block rounded-md border p-3 ${tints[uc.tint]}`}>
                  <span className="text-2xl">📄</span>
                </div>
                <h3 className="text-lg font-semibold text-fg">{uc.title}</h3>
                <p className="mt-2 text-sm text-fg-2">{uc.description}</p>
                <p className="mt-4 text-caption-uppercase text-muted">{uc.audience}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function SocialProof() {
  return (
    <section className="border-y border-border-soft bg-surface py-12">
      <div className="mx-auto max-w-marketing px-6">
        <p className="text-center text-caption-uppercase text-muted">Built on the shoulders of</p>
        <div className="mt-6 grid grid-cols-2 items-center gap-8 md:grid-cols-4">
          {[
            "AutoDesign (arXiv 2608.13560)",
            "Google Stitch DESIGN.md",
            "Ollama local LLM",
            "$0 cloud spend",
          ].map((name) => (
            <p key={name} className="text-center font-mono text-sm text-fg-2">
              {name}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

function CaseStudiesPreview() {
  return (
    <section className="section-rhythm">
      <div className="mx-auto max-w-marketing px-6">
        <div className="text-center">
          <p className="text-caption-uppercase text-accent">Case studies</p>
          <h2 className="mt-3 text-section text-fg">Researchers love it</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {CASE_STUDIES.slice(0, 3).map((cs) => (
            <Link
              key={cs.id}
              href={`/case-studies/${cs.slug}`}
              className="rounded-lg border border-border bg-surface p-6 transition-shadow hover:shadow-elevated"
            >
              <p className="text-caption-uppercase text-accent">{cs.stats[0]?.value}</p>
              <h3 className="mt-3 text-lg font-semibold text-fg">{cs.title}</h3>
              <p className="mt-2 text-sm text-fg-2">{cs.subtitle}</p>
              <div className="mt-6 flex items-center gap-3 border-t border-border-soft pt-4">
                <div className="h-8 w-8 rounded-pill bg-surface-warm" />
                <div>
                  <p className="text-sm font-medium text-fg">{cs.authorName}</p>
                  <p className="text-xs text-muted">{cs.authorRole}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function ComparisonSection() {
  return (
    <section className="section-rhythm bg-surface-cream">
      <div className="mx-auto max-w-marketing px-6">
        <div className="text-center">
          <p className="text-caption-uppercase text-accent">Comparison</p>
          <h2 className="mt-3 text-section text-fg">How it stacks up</h2>
        </div>
        <div className="mt-12 overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-surface-warm">
              <tr>
                <th className="px-6 py-4 text-left font-medium text-fg-2">Feature</th>
                <th className="px-6 py-4 text-center font-semibold text-accent">
                  AI Poster Studio
                </th>
                <th className="px-6 py-4 text-center font-medium text-fg-2">Canva</th>
                <th className="px-6 py-4 text-center font-medium text-fg-2">Beautiful.ai</th>
                <th className="px-6 py-4 text-center font-medium text-fg-2">Designer</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Time to first poster", "2–5 min", "30–60 min", "20–40 min", "2–4 hours"],
                ["Auto-extracts from PDF", true, false, false, false],
                ["AI critique + iteration", true, false, false, false],
                ["Editable artifact (HTML)", true, false, false, false],
                ["Provenance links", true, false, false, false],
                ["Research templates", true, false, true, true],
                ["Why this design? explanations", true, false, false, true],
              ].map((row) => (
                <tr key={String(row[0])} className="border-t border-border-soft">
                  <td className="px-6 py-3 font-medium text-fg">{String(row[0])}</td>
                  {row.slice(1).map((cell, i) => (
                    <td key={`${row[0]}-${i}`} className="px-6 py-3 text-center">
                      {cell === true ? (
                        <CheckCircle2 className="mx-auto h-5 w-5 text-success" />
                      ) : cell === false ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span className={i === 0 ? "font-medium text-accent" : "text-fg-2"}>
                          {cell}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function FAQSection() {
  return (
    <section className="section-rhythm">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-caption-uppercase text-accent">FAQ</p>
          <h2 className="mt-3 text-section text-fg">Questions, answered</h2>
        </div>
        <div className="mt-12 space-y-2">
          {FAQ.map((item) => (
            <details
              key={item.question}
              className="group rounded-lg border border-border bg-surface p-5"
            >
              <summary className="flex cursor-pointer items-center justify-between font-medium text-fg">
                {item.question}
                <span className="ml-4 text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-fg-2">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
