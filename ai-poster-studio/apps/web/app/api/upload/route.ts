import { promises as fs } from "node:fs"
import path from "node:path"
import { requireUser } from "@/lib/auth/session"
import { nanoid } from "nanoid"
import { NextResponse } from "next/server"
import { z } from "zod"

const schema = z.object({
  filename: z.string().min(1).max(255),
  size: z
    .number()
    .int()
    .nonnegative()
    .max(50 * 1024 * 1024),
  contentType: z.literal("application/pdf"),
  sourceUrl: z.string().url().optional(),
})

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads")

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
}

/**
 * Step 1 of the upload flow.
 *
 * Instead of presigned URLs (UploadThing + R2), we just return a path the
 * browser will POST the file to. The file is stored in .data/uploads/.
 * For production: swap this for S3 / R2 presigned URLs — the API shape
 * stays identical.
 */
export async function POST(request: Request) {
  await ensureDir()
  const user = await requireUser()

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const id = nanoid()
  const safeName = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  const stored = `${user.id}/${id}-${safeName}`

  return NextResponse.json({
    uploadUrl: "/api/upload/file",
    fields: { id, userId: user.id, filename: parsed.data.filename },
    fileUrl: `/api/upload/file?path=${encodeURIComponent(stored)}`,
  })
}
