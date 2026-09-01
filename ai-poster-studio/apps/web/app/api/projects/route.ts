import { runPipeline } from "@/lib/agents/run-pipeline"
import { requireUser } from "@/lib/auth/session"
import { createProject, listProjectsByUser } from "@/lib/db/local"
import type { PosterAspectRatio, PosterTemplate } from "@aips/types"
import { NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

const projectSchema = z.object({
  title: z.string().min(1).max(255),
  paperFileUrl: z.string(),
  paperArxivId: z.string().optional(),
  template: z.string().default("cvpr-portrait"),
  aspectRatio: z.string().default("A0-portrait"),
  accentColor: z.string().default("#4f46e5"),
})

const VALID_TEMPLATES: PosterTemplate[] = [
  "cvpr-landscape",
  "cvpr-portrait",
  "icml-portrait",
  "neurips-portrait",
  "nature-portrait",
  "custom",
]

const VALID_ASPECTS: PosterAspectRatio[] = ["A0-landscape", "A0-portrait", "US-Letter"]

export async function POST(request: Request) {
  const user = await requireUser()
  const body = await request.json()
  const parsed = projectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const tmpl: PosterTemplate = (VALID_TEMPLATES as string[]).includes(parsed.data.template)
    ? (parsed.data.template as PosterTemplate)
    : "cvpr-portrait"
  const aspect: PosterAspectRatio = (VALID_ASPECTS as string[]).includes(parsed.data.aspectRatio)
    ? (parsed.data.aspectRatio as PosterAspectRatio)
    : "A0-portrait"

  const project = await createProject({
    title: parsed.data.title,
    paperFileUrl: parsed.data.paperFileUrl,
    paperArxivId: parsed.data.paperArxivId ?? null,
    template: tmpl,
    aspectRatio: aspect,
    accentColor: parsed.data.accentColor,
    userId: user.id,
    status: "uploading",
    contentBrief: null,
    posterPlan: null,
    drafts: [],
    finalDraftId: null,
    completedAt: null,
  })

  // Kick off the agent pipeline (fire-and-forget)
  void runPipeline(project.id).catch((err: unknown) => {
    console.error("Pipeline failed:", err)
  })

  return NextResponse.json({ projectId: project.id })
}

export async function GET() {
  const user = await requireUser()
  const projects = await listProjectsByUser(user.id)
  return NextResponse.json({ projects })
}
