"use client"

import { ArrowLeft, ChevronDown, ChevronUp, Palette, RotateCcw, Save } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const PALETTE = [
  { name: "Indigo", value: "#4f46e5" },
  { name: "Blue", value: "#2563eb" },
  { name: "Teal", value: "#0d9488" },
  { name: "Green", value: "#16a34a" },
  { name: "Orange", value: "#ea580c" },
  { name: "Red", value: "#dc2626" },
  { name: "Pink", value: "#db2777" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Slate", value: "#475569" },
]

export default function EditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const projectId = params.id
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [draftHtml, setDraftHtml] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [accent, setAccent] = useState("#4f46e5")
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await fetch(`/api/projects/${projectId}/events`, {
        cache: "no-store",
      } as RequestInit)
      if (!res.ok) return
      const data = (await res.json()) as {
        drafts: Array<{ id: string; turnNumber: number; htmlContent: string; accepted?: boolean }>
      }
      if (cancelled) return
      const accepted = data.drafts.find((d) => d.accepted) ?? data.drafts[data.drafts.length - 1]
      if (accepted) {
        setDraftHtml(accepted.htmlContent)
        setDraftId(accepted.id)
        // Detect current accent
        const m = accepted.htmlContent.match(/--accent:\s*([#\w]+)/)
        if (m?.[1]) setAccent(m[1])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // Apply accent color live
  useEffect(() => {
    if (!iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return
    const style = doc.getElementById("aips-live-accent") as HTMLStyleElement | null
    if (style) {
      style.textContent = `:root { --accent: ${accent} !important; } .accent-soft { background: ${accent}1a !important; }`
    }
  }, [accent])

  const [order, setOrder] = useState<string[]>([])

  // Discover panels from the loaded HTML
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when iframe srcDoc changes
  useEffect(() => {
    if (!iframeRef.current?.contentDocument) return
    const doc = iframeRef.current.contentDocument
    const panels = Array.from(doc.querySelectorAll("[data-panel-id]")) as HTMLElement[]
    const ids = panels.map((p) => p.getAttribute("data-panel-id") ?? "")
    setOrder(ids)
  }, [draftHtml])

  const movePanel = (id: string, direction: -1 | 1) => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    const panels = Array.from(doc.querySelectorAll("[data-panel-id]")) as HTMLElement[]
    const container = doc.querySelector(".body, .stack")
    if (!container) return
    const current = panels.find((p) => p.getAttribute("data-panel-id") === id)
    if (!current) return
    const all = Array.from(container.children) as HTMLElement[]
    const idx = all.indexOf(current)
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= all.length) return
    if (direction === -1) {
      container.insertBefore(current, all[newIdx] ?? null)
    } else {
      container.insertBefore(all[newIdx] ?? current, current)
    }
    setDirty(true)
    // Update local order
    const newOrder = Array.from(container.querySelectorAll("[data-panel-id]")).map(
      (p) => p.getAttribute("data-panel-id") ?? "",
    )
    setOrder(newOrder)
  }

  const onIframeLoad = () => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    // Inject editable styles + a style element for live accent
    const liveStyle = doc.createElement("style")
    liveStyle.id = "aips-live-accent"
    liveStyle.textContent = `:root { --accent: ${accent} !important; }`
    doc.head.appendChild(liveStyle)

    const editStyle = doc.createElement("style")
    editStyle.id = "aips-edit-style"
    editStyle.textContent = `
      [contenteditable] { outline: 1px dashed transparent; transition: outline-color 0.1s; }
      [contenteditable]:hover { outline-color: ${accent}80; }
      [contenteditable]:focus { outline: 2px solid ${accent}; outline-offset: 2px; }
      /* Resizable panels: native CSS resize handles */
      .panel, .figure, .diagram, .claims, .table-block, .abstract {
        resize: both;
        overflow: auto;
        min-width: 80px;
        min-height: 40px;
        box-sizing: border-box;
      }
      .panel:hover, .figure:hover, .diagram:hover, .claims:hover, .table-block:hover, .abstract:hover {
        outline: 1px dashed ${accent}80;
        outline-offset: 4px;
      }
      /* Page size badge in the corner */
      body::after {
        content: "Resize boxes by dragging their bottom-right corner";
        position: fixed;
        bottom: 8px;
        right: 12px;
        font: 9px 'JetBrains Mono', monospace;
        color: ${accent};
        background: white;
        padding: 2px 6px;
        border: 1px solid ${accent}40;
        border-radius: 3px;
        pointer-events: none;
      }
    `
    doc.head.appendChild(editStyle)

    // Make text editable
    const targets = doc.querySelectorAll(
      "h1, h2, p, li, figcaption, .tagline, .authors, .abstract, .claim span:last-child",
    )
    for (const el of Array.from(targets)) {
      ;(el as HTMLElement).setAttribute("contenteditable", "plaintext-only")
      ;(el as HTMLElement).addEventListener("input", () => setDirty(true))
    }

    // Track panel resize events to mark dirty
    const resizables = doc.querySelectorAll(
      ".panel, .figure, .diagram, .claims, .table-block, .abstract",
    )
    for (const el of Array.from(resizables)) {
      ;(el as HTMLElement).addEventListener("mouseup", () => setDirty(true))
    }
  }

  const save = async () => {
    if (!iframeRef.current?.contentDocument || !draftId) return
    setSaving(true)
    try {
      const html = iframeRef.current.contentDocument.documentElement.outerHTML
      const res = await fetch(`/api/projects/${projectId}/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ htmlContent: html }),
      })
      if (!res.ok) throw new Error("Save failed")
      setDirty(false)
      setDraftHtml(html)
    } catch (err) {
      console.error(err)
      alert("Save failed. See console.")
    } finally {
      setSaving(false)
    }
  }

  const revert = () => {
    if (!confirm("Discard unsaved changes?")) return
    if (iframeRef.current?.contentDocument) {
      iframeRef.current.contentDocument.open()
      iframeRef.current.contentDocument.write(draftHtml ?? "")
      iframeRef.current.contentDocument.close()
    }
    setDirty(false)
  }

  if (!draftHtml) {
    return (
      <div className="grid h-screen place-items-center bg-bg">
        <p className="text-fg-2">Loading draft…</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-ws-canvas">
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-ws-hairline bg-surface px-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/app/p/${projectId}`}
            className="inline-flex items-center gap-1.5 text-sm text-fg-2 hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
          <span className="text-caption-uppercase text-muted">Editor</span>
          {dirty && <span className="text-caption-uppercase text-warn">Unsaved changes</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-ws-hairline bg-ws-panel-2 px-2 py-1">
            <Palette className="h-3.5 w-3.5 text-muted" />
            {PALETTE.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                onClick={() => {
                  setAccent(c.value)
                  setDirty(true)
                }}
                className={`h-5 w-5 rounded-pill border-2 transition-transform ${
                  accent.toLowerCase() === c.value.toLowerCase()
                    ? "scale-125 border-fg"
                    : "border-transparent hover:scale-110"
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
            <input
              type="color"
              value={accent}
              onChange={(e) => {
                setAccent(e.target.value)
                setDirty(true)
              }}
              className="h-5 w-5 cursor-pointer rounded-pill border border-ws-hairline"
              title="Custom color"
            />
          </div>
          <button
            type="button"
            onClick={revert}
            disabled={!dirty}
            className="inline-flex items-center gap-1.5 rounded-md border border-ws-hairline bg-white px-3 py-1.5 text-xs font-medium text-fg hover:bg-ws-active disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Revert
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            style={{ backgroundColor: accent }}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save draft"}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto" style={{ maxWidth: 900 }}>
          <iframe
            ref={iframeRef}
            title="poster-editor"
            srcDoc={draftHtml}
            onLoad={onIframeLoad}
            className="block w-full border border-ws-hairline bg-white shadow-elevated"
            style={{ height: "1200px" }}
            sandbox="allow-same-origin allow-scripts"
          />
          <p className="mt-3 text-center text-xs text-muted">
            Click any text to edit. Use the panel list below to reorder.
          </p>

          {order.length > 0 && (
            <div className="mt-6 rounded-lg border border-ws-hairline bg-ws-panel-2 p-4">
              <p className="text-caption-uppercase text-muted">Panel order</p>
              <ol className="mt-2 space-y-1">
                {order.map((id, idx) => {
                  const labels: Record<string, string> = {
                    title: "Title",
                    abstract: "Abstract",
                    claims: "Key claims",
                    diagram: "Architecture diagram",
                  }
                  let label = labels[id] ?? id
                  if (id.startsWith("section-")) label = `Section ${idx}`
                  if (id.startsWith("figure-")) label = `Figure ${idx - 1}`
                  if (id.startsWith("claim-")) label = `Claim ${idx - 1}`
                  if (id.startsWith("table-")) label = "Table"
                  return (
                    <li
                      key={id}
                      className="flex items-center justify-between rounded-md border border-ws-hairline bg-white px-3 py-1.5 text-sm"
                    >
                      <span className="text-fg-2">
                        {idx + 1}. {label}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => movePanel(id, -1)}
                          disabled={idx === 0}
                          aria-label="Move up"
                          className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-ws-active disabled:opacity-30"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePanel(id, 1)}
                          disabled={idx === order.length - 1}
                          aria-label="Move down"
                          className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-ws-active disabled:opacity-30"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
