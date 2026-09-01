"use client"

import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface PdfViewerPanelProps {
  paperFileUrl: string | null
}

interface PageData {
  num: number
  thumbnail: string | null
}

interface PdfViewport {
  width: number
  height: number
}

interface PdfPage {
  getViewport: (opts: { scale: number }) => PdfViewport
  render: (opts: {
    canvasContext: CanvasRenderingContext2D
    viewport: PdfViewport
    canvas: HTMLCanvasElement
  }) => { promise: Promise<void> }
}

interface PdfDocument {
  numPages: number
  getPage: (n: number) => Promise<PdfPage>
}

export function PdfViewerPanel({ paperFileUrl }: PdfViewerPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [activePage, setActivePage] = useState(1)
  const [tab, setTab] = useState<"citations" | "figures" | "tables">("figures")
  const [zoom, setZoom] = useState(100)
  const [pages, setPages] = useState<PageData[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pdfDocRef = useRef<PdfDocument | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!paperFileUrl) {
      setPages([])
      setTotalPages(0)
      pdfDocRef.current = null
      return
    }

    setLoading(true)
    setError(null)

    async function loadPdf() {
      try {
        const pdfjsLib = await import("pdfjs-dist")
        // Worker served from /public (copied from pdfjs-dist/build in scripts/)
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

        const loadingTask = pdfjsLib.getDocument(paperFileUrl ?? "")
        const doc = await loadingTask.promise
        if (cancelled) return

        pdfDocRef.current = doc
        setTotalPages(doc.numPages)

        const thumbnails: PageData[] = []
        const thumbPromises: Promise<void>[] = []
        for (let i = 1; i <= doc.numPages; i++) {
          thumbPromises.push(
            (async () => {
              const page = await doc.getPage(i)
              const viewport = page.getViewport({ scale: 0.3 })
              const canvas = document.createElement("canvas")
              canvas.width = viewport.width
              canvas.height = viewport.height
              const ctx = canvas.getContext("2d")
              if (!ctx) return
              await page.render({ canvasContext: ctx, viewport, canvas }).promise
              if (cancelled) return
              thumbnails[i - 1] = {
                num: i,
                thumbnail: canvas.toDataURL("image/png"),
              }
            })(),
          )
        }
        await Promise.all(thumbPromises)
        if (cancelled) return
        setPages(thumbnails)
        setLoading(false)
      } catch (err) {
        console.error("PDF load failed:", err)
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load PDF")
          setLoading(false)
        }
      }
    }

    void loadPdf()
    return () => {
      cancelled = true
    }
  }, [paperFileUrl])

  // Render active page
  useEffect(() => {
    let cancelled = false
    const doc = pdfDocRef.current
    if (!doc || !canvasRef.current) return

    setRendering(true)
    void (async () => {
      try {
        const page = await doc.getPage(activePage)
        const viewport = page.getViewport({ scale: (zoom / 100) * 1.5 })
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        await page.render({ canvasContext: ctx, viewport, canvas }).promise
      } catch (err) {
        console.error("Render failed:", err)
      } finally {
        if (!cancelled) setRendering(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activePage, zoom])

  return (
    <div className="flex flex-col bg-ws-panel-2">
      <div className="flex h-11 items-center justify-between border-b border-ws-hairline px-4">
        <p className="text-caption-uppercase text-muted">
          PDF {totalPages > 0 ? `· ${totalPages} pages` : ""}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-ws-active"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-xs text-muted">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            className="grid h-6 w-6 place-items-center rounded text-muted hover:bg-ws-active"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[80px_1fr] flex-1 overflow-hidden">
        <div className="overflow-y-auto border-r border-ws-hairline p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </div>
          ) : error ? (
            <p className="p-2 text-xs text-danger">{error}</p>
          ) : pages.length === 0 ? (
            <p className="p-2 text-xs text-muted">
              {paperFileUrl ? "No pages" : "Upload a PDF to view"}
            </p>
          ) : (
            pages.map((page) => (
              <button
                type="button"
                key={page.num}
                onClick={() => setActivePage(page.num)}
                className={`mb-2 block w-full rounded-md border p-1 transition-colors ${
                  activePage === page.num
                    ? "border-accent bg-ws-active"
                    : "border-ws-hairline bg-white hover:border-accent"
                }`}
              >
                {page.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={page.thumbnail}
                    alt={`Page ${page.num}`}
                    className="block w-full rounded-sm"
                  />
                ) : (
                  <div className="aspect-[3/4] rounded-sm bg-ws-canvas" />
                )}
                <p className="mt-1 text-center font-mono text-[10px] text-muted">p.{page.num}</p>
              </button>
            ))
          )}
        </div>

        <div className="overflow-auto p-4">
          {paperFileUrl && pages.length > 0 ? (
            <div className="mx-auto">
              <canvas
                ref={canvasRef}
                className="block border border-ws-hairline bg-white shadow-raised"
              />
              {rendering && (
                <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted">
                  <Loader2 className="h-3 w-3 animate-spin" /> Rendering…
                </div>
              )}
            </div>
          ) : (
            <div className="grid h-full place-items-center text-center">
              <div>
                <div className="mx-auto h-16 w-16 rounded-lg border-2 border-dashed border-ws-hairline" />
                <p className="mt-4 text-sm text-muted">
                  {paperFileUrl ? "Loading PDF…" : "No PDF loaded"}
                </p>
              </div>
            </div>
          )}

          {pages.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <span className="font-mono text-xs text-muted">
                Page {activePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setActivePage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-ws-hairline bg-white">
        <div className="flex gap-px px-2 pt-2">
          {(["citations", "figures", "tables"] as const).map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-t-md px-3 py-1.5 text-caption-uppercase transition-colors ${
                tab === t ? "bg-ws-active text-accent" : "text-muted hover:text-fg"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="max-h-32 overflow-y-auto p-3">
          {tab === "figures" && (
            <p className="text-xs text-muted">
              Figures are auto-extracted from the paper. See the right panel for the rendered
              poster.
            </p>
          )}
          {tab === "citations" && (
            <p className="text-xs text-muted">
              Citations from the paper will appear in the poster's references section.
            </p>
          )}
          {tab === "tables" && (
            <p className="text-xs text-muted">
              Tables detected in the paper are rendered in the poster with the same data.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
