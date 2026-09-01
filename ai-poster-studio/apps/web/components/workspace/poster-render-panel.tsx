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
      const data = e.data as { type?: string; panel?: Record<string, string>; html?: string } | null
      if (!data) return
      if (data.type === "aips-panel-click" && data.panel) {
        setSelected({ type: data.panel["data-panel-type"] ?? "unknown", attrs: data.panel })
        setOverrideOpen(false)
        return
      }
      if (data.type === "aips-content-edited") {
        // User typed/resized in the iframe — mark dirty without reloading
        setDirty(true)
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [])

  const [dirty, setDirty] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)

  // Track the latest draft id for save-back
  useEffect(() => {
    const d = drafts.find((x) => x.turnNumber === currentDraft)
    setDraftId(d?.id ?? null)
    setDirty(false)
  }, [drafts, currentDraft])

  const saveDraftEdits = async () => {
    if (!draftId) return
    const doc = iframeRef.current?.contentDocument
    const liveHtml = doc ? doc.documentElement.outerHTML : activeHtml
    if (!liveHtml) return
    setSavingDraft(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent: liveHtml }),
      })
      if (!res.ok) throw new Error("Save failed")
      setDirty(false)
    } catch (err) {
      console.error(err)
      alert("Save failed. See console.")
    } finally {
      setSavingDraft(false)
    }
  }

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
          {dirty && " · unsaved changes"}
        </p>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={saveDraftEdits}
              disabled={savingDraft}
              className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {savingDraft ? "Saving…" : "Save edits"}
            </button>
          )}
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
              <PanelEditCanvas
                projectId={projectId}
                draftId={draftId}
                html={activeHtml}
                pageWidth={pageWidth}
                pageHeight={pageHeight}
                zoom={zoom}
                onHtmlChange={(next) => {
                  setActiveHtml(next)
                  setDirty(true)
                }}
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

/**
 * Inject preview-only behavior into the poster iframe:
 *  - Mark panels `position: relative` so an overlay layer can anchor to them
 *  - `contenteditable="plaintext-only"` on every text element inside panels
 *  - postMessage back to the parent with the modified HTML on input
 *
 * Resize + drag-to-move are handled by the *parent* via an overlay layer
 * (aips-overlay) so handles stay visible even when a panel overflows the
 * canvas. The overlay reads panel rects from the iframe and ships back
 * width/height/left/top changes that get persisted into the HTML.
 */
function injectPreviewBehavior(iframe: HTMLIFrameElement | null) {
  if (!iframe) return
  const doc = iframe.contentDocument
  if (!doc) return

  const styleId = "aips-preview-style"
  if (doc.getElementById(styleId)) return
  const style = doc.createElement("style")
  style.id = styleId
  style.textContent = `
    [data-panel-id] {
      position: relative !important;
      box-sizing: border-box !important;
      transition: outline-color 0.1s;
    }
    [data-panel-id]:hover {
      outline: 1.5px dashed var(--accent, #4f46e5) !important;
      outline-offset: 4px !important;
    }
    [data-panel-id] h1, [data-panel-id] h2, [data-panel-id] h3,
    [data-panel-id] p, [data-panel-id] li, [data-panel-id] figcaption,
    [data-panel-id] .tagline, [data-panel-id] .authors,
    [data-panel-id] .claim span:last-child {
      outline: 1px solid transparent;
      transition: outline-color 0.1s;
      border-radius: 2px;
      cursor: text;
    }
    [data-panel-id] h1:hover, [data-panel-id] h2:hover, [data-panel-id] h3:hover,
    [data-panel-id] p:hover, [data-panel-id] li:hover, [data-panel-id] figcaption:hover {
      outline-color: var(--accent, #4f46e5);
    }
    [data-panel-id] h1:focus, [data-panel-id] h2:focus, [data-panel-id] h3:focus,
    [data-panel-id] p:focus, [data-panel-id] li:focus, [data-panel-id] figcaption:focus {
      outline: 2px solid var(--accent, #4f46e5) !important;
      outline-offset: 2px;
    }
    body::after { content: none !important; }
  `
  doc.head.appendChild(style)

  const targets = doc.querySelectorAll(
    "[data-panel-id] h1, [data-panel-id] h2, [data-panel-id] h3, [data-panel-id] p, [data-panel-id] li, [data-panel-id] figcaption, [data-panel-id] .tagline, [data-panel-id] .authors",
  )
  for (const el of Array.from(targets)) {
    ;(el as HTMLElement).setAttribute("contenteditable", "plaintext-only")
  }

  // Ship HTML on input events (resizes/moves are shipped separately by the overlay)
  doc.addEventListener("input", () => {
    const html = doc.documentElement.outerHTML
    window.parent.postMessage({ type: "aips-content-edited", html }, "*")
  })
}

