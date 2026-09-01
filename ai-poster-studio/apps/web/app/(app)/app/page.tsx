import { requireUser } from "@/lib/auth/session"
import { listProjectsByUser } from "@/lib/db/local"
import { FileText, Plus } from "lucide-react"
import Link from "next/link"

export const metadata = {
  title: "Dashboard",
}

export const dynamic = "force-dynamic"

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString()
}

const STATUS_STYLES = {
  uploading: "bg-muted/20 text-muted",
  ingesting: "bg-timeline-reading/20 text-timeline-reading",
  planning: "bg-timeline-planning/20 text-timeline-planning",
  drafting: "bg-timeline-rendering/20 text-timeline-rendering",
  critiquing: "bg-timeline-critique/30 text-fg",
  finalizing: "bg-timeline-done/20 text-timeline-done",
  completed: "bg-success/20 text-success",
  failed: "bg-danger/20 text-danger",
} as const

export default async function AppDashboard() {
  const user = await requireUser()
  const projects = await listProjectsByUser(user.id)

  return (
    <div className="mx-auto max-w-marketing px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-section text-fg">Your posters</h1>
          <p className="mt-2 text-fg-2">
            {projects.length === 0
              ? "Upload a paper to make your first poster."
              : `${projects.length} poster${projects.length === 1 ? "" : "s"} so far.`}
          </p>
        </div>
        <Link
          href="/app/new"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          New poster
        </Link>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/app/new"
          className="group flex aspect-[4/3] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-surface transition-colors hover:border-accent hover:bg-accent-soft"
        >
          <Plus className="h-8 w-8 text-muted group-hover:text-accent" />
          <p className="mt-3 text-sm font-medium text-fg-2 group-hover:text-accent">New poster</p>
        </Link>

        {projects.map((project) => {
          const draftCount = project.drafts?.length ?? 0
          const statusStyle =
            STATUS_STYLES[project.status as keyof typeof STATUS_STYLES] ?? STATUS_STYLES.uploading
          return (
            <Link
              key={project.id}
              href={`/app/p/${project.id}`}
              className="group flex aspect-[4/3] flex-col rounded-lg border border-border bg-surface p-4 transition-all hover:border-accent hover:shadow-elevated"
            >
              <div className="relative flex-1 overflow-hidden rounded-md bg-surface-warm">
                <div className="absolute inset-0 grid place-items-center">
                  <FileText className="h-10 w-10 text-meta transition-colors group-hover:text-accent" />
                </div>
              </div>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg group-hover:text-accent">
                    {project.title}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted">
                    {draftCount === 0
                      ? "Generating…"
                      : `${draftCount} draft${draftCount === 1 ? "" : "s"}`}{" "}
                    · {timeAgo(project.createdAt)}
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-pill px-2 py-0.5 text-caption-uppercase ${statusStyle}`}
                >
                  {project.status}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
