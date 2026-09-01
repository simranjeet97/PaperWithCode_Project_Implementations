"use client"

import { AgentActivityPanel } from "@/components/workspace/agent-activity-panel"
import { PdfViewerPanel } from "@/components/workspace/pdf-viewer-panel"
import { PosterRenderPanel } from "@/components/workspace/poster-render-panel"
import { TemplatePicker } from "@/components/workspace/template-picker"
import { POSTER_TEMPLATES, getTemplate } from "@/lib/agents/templates"
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
  const [accentColor, setAccentColor] = useState<string>("#4f46e5")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [leftWidth, setLeftWidth] = useState(320)
  const [middleWidth, setMiddleWidth] = useState(380)
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
          project: { paperFileUrl: string; accentColor?: string }
        }
        if (cancelled) return
        setEvents(data.events)
        setDrafts(data.drafts)
        setStatus(data.status)
        setPosterHtml(data.posterHtml)
        setPaperFileUrl(projectData.project.paperFileUrl)
        if (projectData.project.accentColor) setAccentColor(projectData.project.accentColor)
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

  async function saveSettings(nextTemplate: string, nextAccent: string) {
    setSavingSettings(true)
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: nextTemplate, accentColor: nextAccent }),
      })
      if (!res.ok) throw new Error("Save failed")
      setTemplateId(nextTemplate)
      setAccentColor(nextAccent)
      setSettingsOpen(false)
      // Trigger pipeline re-run with the new template
      void fetch(`/api/projects/${projectId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: `Switch template to ${nextTemplate}.` }),
      })
    } catch (err) {
      console.error(err)
      alert("Settings save failed. See console.")
    } finally {
      setSavingSettings(false)
    }
  }

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
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="ml-3 inline-flex items-center gap-1 rounded-md border border-ws-hairline bg-white px-2 py-0.5 text-[11px] font-medium text-fg-2 hover:bg-ws-active"
          aria-label="Project settings"
        >
          Settings
        </button>
      </div>
      <ResizableGrid
        leftWidth={leftWidth}
        middleWidth={middleWidth}
        onResize={setLeftWidth}
        onResizeMid={setMiddleWidth}
      >
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
      </ResizableGrid>
      {settingsOpen ? (
        <SettingsModal
          currentTemplate={templateId}
          currentAccent={accentColor}
          saving={savingSettings}
          onClose={() => setSettingsOpen(false)}
          onSave={saveSettings}
        />
      ) : null}
    </div>
  )
}

interface SettingsModalProps {
  currentTemplate: string
  currentAccent: string
  saving: boolean
  onClose: () => void
  onSave: (template: string, accent: string) => void
}

function SettingsModal({
  currentTemplate,
  currentAccent,
  saving,
  onClose,
  onSave,
}: SettingsModalProps) {
  const [template, setTemplate] = useState(currentTemplate)
  const [accent, setAccent] = useState(currentAccent)
  const presetAccents = POSTER_TEMPLATES.map((t) => "#4f46e5")
  return (
    <dialog
      ref={(el) => el?.showModal()}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose()
      }}
      className="fixed inset-0 m-auto h-fit max-h-[90vh] w-full max-w-2xl rounded-xl border border-border bg-surface p-6 shadow-elevated backdrop:bg-black/40"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-fg">Project settings</h2>
          <p className="mt-1 text-xs text-muted">
            Switching templates re-renders the poster with the new layout. Accent updates live.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted hover:bg-ws-active"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="mt-5">
        <TemplatePicker value={template} onChange={setTemplate} />
      </div>

      <div className="mt-5">
        <p className="text-caption-uppercase text-muted">Accent color</p>
        <div className="mt-2 flex items-center gap-3">
          {presetAccents.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setAccent(c)}
              aria-label={`Accent ${c}`}
              className={`h-6 w-6 rounded-pill border-2 transition-transform ${
                accent.toLowerCase() === c.toLowerCase()
                  ? "scale-125 border-fg"
                  : "border-transparent hover:scale-110"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="h-7 w-7 cursor-pointer rounded-pill border border-ws-hairline"
            title="Custom color"
          />
          <span className="font-mono text-xs text-muted">{accent}</span>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center rounded-md border border-ws-hairline bg-white px-3 py-1.5 text-xs font-medium text-fg hover:bg-ws-active"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave(template, accent)}
          className="inline-flex items-center rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          style={{ backgroundColor: accent }}
        >
          {saving ? "Saving…" : "Save & re-render"}
        </button>
      </div>
    </dialog>
  )
}

interface ResizableGridProps {
  leftWidth: number
  middleWidth: number
  onResize: (w: number) => void
  onResizeMid: (w: number) => void
  children: [React.ReactNode, React.ReactNode, React.ReactNode]
}

function ResizableGrid({
  leftWidth,
  middleWidth,
  onResize,
  onResizeMid,
  children,
}: ResizableGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{
    startX: number
    startLeft: number
    startMid: number
    target: "left" | "mid"
  } | null>(null)

  const onMouseDown = (target: "left" | "mid") => (e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startLeft: leftWidth, startMid: middleWidth, target }
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.startX
      if (d.target === "left") {
        const next = Math.max(220, Math.min(640, d.startLeft + dx))
        onResize(next)
      } else {
        const next = Math.max(260, Math.min(720, d.startMid + dx))
        onResizeMid(next)
      }
    }
    function onUp() {
      if (!dragRef.current) return
      dragRef.current = null
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [onResize, onResizeMid])

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 bg-ws-canvas" style={{ minWidth: 0 }}>
      <div
        style={{ width: `${leftWidth}px`, minWidth: 0 }}
        className="flex h-full min-w-0 flex-col border-r border-ws-hairline"
      >
        {children[0]}
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: <hr> doesn't accept onMouseDown + drag interaction */}
      <div
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        onMouseDown={onMouseDown("left")}
        className="group relative flex h-full w-1.5 cursor-col-resize items-center justify-center bg-ws-canvas hover:bg-accent/30"
        title="Drag to resize"
      >
        <span className="block h-8 w-0.5 rounded-full bg-ws-hairline group-hover:bg-accent" />
      </div>
      <div
        style={{ width: `${middleWidth}px`, minWidth: 0 }}
        className="flex h-full min-w-0 flex-col border-r border-ws-hairline"
      >
        {children[1]}
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: <hr> doesn't accept onMouseDown + drag interaction */}
      <div
        role="separator"
        aria-orientation="vertical"
        tabIndex={0}
        onMouseDown={onMouseDown("mid")}
        className="group relative flex h-full w-1.5 cursor-col-resize items-center justify-center bg-ws-canvas hover:bg-accent/30"
        title="Drag to resize"
      >
        <span className="block h-8 w-0.5 rounded-full bg-ws-hairline group-hover:bg-accent" />
      </div>
      <div className="min-w-0 flex-1">{children[2]}</div>
    </div>
  )
}