/**
 * Wraps the poster iframe with an overlay layer that renders 8 resize handles
 * + a drag handle per [data-panel-id] panel. The handles live in the parent
 * document (NOT the iframe) so they remain visible even when a panel
 * overflows the poster canvas.
 *
 * Communication with the iframe:
 *  - Read: panel.getBoundingClientRect() in iframe coords → transform to
 *    parent coords via the iframe's rect.
 *  - Write: set style.width/height/left/top directly on the iframe element.
 *    The change persists into the iframe's outerHTML on next ship.
 */
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"
const HANDLE_SIZE = 10

interface PanelRect {
  panelId: string
  /** rect in parent (overlay) coords */
  x: number
  y: number
  w: number
  h: number
}

function PanelEditCanvas({
  projectId,
  draftId,
  html,
  pageWidth,
  pageHeight,
  zoom,
  onHtmlChange,
}: {
  projectId: string
  draftId: string | null
  html: string
  pageWidth: number
  pageHeight: number
  zoom: number
  onHtmlChange: (html: string) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [rects, setRects] = useState<PanelRect[]>([])
  const dragRef = useRef<{
    panelId: string
    handle: Handle | "move"
    startX: number
    startY: number
    startRect: PanelRect
    iframeEl: HTMLElement
  } | null>(null)

  // Recompute overlay rects every time the iframe scrolls, resizes, or mutates.
  // biome-ignore lint/correctness/useExhaustiveDependencies: tick is intentionally cheap; re-running on zoom/html is fine
  useEffect(() => {
    const tick = () => {
      const iframe = iframeRef.current
      const container = containerRef.current
      if (!iframe || !container) return
      const doc = iframe.contentDocument
      if (!doc) return
      const iframeRect = iframe.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      // Offset of iframe within container (positive if iframe top-left is offset)
      const ox = iframeRect.left - containerRect.left
      const oy = iframeRect.top - containerRect.top
      const next: PanelRect[] = []
      const panels = doc.querySelectorAll("[data-panel-id]")
      for (const panel of Array.from(panels) as HTMLElement[]) {
        const id = panel.getAttribute("data-panel-id")
        if (!id) continue
        const r = panel.getBoundingClientRect()
        next.push({
          panelId: id,
          x: ox + r.left,
          y: oy + r.top,
          w: r.width,
          h: r.height,
        })
      }
      setRects(next)
    }
    tick()
    const interval = window.setInterval(tick, 500)
    const ro = new ResizeObserver(tick)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => {
      window.clearInterval(interval)
      ro.disconnect()
    }
  }, [html, zoom])

  function onHandleMouseDown(panelId: string, handle: Handle | "move") {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const iframe = iframeRef.current
      if (!iframe) return
      const doc = iframe.contentDocument
      if (!doc) return
      const iframeEl = doc.querySelector<HTMLElement>(`[data-panel-id="${cssEscape(panelId)}"]`)
      if (!iframeEl) return
      const r = rects.find((x) => x.panelId === panelId)
      if (!r) return
      dragRef.current = {
        panelId,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startRect: r,
        iframeEl,
      }
      document.body.style.cursor =
        handle === "move"
          ? "grabbing"
          : handle === "n" || handle === "s"
            ? "ns-resize"
            : handle === "e" || handle === "w"
              ? "ew-resize"
              : handle === "ne" || handle === "sw"
                ? "nesw-resize"
                : "nwse-resize"
      document.body.style.userSelect = "none"
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: rects is the only signal we need to re-bind drag listeners
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      const start = d.startRect
      const minW = 60
      const minH = 30
      let nx = start.x
      let ny = start.y
      let nw = start.w
      let nh = start.h
      if (d.handle === "move") {
        nx = start.x + dx
        ny = start.y + dy
      } else {
        if (d.handle.includes("e")) nw = Math.max(minW, start.w + dx)
        if (d.handle.includes("s")) nh = Math.max(minH, start.h + dy)
        if (d.handle.includes("w")) {
          nw = Math.max(minW, start.w - dx)
          nx = start.x + (start.w - nw)
        }
        if (d.handle.includes("n")) {
          nh = Math.max(minH, start.h - dy)
          ny = start.y + (start.h - nh)
        }
      }
      // Write style to the iframe element so it persists in the HTML
      d.iframeEl.style.width = `${nw}px`
      d.iframeEl.style.height = `${nh}px`
      if (d.handle === "move") {
        d.iframeEl.style.position = "absolute"
        d.iframeEl.style.left = `${nx}px`
        d.iframeEl.style.top = `${ny}px`
      } else {
        // For resize, also normalize position so the panel becomes absolutely
        // positioned relative to its offset parent (so further drags work).
        if (d.iframeEl.style.position !== "absolute") {
          const pr = d.iframeEl.getBoundingClientRect()
          d.iframeEl.style.position = "absolute"
          d.iframeEl.style.left = `${pr.left}px`
          d.iframeEl.style.top = `${pr.top}px`
        }
      }
      // Update overlay rect immediately for smooth handle follow
      setRects((prev) =>
        prev.map((r) => (r.panelId === d.panelId ? { ...r, x: nx, y: ny, w: nw, h: nh } : r)),
      )
    }
    function onUp() {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      // Ship the updated HTML up to the parent
      const doc = iframeRef.current?.contentDocument
      if (doc) {
        onHtmlChange(doc.documentElement.outerHTML)
      }
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rects])

  return (
    <div ref={containerRef} className="relative">
      <iframe
        ref={iframeRef}
        title="poster-preview"
        srcDoc={html}
        onLoad={() => {
          injectPreviewBehavior(iframeRef.current)
        }}
        className="block border border-ws-hairline bg-white"
        style={{ width: `${pageWidth}px`, height: `${(pageHeight * zoom) / 60}px` }}
        sandbox="allow-same-origin allow-scripts"
      />
      {/* Overlay layer with handles — pointer-events only on handles */}
      <div className="pointer-events-none absolute inset-0">
        {rects.map((r) => (
          <PanelOverlay key={r.panelId} rect={r} onHandleMouseDown={onHandleMouseDown} />
        ))}
      </div>
    </div>
  )
}

