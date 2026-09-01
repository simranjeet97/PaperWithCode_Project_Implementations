import { CTABanner } from "@/components/marketing/cta-banner"
import { CASE_STUDIES } from "@/lib/data"
import Link from "next/link"

export const metadata = {
  title: "Case studies",
  description: "How researchers use AI Poster Studio.",
}

export default function CaseStudiesIndex() {
  return (
    <>
      <section className="section-rhythm">
        <div className="mx-auto max-w-marketing px-6">
          <p className="text-caption-uppercase text-accent">Case studies</p>
          <h1 className="mt-3 text-hero text-fg">Researchers love it.</h1>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-marketing px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {CASE_STUDIES.map((cs) => (
              <Link
                key={cs.id}
                href={`/case-studies/${cs.slug}`}
                className="group block overflow-hidden rounded-lg border border-border bg-surface transition-shadow hover:shadow-elevated"
              >
                <div className="aspect-video bg-surface-warm" />
                <div className="p-6">
                  <p className="text-caption-uppercase text-accent">{cs.stats[0]?.value}</p>
                  <h2 className="mt-2 text-xl font-semibold text-fg group-hover:text-accent">
                    {cs.title}
                  </h2>
                  <p className="mt-2 text-sm text-fg-2">{cs.subtitle}</p>
                  <div className="mt-6 flex items-center gap-3 border-t border-border-soft pt-4">
                    <div className="h-8 w-8 rounded-pill bg-surface-warm" />
                    <div>
                      <p className="text-sm font-medium text-fg">{cs.authorName}</p>
                      <p className="text-xs text-muted">{cs.authorRole}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  )
}
