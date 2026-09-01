import { POSTER_TEMPLATES } from "@/lib/agents/templates"
import { requireUser } from "@/lib/auth/session"
import { getProject, updateProject } from "@/lib/db/local"
import type { PosterAspectRatio, PosterTemplate } from "@aips/types"
import { NextResponse } from "next/server"
import { z } from "zod"

const VALID_TEMPLATES = POSTER_TEMPLATES.map((t) => t.id) as PosterTemplate[]

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await ctx.params
  const project = await getProject(id)
  if (!project || project.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json({ project })
}

const patchSchema = z.object({
  template: z.enum(VALID_TEMPLATES as [PosterTemplate, ...PosterTemplate[]]).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #1f2937")
    .optional(),
})

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await ctx.params

  const project = await getProject(id)
  if (!project || project.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const patch: Partial<{
    template: PosterTemplate
    accentColor: string
    aspectRatio: PosterAspectRatio
  }> = {}
  if (parsed.data.template && parsed.data.template !== project.template) {
    patch.template = parsed.data.template
    const tpl = POSTER_TEMPLATES.find((t) => t.id === parsed.data.template)
    if (tpl) patch.aspectRatio = tpl.aspectRatio
  }
  if (parsed.data.accentColor && parsed.data.accentColor !== project.accentColor) {
    patch.accentColor = parsed.data.accentColor
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ project })
  }

  const updated = await updateProject(id, patch)
  return NextResponse.json({ project: updated })
}
