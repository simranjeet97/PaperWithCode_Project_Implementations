import { CTABanner } from "@/components/marketing/cta-banner"
import { USE_CASES } from "@/lib/data"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "Use cases",
  description: "Who uses AI Poster Studio.",
}

const TINT_STYLES = {
  peach: "bg-[#fde6dc] border-[#f5c8b8]",
  mint: "bg-[#d8efe0] border-[#a7d8b8]",
  lavender: "bg-[#ebe3f5] border-[#c8b9e0]",
  sky: "bg-[#dfeaf7] border-[#a8c8e8]",
  rose: "bg-[#fadcd9] border-[#e8b3ae]",
  yellow: "bg-[#fbf3cf] border-[#e8d894]",
} as const

export default function UseCasesPage() {
  return (
    <>
      <section className="section-rhythm">
        <div className="mx-auto max-w-marketing px-6 text-center">
          <p className="text-caption-uppercase text-accent">Use cases</p>
          <h1 className="mt-3 text-hero text-fg">Built for everyone who ships research.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lead text-fg-2">
            From conference posters to classroom explainers — see how different people use AI Poster
            Studio.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-marketing px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {USE_CASES.map((uc) => (
              <article
                key={uc.id}
                className="rounded-lg border border-border bg-surface p-8 transition-shadow hover:shadow-elevated"
              >
                <div
                  className={cn(
                    "mb-6 inline-grid h-14 w-14 place-items-center rounded-lg border",
                    TINT_STYLES[uc.tint],
                  )}
                >
                  <span className="text-2xl">📄</span>
                </div>
                <h2 className="text-xl font-semibold text-fg">{uc.title}</h2>
                <p className="mt-3 text-fg-2">{uc.description}</p>
                <p className="mt-6 text-caption-uppercase text-muted">{uc.audience}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  )
}
