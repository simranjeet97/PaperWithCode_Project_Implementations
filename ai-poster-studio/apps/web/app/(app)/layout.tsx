import { Logo } from "@/app/(marketing)/layout"
import { requireUser } from "@/lib/auth/session"
import { Sparkles } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  return (
    <div className="flex h-screen flex-col bg-ws-canvas">
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-ws-hairline bg-surface px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <Link href="/app" className="text-sm text-fg-2 hover:text-fg">
            Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-pill bg-accent-soft px-3 py-1 text-caption-uppercase text-accent">
            Free · unlimited
          </span>
          <div className="flex items-center gap-2 rounded-md border border-ws-hairline bg-ws-panel-2 px-3 py-1.5">
            <span className="grid h-6 w-6 place-items-center rounded-pill bg-accent font-mono text-xs font-semibold text-white">
              {(user.name?.[0] ?? user.email[0] ?? "?").toUpperCase()}
            </span>
            <span className="text-sm text-fg-2">{user.name ?? user.email}</span>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