function PanelOverlay({
  rect,
  onHandleMouseDown,
}: {
  rect: PanelRect
  onHandleMouseDown: (id: string, h: Handle | "move") => (e: React.MouseEvent) => void
}) {
  const handles: { name: Handle; cls: string; style: React.CSSProperties }[] = [
    {
      name: "nw",
      cls: "cursor-nwse-resize",
      style: { left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
    },
    {
      name: "n",
      cls: "cursor-ns-resize",
      style: { left: rect.w / 2 - HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
    },
    {
      name: "ne",
      cls: "cursor-nesw-resize",
      style: { right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2 },
    },
    {
      name: "e",
      cls: "cursor-ew-resize",
      style: { right: -HANDLE_SIZE / 2, top: rect.h / 2 - HANDLE_SIZE / 2 },
    },
    {
      name: "se",
      cls: "cursor-nwse-resize",
      style: { right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
    },
    {
      name: "s",
      cls: "cursor-ns-resize",
      style: { left: rect.w / 2 - HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
    },
    {
      name: "sw",
      cls: "cursor-nesw-resize",
      style: { left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2 },
    },
    {
      name: "w",
      cls: "cursor-ew-resize",
      style: { left: -HANDLE_SIZE / 2, top: rect.h / 2 - HANDLE_SIZE / 2 },
    },
  ]
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    >
      {/* Outline */}
      <div className="pointer-events-none absolute inset-0 rounded-sm outline outline-2 outline-dashed outline-accent/40" />
      {/* Drag-anywhere handle (center) */}
      <div
        onMouseDown={onHandleMouseDown(rect.panelId, "move")}
        className="pointer-events-auto absolute inset-2 cursor-grab"
        title="Drag to move"
      />
      {/* 8 resize handles */}
      {handles.map((h) => (
        <div
          key={h.name}
          onMouseDown={onHandleMouseDown(rect.panelId, h.name)}
          className={`pointer-events-auto absolute h-${HANDLE_SIZE / 4} w-${HANDLE_SIZE / 4} rounded-sm border-2 border-accent bg-white shadow ${h.cls}`}
          style={{
            ...h.style,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
          }}
        />
      ))}
    </div>
  )
}

function cssEscape(s: string): string {
  if (window.CSS && CSS.escape) return CSS.escape(s)
  return s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)
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
