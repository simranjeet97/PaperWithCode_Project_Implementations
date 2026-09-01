"use client"

import { FileText, Loader2, Upload } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"

export function UploadZone() {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = params.get("redirect") ?? "/app/p"

  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError("Only PDF files are accepted.")
        return
      }
      if (file.size > 50 * 1024 * 1024) {
        setError("File too large. Max 50MB.")
        return
      }

      setError(null)
      setIsUploading(true)
      try {
        // Step 1: ask server for an upload slot
        const initRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            size: file.size,
            contentType: file.type,
          }),
        })
        if (!initRes.ok) {
          const data = (await initRes.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error ?? "Failed to start upload")
        }
        const { uploadUrl, fields, fileUrl } = (await initRes.json()) as {
          uploadUrl: string
          fields: { id: string; userId: string; filename: string }
          fileUrl: string
        }

        // Step 2: POST the file to our own /api/upload/file
        const formData = new FormData()
        for (const [key, value] of Object.entries(fields)) {
          formData.append(key, value)
        }
        formData.append("file", file)

        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          body: formData,
        })
        if (!uploadRes.ok) throw new Error("Upload failed")

        // Step 3: create the project (this kicks off the agent pipeline)
        const projectRes = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: file.name.replace(/\.pdf$/i, ""),
            paperFileUrl: fileUrl,
            template:
              (document.querySelector("[data-template]") as HTMLElement | null)?.dataset.template ??
              "cvpr-portrait",
          }),
        })
        if (!projectRes.ok) throw new Error("Project creation failed")
        const { projectId } = (await projectRes.json()) as { projectId: string }

        router.push(`${redirectTo}/${projectId}`)
      } catch (err) {
        console.error(err)
        setError(err instanceof Error ? err.message : "Upload failed")
        setIsUploading(false)
      }
    },
    [router, redirectTo],
  )

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const dt = e.dataTransfer as unknown as { files: File[] }
          const file = dt.files[0]
          if (file) handleFile(file)
        }}
        className={`mt-8 rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          isDragging ? "border-accent bg-accent-soft" : "border-border bg-surface"
        }`}
      >
        {isUploading ? (
          <div>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-accent" />
            <p className="mt-4 text-sm text-fg-2">Uploading your paper and starting the agent…</p>
          </div>
        ) : (
          <div>
            <Upload className="mx-auto h-10 w-10 text-muted" />
            <p className="mt-4 text-sm font-medium text-fg">Drop a PDF here, or click to browse</p>
            <p className="mt-2 text-xs text-muted">Up to 50MB. Stored locally in .data/</p>
            <label className="mt-6 inline-block">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const target = e.target as unknown as { files: File[] }
                  const file = target.files[0]
                  if (file) handleFile(file)
                }}
                className="hidden"
              />
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover">
                <FileText className="h-4 w-4" />
                Choose PDF
              </span>
            </label>
          </div>
        )}
      </div>
      {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}
    </div>
  )
}
