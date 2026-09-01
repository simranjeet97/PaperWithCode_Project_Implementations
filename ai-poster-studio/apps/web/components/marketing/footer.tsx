import { Logo } from "@/app/(marketing)/layout"
import { SOCIAL_LINKS } from "@/lib/data"
import Link from "next/link"

const COLUMNS = [
  {
    label: "Product",
    links: [
      { href: "/", label: "Home" },
      { href: "/examples", label: "Examples" },
      { href: "/pricing", label: "Pricing" },
      { href: "/use-cases", label: "Use cases" },
    ],
  },
  {
    label: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/docs", label: "Docs" },
      { href: "/changelog", label: "Changelog" },
      { href: "/api", label: "API" },
    ],
  },
  {
    label: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
      { href: "/case-studies", label: "Case studies" },
    ],
  },
  {
    label: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/dpa", label: "DPA" },
    ],
  },
] as const

export function MarketingFooter() {
  return (
    <footer className="border-t border-border-soft bg-surface">
      <div className="mx-auto max-w-marketing px-6 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-fg-2">
              I gave an AI agent a 19-page research paper and asked for one slide.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.label}>
              <p className="text-caption-uppercase text-muted">{col.label}</p>
              <ul className="mt-4 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-fg-2 transition-colors hover:text-fg"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border-soft pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted">
            Built by{" "}
            <a
              href="https://www.linkedin.com/in/simranjeet97/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg-2 hover:text-accent"
            >
              Simranjeet Singh
            </a>
            . Inspired by{" "}
            <a
              href="https://autodesign.designanything.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg-2 hover:text-accent"
            >
              AutoDesign
            </a>
            .
          </p>
          <div className="flex items-center gap-4">
            {SOCIAL_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className="text-sm text-muted transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
