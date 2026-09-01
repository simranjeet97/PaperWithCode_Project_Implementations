"use client"

import { AgentActivityPanel } from "@/components/workspace/agent-activity-panel"
import { PdfViewerPanel } from "@/components/workspace/pdf-viewer-panel"
import { PosterRenderPanel } from "@/components/workspace/poster-render-panel"
import { getTemplate } from "@/lib/agents/templates"
import type { AgentEvent, AgentStage } from "@aips/types"
import { useEffect, useRef, useState } from "react"

interface Draft {
  id: string
  turnNumber: number
  previewColor: string
  accepted: boolean
  critique: string
  htmlContent?: string
}

const PALETTE = {
  1: "bg-timeline-rendering/30",
  2: "bg-timeline-critique/30",
  3: "bg-success/20",
}

export function WorkspaceShell({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [currentDraft, setCurrentDraft] = useState(0)
  const [activeStage, setActiveStage] = useState<AgentStage | null>(null)
  const [posterHtml, setPosterHtml] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("loading")
  const [paperFileUrl, setPaperFileUrl] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState<string>("cvpr-portrait")
  const startedAt = useRef<Date>(new Date())

  // Poll project state every 1.5s
  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null

    const fetchOnce = async () => {
      try {
        const [eventsRes, projectRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/events`, { cache: "no-store" } as RequestInit),
          fetch(`/api/projects/${projectId}`, { cache: "no-store" } as RequestInit),
        ])
        if (!eventsRes.ok || !projectRes.ok) return
        const data = (await eventsRes.json()) as {
          events: AgentEvent[]
          drafts: Draft[]
          status: string
          posterHtml: string | null
          template?: string
        }
        const projectData = (await projectRes.json()) as {
          project: { paperFileUrl: string }
        }
        if (cancelled) return
        setEvents(data.events)
        setDrafts(data.drafts)
        setStatus(data.status)
        setPosterHtml(data.posterHtml)
        setPaperFileUrl(projectData.project.paperFileUrl)
        if (data.template) setTemplateId(data.template)
        if (data.events.length > 0) {
          const last = data.events[data.events.length - 1]
          if (last) setActiveStage(last.stage)
        }
        const lastDraft = data.drafts[data.drafts.length - 1]
        if (lastDraft && currentDraft === 0) {
          setCurrentDraft(lastDraft.turnNumber)
        }
        if (data.status === "completed" || data.status === "failed") {
          if (interval) clearInterval(interval)
        }
      } catch (err) {
        console.warn("Poll failed:", err)
      }
    }

    void fetchOnce()
    interval = setInterval(fetchOnce, 1500)

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [projectId, currentDraft])

  const template = getTemplate(templateId)
  const orientation = template.pageSize.width >= template.pageSize.height ? "landscape" : "portrait"

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ws-hairline bg-ws-panel-2 px-4 py-2 text-xs">
        <div className="flex items-center gap-2 text-muted">
          <span className="font-medium text-fg-2">{template.shortName}</span>
          <span aria-hidden>·</span>
          <span>{orientation}</span>
          <span aria-hidden>·</span>
          <span className="font-mono">
            {template.pageSize.width}×{template.pageSize.height}mm
          </span>
        </div>
        <span className="font-mono text-muted">status: {status}</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[320px_380px_1fr] divide-x divide-ws-hairline bg-ws-canvas">
        <PdfViewerPanel paperFileUrl={paperFileUrl} />
        <AgentActivityPanel
          events={events}
          drafts={drafts.map((d) => ({
            ...d,
            previewColor: PALETTE[d.turnNumber as 1 | 2 | 3] ?? "bg-timeline-rendering/30",
          }))}
          currentDraft={currentDraft}
          onSelectDraft={setCurrentDraft}
          activeStage={activeStage}
          startedAt={startedAt.current}
          status={status}
          projectId={projectId}
        />
        <PosterRenderPanel
          drafts={drafts.map((d) => ({
            ...d,
            previewColor: PALETTE[d.turnNumber as 1 | 2 | 3] ?? "bg-timeline-rendering/30",
          }))}
          currentDraft={currentDraft}
          posterHtml={posterHtml}
          projectId={projectId}
        />
      </div>
    </div>
  )
}
