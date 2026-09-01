import { promises as fs } from "node:fs"
import path from "node:path"
import { requireUser } from "@/lib/auth/session"
import { NextResponse } from "next/server"

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads")

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
}

/**
 * Multipart upload endpoint. Browser POSTs the FormData from /api/upload.
 * Saves the file to .data/uploads/<userId>/<id>-<filename>.
 */
export async function POST(request: Request) {
  await ensureDir()
  await requireUser()

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const id = formData.get("id") as string | null
  const userId = formData.get("userId") as string | null

  if (!file || !id || !userId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const userDir = path.join(UPLOAD_DIR, userId)
  await fs.mkdir(userDir, { recursive: true })

  const target = path.join(userDir, `${id}-${safeName}`)
  const bytes = new Uint8Array(await file.arrayBuffer())
  await fs.writeFile(target, bytes)

  const targetName = path.basename(target)
  return NextResponse.json({ ok: true, path: targetName })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const relPath = url.searchParams.get("path")
  if (!relPath) return NextResponse.json({ error: "Missing path" }, { status: 400 })

  const fullPath = path.join(UPLOAD_DIR, relPath)
  try {
    const data = await fs.readFile(fullPath)
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
