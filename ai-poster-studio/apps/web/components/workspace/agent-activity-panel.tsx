"use client"

import { formatDuration } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { AgentEvent, AgentStage } from "@aips/types"
import { Loader2, Send } from "lucide-react"
import { useEffect, useState } from "react"

const STAGE_COLORS: Record<AgentStage, string> = {
  reading: "bg-timeline-reading",
  extracting: "bg-timeline-extracting",
  planning: "bg-timeline-planning",
  rendering: "bg-timeline-rendering",
  critique: "bg-timeline-critique",
  done: "bg-timeline-done",
}

const STAGE_LABELS: Record<AgentStage, string> = {
  reading: "Reading",
  extracting: "Extracting",
  planning: "Planning",
  rendering: "Drafting",
  critique: "Critique",
  done: "Done",
}

const STAGE_ORDER: AgentStage[] = [
  "reading",
  "extracting",
  "planning",
  "rendering",
  "critique",
  "done",
]

interface Draft {
  id: string
  turnNumber: number
  previewColor: string
  accepted: boolean
  critique: string
}

export function AgentActivityPanel({
  events,
  drafts,
  currentDraft,
  onSelectDraft,
  activeStage,
  startedAt,
  status,
  projectId,
}: {
  events: AgentEvent[]
  drafts: Draft[]
  currentDraft: number
  onSelectDraft: (n: number) => void
  activeStage: AgentStage | null
  startedAt: Date
  status: string
  projectId: string
}) {
  const [elapsed, setElapsed] = useState(0)
  const [feedback, setFeedback] = useState("")
  const [sendingFeedback, setSendingFeedback] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt.getTime())
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const isRunning =
    status === "uploading" ||
    status === "ingesting" ||
    status === "planning" ||
    status === "drafting" ||
    status === "critiquing" ||
    status === "finalizing"

  const currentStageIndex = activeStage ? STAGE_ORDER.indexOf(activeStage) : -1

  const sendFeedback = async () => {
    if (!feedback.trim() || sendingFeedback) return
    setSendingFeedback(true)
    setFeedbackError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "Could not send feedback")
      }
      setFeedback("")
    } catch (err) {
      setFeedbackError(err instanceof Error ? err.message : "Send failed")
    } finally {
      setSendingFeedback(false)
    }
  }

  return (
    <div className="flex flex-col bg-ws-panel">
      <div className="flex h-11 items-center justify-between border-b border-ws-hairline px-4">
        <p className="text-caption-uppercase text-muted">Agent activity</p>
        <span className="font-mono text-xs text-muted">
          {formatDuration(elapsed)} · {status}
        </span>
      </div>

      <div className="border-b border-ws-hairline px-4 py-3">
        <div className="flex gap-1">
          {STAGE_ORDER.map((stage, i) => (
            <div
              key={stage}
              className={cn(
                "flex-1 rounded-pill text-center text-[10px] uppercase tracking-wider transition-colors",
                i < currentStageIndex && "bg-success/20 text-success",
                i === currentStageIndex && `${STAGE_COLORS[stage]} text-fg`,
                i > currentStageIndex && "bg-ws-panel-2 text-meta",
              )}
              style={{ padding: "4px 6px" }}
            >
              {STAGE_LABELS[stage]}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs">
        {events.length === 0 ? (
          <p className="text-muted">Waiting for events…</p>
        ) : (
          <div className="space-y-1.5">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-pill",
                    STAGE_COLORS[event.stage],
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-fg-2">{event.message}</p>
                  {event.draftNumber && (
                    <p className="mt-0.5 text-[10px] text-meta">Turn {event.draftNumber}</p>
                  )}
                </div>
              </div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-2 pt-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-pill bg-accent" />
                <span className="text-meta">streaming…</span>
              </div>
            )}
          </div>
        )}
      </div>

      {drafts.length > 0 && (
        <div className="border-t border-ws-hairline px-4 py-3">
          <p className="text-caption-uppercase text-muted">Drafts</p>
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {Array.from({ length: Math.max(3, currentDraft) }).map((_, i) => {
              const draft = drafts.find((d) => d.turnNumber === i + 1)
              const isCurrent = i + 1 === currentDraft
              return (
                <button
                  type="button"
                  key={`draft-slot-${i + 1}`}
                  onClick={() => draft && onSelectDraft(i + 1)}
                  className={cn(
                    "flex h-16 w-20 flex-shrink-0 flex-col rounded-md border p-1.5 transition-colors",
                    isCurrent
                      ? "border-accent bg-accent-soft"
                      : "border-ws-hairline bg-ws-panel-2 hover:bg-ws-active",
                  )}
                >
                  <div
                    className={cn("h-full w-full rounded-sm", draft?.previewColor ?? "bg-ws-panel")}
                  />
                  <p className="mt-1 text-center font-mono text-[10px]">
                    D{i + 1}
                    {draft?.accepted && " ✓"}
                  </p>
                </button>
              )
            })}
          </div>
          {drafts.find((d) => d.turnNumber === currentDraft)?.critique && (
            <p className="mt-2 text-[10px] text-fg-2">
              {drafts.find((d) => d.turnNumber === currentDraft)?.critique}
            </p>
          )}
        </div>
      )}

      <div className="border-t border-ws-hairline p-3">
        <div className="flex items-center gap-2 rounded-md border border-ws-hairline bg-ws-panel-2 px-3 py-2">
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void sendFeedback()
              }
            }}
            placeholder="Tell the agent what to change…"
            disabled={isRunning}
            className="flex-1 bg-transparent text-xs text-fg placeholder:text-meta focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={sendFeedback}
            disabled={!feedback.trim() || sendingFeedback || isRunning}
            aria-label="Send feedback"
            className="grid h-6 w-6 place-items-center rounded text-accent hover:bg-accent-soft disabled:opacity-30"
          >
            {sendingFeedback ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        {feedbackError && <p className="mt-1 text-[10px] text-danger">{feedbackError}</p>}
        <p className="mt-1 text-[10px] text-meta">
          Press Enter to send. The agent applies your feedback in the next revision.
        </p>
      </div>
    </div>
  )
}
