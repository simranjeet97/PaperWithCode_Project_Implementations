"use client"

import { PanelEditCanvas } from "@/components/workspace/panel-edit-canvas"
import { ArrowLeft, ChevronDown, ChevronUp, Palette, RotateCcw, Save } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
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
  const projectId = params.id
  const iframeContainerRef = useRef<HTMLDivElement | null>(null)
  const [draftHtml, setDraftHtml] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [accent, setAccent] = useState("#4f46e5")
  const [dirty, setDirty] = useState(false)
  const [order, setOrder] = useState<string[]>([])

  // Load draft + accepted state
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
        const m = accepted.htmlContent.match(/--accent:\s*([#\w]+)/)
        if (m?.[1]) setAccent(m[1])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  // After PanelEditCanvas loads, find the iframe + apply accent live + read panel order
  const refreshOrderFromIframe = () => {
    const iframe = iframeContainerRef.current?.querySelector("iframe")
    const doc = iframe?.contentDocument
    if (!doc) return
    const panels = Array.from(doc.querySelectorAll("[data-panel-id]")) as HTMLElement[]
    setOrder(panels.map((p) => p.getAttribute("data-panel-id") ?? ""))
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshOrderFromIframe reads live DOM
  useEffect(() => {
    const iframe = iframeContainerRef.current?.querySelector("iframe")
    if (!iframe) return
    function applyAccent() {
      const doc = iframe?.contentDocument
      if (!doc) return
      const style = doc.getElementById("aips-live-accent") as HTMLStyleElement | null
      if (style) {
        style.textContent = `:root { --accent: ${accent} !important; } .accent-soft { background: ${accent}1a !important; }`
      }
      refreshOrderFromIframe()
    }
    iframe.addEventListener("load", applyAccent)
    // Also apply when html changes
    if (iframe.contentDocument?.readyState === "complete") applyAccent()
    return () => {
      iframe.removeEventListener("load", applyAccent)
    }
  }, [accent, draftHtml])

  const movePanel = (id: string, direction: -1 | 1) => {
    const iframe = iframeContainerRef.current?.querySelector("iframe")
    const doc = iframe?.contentDocument
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
    if (doc.documentElement) {
      setDraftHtml(doc.documentElement.outerHTML)
    }
    refreshOrderFromIframe()
  }

  const save = async () => {
    const iframe = iframeContainerRef.current?.querySelector("iframe")
    const html = iframe?.contentDocument?.documentElement.outerHTML ?? draftHtml
    if (!html || !draftId) return
    setSaving(true)
    try {
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
    setDirty(false)
    // Force-remount by setting html to its original — PanelEditCanvas re-loads via srcDoc
    setDraftHtml((prev) => (prev ? `${prev}` : prev))
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
          <div
            ref={iframeContainerRef}
            className="block w-full border border-ws-hairline bg-white shadow-elevated"
          >
            <PanelEditCanvas
              html={draftHtml}
              pageWidth={841}
              pageHeight={1189}
              zoom={60}
              onHtmlChange={(next) => {
                setDraftHtml(next)
                setDirty(true)
              }}
              onDirtyChange={setDirty}
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted">
            Click any text to edit. Drag any panel to move. Drag the corners to resize. Use the
            panel list below to reorder.
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
