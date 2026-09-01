import { CTABanner } from "@/components/marketing/cta-banner"
import { SOCIAL_LINKS } from "@/lib/data"
import { Github, Instagram, Linkedin, Sparkles, Video } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "About",
  description: "Built by Simranjeet Singh.",
}

const SOCIAL_ICONS = {
  LinkedIn: Linkedin,
  Instagram: Instagram,
  GitHub: Github,
  TopMate: Video,
} as const

export default function AboutPage() {
  return (
    <>
      <section className="section-rhythm">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-caption-uppercase text-accent">About</p>
          <h1 className="mt-3 text-hero text-fg">
            A research paper → a beautiful poster, in minutes.
          </h1>
          <div className="prose prose-lg mt-12 max-w-none space-y-6 text-lg leading-relaxed text-fg-2">
            <p>
              AI Poster Studio exists because poster-making is the most hated part of research
              deadlines. I built it after watching my collaborators spend entire Saturdays fighting
              PowerPoint text boxes — when they should be fighting their actual research problems.
            </p>
            <p>
              The core idea is simple: <strong className="text-fg">show your work</strong>. Every
              design choice the agent makes is logged, reasoned, and reversible. You can ask
              &ldquo;why did you design it this way?&rdquo; and get a real answer — sourced from the
              paper, cited, and editable.
            </p>
            <p>
              The runtime is inspired by{" "}
              <a
                href="https://autodesign.designanything.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                AutoDesign
              </a>{" "}
              (arXiv 2608.13560), a research system that runs autonomously for 40 minutes to produce
              posters. We replicate the runtime, skip the 7-day meta-optimization, and ship it as a
              web app that finishes in 2–5 minutes.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border-soft bg-surface-cream py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-accent" />
          <p className="mt-4 text-caption-uppercase text-accent">Built by</p>
          <h2 className="mt-2 text-section text-fg">Simranjeet Singh</h2>
          <p className="mt-4 text-lead text-fg-2">
            Building AI tools that turn research papers into beautiful artifacts. Reach out for
            consulting, design partnerships, or just to talk shop.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {SOCIAL_LINKS.map((link) => {
              const Icon = SOCIAL_ICONS[link.label as keyof typeof SOCIAL_ICONS]
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-warm"
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </a>
              )
            })}
          </div>
        </div>
      </section>

      <section className="section-rhythm">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-section text-fg">Principles</h2>
          <div className="mt-8 space-y-6">
            {[
              {
                title: "Show your work",
                body: "Every AI decision is logged, reasoned, and reversible. No magic.",
              },
              {
                title: "Owned by the user",
                body: "Your papers, your data, your posters. Export anytime. Delete anytime.",
              },
              {
                title: "Open where it matters",
                body: "The agent runtime will be open source. Pricing is transparent.",
              },
              {
                title: "Quality over speed",
                body: "We cap agent runs at 5 turns so the user gets polish, not just speed.",
              },
            ].map((p) => (
              <div key={p.title} className="rounded-lg border border-border bg-surface p-6">
                <h3 className="text-lg font-semibold text-fg">{p.title}</h3>
                <p className="mt-2 text-fg-2">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  )
}
