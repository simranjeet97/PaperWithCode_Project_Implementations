/**
 * PanelEditCanvas — wraps a poster iframe with an overlay layer that renders
 * 8 resize handles + a drag handle per [data-panel-id] panel.
 *
 * Handles live in the parent document (NOT the iframe) so they stay visible
 * even when a panel overflows the canvas. Each panel resizes/moves
 * independently. Changes are written as inline styles into the iframe
 * element so they persist into outerHTML on drag-end.
 *
 * Usage:
 *   <PanelEditCanvas
 *     html={draftHtml}
 *     pageWidth={841}
 *     pageHeight={1189}
 *     zoom={60}
 *     onHtmlChange={(next) => setDraftHtml(next)}
 *     onDirtyChange={(d) => setDirty(d)}
 *   />
 */
"use client"

import { useEffect, useRef, useState } from "react"

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

export interface PanelEditCanvasProps {
  html: string | null
  pageWidth: number
  pageHeight: number
  zoom: number
  onHtmlChange: (html: string) => void
  onDirtyChange?: (dirty: boolean) => void
}

export function PanelEditCanvas({
  html,
  pageWidth,
  pageHeight,
  zoom,
  onHtmlChange,
  onDirtyChange,
}: PanelEditCanvasProps) {
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

  // Recompute overlay rects whenever iframe content / zoom changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: tick is intentionally cheap
  useEffect(() => {
    const tick = () => {
      const iframe = iframeRef.current
      const container = containerRef.current
      if (!iframe || !container) return
      const doc = iframe.contentDocument
      if (!doc) return
      const iframeRect = iframe.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
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
      // Convert overlay (parent-doc) coords → iframe (inner-doc) coords so
      // the drag math uses the same coordinate system we write back to.
      const iframeRect = iframe.getBoundingClientRect()
      const iframeScrollX = doc.documentElement.scrollLeft || doc.body.scrollLeft || 0
      const iframeScrollY = doc.documentElement.scrollTop || doc.body.scrollTop || 0
      const startIframeX = r.x - iframeRect.left + iframeScrollX
      const startIframeY = r.y - iframeRect.top + iframeScrollY
      dragRef.current = {
        panelId,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startRect: { ...r, x: startIframeX, y: startIframeY },
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: rects is the only signal we need
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
      // nx/ny are iframe-local coords. Write directly to the iframe element
      // so the change persists into the HTML on drag-end.
      d.iframeEl.style.width = `${nw}px`
      d.iframeEl.style.height = `${nh}px`
      if (d.handle === "move") {
        d.iframeEl.style.position = "absolute"
        d.iframeEl.style.left = `${nx}px`
        d.iframeEl.style.top = `${ny}px`
      } else {
        if (d.iframeEl.style.position !== "absolute") {
          d.iframeEl.style.position = "absolute"
          d.iframeEl.style.left = `${start.x}px`
          d.iframeEl.style.top = `${start.y}px`
        }
      }
      // Update overlay rect immediately so handles follow smoothly.
      // Convert iframe-local → parent coords.
      const iframeRect2 = iframeRef.current?.getBoundingClientRect()
      if (iframeRect2) {
        setRects((prev) =>
          prev.map((r) =>
            r.panelId === d.panelId
              ? {
                  ...r,
                  x: iframeRect2.left + nx,
                  y: iframeRect2.top + ny,
                  w: nw,
                  h: nh,
                }
              : r,
          ),
        )
      }
    }
    function onUp() {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      const doc = iframeRef.current?.contentDocument
      if (doc) {
        onHtmlChange(doc.documentElement.outerHTML)
        onDirtyChange?.(true)
      }
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [onHtmlChange, onDirtyChange])

  // Wire input events so inline text edits flow back to the parent
  // biome-ignore lint/correctness/useExhaustiveDependencies: html triggers re-binding; onHtmlChange is the only signal we need
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    function onInput() {
      if (iframe?.contentDocument) {
        onHtmlChange(iframe.contentDocument.documentElement.outerHTML)
        onDirtyChange?.(true)
      }
    }
    doc.addEventListener("input", onInput)
    return () => {
      doc.removeEventListener("input", onInput)
    }
  }, [html, onHtmlChange, onDirtyChange])

  if (!html) return null

  return (
    <div ref={containerRef} className="relative">
      <iframe
        ref={iframeRef}
        title="poster-edit"
        srcDoc={html}
        className="block border border-ws-hairline bg-white"
        style={{
          width: `${pageWidth}px`,
          height: `${(pageHeight * zoom) / 60}px`,
        }}
        sandbox="allow-same-origin allow-scripts"
      />
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
      <div className="pointer-events-none absolute inset-0 rounded-sm outline outline-2 outline-dashed outline-accent/40" />
      {/* Full-panel move area — click anywhere to drag. Resize handles on
          top capture edge/corner drags first. */}
      <div
        onMouseDown={onHandleMouseDown(rect.panelId, "move")}
        className="pointer-events-auto absolute inset-0 cursor-grab"
        title="Drag to move"
      />
      {handles.map((h) => (
        <div
          key={h.name}
          onMouseDown={onHandleMouseDown(rect.panelId, h.name)}
          className={`pointer-events-auto absolute rounded-sm border-2 border-accent bg-white shadow ${h.cls}`}
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
  if (typeof window !== "undefined" && window.CSS && CSS.escape) return CSS.escape(s)
  return s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`)
}
