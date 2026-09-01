"use client"

import { Download, Maximize2, Pencil, X, ZoomIn, ZoomOut } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

interface Draft {
  id: string
  turnNumber: number
  previewColor: string
  accepted: boolean
  critique: string
  htmlContent?: string
}

interface SelectedPanel {
  type: string
  attrs: Record<string, string>
}

export function PosterRenderPanel({
  drafts,
  currentDraft,
  posterHtml,
  projectId,
  pageWidth = 841,
  pageHeight = 1189,
}: {
  drafts: Draft[]
  currentDraft: number
  posterHtml: string | null
  projectId: string
  pageWidth?: number
  pageHeight?: number
}) {
  const [zoom, setZoom] = useState(60)
  const [selected, setSelected] = useState<SelectedPanel | null>(null)
  const [overrideText, setOverrideText] = useState<string>("")
  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideSaving, setOverrideSaving] = useState(false)
  const [activeHtml, setActiveHtml] = useState<string | null>(posterHtml)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    if (posterHtml) setActiveHtml(posterHtml)
  }, [posterHtml])

  // Listen for click events bubbled from the iframe
  useEffect(() => {
    function handler(e: MessageEvent) {
      const data = e.data as { type?: string; panel?: Record<string, string> } | null
      if (!data || data.type !== "aips-panel-click" || !data.panel) return
      setSelected({ type: data.panel["data-panel-type"] ?? "unknown", attrs: data.panel })
      setOverrideOpen(false)
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  const draft = useMemo(
    () => drafts.find((d) => d.turnNumber === currentDraft),
    [drafts, currentDraft],
  )

  const reasoning = useMemo(() => {
    if (!selected) return null
    return explainClientSide(selected)
  }, [selected])

  const downloadHtml = () => {
    if (!activeHtml) return
    const blob = new Blob([activeHtml], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `poster-draft-${currentDraft}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadPng = async () => {
    if (!activeHtml) return
    try {
      const res = await fetch(`/api/projects/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "png", draftNumber: currentDraft }),
      })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `poster-draft-${currentDraft}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert("PNG export failed. See server logs.")
    }
  }

  const downloadPdf = async () => {
    if (!activeHtml) return
    try {
      const res = await fetch(`/api/projects/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "pdf", draftNumber: currentDraft }),
      })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `poster-draft-${currentDraft}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert("PDF export failed. See server logs.")
    }
  }

  async function savePanelOverride() {
    if (!selected || !overrideText.trim()) return
    const panelId = selected.attrs["data-panel-id"]
    if (!panelId) return
    setOverrideSaving(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/panel-override`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panelId, text: overrideText.trim() }),
      })
      if (!res.ok) throw new Error("Override save failed")

      // Trigger a pipeline re-run so the next draft contains the override
      const feedbackRes = await fetch(`/api/projects/${projectId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: `Apply override for panel ${panelId}` }),
      })
      if (!feedbackRes.ok) console.warn("Override saved but pipeline trigger failed")

      setOverrideOpen(false)
      setSelected(null)
    } catch (err) {
      console.error(err)
      alert("Override failed. See console.")
    } finally {
      setOverrideSaving(false)
    }
  }

  return (
    <div className="relative flex flex-col bg-ws-canvas">
      <div className="flex h-11 items-center justify-between border-b border-ws-hairline bg-white px-4">
        <p className="text-caption-uppercase text-muted">
          Poster preview · Draft {currentDraft}
          {draft?.accepted && " · accepted ✓"}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(25, z - 10))}
            aria-label="Zoom out"
            className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-ws-active"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="font-mono text-xs text-muted">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            aria-label="Zoom in"
            className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-ws-active"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Fullscreen"
            onClick={() => iframeRef.current?.requestFullscreen?.()}
            className="grid h-7 w-7 place-items-center rounded text-muted hover:bg-ws-active"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {activeHtml ? (
          <div className="mx-auto flex justify-center">
            <div
              className="origin-top shadow-elevated"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
            >
              <iframe
                ref={iframeRef}
                title="poster-preview"
                srcDoc={activeHtml}
                className="block border border-ws-hairline bg-white"
                style={{ width: `${pageWidth}px`, height: `${(pageHeight * zoom) / 60}px` }}
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>

      <div className="flex items-center justify-between border-t border-ws-hairline bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={!activeHtml}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </button>
          <button
            type="button"
            onClick={downloadPng}
            disabled={!activeHtml}
            className="inline-flex items-center gap-1.5 rounded-md border border-ws-hairline bg-white px-3 py-1.5 text-xs font-medium text-fg hover:bg-ws-active disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            PNG
          </button>
          <button
            type="button"
            onClick={downloadHtml}
            disabled={!activeHtml}
            className="inline-flex items-center gap-1.5 rounded-md border border-ws-hairline bg-white px-3 py-1.5 text-xs font-medium text-fg hover:bg-ws-active disabled:opacity-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            HTML
          </button>
          <a
            href={`/app/p/${projectId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-md border border-ws-hairline bg-white px-3 py-1.5 text-xs font-medium text-fg hover:bg-ws-active"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </a>
        </div>
        <p className="font-mono text-xs text-muted">A0 portrait · 300 DPI</p>
      </div>

      {selected && reasoning && (
        <div
          className="pointer-events-auto absolute right-6 top-16 z-20 max-w-sm rounded-lg border border-ws-hairline bg-white p-4 shadow-floating"
          data-testid="why-this-design-popover"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-caption-uppercase text-accent">Why this design?</p>
              <h3 className="mt-1 text-sm font-semibold text-fg">{reasoning.title}</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close"
              className="grid h-6 w-6 flex-shrink-0 place-items-center rounded text-muted hover:bg-ws-active"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-fg-2">{reasoning.body}</p>
          {selected.attrs["data-panel-id"] && (
            <div className="mt-3 border-t border-ws-hairline pt-3">
              {!overrideOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    setOverrideText(
                      selected.attrs["data-claim-text"] ??
                        selected.attrs["data-section-title"] ??
                        selected.attrs["data-title"] ??
                        selected.attrs["data-abstract-text"] ??
                        "",
                    )
                    setOverrideOpen(true)
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-ws-hairline bg-white px-2 py-1 text-xs font-medium text-fg hover:bg-ws-active"
                >
                  <Pencil className="h-3 w-3" />
                  Override text
                </button>
              ) : (
                <div>
                  <label htmlFor="override-text" className="text-caption-uppercase text-muted">
                    New text for this panel
                  </label>
                  <textarea
                    id="override-text"
                    value={overrideText}
                    onChange={(e) => setOverrideText(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-md border border-ws-hairline bg-white p-2 text-fg-2 text-xs"
                    maxLength={2000}
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setOverrideOpen(false)}
                      className="rounded-md border border-ws-hairline bg-white px-2 py-1 text-xs font-medium text-fg hover:bg-ws-active"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={savePanelOverride}
                      disabled={overrideSaving || !overrideText.trim()}
                      className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
                    >
                      {overrideSaving ? "Saving…" : "Save & re-render"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {Object.keys(selected.attrs).length > 0 && (
            <details className="mt-3 text-xs">
              <summary className="cursor-pointer text-muted">Raw panel data</summary>
              <pre className="mt-1 overflow-x-auto rounded bg-ws-panel-2 p-2 font-mono text-[10px] text-fg-2">
                {Object.entries(selected.attrs)
                  .map(([k, v]) => `${k}=${v}`)
                  .join("\n")}
              </pre>
            </details>
          )}
        </div>
      )}

      {!selected && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 rounded-pill border border-ws-hairline bg-white/90 px-3 py-1 text-caption-uppercase text-muted backdrop-blur-sm">
          Click any element in the poster for the agent's reasoning
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="grid h-full place-items-center">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 rounded-lg border-2 border-dashed border-ws-hairline" />
        <p className="mt-4 text-sm font-medium text-fg-2">Waiting for first draft…</p>
        <p className="mt-1 text-xs text-muted">
          The agent is reading the paper. Drafts will appear here in a few seconds.
        </p>
      </div>
    </div>
  )
}

// Client-side mirror of the agent reasoning. In a real app this would
// come from the agent's CriticFeedback / VLMCritique JSON stored on the draft.
function explainClientSide(panel: SelectedPanel): { title: string; body: string } {
  const type = panel.type
  const attrs = panel.attrs
  if (type === "title") {
    return {
      title: "Title block",
      body: "Used the paper title verbatim. Set at 36px / weight 700 with the accent-color underline. At A0 scale the title must be readable from across a conference hall — anything smaller gets lost.",
    }
  }
  if (type === "abstract") {
    return {
      title: "Abstract",
      body: "Truncated the paper's abstract to 600 characters and placed it in a tinted band with a thick accent-color left border. Conference reviewers should be able to scan the core contribution in 10 seconds.",
    }
  }
  if (type === "section") {
    const title = attrs["data-section-title"] ?? "Section"
    const isMethod = /method|approach|model|architecture/i.test(title)
    const isResults = /result|experiment|evaluation|benchmark/i.test(title)
    return {
      title: `${title} section`,
      body: isMethod
        ? `Allocated this panel to the Method section because it's typically the paper's primary contribution. Placed in the left column so it sits in the natural reading path.`
        : isResults
          ? "Results panel — given equal width as the Method because quantitative comparisons are the most-cited part of any research paper."
          : "Section panel extracted directly from the source PDF. Text truncated to 400 characters to keep the panel readable from across a conference hall.",
    }
  }
  if (type === "figure") {
    const caption = attrs["data-figure-caption"] ?? "Figure"
    return {
      title: "Figure placeholder",
      body: `Original figure "${caption}" was not extracted automatically. The placeholder shows the caption. Use the Edit button to upload a replacement PNG.`,
    }
  }
  if (type === "claim") {
    const text = attrs["data-claim-text"] ?? ""
    const page = attrs["data-claim-page"] ?? "?"
    return {
      title: "Key claim",
      body: `Extracted from page ${page} by matching strong verbs (show, demonstrate, achieve, outperform, propose, introduce) in sentences between 30–400 characters. Original: "${text.slice(0, 120)}${text.length > 120 ? "…" : ""}"`,
    }
  }
  if (type === "claims") {
    return {
      title: "Claims block",
      body: "Container for the top 3 claims ranked by importance (primary first). Extracted with the verb-matching heuristic described in each claim entry.",
    }
  }
  if (type === "diagram") {
    const caption = attrs["data-diagram-caption"] ?? "Architecture"
    return {
      title: "Architecture diagram",
      body: `Auto-generated from the paper's Method/Architecture section. Shows the ${caption.toLowerCase()} as a left-to-right flow. Component labels are extracted by pattern-matching "we propose X, Y, Z" / "the model consists of..." in the source PDF. Click any element in the editor to swap the rendering.`,
    }
  }
  if (type === "table") {
    const caption = attrs["data-table-caption"] ?? "Table"
    return {
      title: "Table reference",
      body: `Detected table "${caption}" from the source PDF. Cell-by-cell extraction is on the roadmap; for now this panel links back to the page reference in the original paper.`,
    }
  }
  return { title: "Panel", body: "No reasoning recorded for this element." }
}
