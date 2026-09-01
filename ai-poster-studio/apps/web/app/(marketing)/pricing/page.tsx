import { CTABanner } from "@/components/marketing/cta-banner"
import { PRICING_TIERS } from "@/lib/data"
import { cn } from "@/lib/utils"
import { Check, Sparkles } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Pricing",
  description: "$0 for now — we're in local-first alpha.",
}

export default function PricingPage() {
  return (
    <>
      <section className="section-rhythm">
        <div className="mx-auto max-w-marketing px-6 text-center">
          <p className="text-caption-uppercase text-accent">Pricing</p>
          <h1 className="mt-3 text-hero text-fg">$0 while we&apos;re in alpha.</h1>
          <p className="mx-auto mt-6 max-w-xl text-lead text-fg-2">
            Everything runs locally on your machine — your papers never leave your disk. Paid tiers
            will come later, but you won&apos;t need them for the first 100 users.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 rounded-pill border border-accent/20 bg-accent-soft px-4 py-2 text-caption-uppercase text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Local-first · No API keys · No cloud spend
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="mx-auto max-w-marketing px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={cn(
                  "relative rounded-lg border p-8",
                  tier.featured
                    ? "border-accent bg-fg text-white shadow-elevated"
                    : "border-border bg-surface",
                )}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-pill bg-accent px-3 py-1 text-caption-uppercase text-white">
                      <Sparkles className="h-3 w-3" />
                      Most popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-semibold">{tier.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold tracking-tight">
                    ${tier.priceMonthly}
                  </span>
                  <span className={cn("text-sm", tier.featured ? "text-white/60" : "text-muted")}>
                    /month
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 flex-shrink-0",
                          tier.featured ? "text-accent" : "text-success",
                        )}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.id === "free" ? "/app/new" : "/contact"}
                  className={cn(
                    "mt-8 block w-full rounded-md px-4 py-2.5 text-center text-sm font-medium transition-colors",
                    tier.featured
                      ? "bg-white text-fg hover:bg-white/90"
                      : "bg-accent text-white hover:bg-accent-hover",
                  )}
                >
                  {tier.id === "free" ? "Start free" : "Join waitlist"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTABanner
        title="Have feedback?"
        subtitle="This is local-first alpha — tell us what's broken."
        primaryHref="https://github.com/simranjeet97"
        primaryLabel="Open an issue"
        secondaryHref="https://topmate.io/simranjeet97/"
        secondaryLabel="Book a 1:1"
      />
    </>
  )
}
