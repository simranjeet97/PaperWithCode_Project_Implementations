import { MarketingFooter } from "@/components/marketing/footer"
import { MarketingNav } from "@/components/marketing/nav"
import { Sparkles } from "lucide-react"
import Link from "next/link"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 font-display font-semibold tracking-tight text-fg"
    >
      <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white">
        <Sparkles className="h-4 w-4" />
      </span>
      <span className={className}>AI Poster Studio</span>
    </Link>
  )
}
