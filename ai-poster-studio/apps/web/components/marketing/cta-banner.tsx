import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"

export function CTABanner({
  title = "Ready to make your first poster?",
  subtitle = "Upload a research paper and watch an AI agent draft, critique, and iterate a beautiful poster in minutes.",
  primaryHref = "/app/new",
  primaryLabel = "Try it free",
  secondaryHref = "/examples",
  secondaryLabel = "See examples",
}: {
  title?: string
  subtitle?: string
  primaryHref?: string
  primaryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
}) {
  return (
    <section className="bg-fg text-white" style={{ backgroundColor: "#111827", color: "#ffffff" }}>
      <div className="mx-auto max-w-marketing px-6 py-24 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-accent" />
        <h2 className="mt-6 text-section text-white" style={{ color: "#ffffff" }}>
          {title}
        </h2>
        <p
          className="mx-auto mt-4 max-w-xl text-lg text-white/70"
          style={{ color: "rgba(255, 255, 255, 0.78)" }}
        >
          {subtitle}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-white/90"
            style={{ backgroundColor: "#ffffff", color: "#111827" }}
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={secondaryHref}
            className="inline-flex items-center gap-2 rounded-md border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            style={{
              borderColor: "rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
            }}
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}
