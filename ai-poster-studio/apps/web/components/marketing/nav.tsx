"use client"

import { Logo } from "@/app/(marketing)/layout"
import { useSession } from "@/components/providers"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"

const NAV_LINKS = [
  { href: "/examples", label: "Examples" },
  { href: "/use-cases", label: "Use cases" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
] as const

export function MarketingNav() {
  const { user } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.refresh()
    router.push("/")
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b border-border-soft",
        "bg-bg/80 backdrop-blur-md",
      )}
    >
      <div className="mx-auto flex h-14 max-w-marketing items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm text-fg-2 transition-colors hover:text-fg hover:bg-surface-warm"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/app" className="rounded-md px-3 py-1.5 text-sm text-fg-2 hover:text-fg">
                Dashboard
              </Link>
              <span className="hidden text-sm text-muted sm:block">{user.name ?? user.email}</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md px-3 py-1.5 text-sm text-fg-2 hover:text-fg"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-md px-3 py-1.5 text-sm text-fg-2 hover:text-fg"
              >
                Sign in
              </Link>
              <Link
                href="/sign-in?mode=signup"
                className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
