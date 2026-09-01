import { requireUser } from "@/lib/auth/session"
import { appendEvent, getDraft, getProject, updateDraft, updateProject } from "@/lib/db/local"
import { NextResponse } from "next/server"
import { z } from "zod"

export const dynamic = "force-dynamic"

const schema = z.object({
  htmlContent: z.string().min(50).max(500_000),
})

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string; draftId: string }> },
) {
  const user = await requireUser()
  const { id, draftId } = await ctx.params

  const project = await getProject(id)
  if (!project || project.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const draft = await getDraft(draftId)
  if (!draft || draft.projectId !== id) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  await updateDraft(draftId, { htmlContent: parsed.data.htmlContent })

  // Mark as a manual edit
  await appendEvent({
    projectId: id,
    runId: id,
    stage: "critique",
    message: `User edited Draft ${draft.turnNumber} manually`,
    draftNumber: draft.turnNumber,
  })

  // If this was the accepted draft, mark the project as still completed
  if (project.finalDraftId === draftId) {
    await updateProject(id, { status: "completed" })
  }

  return NextResponse.json({ ok: true })
}
