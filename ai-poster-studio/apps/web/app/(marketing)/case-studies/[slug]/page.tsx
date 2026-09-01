import { CTABanner } from "@/components/marketing/cta-banner"
import { CASE_STUDIES } from "@/lib/data"
import { notFound } from "next/navigation"

export async function generateStaticParams() {
  return CASE_STUDIES.map((cs) => ({ slug: cs.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cs = CASE_STUDIES.find((c) => c.slug === slug)
  if (!cs) return {}
  return { title: cs.title, description: cs.subtitle }
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cs = CASE_STUDIES.find((c) => c.slug === slug)
  if (!cs) notFound()

  return (
    <>
      <article className="section-rhythm">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-caption-uppercase text-accent">Case study</p>
          <h1 className="mt-3 text-hero text-fg">{cs.title}</h1>
          <p className="mt-4 text-lead text-fg-2">{cs.subtitle}</p>

          <div className="mt-8 flex items-center gap-4 border-y border-border-soft py-6">
            <div className="h-12 w-12 rounded-pill bg-surface-warm" />
            <div>
              <p className="font-medium text-fg">{cs.authorName}</p>
              <p className="text-sm text-fg-2">{cs.authorRole}</p>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4 rounded-lg border border-border bg-surface p-6">
            {cs.stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-semibold text-accent">{stat.value}</p>
                <p className="mt-1 text-caption-uppercase text-muted">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="prose prose-lg mt-12 max-w-none">
            <p className="text-lg leading-relaxed text-fg-2">{cs.body}</p>
          </div>

          <div className="mt-12 aspect-[3/4] rounded-lg bg-surface-warm" />
        </div>
      </article>

      <CTABanner />
    </>
  )
}
