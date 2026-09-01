import { requireUser } from "@/lib/auth/session"
import { getProject, updateProject } from "@/lib/db/local"
import { NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

const schema = z.object({
  panelId: z.string().min(1).max(200),
  text: z.string().min(1).max(2000),
})

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await ctx.params

  const project = await getProject(id)
  if (!project || project.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const nextOverrides = {
    ...(project.panelOverrides ?? {}),
    [parsed.data.panelId]: parsed.data.text,
  }

  const updated = await updateProject(id, { panelOverrides: nextOverrides })
  return NextResponse.json({ project: updated })
}
