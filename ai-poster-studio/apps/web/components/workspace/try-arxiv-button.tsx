"use client"

import { Download, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function TryArxivButton({
  arxivId,
  title,
  authors,
}: {
  arxivId: string
  title: string
  authors: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setError(null)
    setLoading(true)
    try {
      const pdfUrl = `https://arxiv.org/pdf/${arxivId}`
      const initRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: `${arxivId}.pdf`,
          size: 0,
          contentType: "application/pdf",
          sourceUrl: pdfUrl,
        }),
      })
      if (!initRes.ok) {
        const data = (await initRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? "Could not start download")
      }
      const { uploadUrl, fields, fileUrl } = (await initRes.json()) as {
        uploadUrl: string
        fields: { id: string; userId: string; filename: string }
        fileUrl: string
      }

      const pdfRes = await fetch(pdfUrl)
      if (!pdfRes.ok) throw new Error(`Could not fetch ${pdfUrl}`)
      const blob = await pdfRes.blob()
      const file = new File([blob], `${arxivId}.pdf`, { type: "application/pdf" })

      const formData = new FormData()
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value)
      }
      formData.append("file", file)

      const uploadRes = await fetch(uploadUrl, { method: "POST", body: formData })
      if (!uploadRes.ok) throw new Error("Upload failed")

      const projectRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          paperFileUrl: fileUrl,
          paperArxivId: arxivId,
          template:
            (document.querySelector("[data-template]") as HTMLElement | null)?.dataset.template ??
            "cvpr-portrait",
        }),
      })
      if (!projectRes.ok) throw new Error("Could not create project")
      const { projectId } = (await projectRes.json()) as { projectId: string }
      router.push(`/app/p/${projectId}`)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Download failed")
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="group flex w-full flex-col items-start rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-accent hover:bg-accent-soft disabled:opacity-60"
      >
        <div className="flex w-full items-center justify-between">
          <p className="text-sm font-medium text-fg group-hover:text-accent">{title}</p>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
          ) : (
            <Download className="h-3.5 w-3.5 text-muted group-hover:text-accent" />
          )}
        </div>
        <p className="mt-1 font-mono text-xs text-muted">{authors}</p>
        <p className="mt-1 font-mono text-xs text-meta">arXiv:{arxivId}</p>
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  )
}
